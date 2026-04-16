/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";

import { ColdStartService } from "./cold-start.service";
import { ColorMatchingService } from "./color-matching.service";
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
    private colorMatching: ColorMatchingService,
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
      const engineResults = await this.engine.getRecommendations({
        userId,
        context: { occasion: subCategory },
        options: { limit: pageSize * 2 },
      });
      recommendations = engineResults.map((r) => ({
        itemId: r.item.id,
        score: r.score,
        reasons: r.reasons,
      }));
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
    if (recommendations.length === 0) {return [];}

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
      if (!item) {continue;}

      const attrs = item.attributes as Record<string, unknown> | null;
      const itemColors = (
        (attrs?.colors as string[]) || [attrs?.primaryColor as string].filter(Boolean)
      );

      const colorHarmonyScore = this.calculateColorHarmony(itemColors, userProfile);

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
        mainImage: item.mainImage ?? "",
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

  /**
   * Calculate color harmony score using CIEDE2000 color difference.
   * Compares item colors against user's color season / preferred colors.
   * Returns 0-100 score.
   */
  private calculateColorHarmony(
    itemColors: string[],
    userProfile: Record<string, unknown> | null,
  ): number {
    if (!itemColors || itemColors.length === 0) {
      return 65;
    }

    const userColors = (
      (userProfile?.colorPreferences as string[]) || []
    ).filter(Boolean);
    const colorSeason = userProfile?.colorSeason as string | undefined;

    if (userColors.length === 0 && !colorSeason) {
      return 65;
    }

    let totalScore = 0;
    let comparisons = 0;

    for (const itemColor of itemColors.slice(0, 3)) {
      try {
        const itemRgb = this.colorMatching.hexToRgb(itemColor);

        if (userColors.length > 0) {
          for (const prefColor of userColors.slice(0, 3)) {
            try {
              const prefRgb = this.colorMatching.hexToRgb(prefColor);
              const itemLab = this.colorMatching.rgbToLab(itemRgb);
              const prefLab = this.colorMatching.rgbToLab(prefRgb);
              const delta = this.colorMatching.deltaE2000(itemLab, prefLab);
              const score = Math.max(0, Math.min(100, 100 - delta * 2));
              totalScore += score;
              comparisons++;
            } catch {
              // skip invalid hex
            }
          }
        }

        if (colorSeason) {
          const seasonColors = this.getSeasonColors(colorSeason);
          for (const seasonColor of seasonColors) {
            try {
              const seasonRgb = this.colorMatching.hexToRgb(seasonColor);
              const itemLab = this.colorMatching.rgbToLab(itemRgb);
              const seasonLab = this.colorMatching.rgbToLab(seasonRgb);
              const delta = this.colorMatching.deltaE2000(itemLab, seasonLab);
              const score = Math.max(0, Math.min(100, 100 - delta * 2));
              totalScore += score;
              comparisons++;
            } catch {
              // skip invalid hex
            }
          }
        }
      } catch {
        // skip invalid item color hex
      }
    }

    if (comparisons === 0) {
      return 65;
    }

    return Math.round(Math.max(30, Math.min(98, totalScore / comparisons)));
  }

  private getSeasonColors(season: string): string[] {
    const seasonMap: Record<string, string[]> = {
      spring_warm: ["#E8A87C", "#D4A574", "#85CDCA", "#E27D60", "#C38D9E"],
      spring_light: ["#F8B500", "#FFDDD2", "#B5EAD7", "#E2F0CB", "#FFDAC1"],
      summer_cool: ["#7EC8E3", "#A7BEAE", "#B8B8D1", "#D5C4A1", "#92A9BD"],
      summer_light: ["#C9CCD5", "#E8D5B7", "#B8D4E3", "#CAE1CE", "#D4C5E2"],
      autumn_warm: ["#BC6C25", "#DDA15E", "#606C38", "#9B2226", "#BB3E03"],
      autumn_deep: ["#6B2737", "#3D405B", "#5F0F40", "#9A031E", "#4F6D7A"],
      winter_cool: ["#003049", "#D62828", "#1B4965", "#5FA8D3", "#000000"],
      winter_deep: ["#1A1A2E", "#16213E", "#0F3460", "#E94560", "#533483"],
    };
    return seasonMap[season] || seasonMap.spring_warm || [];
  }
}
