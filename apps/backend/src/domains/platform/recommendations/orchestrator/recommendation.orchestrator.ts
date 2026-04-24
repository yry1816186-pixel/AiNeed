import { Injectable, Logger, Optional } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { CacheKeyBuilder, CACHE_TTL } from "../../../../modules/cache/cache.constants";
import { CacheService } from "../../../../modules/cache/cache.service";
import { ClothingCategory } from "../../../../types/prisma-enums";
import { AdvancedRecommendationService } from "../services/advanced-recommendation.service";
import {
  BehaviorTrackingService,
  type BehaviorAction,
} from "../services/behavior-tracking.service";
import { ColdStartService } from "../services/cold-start.service";
import { ColorMatchingService } from "../services/color-matching.service";
import { GoldenRecommendationService } from "../services/golden-recommendation.service";
import { MatchingTheoryService } from "../services/matching-theory.service";
import { OutfitCompletionService } from "../services/outfit-completion.service";
import { PreferenceLearningService } from "../services/preference-learning.service";
import { QdrantService } from "../services/qdrant.service";
import { RecommendationExplainerService } from "../services/recommendation-explainer.service";
import { RecommendationFeedService } from "../services/recommendation-feed.service";
import { RuleEngineService } from "../services/rule-engine.service";
import { SASRecService } from "../services/sasrec.service";
import type { FeatureFlagService } from "../../feature-flags/feature-flag.service";

export interface ScoreWeights {
  rule: number;
  vector: number;
  preference: number;
}

export interface RecommendationRequest {
  userId: string;
  context?: {
    occasion?: string;
    season?: string;
    weather?: string;
    baseItemId?: string;
  };
  options?: {
    limit?: number;
    category?: ClothingCategory;
    minPrice?: number;
    maxPrice?: number;
    includeReasons?: boolean;
    scoreWeights?: ScoreWeights;
  };
}

export interface RecommendationItemData {
  id: string;
  name: string;
  price: number;
  category: string;
  images: string[];
  brand?: {
    id: string;
    name: string;
    logo?: string | null;
  } | null;
}

export interface RecommendationResult {
  item: RecommendationItemData;
  score: number;
  sources: string[];
  reasons: string[];
  experimentId?: string;
  explanation?: {
    why: string;
    alternative: string;
    nextAction: string;
    confidence: number;
  };
  breakdown?: {
    totalCandidates: number;
    afterSceneFilter: number;
    afterSizeFilter: number;
    afterBudgetFilter: number;
    ruleScore: number;
    vectorScore: number;
    preferenceScore: number;
    finalScore: number;
  };
}

export interface OutfitRecommendation {
  tops?: RecommendationResult[];
  bottoms?: RecommendationResult[];
  accessories?: RecommendationResult[];
  footwear?: RecommendationResult[];
  outerwear?: RecommendationResult[];
  overallScore: number;
}

export type RecommendationAlgorithm = "unified" | "hybrid";

interface FunnelCandidate {
  id: string;
  name: string;
  price: number;
  category: string;
  images: string[];
  colors: string[];
  sizes: string[];
  tags: string[];
  material: string | null;
  attributes: Record<string, unknown> | null;
  brand: { id: string; name: string; logo: string | null } | null;
  viewCount: number;
  likeCount: number;
}

interface ScoredCandidate {
  candidate: FunnelCandidate;
  ruleScore: number;
  vectorScore: number;
  preferenceScore: number;
  finalScore: number;
  matchedRules: string[];
  avoidHits: string[];
  sources: string[];
  reasons: string[];
}

const SCENE_OCCASION_MAP: Record<string, string[]> = {
  interview: ["interview", "work", "business"],
  date: ["date", "romantic", "elegant"],
  travel: ["travel", "casual", "comfortable"],
  seasonal: ["spring", "summer", "autumn", "winter"],
  bodypositive: ["casual", "comfortable", "inclusive"],
  career: ["work", "business", "professional", "smart-casual"],
  daily: ["daily", "casual", "comfortable"],
  work: ["work", "business", "smart-casual"],
  party: ["party", "trendy", "glamorous"],
  campus: ["campus", "casual", "youthful"],
  workout: ["workout", "athletic", "sporty"],
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL", "5XL"];

@Injectable()
export class RecommendationOrchestrator {
  private readonly logger = new Logger(RecommendationOrchestrator.name);

  private readonly COLD_START_THRESHOLD = 10;

  private readonly SCORE_WEIGHTS = {
    rule: 0.4,
    vector: 0.35,
    preference: 0.25,
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
    private readonly advancedRecommendation: AdvancedRecommendationService,
    private readonly coldStart: ColdStartService,
    private readonly preferenceLearning: PreferenceLearningService,
    private readonly qdrantService: QdrantService,
    private readonly colorMatching: ColorMatchingService,
    private readonly sasrec: SASRecService,
    private readonly matchingTheory: MatchingTheoryService,
    private readonly ruleEngine: RuleEngineService,
    private readonly explainer: RecommendationExplainerService,
    private readonly feedService: RecommendationFeedService,
    private readonly outfitCompletionService: OutfitCompletionService,
    private readonly goldenRecommendationService: GoldenRecommendationService,
    private readonly behaviorTrackingService: BehaviorTrackingService,
    @Optional() private readonly featureFlagService: FeatureFlagService | null
  ) {}

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult[]> {
    const { userId, context, options } = request;
    const limit = options?.limit || 20;

    const cacheKey = CacheKeyBuilder.outfitRecommendations(userId, {
      algorithm: "unified",
      category: options?.category,
      occasion: context?.occasion,
      season: context?.season,
      limit,
    });

    return this.cacheService
      .getOrSet(
        cacheKey,
        async () => {
          const isColdStart = await this.isColdStartUser(userId);

          if (isColdStart) {
            return this.getColdStartRecommendations(request);
          }

          return this.recommend(request);
        },
        CACHE_TTL.OUTFIT_RECOMMENDATIONS
      )
      .then((result) => result ?? []);
  }

  async recommend(request: RecommendationRequest): Promise<RecommendationResult[]> {
    const { userId, context, options } = request;
    const limit = options?.limit || 20;

    const scene = context?.occasion || "daily";

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    try {
      const allItems = await this.fetchAllCandidates(options?.category);
      const totalCandidates = allItems.length;

      const sceneFiltered = this.filterByScene(allItems, scene);
      const afterSceneFilter = sceneFiltered.length;

      const sizeFiltered = this.filterBySize(sceneFiltered, profile);
      const afterSizeFilter = sizeFiltered.length;

      const budgetFiltered = this.filterByBudget(sizeFiltered, profile, options);
      const afterBudgetFilter = budgetFiltered.length;

      const ruleScored = await this.scoreByRules(budgetFiltered, profile, context);
      const vectorScored = await this.scoreByVector(ruleScored, profile, context);
      const finalScored = await this.applyPreferenceLearning(vectorScored, userId);

      const fused = this.fuseAndExplain(finalScored, limit, options?.scoreWeights);

      const { experimentId } = await this.assignExperimentVariant(userId);

      return fused.map((sc) =>
        this.toRecommendationResult(sc, {
          totalCandidates,
          afterSceneFilter,
          afterSizeFilter,
          afterBudgetFilter,
          experimentId,
        })
      );
    } catch (error) {
      this.logger.warn(
        `AI pipeline unavailable, falling back to rule engine: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
      return this.degradedPipeline(request);
    }
  }

  async getOutfitRecommendations(
    userId: string,
    baseItemId: string,
    options?: { occasion?: string; limit?: number }
  ): Promise<OutfitRecommendation> {
    this.logger.log(`Getting outfit recommendations for user ${userId}, base item ${baseItemId}`);

    const occasion = options?.occasion;
    const result = await this.advancedRecommendation.getOutfitRecommendation(
      baseItemId,
      userId,
      occasion
    );

    interface OutfitItem {
      id: string;
      name: string;
      price: number;
      category: ClothingCategory;
      images: string[];
      brand?: { id: string; name: string; logo?: string | null } | null;
      score: number;
      matchReasons?: string[];
    }

    const mapItems = (items: OutfitItem[]): RecommendationResult[] =>
      items.map((item) => ({
        item: {
          id: item.id,
          name: item.name,
          price: item.price,
          category: String(item.category),
          images: item.images,
          brand: item.brand
            ? { id: item.brand.id, name: item.brand.name, logo: item.brand.logo ?? null }
            : null,
        },
        score: item.score,
        sources: ["outfit"],
        reasons: item.matchReasons || [],
      }));

    return {
      tops: result.tops ? mapItems(result.tops as OutfitItem[]) : undefined,
      bottoms: result.bottoms ? mapItems(result.bottoms as OutfitItem[]) : undefined,
      accessories: result.accessories ? mapItems(result.accessories as OutfitItem[]) : undefined,
      footwear:
        "footwear" in result && result.footwear
          ? mapItems(result.footwear as OutfitItem[])
          : undefined,
      outerwear:
        "outerwear" in result && result.outerwear
          ? mapItems(result.outerwear as OutfitItem[])
          : undefined,
      overallScore: result.overallScore,
    };
  }

  async explainRecommendation(
    userId: string,
    itemId: string
  ): Promise<{
    reasons: string[];
    factors: Array<{ name: string; contribution: number }>;
    similarItems: string[];
  }> {
    return this.explainer.explain(userId, itemId);
  }

  async recordFeedback(
    userId: string,
    itemId: string,
    feedback: "like" | "dislike" | "purchase" | "view"
  ): Promise<void> {
    await this.preferenceLearning.recordFeedback(userId, itemId, feedback);
    this.logger.debug(`Recorded ${feedback} feedback for item ${itemId}`);
  }

  /**
   * Get paginated recommendation feed (delegates to RecommendationFeedService)
   */
  async getFeed(
    userId: string,
    category: "daily" | "occasion" | "trending" | "explore",
    subCategory?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: unknown[]; total: number; hasMore: boolean }> {
    return this.feedService.getFeed(userId, category, subCategory, page, pageSize);
  }

  /**
   * Get complete-the-look outfit suggestions (delegates to OutfitCompletionService)
   */
  async getCompleteTheLook(clothingId: string, userId: string): Promise<unknown> {
    return this.outfitCompletionService.getCompleteTheLook(clothingId, userId);
  }

  /**
   * Get all golden recommendation profiles (delegates to GoldenRecommendationService)
   */
  async getGoldenProfiles(): Promise<Array<{ profile_id: string; profile: unknown }>> {
    return this.goldenRecommendationService.getAllGoldenProfiles();
  }

  /**
   * Get a specific golden recommendation (delegates to GoldenRecommendationService)
   */
  async getGoldenRecommendation(profileId: string): Promise<unknown> {
    return this.goldenRecommendationService.getGoldenRecommendation(profileId);
  }

  /**
   * Submit user feedback with behavior tracking and preference learning
   */
  async submitFeedback(
    userId: string,
    dto: { clothingId: string; action: string; recommendationId?: string }
  ): Promise<void> {
    const actionMap: Record<string, BehaviorAction> = {
      like: "post_like",
      dislike: "click",
      ignore: "click",
    };

    await this.behaviorTrackingService.track({
      userId,
      action: actionMap[dto.action] || "click",
      clothingId: dto.clothingId,
      context: {
        recommendationId: dto.recommendationId,
        source: "recommendation_feedback",
      },
    });

    if (dto.action === "like" || dto.action === "dislike") {
      await this.recordFeedback(userId, dto.clothingId, dto.action === "like" ? "like" : "dislike");
    }
  }

  /**
   * Submit batch user feedback with behavior tracking and preference learning
   */
  async submitBatchFeedback(
    userId: string,
    items: Array<{ clothingId: string; action: string; recommendationId?: string }>
  ): Promise<void> {
    const actionMap: Record<string, BehaviorAction> = {
      like: "post_like",
      dislike: "click",
      ignore: "click",
    };

    await this.behaviorTrackingService.trackBatch(
      items.map((item) => ({
        userId,
        action: actionMap[item.action] || ("click" as BehaviorAction),
        clothingId: item.clothingId,
        context: {
          recommendationId: item.recommendationId,
          source: "recommendation_feedback_batch",
        },
      }))
    );

    const feedbackItems = items.filter(
      (item) => item.action === "like" || item.action === "dislike"
    );
    for (const item of feedbackItems) {
      await this.recordFeedback(
        userId,
        item.clothingId,
        item.action === "like" ? "like" : "dislike"
      );
    }
  }

  async recordImpressions(
    userId: string,
    items: Array<{ id: string; score: number; source: string }>,
    recommendationId: string
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    try {
      await this.prisma.recommendationImpression.createMany({
        data: items.map((item, position) => ({
          userId,
          recommendationId,
          impressionType: "view",
          dwellTimeMs: position,
          createdAt: new Date(),
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record impressions: ${error instanceof Error ? error.message : "unknown"}`
      );
    }
  }

  async getTrendingRecommendations(limit: number = 20): Promise<RecommendationResult[]> {
    const scoredItems = await this.advancedRecommendation.getTrendingRecommendations(limit);
    return scoredItems.map((item) => ({
      item: {
        id: item.id,
        name: item.name,
        price: item.price,
        category: String(item.category),
        images: item.images,
        brand: item.brand,
      },
      score: item.score,
      sources: ["trending"],
      reasons: item.matchReasons,
    }));
  }

  async getDailyOutfitRecommendation(userId: string): Promise<{
    items: RecommendationResult[];
    outfitName: string;
    description: string;
  }> {
    const result = await this.advancedRecommendation.getDailyOutfitRecommendation(userId);
    return {
      items: result.items.map((item) => ({
        item: {
          id: item.id,
          name: item.name,
          price: item.price,
          category: String(item.category),
          images: item.images,
          brand: item.brand,
        },
        score: item.score,
        sources: ["daily-outfit"],
        reasons: item.matchReasons,
      })),
      outfitName: result.outfitName,
      description: result.description,
    };
  }

  async getOccasionRecommendations(
    userId: string,
    occasion: string,
    limit: number = 10
  ): Promise<RecommendationResult[]> {
    return this.recommend({
      userId,
      context: { occasion },
      options: { limit },
    });
  }

  async getStyleGuide(userId: string): Promise<{
    bodyType: string | null;
    skinTone: string | null;
    colorSeason: string | null;
    recommendations: string[];
  }> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        bodyType: null,
        skinTone: null,
        colorSeason: null,
        recommendations: ["请先完善您的形象档案"],
      };
    }

    const recommendations: string[] = [];

    if (profile.bodyType) {
      recommendations.push(`体型: ${profile.bodyType}`);
    }
    if (profile.colorSeason) {
      recommendations.push(`色彩季型: ${profile.colorSeason}`);
    }
    if (profile.skinTone) {
      recommendations.push(`肤色: ${profile.skinTone}`);
    }

    const preferences = await this.preferenceLearning.getTopPreferences(userId, "style", 3);
    if (preferences.length > 0) {
      recommendations.push(`偏好风格: ${preferences.join("、")}`);
    }

    return {
      bodyType: profile.bodyType || null,
      skinTone: profile.skinTone || null,
      colorSeason: profile.colorSeason || null,
      recommendations,
    };
  }

  private async fetchAllCandidates(category?: ClothingCategory): Promise<FunnelCandidate[]> {
    const where: { isActive: boolean; isDeleted: boolean; category?: ClothingCategory } = {
      isActive: true,
      isDeleted: false,
    };
    if (category) {
      where.category = category;
    }

    const items = await this.prisma.clothingItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
        images: true,
        colors: true,
        sizes: true,
        tags: true,
        material: true,
        attributes: true,
        viewCount: true,
        likeCount: true,
        brand: { select: { id: true, name: true, logo: true } },
      },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      take: 500,
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      category: String(item.category),
      images: (item.images as string[]) || [],
      colors: (item.colors as string[]) || [],
      sizes: (item.sizes as string[]) || [],
      tags: (item.tags as string[]) || [],
      material: item.material || null,
      attributes: item.attributes as Record<string, unknown> | null,
      brand: item.brand as { id: string; name: string; logo: string | null } | null,
      viewCount: item.viewCount || 0,
      likeCount: item.likeCount || 0,
    }));
  }

  private filterByScene(items: FunnelCandidate[], scene: string): FunnelCandidate[] {
    const sceneKeywords =
      SCENE_OCCASION_MAP[scene.toLowerCase()] || SCENE_OCCASION_MAP["daily"] || [];

    return items.filter((item) => {
      const attrs = item.attributes as Record<string, unknown> | null;

      if (attrs?.occasions && Array.isArray(attrs.occasions)) {
        const hasOccasion = attrs.occasions.some((o: string) =>
          sceneKeywords.some((kw) => o.toLowerCase().includes(kw.toLowerCase()))
        );
        if (hasOccasion) {
          return true;
        }
      }

      if (attrs?.style && Array.isArray(attrs.style)) {
        const hasStyle = attrs.style.some((s: string) =>
          sceneKeywords.some((kw) => s.toLowerCase().includes(kw.toLowerCase()))
        );
        if (hasStyle) {
          return true;
        }
      }

      const tagMatch = item.tags.some((t) =>
        sceneKeywords.some((kw) => t.toLowerCase().includes(kw.toLowerCase()))
      );
      if (tagMatch) {
        return true;
      }

      if (scene === "daily") {
        return true;
      }

      return false;
    });
  }

  private filterBySize(
    items: FunnelCandidate[],
    profile: Record<string, unknown> | null
  ): FunnelCandidate[] {
    if (!profile) {
      return items;
    }

    const userSizes = this.inferUserSizes(profile);
    if (userSizes.length === 0) {
      return items;
    }

    return items.filter((item) => {
      if (!item.sizes || item.sizes.length === 0) {
        return true;
      }
      return item.sizes.some((s) => userSizes.includes(s.toUpperCase()));
    });
  }

  private inferUserSizes(profile: Record<string, unknown>): string[] {
    const sizes: string[] = [];

    const height = typeof profile.height === "number" ? profile.height : 0;
    const weight = typeof profile.weight === "number" ? profile.weight : 0;
    const bust = typeof profile.bust === "number" ? profile.bust : 0;
    const waist = typeof profile.waist === "number" ? profile.waist : 0;

    if (height && weight) {
      const bmi = weight / (height / 100) ** 2;

      if (bmi < 18.5) {
        sizes.push("XS", "S");
      } else if (bmi < 24) {
        sizes.push("S", "M");
      } else if (bmi < 28) {
        sizes.push("M", "L", "XL");
      } else {
        sizes.push("XL", "XXL", "2XL", "3XL");
      }
    }

    if (bust) {
      if (bust < 80) {
        sizes.push("XS", "S");
      } else if (bust < 88) {
        sizes.push("S", "M");
      } else if (bust < 96) {
        sizes.push("M", "L");
      } else {
        sizes.push("L", "XL", "XXL");
      }
    }

    if (waist) {
      if (waist < 65) {
        sizes.push("XS", "S");
      } else if (waist < 75) {
        sizes.push("S", "M");
      } else if (waist < 85) {
        sizes.push("M", "L");
      } else {
        sizes.push("L", "XL");
      }
    }

    const uniqueSizes = [...new Set(sizes)];
    if (uniqueSizes.length === 0) {
      return SIZE_ORDER;
    }

    const expanded = new Set<string>();
    for (const s of uniqueSizes) {
      expanded.add(s);
      const idx = SIZE_ORDER.indexOf(s);
      if (idx > 0) {
        const prev = SIZE_ORDER[idx - 1];
        if (prev) {
          expanded.add(prev);
        }
      }
      if (idx >= 0 && idx < SIZE_ORDER.length - 1) {
        const next = SIZE_ORDER[idx + 1];
        if (next) {
          expanded.add(next);
        }
      }
    }

    return Array.from(expanded);
  }

  private filterByBudget(
    items: FunnelCandidate[],
    profile: Record<string, unknown> | null,
    options?: RecommendationRequest["options"]
  ): FunnelCandidate[] {
    const maxBudget =
      options?.maxPrice ||
      (typeof profile?.priceRangeMax === "number" ? profile.priceRangeMax : undefined);
    const minBudget =
      options?.minPrice ||
      (typeof profile?.priceRangeMin === "number" ? profile.priceRangeMin : undefined);

    if (!maxBudget && !minBudget) {
      return items;
    }

    return items.filter((item) => {
      if (minBudget && item.price < minBudget) {
        return false;
      }
      if (maxBudget && item.price > maxBudget) {
        return false;
      }
      return true;
    });
  }

  private async scoreByRules(
    items: FunnelCandidate[],
    profile: Record<string, unknown> | null,
    context?: RecommendationRequest["context"]
  ): Promise<ScoredCandidate[]> {
    const ruleContext = {
      bodyType: (typeof profile?.bodyType === "string" ? profile.bodyType : null) as string | null,
      colorSeason: (typeof profile?.colorSeason === "string" ? profile.colorSeason : null) as
        | string
        | null,
      occasion: context?.occasion || null,
      season: context?.season || null,
      weather: context?.weather || null,
      stylePreferences: Array.isArray(profile?.stylePreferences)
        ? (profile.stylePreferences as Array<Record<string, unknown> | string>)
            .map((s) =>
              typeof s === "string" ? s : String((s as Record<string, unknown>)?.name || "")
            )
            .filter((s: string) => s.length > 0)
        : [],
    };

    const ruleResults = await this.ruleEngine.scoreByRules(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        colors: item.colors,
        tags: item.tags,
        price: item.price,
        attributes: item.attributes,
        material: item.material,
      })),
      ruleContext
    );

    const ruleMap = new Map(ruleResults.map((r) => [r.itemId, r]));

    return items.map((item) => {
      const ruleResult = ruleMap.get(item.id) || {
        ruleScore: 50,
        matchedRules: [],
        avoidHits: [],
      };

      return {
        candidate: item,
        ruleScore: ruleResult.ruleScore,
        vectorScore: 0,
        preferenceScore: 0,
        finalScore: 0,
        matchedRules: ruleResult.matchedRules,
        avoidHits: ruleResult.avoidHits,
        sources: ruleResult.matchedRules.length > 0 ? ["rules"] : [],
        reasons: this.buildReasonsFromRules(ruleResult, profile),
      };
    });
  }

  private async scoreByVector(
    candidates: ScoredCandidate[],
    profile: Record<string, unknown> | null,
    context?: RecommendationRequest["context"]
  ): Promise<ScoredCandidate[]> {
    if (!this.qdrantService.isReady() || candidates.length === 0) {
      return candidates.map((c) => ({ ...c, vectorScore: c.ruleScore * 0.5 }));
    }

    try {
      const queryParts: string[] = [];
      if (context?.occasion) {
        queryParts.push(context.occasion);
      }
      if (context?.season) {
        queryParts.push(context.season);
      }
      if (profile?.bodyType) {
        queryParts.push(String(profile.bodyType));
      }

      const stylePrefs = Array.isArray(profile?.stylePreferences)
        ? (profile.stylePreferences as Array<Record<string, unknown> | string>)
            .map((s) =>
              typeof s === "string" ? s : String((s as Record<string, unknown>)?.name || "")
            )
            .filter((s: string) => s.length > 0)
        : [];
      queryParts.push(...stylePrefs.slice(0, 3));

      const queryText = queryParts.join(" ") || "casual daily";
      const queryEmbedding = await this.qdrantService.getTextEmbedding(queryText);

      const vectorResults = await this.qdrantService.searchSimilar(queryEmbedding, {
        topK: candidates.length,
        minScore: 0.1,
      });

      const vectorMap = new Map(vectorResults.map((r) => [r.id, r.score]));

      return candidates.map((c) => {
        const vectorScore = vectorMap.get(c.candidate.id);
        const normalizedVectorScore = vectorScore !== undefined ? vectorScore * 100 : 0;

        return {
          ...c,
          vectorScore: normalizedVectorScore,
          sources: vectorScore !== undefined ? [...c.sources, "vector"] : c.sources,
        };
      });
    } catch (error) {
      this.logger.debug(`Vector scoring failed, using rule scores only: ${error}`);
      return candidates.map((c) => ({ ...c, vectorScore: c.ruleScore * 0.5 }));
    }
  }

  private async applyPreferenceLearning(
    candidates: ScoredCandidate[],
    userId: string
  ): Promise<ScoredCandidate[]> {
    try {
      // Sync quiz results into preferences for cold-start users
      const isColdStart = await this.isColdStartUser(userId);
      if (isColdStart) {
        await this.preferenceLearning.syncQuizResults(userId);
      }

      const [preferences, sasrecResult] = await Promise.allSettled([
        this.preferenceLearning.getUserPreferences(userId),
        this.sasrec.getSequenceRecommendations(userId, 50),
      ]);

      const prefMap = new Map<string, number>();
      if (preferences.status === "fulfilled") {
        for (const pref of preferences.value) {
          prefMap.set(`${pref.category}:${pref.key}`, pref.value);
        }
      }

      const sasrecMap = new Map<string, number>();
      if (sasrecResult.status === "fulfilled") {
        for (const r of sasrecResult.value.recommendations) {
          sasrecMap.set(r.itemId, r.score);
        }
      }

      return candidates.map((c) => {
        let prefScore = 0;

        const cat = c.candidate.category?.toLowerCase();
        if (cat) {
          const catScore = prefMap.get(`category:${cat}`);
          if (catScore) {
            prefScore += catScore * 3;
          }
        }

        if (c.candidate.brand?.name) {
          const brandScore = prefMap.get(`brand:${c.candidate.brand.name.toLowerCase()}`);
          if (brandScore) {
            prefScore += brandScore * 2;
          }
        }

        const sasrecScore = sasrecMap.get(c.candidate.id) || 0;
        prefScore += sasrecScore * 10;

        const normalizedPrefScore = Math.min(prefScore, 100);

        return {
          ...c,
          preferenceScore: normalizedPrefScore,
          sources: [
            ...c.sources,
            ...(prefScore > 0 && cat ? ["preference"] : []),
            ...(sasrecScore > 0 ? ["sasrec"] : []),
          ],
        };
      });
    } catch (error) {
      this.logger.debug(`Preference learning failed: ${error}`);
      return candidates;
    }
  }

  private fuseAndExplain(
    candidates: ScoredCandidate[],
    limit: number,
    customWeights?: ScoreWeights
  ): ScoredCandidate[] {
    const weights = customWeights || this.SCORE_WEIGHTS;
    const fused = candidates.map((c) => {
      const ruleWeight = c.ruleScore > 0 ? weights.rule : 0;
      const vectorWeight = c.vectorScore > 0 ? weights.vector : 0;
      const prefWeight = c.preferenceScore > 0 ? weights.preference : 0;

      const totalWeight = ruleWeight + vectorWeight + prefWeight || 1;

      const finalScore =
        (c.ruleScore * ruleWeight + c.vectorScore * vectorWeight + c.preferenceScore * prefWeight) /
        totalWeight;

      return {
        ...c,
        finalScore,
        sources: c.sources.length > 0 ? [...new Set(c.sources)] : ["hybrid"],
      };
    });

    fused.sort((a, b) => b.finalScore - a.finalScore);

    return fused.slice(0, limit);
  }

  private buildReasonsFromRules(
    ruleResult: { matchedRules: string[]; avoidHits: string[]; ruleScore: number },
    profile: Record<string, unknown> | null
  ): string[] {
    const reasons: string[] = [];

    if (ruleResult.matchedRules.some((r) => r.startsWith("bodyType_"))) {
      if (profile?.bodyType) {
        reasons.push(`适合${profile.bodyType}体型`);
      }
    }

    if (ruleResult.matchedRules.some((r) => r.startsWith("colorSeason_"))) {
      if (profile?.colorSeason) {
        reasons.push(`符合${profile.colorSeason}色彩季型`);
      }
    }

    if (ruleResult.matchedRules.some((r) => r.startsWith("occasion_"))) {
      reasons.push("场合匹配");
    }

    if (ruleResult.matchedRules.includes("style_preference_match")) {
      reasons.push("符合你的风格偏好");
    }

    if (ruleResult.ruleScore >= 80) {
      reasons.push("高度匹配");
    } else if (ruleResult.ruleScore >= 60) {
      reasons.push("较为匹配");
    }

    return reasons.length > 0 ? reasons : ["为你推荐"];
  }

  private toRecommendationResult(
    scored: ScoredCandidate,
    funnelStats: {
      totalCandidates: number;
      afterSceneFilter: number;
      afterSizeFilter: number;
      afterBudgetFilter: number;
      experimentId?: string;
    }
  ): RecommendationResult {
    const confidence = Math.min(1, scored.finalScore / 100);
    const primaryReason = scored.reasons[0] || "为你推荐";

    return {
      item: {
        id: scored.candidate.id,
        name: scored.candidate.name,
        price: scored.candidate.price,
        category: scored.candidate.category,
        images: scored.candidate.images,
        brand: scored.candidate.brand,
      },
      score: scored.finalScore,
      sources: scored.sources,
      reasons: scored.reasons,
      experimentId: funnelStats.experimentId,
      explanation: {
        why: primaryReason,
        alternative:
          scored.reasons.length > 1
            ? scored.reasons[1] ?? "也可以浏览更多相似推荐"
            : "也可以浏览更多相似推荐",
        nextAction: scored.finalScore >= 70 ? "试穿看看效果" : "查看相似款",
        confidence,
      },
      breakdown: {
        totalCandidates: funnelStats.totalCandidates,
        afterSceneFilter: funnelStats.afterSceneFilter,
        afterSizeFilter: funnelStats.afterSizeFilter,
        afterBudgetFilter: funnelStats.afterBudgetFilter,
        ruleScore: scored.ruleScore,
        vectorScore: scored.vectorScore,
        preferenceScore: scored.preferenceScore,
        finalScore: scored.finalScore,
      },
    };
  }

  private generateExperimentId(): string {
    return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Assign experiment variant using FeatureFlag system.
   * Falls back to timestamp-random format when no flag is configured.
   */
  private async assignExperimentVariant(
    userId: string
  ): Promise<{ experimentId: string; variant?: string }> {
    if (!this.featureFlagService) {
      return { experimentId: this.generateExperimentId() };
    }

    try {
      const result = await this.featureFlagService.evaluate(
        "recommendation_algorithm_v2",
        userId
      );

      if (result.variant) {
        return {
          experimentId: `exp-${result.variant}-${Date.now()}`,
          variant: result.variant,
        };
      }

      return { experimentId: this.generateExperimentId() };
    } catch (error) {
      this.logger.debug(
        `Feature flag evaluation failed, using fallback experiment ID: ${error}`
      );
      return { experimentId: this.generateExperimentId() };
    }
  }

  private async degradedPipeline(request: RecommendationRequest): Promise<RecommendationResult[]> {
    const { context, options } = request;
    const limit = options?.limit || 20;

    const degradedRecs = await this.ruleEngine.getDegradedRecommendations({
      season: context?.season,
      occasion: context?.occasion,
      weather: context?.weather,
      limit,
    });

    const experimentId = this.generateExperimentId();

    return degradedRecs.map((rec) => ({
      item: {
        id: rec.itemId,
        name: "",
        price: 0,
        category: "",
        images: [],
        brand: null,
      },
      score: rec.score,
      sources: ["degraded-rule-engine"],
      reasons: [rec.reason],
      experimentId,
      explanation: rec.explanation,
      breakdown: {
        totalCandidates: degradedRecs.length,
        afterSceneFilter: degradedRecs.length,
        afterSizeFilter: degradedRecs.length,
        afterBudgetFilter: degradedRecs.length,
        ruleScore: rec.score,
        vectorScore: 0,
        preferenceScore: 0,
        finalScore: rec.score,
      },
    }));
  }

  private async isColdStartUser(userId: string): Promise<boolean> {
    try {
      const behaviorCount = await this.prisma.userBehavior.count({
        where: { userId },
      });
      return behaviorCount < this.COLD_START_THRESHOLD;
    } catch {
      return true;
    }
  }

  private async getColdStartRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    const { userId, options } = request;
    const limit = options?.limit || 20;

    this.logger.log(`Cold start recommendations for user ${userId}`);

    const strategy = await this.coldStart.handleNewUser(userId);

    const itemIds = strategy.recommendations.map((r) => r.itemId);

    const items = await this.prisma.clothingItem.findMany({
      where: { id: { in: itemIds }, isActive: true },
      include: { brand: { select: { id: true, name: true, logo: true } } },
    });

    const itemMap = new Map(items.map((i) => [i.id, i]));

    const results: RecommendationResult[] = [];
    for (const rec of strategy.recommendations) {
      const item = itemMap.get(rec.itemId);
      if (!item) {
        continue;
      }

      results.push({
        item: {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          category: String(item.category),
          images: item.images,
          brand: item.brand
            ? { id: item.brand.id, name: item.brand.name, logo: item.brand.logo }
            : null,
        },
        score: rec.score,
        sources: [rec.strategy || strategy.type],
        reasons: [rec.reason],
        breakdown: {
          totalCandidates: itemIds.length,
          afterSceneFilter: itemIds.length,
          afterSizeFilter: itemIds.length,
          afterBudgetFilter: itemIds.length,
          ruleScore: rec.score,
          vectorScore: 0,
          preferenceScore: 0,
          finalScore: rec.score,
        },
      });
    }

    await this.recordImpressions(
      userId,
      results.slice(0, limit).map((r, i) => ({
        id: r.item.id,
        score: r.score,
        source: r.sources[0] || "cold-start",
      })),
      `cold-${userId}-${Date.now()}`
    );

    return results.slice(0, limit);
  }
}
