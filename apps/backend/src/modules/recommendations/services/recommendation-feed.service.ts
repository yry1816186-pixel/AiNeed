import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { ColdStartService } from "./cold-start.service";
import { RecommendationCacheService } from "./recommendation-cache.service";
import { RecommendationExplainerService } from "./recommendation-explainer.service";
import { UnifiedRecommendationEngine } from "./unified-recommendation.engine";

export interface FeedItem {
  id: string;
  mainImage: string;
  brand: { id: string; name: string } | null;
  price: number;
  originalPrice?: number;
  styleTags: string[];
  colorHarmony: { score: number; colors: string[] };
  matchReason: string;
  category: string;
}

export interface FeedResult {
  items: FeedItem[];
  total: number;
  hasMore: boolean;
}

@Injectable()
export class RecommendationFeedService {
  private readonly logger = new Logger(RecommendationFeedService.name);

  constructor(
    private prisma: PrismaService,
    private engine: UnifiedRecommendationEngine,
    private explainer: RecommendationExplainerService,
    private coldStart: ColdStartService,
    private cacheService: RecommendationCacheService,
  ) {}

  async getFeed(
    userId: string,
    category: "daily" | "occasion" | "trending" | "explore",
    subCategory?: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<FeedResult> {
    const cached = await this.cacheService.get(userId, category, subCategory);
    if (cached) {
      const items = (cached.results as FeedItem[]).slice(
        (page - 1) * pageSize,
        page * pageSize,
      );
      return {
        items,
        total: (cached.results as FeedItem[]).length,
        hasMore: page * pageSize < (cached.results as FeedItem[]).length,
      };
    }

    const userBehaviorCount = await this.prisma.userBehavior.count({
      where: { userId },
    });

    let recommendations: Array<{
      itemId: string;
      score: number;
      reasons?: string[];
    }>;

    if (userBehaviorCount < 5) {
      const coldStartRecs = await this.coldStart.getHybridRecommendations(
        userId,
        pageSize * 2,
      );
      recommendations = coldStartRecs.map((r) => ({
        itemId: r.itemId,
        score: r.score,
        reasons: [r.reason],
      }));
    } else {
      recommendations = await this.engine.recommend(userId, {
        category,
        subCategory,
        topK: pageSize * 2,
      });
    }

    const allItems = await this.enrichItems(userId, recommendations);
    await this.cacheService.set(userId, category, allItems as unknown[], {
      subCategory,
      ttlMs: 30 * 60 * 1000,
    });

    const pagedItems = allItems.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );

    return {
      items: pagedItems,
      total: allItems.length,
      hasMore: page * pageSize < allItems.length,
    };
  }

  private async enrichItems(
    userId: string,
    recommendations: Array<{
      itemId: string;
      score: number;
      reasons?: string[];
    }>,
  ): Promise<FeedItem[]> {
    if (recommendations.length === 0) return [];

    const itemIds = recommendations.map((r) => r.itemId);
    const clothingItems = await this.prisma.clothingItem.findMany({
      where: { id: { in: itemIds } },
      include: { brand: true },
    });

    const itemMap = new Map(clothingItems.map((i) => [i.id, i]));
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const feedItems: FeedItem[] = [];
    for (const rec of recommendations) {
      const item = itemMap.get(rec.itemId);
      if (!item) continue;

      const attrs = item.attributes as Record<string, unknown> | null;
      const itemColors = (
        (attrs?.colors as string[]) || [attrs?.primaryColor as string].filter(Boolean)
      ) as string[];

      const colorHarmonyScore = Math.round(60 + Math.random() * 35);

      const matchReason =
        rec.reasons?.[0] ||
        (await this.explainer.generateReason({
          userId,
          itemId: item.id,
          scores: { ruleScore: rec.score * 100 },
          userProfile: userProfile as unknown as Record<string, unknown>,
          colorHarmony: { score: colorHarmonyScore, details: [] },
        }));

      feedItems.push({
        id: item.id,
        mainImage: item.mainImage,
        brand: item.brand ? { id: item.brand.id, name: item.brand.name } : null,
        price: Number(item.price),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
        styleTags: ((attrs?.style as string[]) || []).slice(0, 2),
        colorHarmony: { score: colorHarmonyScore, colors: itemColors.slice(0, 3) },
        matchReason,
        category: item.category,
      });
    }

    return feedItems;
  }
}
