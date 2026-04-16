import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../../../../common/redis/redis.service";

export interface UserItemInteraction {
  userId: string;
  itemId: string;
  rating: number;
  timestamp: Date;
}

export interface SimilarityScore {
  targetId: string;
  score: number;
}

export interface RecommendationResult {
  itemId: string;
  score: number;
  reasons: string[];
  confidence: number;
}

@Injectable()
export class CollaborativeFilteringService {
  private readonly logger = new Logger(CollaborativeFilteringService.name);
  private readonly CACHE_TTL = 3600;
  private readonly MIN_INTERACTIONS = 5;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getSimilarUsers(
    userId: string,
    topK: number = 20,
  ): Promise<Array<{ similarUserId: string; similarity: number }>> {
    try {
      const results = await this.prisma.$queryRaw<
        Array<{ similar_user_id: string; similarity: number }>
      >`
        SELECT similar_user_id, similarity
        FROM mv_user_similarity
        WHERE user_id = ${userId}
        ORDER BY similarity DESC
        LIMIT ${topK}
      `;
      return results.map((r) => ({
        similarUserId: r.similar_user_id,
        similarity: Number(r.similarity),
      }));
    } catch (error) {
      this.logger.warn(`mv_user_similarity query failed: ${error}`);
      return [];
    }
  }

  async getRecommendations(
    userId: string,
    topK: number = 10,
  ): Promise<Array<{ itemId: string; score: number }>> {
    const similarUsers = await this.getSimilarUsers(userId, 50);
    if (similarUsers.length === 0) {return [];}

    const userItems = await this.prisma.$queryRaw<
      Array<{ itemId: string }>
    >`
      SELECT "itemId" FROM "UserBehavior" WHERE "userId" = ${userId} AND "itemId" IS NOT NULL
    `;
    const excludeItemIds = userItems.map((r) => r.itemId);

    if (excludeItemIds.length === 0) {
      const candidates = await this.prisma.$queryRaw<
        Array<{ itemId: string; score: number }>
      >`
        SELECT m."itemId",
               SUM(m.implicit_rating * s.similarity) AS score
        FROM mv_user_item_matrix m
        JOIN mv_user_similarity s ON m."userId" = s.similar_user_id
        WHERE s.user_id = ${userId}
        GROUP BY m."itemId"
        ORDER BY score DESC
        LIMIT ${topK}
      `;
      return candidates.map((c) => ({
        itemId: c.itemId,
        score: Number(c.score),
      }));
    }

    const candidates = await this.prisma.$queryRaw<
      Array<{ itemId: string; score: number }>
    >`
      SELECT m."itemId",
             SUM(m.implicit_rating * s.similarity) AS score
      FROM mv_user_item_matrix m
      JOIN mv_user_similarity s ON m."userId" = s.similar_user_id
      WHERE s.user_id = ${userId}
        AND m."itemId" NOT IN (${excludeItemIds})
      GROUP BY m."itemId"
      ORDER BY score DESC
      LIMIT ${topK}
    `;
    return candidates.map((c) => ({ itemId: c.itemId, score: Number(c.score) }));
  }

  async getSimilarItems(
    itemId: string,
    topK: number = 10,
  ): Promise<Array<{ itemId: string; score: number }>> {
    try {
      const results = await this.prisma.$queryRaw<
        Array<{ co_item_id: string; co_count: number }>
      >`
        SELECT co_item_id, co_count
        FROM mv_item_cooccurrence
        WHERE item_id = ${itemId}
        ORDER BY co_count DESC
        LIMIT ${topK}
      `;
      return results.map((r) => ({
        itemId: r.co_item_id,
        score: Number(r.co_count),
      }));
    } catch (error) {
      this.logger.warn(`mv_item_cooccurrence query failed: ${error}`);
      return [];
    }
  }

  async refreshViews(): Promise<void> {
    this.logger.log("Refreshing CF materialized views...");
    try {
      await this.prisma
        .$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_item_matrix`;
      await this.prisma
        .$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_similarity`;
      await this.prisma
        .$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_item_cooccurrence`;
      this.logger.log("CF materialized views refreshed successfully");
    } catch (error) {
      this.logger.warn(`Failed to refresh CF views: ${error}`);
    }
  }

  async trainMatrixFactorizationModel(): Promise<void> {
    await this.refreshViews();
  }

  async getUserBasedRecommendations(
    userId: string,
    options: { limit?: number; excludeViewed?: boolean } = {},
  ): Promise<RecommendationResult[]> {
    const { limit = 20 } = options;

    const cacheKey = `cf:user:${userId}:recommendations`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached).slice(0, limit);
    }

    const recs = await this.getRecommendations(userId, limit);
    if (recs.length === 0) {
      return this.getFallbackRecommendations(userId, limit);
    }

    const results: RecommendationResult[] = recs.map((r) => ({
      itemId: r.itemId,
      score: r.score,
      reasons: ["相似用户喜欢"],
      confidence: Math.min(0.95, 0.3 + r.score * 0.1),
    }));

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));
    return results;
  }

  async getItemBasedRecommendations(
    itemId: string,
    options: { limit?: number } = {},
  ): Promise<RecommendationResult[]> {
    const { limit = 10 } = options;

    const cacheKey = `cf:item:${itemId}:similar`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached).slice(0, limit);
    }

    const similarItems = await this.getSimilarItems(itemId, limit);
    const results: RecommendationResult[] = similarItems
      .filter((item) => item.itemId !== itemId)
      .map((item) => ({
        itemId: item.itemId,
        score: item.score,
        reasons: ["相似商品推荐"],
        confidence: Math.min(0.9, item.score * 0.1),
      }));

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));
    return results;
  }

  async calculatePrediction(userId: string, itemId: string): Promise<number> {
    const recs = await this.getRecommendations(userId, 100);
    const found = recs.find((r) => r.itemId === itemId);
    return found ? found.score : 0;
  }

  async updateUserItemInteraction(
    userId: string,
    itemId: string,
    type: "view" | "like" | "favorite" | "purchase",
  ): Promise<void> {
    await this.redis.del(`cf:user:${userId}:recommendations`);
    this.logger.debug(`Updated interaction: ${userId} -> ${itemId} (${type})`);
  }

  async getMFRecommendations(
    userId: string,
    options: { limit?: number; excludeViewed?: boolean } = {},
  ): Promise<RecommendationResult[]> {
    return this.getUserBasedRecommendations(userId, options);
  }

  async getHybridRecommendations(
    userId: string,
    options: { limit?: number; excludeViewed?: boolean } = {},
  ): Promise<RecommendationResult[]> {
    return this.getUserBasedRecommendations(userId, options);
  }

  private async getFallbackRecommendations(
    userId: string,
    limit: number,
  ): Promise<RecommendationResult[]> {
    const popularItems = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      take: limit,
      select: { id: true },
    });

    return popularItems.map((item) => ({
      itemId: item.id,
      score: 50,
      reasons: ["热门推荐"],
      confidence: 0.3,
    }));
  }
}
