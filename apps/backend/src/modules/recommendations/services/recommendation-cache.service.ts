import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

export interface CachedRecommendation {
  id: string;
  userId: string;
  category: string;
  subCategory: string | null;
  results: unknown[];
  version: string;
  expiresAt: Date;
}

@Injectable()
export class RecommendationCacheService {
  private readonly logger = new Logger(RecommendationCacheService.name);
  private readonly DEFAULT_TTL_MS = 30 * 60 * 1000;

  constructor(private prisma: PrismaService) {}

  async get(
    userId: string,
    category: string,
    subCategory?: string,
    version: string = "v1",
  ): Promise<CachedRecommendation | null> {
    const cache = await this.prisma.recommendationCache.findFirst({
      where: {
        userId,
        category,
        subCategory: subCategory ?? null,
        version,
        expiresAt: { gt: new Date() },
      },
    });

    if (!cache) {return null;}

    return {
      id: cache.id,
      userId: cache.userId,
      category: cache.category,
      subCategory: cache.subCategory,
      results: cache.results as unknown[],
      version: cache.version,
      expiresAt: cache.expiresAt,
    };
  }

  async set(
    userId: string,
    category: string,
    results: unknown[],
    options: {
      subCategory?: string;
      version?: string;
      ttlMs?: number;
    } = {},
  ): Promise<CachedRecommendation> {
    const { subCategory, version = "v1", ttlMs = this.DEFAULT_TTL_MS } = options;
    const expiresAt = new Date(Date.now() + ttlMs);

    const cache = await this.prisma.recommendationCache.upsert({
      where: {
        userId_category_subCategory_version: {
          userId,
          category,
          subCategory: subCategory ?? "",
          version,
        },
      },
      update: {
        results: results as unknown as Prisma.InputJsonValue,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        userId,
        category,
        subCategory,
        results: results as unknown as Prisma.InputJsonValue,
        version,
        expiresAt,
      },
    });

    return {
      id: cache.id,
      userId: cache.userId,
      category: cache.category,
      subCategory: cache.subCategory,
      results: cache.results as unknown[],
      version: cache.version,
      expiresAt: cache.expiresAt,
    };
  }

  async invalidate(
    userId: string,
    category?: string,
  ): Promise<number> {
    const where: Record<string, unknown> = { userId };
    if (category) {
      where.category = category;
    }

    const result = await this.prisma.recommendationCache.deleteMany({ where });
    this.logger.log(
      `Invalidated ${result.count} cache entries for user ${userId}${category ? ` category ${category}` : ""}`,
    );
    return result.count;
  }

  async cleanup(): Promise<number> {
    const result = await this.prisma.recommendationCache.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    this.logger.log(`Cleaned up ${result.count} expired cache entries`);
    return result.count;
  }
}
