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
import { PrismaService } from "../../common/prisma/prisma.service";
import { REDIS_CLIENT } from "../../common/redis/redis.service";
import { StorageService } from "../../common/storage/storage.service";

import { TryOnOrchestratorService } from "./services/tryon-orchestrator.service";

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

@Injectable()
export class TryOnService {
  private readonly logger: ContextualLogger;

  constructor(
    private prisma: PrismaService,
    private orchestrator: TryOnOrchestratorService,
    private configService: ConfigService,
    private storage: StorageService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    loggingService: StructuredLoggerService,
  ) {
    this.logger = loggingService.createChildLogger(TryOnService.name);
  }

  /**
   * 创建虚拟试衣请求
   */
  async createTryOnRequest(
    userId: string,
    photoId: string,
    itemId: string,
  ): Promise<CreateTryOnResult> {
    this.logger.log("创建试衣请求", { userId, photoId, itemId });

    // 批量查询：照片、商品、已完成的试衣记录、正在处理的试衣记录
    const [photo, item, existingTryOn, pendingTryOn] = await Promise.all([
      this.prisma.userPhoto.findFirst({
        where: { id: photoId, userId },
        select: { id: true, url: true, type: true },
      }),
      this.prisma.clothingItem.findUnique({
        where: { id: itemId },
        select: { id: true, images: true, category: true },
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
    ]);

    if (!photo) {
      throw new NotFoundException("照片不存在");
    }

    if (!item) {
      throw new NotFoundException("服装商品不存在");
    }

    // 检查是否有已完成的相同试衣请求（缓存命中）
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

    // 检查是否有正在处理的相同请求
    if (pendingTryOn) {
      this.logger.log("试衣请求正在处理中", {
        tryOnId: pendingTryOn.id,
        userId,
        status: pendingTryOn.status,
      });
      return {
        id: pendingTryOn.id,
        status: pendingTryOn.status,
        estimatedWaitTime: 30, // 预估等待时间（秒）
      };
    }

    // 创建新的试衣请求
    const tryOn = await this.prisma.virtualTryOn.create({
      data: {
        userId,
        photoId,
        itemId,
        status: TryOnStatus.pending,
      },
    });

    this.logger.log("试衣请求已创建", {
      tryOnId: tryOn.id,
      userId,
      photoId,
      itemId,
    });

    // 异步处理试衣
    const itemImage = item.images[0];
    if (!itemImage) {
      throw new BadRequestException("服装商品缺少展示图片");
    }
    this.processTryOnAsync(tryOn.id, photo.url, itemImage, item.category);

    return {
      id: tryOn.id,
      status: tryOn.status,
      estimatedWaitTime: 45, // 预估等待时间（秒）
    };
  }

  /**
   * 获取试衣状态和结果
   */
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
      throw new NotFoundException("璇曡。璁板綍涓嶅瓨鍦?");
    }

    if (!tryOn.resultImageUrl) {
      throw new NotFoundException("璇曠┛缁撴灉鍥句笉瀛樺湪");
    }

    return this.storage.fetchRemoteAsset(tryOn.resultImageUrl);
  }

  /**
   * 获取用户试衣历史 - 优化版
   * 使用数据库级别的聚合和窗口函数，减少内存计算
   */
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

    // 批量处理所有 attachResultDataUri 操作
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

  /**
   * 删除试衣记录
   */
  async deleteTryOn(tryOnId: string, userId: string): Promise<void> {
    const tryOn = await this.prisma.virtualTryOn.findFirst({
      where: { id: tryOnId, userId },
    });

    if (!tryOn) {
      throw new NotFoundException("试衣记录不存在");
    }

    await this.prisma.virtualTryOn.delete({
      where: { id: tryOnId },
    });
  }

  /**
   * 异步处理试衣请求
   */
  private async processTryOnAsync(
    tryOnId: string,
    userPhotoUrl: string,
    clothingImageUrl: string,
    category?: string,
  ): Promise<void> {
    try {
      // 更新状态为处理中
      await this.prisma.virtualTryOn.update({
        where: { id: tryOnId },
        data: { status: TryOnStatus.processing },
      });

      // 发布状态更新事件
      await this.publishStatusUpdate(tryOnId, TryOnStatus.processing);

      // 调用试衣编排器
      const result = await this.orchestrator.executeTryOn({
        personImageUrl: userPhotoUrl,
        garmentImageUrl: clothingImageUrl,
        category: this.mapCategory(category),
      });

      // 更新试衣结果
      await this.prisma.virtualTryOn.update({
        where: { id: tryOnId },
        data: {
          status: TryOnStatus.completed,
          resultImageUrl: result.resultImageUrl,
          completedAt: new Date(),
        },
      });

      // 发布完成事件
      await this.publishStatusUpdate(
        tryOnId,
        TryOnStatus.completed,
        result.resultImageUrl,
      );

      this.logger.log("试衣处理完成", {
        tryOnId,
        provider: result.provider,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("试衣处理失败", error instanceof Error ? error.stack : undefined, {
        tryOnId,
        error: errorMessage,
      });

      // 更新失败状态
      await this.prisma.virtualTryOn.update({
        where: { id: tryOnId },
        data: {
          status: TryOnStatus.failed,
          errorMessage: errorMessage,
        },
      });

      // 发布失败事件
      await this.publishStatusUpdate(
        tryOnId,
        TryOnStatus.failed,
        null,
        errorMessage,
      );
    }
  }

  /**
   * 发布状态更新到 Redis
   */
  private async publishStatusUpdate(
    tryOnId: string,
    status: TryOnStatus,
    resultImageUrl?: string | null,
    error?: string,
  ): Promise<void> {
    try {
      await this.redis.publish(
        "tryon:status",
        JSON.stringify({
          tryOnId,
          status,
          resultImageUrl,
          error,
          timestamp: new Date().toISOString(),
        }),
      );
      this.logger.debug("试衣状态已发布", { tryOnId, status });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn("发布试衣状态失败", { tryOnId, error: errorMessage });
    }
  }

  /**
   * 映射服装类别到试衣 API 格式
   */
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

  private mapCategory(
    category?: string,
  ): "upper_body" | "lower_body" | "full_body" | "dress" {
    const categoryMap: Record<
      string,
      "upper_body" | "lower_body" | "full_body" | "dress"
    > = {
      tops: "upper_body",
      shirts: "upper_body",
      jackets: "upper_body",
      pants: "lower_body",
      jeans: "lower_body",
      skirts: "lower_body",
      shorts: "lower_body",
      dresses: "dress",
      jumpsuits: "full_body",
      suits: "full_body",
    };

    return categoryMap[category?.toLowerCase() || ""] || "upper_body";
  }
}
