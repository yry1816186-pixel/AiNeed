import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TryOnStatus, Prisma } from "@prisma/client";
import axios from "axios";
import Redis from "ioredis";

import { NotificationService } from "../../../common/gateway/notification.service";
import { StructuredLoggerService, ContextualLogger } from "../../../common/logging";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { REDIS_CLIENT } from "../../../common/redis/redis.service";
import { StorageService } from "../../../common/storage/storage.service";
import { QueueService } from "../../platform/queue/queue.service";

import { generateStableCacheKey } from "./services/ai-tryon-provider.interface";

export interface CreateTryOnResult {
  id: string;
  status: TryOnStatus;
  estimatedWaitTime?: number;
}

export interface TryOnHistoryItem {
  id: string;
  status: TryOnStatus;
  resultImageUrl: string | null;
  resultImageDataUri?: string | null;
  createdAt: Date;
  completedAt: Date | null;
  photo: {
    id: string;
    thumbnailUrl: string | null;
    type: string;
  };
  item: {
    id: string;
    name: string;
    images: string[];
    price: number;
  };
}

const MAX_CONCURRENT_TRYONS_PER_USER = 3;
const DAILY_TRYON_LIMIT = 3;
const DAILY_RETRY_KEY_PREFIX = "tryon:daily";

@Injectable()
export class TryOnService {
  private readonly logger: ContextualLogger;
  private readonly autoEnhance: boolean;
  private readonly mlServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private storage: StorageService,
    private queueService: QueueService,
    private notificationService: NotificationService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    loggingService: StructuredLoggerService,
  ) {
    this.logger = loggingService.createChildLogger(TryOnService.name);
    this.autoEnhance = this.configService.get<string>("TRYON_AUTO_ENHANCE", "true") !== "false";
    this.mlServiceUrl = this.configService.get<string>("ML_SERVICE_URL", "http://localhost:8000");
  }

  async createTryOnRequest(
    userId: string,
    photoId: string,
    itemId: string,
  ): Promise<CreateTryOnResult> {
    this.logger.log("创建试衣请求", { userId, photoId, itemId });

    await this.checkDailyTryonLimit(userId);

    const [photo, item, existingRecord, activeCount] =
      await Promise.all([
        this.prisma.userPhoto.findFirst({
          where: { id: photoId, userId },
          select: { id: true, url: true, type: true },
        }),
        this.prisma.clothingItem.findUnique({
          where: { id: itemId },
          select: { id: true, images: true, category: true, mainImage: true },
        }),
        this.prisma.virtualTryOn.findFirst({
          where: {
            userId,
            photoId,
            itemId,
            status: { in: [TryOnStatus.completed, TryOnStatus.pending, TryOnStatus.processing] },
          },
          select: { id: true, status: true },
          orderBy: [
            { status: 'asc' }, // completed < pending < processing in enum order, prefer completed
          ],
        }),
        this.prisma.virtualTryOn.count({
          where: {
            userId,
            status: { in: [TryOnStatus.pending, TryOnStatus.processing] },
          },
        }),
      ]);

    if (!photo) {
      throw new NotFoundException("照片不存在");
    }

    if (!item) {
      throw new NotFoundException("服装商品不存在");
    }

    // Auto-enhance photo if quality is below threshold
    if (this.autoEnhance && photo.url) {
      try {
        const enhancedUrl = await this.checkAndEnhancePhoto(photo.url);
        if (enhancedUrl) {
          photo.url = enhancedUrl;
        }
      } catch (error) {
        this.logger.warn("照片自动增强失败，使用原始照片", {
          photoId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (existingRecord) {
      if (existingRecord.status === TryOnStatus.completed) {
        this.logger.log("返回缓存的试衣结果", {
          tryOnId: existingRecord.id,
          userId,
          photoId,
          itemId,
        });
        return {
          id: existingRecord.id,
          status: existingRecord.status,
          estimatedWaitTime: 0,
        };
      }

      // pending or processing
      this.logger.log("试衣请求正在处理中", {
        tryOnId: existingRecord.id,
        userId,
        status: existingRecord.status,
      });
      return {
        id: existingRecord.id,
        status: existingRecord.status,
        estimatedWaitTime: 30,
      };
    }

    if (activeCount >= MAX_CONCURRENT_TRYONS_PER_USER) {
      throw new BadRequestException(
        `您已有 ${activeCount} 个试衣任务正在处理中，请等待完成后再试`,
      );
    }

    const stableCacheKey = generateStableCacheKey(photoId, itemId, item.category);
    const cachedResult = await this.redis.get(stableCacheKey);
    if (cachedResult) {
      const cached = JSON.parse(cachedResult) as { resultImageUrl: string };
      const tryOn = await this.prisma.virtualTryOn.create({
        data: {
          userId,
          photoId,
          itemId,
          status: TryOnStatus.completed,
          resultImageUrl: cached.resultImageUrl,
          completedAt: new Date(),
          provider: "cache",
        },
      });
      this.logger.log("Redis缓存命中，直接返回结果", {
        tryOnId: tryOn.id,
        userId,
        photoId,
        itemId,
      });
      return {
        id: tryOn.id,
        status: TryOnStatus.completed,
        estimatedWaitTime: 0,
      };
    }

    const tryOn = await this.prisma.virtualTryOn.create({
      data: {
        userId,
        photoId,
        itemId,
        status: TryOnStatus.pending,
      },
    });

    this.logger.log("试衣请求已创建，加入BullMQ队列", {
      tryOnId: tryOn.id,
      userId,
      photoId,
      itemId,
    });

    const clothingImageUrl = item.mainImage || (item.images?.[0]) || "";
    if (!clothingImageUrl) {
      throw new BadRequestException("服装商品缺少展示图片");
    }

    await this.queueService.addVirtualTryOnTask(
      userId,
      photoId,
      itemId,
      item.category ?? undefined,
    );

    await this.incrementDailyTryonCount(userId);

    await this.notificationService.sendCustomNotification(userId, {
      type: "system",
      title: "试衣任务已排队",
      message: "您的虚拟试衣任务已提交，正在排队处理",
      data: { tryOnId: tryOn.id, status: "queued" },
    });

    return {
      id: tryOn.id,
      status: tryOn.status,
      estimatedWaitTime: 45,
    };
  }

  async getTryOnStatus(tryOnId: string, userId: string) {
    const tryOn = await this.prisma.virtualTryOn.findFirst({
      where: { id: tryOnId, userId },
      include: {
        photo: true,
        item: true,
      },
    });

    if (!tryOn) {
      throw new NotFoundException("试衣记录不存在");
    }

    return this.attachResultDataUri(tryOn);
  }

  async getTryOnResultAsset(tryOnId: string, userId: string): Promise<{
    body: Buffer;
    contentType: string;
    cacheControl: string;
  }> {
    const tryOn = await this.prisma.virtualTryOn.findFirst({
      where: { id: tryOnId, userId },
      select: { resultImageUrl: true },
    });

    if (!tryOn) {
      throw new NotFoundException("试衣记录不存在");
    }

    if (!tryOn.resultImageUrl) {
      throw new NotFoundException("试衣结果图不存在");
    }

    return this.storage.fetchRemoteAsset(tryOn.resultImageUrl);
  }

  async getShareImageAsset(tryOnId: string, userId: string): Promise<{
    body: Buffer;
    contentType: string;
    cacheControl: string;
  }> {
    const tryOn = await this.prisma.virtualTryOn.findFirst({
      where: { id: tryOnId, userId },
      select: { resultImageUrl: true, watermarkedImageUrl: true },
    });

    if (!tryOn) {
      throw new NotFoundException("试衣记录不存在");
    }

    const imageUrl = tryOn.watermarkedImageUrl || tryOn.resultImageUrl;
    if (!imageUrl) {
      throw new NotFoundException("分享图不存在");
    }

    return this.storage.fetchRemoteAsset(imageUrl);
  }

  /**
   * Archive a completed try-on result to the user's inspiration wardrobe.
   * Called after try-on completion.
   */
  async archiveToInspirationWardrobe(
    tryOnId: string,
    userId: string,
  ): Promise<void> {
    try {
      const tryOn = await this.prisma.virtualTryOn.findFirst({
        where: { id: tryOnId, userId, status: "completed" },
        select: {
          resultImageUrl: true,
          watermarkedImageUrl: true,
          itemId: true,
          photoId: true,
        },
      });

      if (!tryOn?.resultImageUrl) {
        return;
      }

      const imageUrl = tryOn.watermarkedImageUrl || tryOn.resultImageUrl;

      // Find or create an "AI试衣效果" collection in wardrobe
      const existingCollection = await this.prisma.wardrobeCollection.findFirst({
        where: { userId, name: "AI试衣效果" },
      });

      let collectionId: string;
      if (existingCollection) {
        collectionId = existingCollection.id;
      } else {
        const newCollection = await this.prisma.wardrobeCollection.create({
          data: {
            userId,
            name: "AI试衣效果",
            icon: "sparkles",
            isDefault: false,
          },
        });
        collectionId = newCollection.id;
      }

      // Check if this try-on is already archived
      const existingItem = await this.prisma.wardrobeCollectionItem.findFirst({
        where: {
          collectionId,
          itemType: "try_on",
          itemId: tryOnId,
        },
      });

      if (existingItem) {
        return;
      }

      await this.prisma.wardrobeCollectionItem.create({
        data: {
          userId,
          collectionId,
          itemType: "try_on",
          itemId: tryOnId,
        },
      });

      this.logger.log("试衣结果已归档到灵感衣橱", { tryOnId, userId });
    } catch (error) {
      this.logger.warn("归档到灵感衣橱失败", {
        tryOnId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getUserTryOnHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: TryOnStatus,
    category?: string,
    scene?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }
    if (scene) {
      where.scene = scene;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as any).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.createdAt as any).lte = new Date(dateTo);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.virtualTryOn.findMany({
        where,
        select: {
          id: true,
          status: true,
          resultImageUrl: true,
          createdAt: true,
          completedAt: true,
          photo: {
            select: { id: true, thumbnailUrl: true, type: true },
          },
          item: {
            select: { id: true, name: true, images: true, price: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.virtualTryOn.count({ where }),
    ]);

    const itemsWithDataUri = await Promise.all(
      items.map((item: any) => this.attachResultDataUri(item)),
    );

    return {
      items: itemsWithDataUri,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteTryOn(tryOnId: string, userId: string): Promise<void> {
    const tryOn = await this.prisma.virtualTryOn.findFirst({
      where: { id: tryOnId, userId },
      select: { id: true, resultImageUrl: true },
    });

    if (!tryOn) {
      throw new NotFoundException("试衣记录不存在");
    }

    if (tryOn.resultImageUrl) {
      try {
        await this.storage.delete(tryOn.resultImageUrl);
        this.logger.debug("已删除MinIO结果图片", { tryOnId, url: tryOn.resultImageUrl });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn("删除MinIO结果图片失败", { tryOnId, error: msg });
      }
    }

    await this.prisma.virtualTryOn.delete({
      where: { id: tryOnId },
    });
  }

  async retryTryOn(
    tryOnId: string,
    userId: string,
  ): Promise<CreateTryOnResult> {
    const original = await this.prisma.virtualTryOn.findFirst({
      where: { id: tryOnId, userId },
    });

    if (!original) {
      throw new NotFoundException("试衣记录不存在");
    }

    await this.checkDailyTryonLimit(userId);

    const retryCount = (original.retryCount ?? 0) + 1;

    const tryOn = await this.prisma.virtualTryOn.create({
      data: {
        userId,
        photoId: original.photoId,
        itemId: original.itemId,
        status: TryOnStatus.pending,
        category: original.category,
        scene: original.scene,
        parentTryOnId: original.id,
        retryCount,
      },
    });

    const item = await this.prisma.clothingItem.findUnique({
      where: { id: original.itemId },
      select: { category: true, mainImage: true, images: true },
    });

    const clothingImageUrl =
      item?.mainImage || (item?.images?.[0]) || "";

    await this.queueService.addVirtualTryOnTask(
      userId,
      original.photoId,
      original.itemId,
      item?.category ?? undefined,
    );

    await this.incrementDailyTryonCount(userId);

    return {
      id: tryOn.id,
      status: tryOn.status,
      estimatedWaitTime: 45,
    };
  }

  async getDailyQuota(userId: string): Promise<{
    used: number;
    limit: number;
    remaining: number;
  }> {
    const used = await this.getDailyRetryCount(userId);
    return {
      used,
      limit: DAILY_TRYON_LIMIT,
      remaining: Math.max(0, DAILY_TRYON_LIMIT - used),
    };
  }

  private getDailyRetryKey(userId: string): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `${DAILY_RETRY_KEY_PREFIX}:${userId}:${today}`;
  }

  private async getDailyRetryCount(userId: string): Promise<number> {
    const key = this.getDailyRetryKey(userId);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  private async checkDailyTryonLimit(userId: string): Promise<void> {
    const used = await this.getDailyRetryCount(userId);
    if (used >= DAILY_TRYON_LIMIT) {
      throw new BadRequestException(
        "今日免费试衣次数已用完，明天再来吧",
      );
    }
  }

  private async incrementDailyTryonCount(userId: string): Promise<void> {
    const key = this.getDailyRetryKey(userId);
    const now = new Date();
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const ttlSeconds = Math.floor(
      (endOfDay.getTime() - now.getTime()) / 1000,
    );

    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    if (ttlSeconds > 0) {
      pipeline.expire(key, ttlSeconds);
    }
    await pipeline.exec();
  }

  private async attachResultDataUri<T extends { resultImageUrl?: string | null }>(
    tryOn: T,
  ): Promise<T & { resultImageDataUri?: string | null }> {
    if (!tryOn.resultImageUrl) {
      return {
        ...tryOn,
        resultImageDataUri: null,
      };
    }

    try {
      return {
        ...tryOn,
        resultImageDataUri: await this.storage.fetchRemoteAssetDataUri(
          tryOn.resultImageUrl,
        ),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to build inline try-on result asset: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        ...tryOn,
        resultImageDataUri: null,
      };
    }
  }

  /**
   * Check photo quality via ML service and enhance if below threshold.
   * Returns enhanced photo URL or null if no enhancement needed/failed.
   */
  private async checkAndEnhancePhoto(photoUrl: string): Promise<string | null> {
    try {
      // Step 1: Analyze quality
      const analyzeResponse = await axios.post(
        `${this.mlServiceUrl}/api/photo-quality/analyze`,
        { image_url: photoUrl },
        { timeout: 10000 },
      );

      const qualityScore = analyzeResponse.data?.data?.overall_score ?? 1.0;

      if (qualityScore >= 0.6 * 100) {
        // Quality is acceptable (score is 0-100 scale, threshold at 60)
        return null;
      }

      this.logger.log("Photo quality below threshold, enhancing", {
        qualityScore,
        threshold: 60,
      });

      // Step 2: Enhance the photo
      const enhanceResponse = await axios.post(
        `${this.mlServiceUrl}/api/photo-quality/enhance`,
        { image_url: photoUrl },
        { timeout: 30000 },
      );

      const enhancedBase64 = enhanceResponse.data?.data?.image_base64;
      if (!enhancedBase64) {
        this.logger.warn("Enhancement returned no image data");
        return null;
      }

      // Step 3: Upload enhanced image to storage
      const imageBuffer = Buffer.from(enhancedBase64, "base64");
      const upload = await this.storage.uploadImage(
        {
          fieldname: "file",
          originalname: `enhanced-${Date.now()}.jpg`,
          encoding: "7bit",
          mimetype: "image/jpeg",
          buffer: imageBuffer,
          size: imageBuffer.length,
        },
        "enhanced-photos",
      );

      this.logger.log("Photo enhanced and uploaded", {
        enhancedUrl: upload.url,
        originalScore: qualityScore,
      });

      return upload.url;
    } catch (error) {
      this.logger.warn("Photo quality check/enhance failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
