import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TryOnStatus, Prisma } from "@prisma/client";
import Redis from "ioredis";

import { StructuredLoggerService, ContextualLogger } from "../../common/logging";
import { NotificationService } from "../../common/gateway/notification.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { REDIS_CLIENT } from "../../common/redis/redis.service";
import { StorageService } from "../../common/storage/storage.service";
import { QueueService } from "../queue/queue.service";

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

@Injectable()
export class TryOnService {
  private readonly logger: ContextualLogger;

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
  }

  async createTryOnRequest(
    userId: string,
    photoId: string,
    itemId: string,
  ): Promise<CreateTryOnResult> {
    this.logger.log("创建试衣请求", { userId, photoId, itemId });

    const [photo, item, existingTryOn, pendingTryOn, activeCount] =
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
            status: TryOnStatus.completed,
          },
          select: { id: true, status: true },
        }),
        this.prisma.virtualTryOn.findFirst({
          where: {
            userId,
            photoId,
            itemId,
            status: { in: [TryOnStatus.pending, TryOnStatus.processing] },
          },
          select: { id: true, status: true },
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

    if (existingTryOn) {
      this.logger.log("返回缓存的试衣结果", {
        tryOnId: existingTryOn.id,
        userId,
        photoId,
        itemId,
      });
      return {
        id: existingTryOn.id,
        status: existingTryOn.status,
        estimatedWaitTime: 0,
      };
    }

    if (pendingTryOn) {
      this.logger.log("试衣请求正在处理中", {
        tryOnId: pendingTryOn.id,
        userId,
        status: pendingTryOn.status,
      });
      return {
        id: pendingTryOn.id,
        status: pendingTryOn.status,
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

    const clothingImageUrl = item.mainImage || item.images[0];
    if (!clothingImageUrl) {
      throw new BadRequestException("服装商品缺少展示图片");
    }

    await this.queueService.addVirtualTryOnTask(
      userId,
      photoId,
      itemId,
      item.category ?? undefined,
    );

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

  async getUserTryOnHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: TryOnStatus,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.VirtualTryOnWhereInput = { userId };
    if (status) {
      where.status = status;
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
      items.map((item) => this.attachResultDataUri(item)),
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
}
