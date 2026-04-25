import { Injectable, Logger, Optional } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { CacheKeyBuilder, CACHE_TTL } from "../../../../modules/cache/cache.constants";
import { CacheService } from "../../../../modules/cache/cache.service";
import { ClothingCategory } from "../../../../types/prisma-enums";
import {
  RecommendationOutput,
  RecommendationOutputItem,
  RecommendationExplanationDetail,
} from "../types/recommendation.types";
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
import { WardrobeComplementaryService } from "../services/wardrobe-complementary.service";
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
    afterCompliance: number;
    afterSceneFilter: number;
    afterSizeFilter: number;
    afterBudgetFilter: number;
    afterStyleFilter: number;
    afterWardrobeFilter: number;
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
    private readonly wardrobeComplementary: WardrobeComplementaryService,
    @Optional() private readonly featureFlagService: FeatureFlagService | null
  ) {}

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationOutput> {
    const { userId, context, options } = request;
    const limit = options?.limit || 20;

    const cacheKey = CacheKeyBuilder.outfitRecommendations(userId, {
      algorithm: "unified",
      category: options?.category,
      occasion: context?.occasion,
      season: context?.season,
      limit,
    });

    const results = await this.cacheService
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

    // Detect if results came from degraded pipeline
    const isDegraded =
      results.length > 0 && results.some((r) => r.sources?.includes("degraded-rule-engine"));
    return this.toRecommendationOutput(results, context, isDegraded);
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

      // L1: Compliance filter
      const complianceFiltered = await this.filterByCompliance(allItems, userId);
      const afterCompliance = complianceFiltered.length;

      // L2: Scene filter
      const sceneFiltered = this.filterByScene(complianceFiltered, scene);
      const afterSceneFilter = sceneFiltered.length;

      // L3: Size filter
      const sizeFiltered = this.filterBySize(sceneFiltered, profile);
      const afterSizeFilter = sizeFiltered.length;

      // L4: Budget filter
      const budgetFiltered = this.filterByBudget(sizeFiltered, profile, options);
      const afterBudgetFilter = budgetFiltered.length;

      // L5: Style scoring filter
      const styleFiltered = this.filterByStyle(budgetFiltered, profile);
      const afterStyleFilter = styleFiltered.length;

      // L6: Wardrobe complementary filter
      const wardrobeFiltered = await this.filterByWardrobe(styleFiltered, userId);
      const afterWardrobeFilter = wardrobeFiltered.length;

      const ruleScored = await this.scoreByRules(wardrobeFiltered, profile, context);
      const vectorScored = await this.scoreByVector(ruleScored, profile, context);
      const finalScored = await this.applyPreferenceLearning(vectorScored, userId);

      const fused = this.fuseAndExplain(finalScored, limit, options?.scoreWeights);

      // Mix in complementary recommendations from wardrobe analysis
      const complementary = await this.getComplementaryItems(userId, fused, context);

      const { experimentId } = await this.assignExperimentVariant(userId);

      const mainResults = fused.map((sc) =>
        this.toRecommendationResult(sc, {
          totalCandidates,
          afterCompliance,
          afterSceneFilter,
          afterSizeFilter,
          afterBudgetFilter,
          afterStyleFilter,
          afterWardrobeFilter,
          experimentId,
        })
      );

      return [...mainResults, ...complementary];
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
  ): Promise<RecommendationOutput> {
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

    // Flatten category-grouped results into a single list
    const allResults: RecommendationResult[] = [
      ...(result.tops ? mapItems(result.tops as OutfitItem[]) : []),
      ...(result.bottoms ? mapItems(result.bottoms as OutfitItem[]) : []),
      ...(result.accessories ? mapItems(result.accessories as OutfitItem[]) : []),
      ...("footwear" in result && result.footwear ? mapItems(result.footwear as OutfitItem[]) : []),
      ...("outerwear" in result && result.outerwear
        ? mapItems(result.outerwear as OutfitItem[])
        : []),
    ];

    const { experimentId } = await this.assignExperimentVariant(userId);
    const output = this.toRecommendationOutput(allResults, { occasion }, false, experimentId);
    output.outfit = {
      name: `${occasion ?? "日常"}完整搭配`,
      description: `基于选中商品的搭配推荐，综合评分 ${result.overallScore.toFixed(1)}`,
      items: output.items,
    };
    return output;
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
   * Wrapped to return standardized RecommendationOutput.
   */
  async getCompleteTheLook(clothingId: string, userId: string): Promise<RecommendationOutput> {
    const completion = await this.outfitCompletionService.getCompleteTheLook(clothingId, userId);

    // Convert anchor item to RecommendationOutputItem
    const anchorItem: RecommendationOutputItem = {
      id: completion.anchor.id,
      name: completion.anchor.name,
      imageUrl: completion.anchor.imageUrl,
      category: completion.anchor.category,
      price: completion.anchor.price,
      score: 100,
      explanation: {
        why: "你选择的单品",
        alternative: "也可以换一件基础款试试",
        nextAction: "查看搭配建议",
        confidence: 1.0,
      },
    };

    // Flatten all suggestions into RecommendationOutputItem[]
    const allSuggestions = [
      ...completion.suggestions.top,
      ...completion.suggestions.bottom,
      ...completion.suggestions.shoes,
      ...completion.suggestions.accessories,
    ];

    const suggestionItems: RecommendationOutputItem[] = allSuggestions.map((s) => ({
      id: s.id,
      name: s.name,
      imageUrl: s.imageUrl,
      category: "",
      price: s.price,
      score: s.matchScore,
      explanation: {
        why: s.reason,
        alternative: "查看更多搭配选项",
        nextAction: "试穿看看效果",
        confidence: Math.min(1, s.matchScore / 100),
      },
    }));

    const allItems = [anchorItem, ...suggestionItems];
    const experimentId = this.generateExperimentId();

    return {
      items: allItems,
      outfit: {
        name: `${completion.anchor.name}的完整搭配`,
        description: completion.harmonyDescription,
        items: suggestionItems,
      },
      explanation: {
        why: `基于你选择的${completion.anchor.category}，推荐${allSuggestions.length}件搭配单品`,
        alternative: "可以浏览更多风格",
        nextAction: "试穿看看整体效果",
        confidence: Math.min(1, completion.harmonyScore / 100),
      },
      experimentId,
      degraded: false,
    };
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

  async getTrendingRecommendations(limit: number = 20): Promise<RecommendationOutput> {
    const scoredItems = await this.advancedRecommendation.getTrendingRecommendations(limit);
    const results: RecommendationResult[] = scoredItems.map((item) => ({
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

    const experimentId = this.generateExperimentId();
    return this.toRecommendationOutput(results, undefined, false, experimentId);
  }

  async getDailyOutfitRecommendation(userId: string): Promise<RecommendationOutput> {
    const result = await this.advancedRecommendation.getDailyOutfitRecommendation(userId);
    const results: RecommendationResult[] = result.items.map((item) => ({
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
    }));

    const { experimentId } = await this.assignExperimentVariant(userId);

    const output = this.toRecommendationOutput(results, { season: undefined }, false, experimentId);
    // Override outfit with the advanced service's naming
    output.outfit = {
      name: result.outfitName,
      description: result.description,
      items: output.items,
    };
    return output;
  }

  async getOccasionRecommendations(
    userId: string,
    occasion: string,
    limit: number = 10
  ): Promise<RecommendationOutput> {
    const results = await this.recommend({
      userId,
      context: { occasion },
      options: { limit },
    });
    return this.toRecommendationOutput(results, { occasion });
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

  /**
   * L1 Compliance filter: remove items that require consents the user has not granted.
   * - body_metrics consent: items with bodyTypeFit attributes require this consent
   * - photos consent: items requiring photo analysis need this consent
   */
  async filterByCompliance(items: FunnelCandidate[], userId: string): Promise<FunnelCandidate[]> {
    try {
      const consents = await this.prisma.userConsent.findMany({
        where: { userId, granted: true },
        select: { consentType: true },
      });

      const grantedConsents = new Set(consents.map((c) => c.consentType));

      const hasBodyMetricsConsent = grantedConsents.has("body_metrics");
      const hasPhotosConsent = grantedConsents.has("photos");

      return items.filter((item) => {
        const attrs = item.attributes as Record<string, unknown> | null;

        // Items with bodyTypeFit require body_metrics consent
        if (!hasBodyMetricsConsent && attrs?.bodyTypeFit) {
          const bodyTypeFit = attrs.bodyTypeFit;
          if (Array.isArray(bodyTypeFit) && bodyTypeFit.length > 0) {
            return false;
          }
        }

        // Items requiring photo analysis need photos consent
        if (!hasPhotosConsent && attrs?.requiresPhoto) {
          return false;
        }

        return true;
      });
    } catch (error) {
      this.logger.debug(
        `Compliance filter failed, passing all items through: ${
          error instanceof Error ? error.message : "unknown"
        }`
      );
      return items;
    }
  }

  /**
   * L5 Style scoring filter: remove items whose style score is below threshold.
   * Uses the user's styleExpression from profile to score each item.
   */
  filterByStyle(
    items: FunnelCandidate[],
    profile: Record<string, unknown> | null
  ): FunnelCandidate[] {
    if (!profile) {
      return items;
    }

    const styleExpression = Array.isArray(profile.stylePreferences)
      ? (profile.stylePreferences as Array<Record<string, unknown> | string>)
          .map((s) =>
            typeof s === "string" ? s : String((s as Record<string, unknown>)?.name || "")
          )
          .filter((s: string) => s.length > 0)
      : [];

    if (styleExpression.length === 0) {
      return items;
    }

    const styleKeywords = styleExpression.map((s: string) => s.toLowerCase());

    return items.filter((item) => {
      let styleScore = 0;

      const attrs = item.attributes as Record<string, unknown> | null;

      // Check style tags in attributes
      if (attrs?.style && Array.isArray(attrs.style)) {
        const itemStyles = (attrs.style as string[]).map((s: string) => s.toLowerCase());
        for (const keyword of styleKeywords) {
          if (itemStyles.some((s) => s.includes(keyword) || keyword.includes(s))) {
            styleScore += 0.3;
          }
        }
      }

      // Check tags
      for (const tag of item.tags) {
        const tagLower = tag.toLowerCase();
        for (const keyword of styleKeywords) {
          if (tagLower.includes(keyword) || keyword.includes(tagLower)) {
            styleScore += 0.2;
          }
        }
      }

      // Check category match with style preferences
      const categoryLower = item.category?.toLowerCase() || "";
      for (const keyword of styleKeywords) {
        if (categoryLower.includes(keyword)) {
          styleScore += 0.1;
        }
      }

      // Baseline score for all items (avoid filtering everything out)
      styleScore += 0.1;

      return styleScore >= 0.3;
    });
  }

  /**
   * L6 Wardrobe complementary filter: remove items too similar to existing wardrobe,
   * prioritize complementary items from different categories.
   */
  async filterByWardrobe(items: FunnelCandidate[], userId: string): Promise<FunnelCandidate[]> {
    try {
      // Fetch user's wardrobe items (all types, as clothing items can be linked via any type)
      const wardrobeItems = await this.prisma.wardrobeCollectionItem.findMany({
        where: { userId },
        select: { itemId: true },
        take: 200,
      });

      if (wardrobeItems.length === 0) {
        return items;
      }

      const wardrobeItemIds = new Set(wardrobeItems.map((w) => w.itemId));

      // Fetch wardrobe item categories for complementary scoring
      const wardrobeClothingItems = await this.prisma.clothingItem.findMany({
        where: { id: { in: Array.from(wardrobeItemIds) } },
        select: { id: true, category: true, tags: true, colors: true },
      });

      const wardrobeCategoryCount = new Map<string, number>();
      const wardrobeTagSet = new Set<string>();

      for (const wItem of wardrobeClothingItems) {
        const cat = String(wItem.category);
        wardrobeCategoryCount.set(cat, (wardrobeCategoryCount.get(cat) || 0) + 1);

        const tags = (wItem.tags as string[]) || [];
        for (const tag of tags) {
          wardrobeTagSet.add(tag.toLowerCase());
        }
      }

      // Find the most common category in wardrobe
      let dominantCategory = "";
      let maxCount = 0;
      for (const [cat, count] of wardrobeCategoryCount) {
        if (count > maxCount) {
          maxCount = count;
          dominantCategory = cat;
        }
      }

      return items.filter((item) => {
        // Remove items already in wardrobe
        if (wardrobeItemIds.has(item.id)) {
          return false;
        }

        // Check tag similarity (proxy for cosine similarity)
        const itemTags = item.tags.map((t) => t.toLowerCase());
        let matchingTags = 0;
        for (const tag of itemTags) {
          if (wardrobeTagSet.has(tag)) {
            matchingTags++;
          }
        }

        // If too many tags overlap (> 90% of item tags), item is too similar
        if (itemTags.length > 0 && matchingTags / itemTags.length > 0.9) {
          // But allow if it's a different category (complementary)
          if (String(item.category) !== dominantCategory) {
            return true;
          }
          return false;
        }

        return true;
      });
    } catch (error) {
      this.logger.debug(
        `Wardrobe filter failed, passing all items through: ${
          error instanceof Error ? error.message : "unknown"
        }`
      );
      return items;
    }
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
      afterCompliance: number;
      afterSceneFilter: number;
      afterSizeFilter: number;
      afterBudgetFilter: number;
      afterStyleFilter: number;
      afterWardrobeFilter: number;
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
        afterCompliance: funnelStats.afterCompliance,
        afterSceneFilter: funnelStats.afterSceneFilter,
        afterSizeFilter: funnelStats.afterSizeFilter,
        afterBudgetFilter: funnelStats.afterBudgetFilter,
        afterStyleFilter: funnelStats.afterStyleFilter,
        afterWardrobeFilter: funnelStats.afterWardrobeFilter,
        ruleScore: scored.ruleScore,
        vectorScore: scored.vectorScore,
        preferenceScore: scored.preferenceScore,
        finalScore: scored.finalScore,
      },
    };
  }

  /**
   * Convert internal RecommendationResult[] to standardized RecommendationOutput.
   * Ensures every output has items, explanation, and experimentId.
   */
  private toRecommendationOutput(
    results: RecommendationResult[],
    context?: { occasion?: string; season?: string; weather?: string },
    isDegraded?: boolean,
    experimentId?: string
  ): RecommendationOutput {
    const items: RecommendationOutputItem[] = results.map((r) => ({
      id: r.item.id,
      name: r.item.name,
      imageUrl: r.item.images?.[0] ?? "",
      category: r.item.category,
      price: r.item.price,
      score: r.score,
      explanation: r.explanation ?? {
        why: "为你推荐",
        alternative: "可以浏览更多分类",
        nextAction: "查看详情",
        confidence: 0.5,
      },
    }));

    // Auto-group into outfit if items span 3+ categories
    let outfit: RecommendationOutput["outfit"];
    const uniqueCategories = new Set(items.map((i) => i.category));
    if (uniqueCategories.size >= 3) {
      const occasionLabel = context?.occasion ?? "日常";
      outfit = {
        name: `${occasionLabel}搭配方案`,
        description: `为你精选${context?.season ?? "当季"}${occasionLabel}场景的全套搭配`,
        items,
      };
    }

    // Use first item's explanation as batch explanation, add ensemble context
    const firstExplanation = results[0]?.explanation ?? {
      why: "为你推荐",
      alternative: "可以浏览更多分类",
      nextAction: "查看详情",
      confidence: 0.5,
    };

    const batchExplanation: RecommendationExplanationDetail = {
      why: firstExplanation.why,
      alternative: firstExplanation.alternative,
      nextAction: firstExplanation.nextAction,
      confidence: firstExplanation.confidence,
    };

    const effectiveExpId = experimentId ?? results[0]?.experimentId ?? this.generateExperimentId();

    const firstBreakdown = results[0]?.breakdown;

    return {
      items,
      outfit,
      explanation: batchExplanation,
      breakdown: firstBreakdown
        ? {
            totalCandidates: firstBreakdown.totalCandidates,
            afterCompliance: firstBreakdown.afterCompliance,
            afterSceneFilter: firstBreakdown.afterSceneFilter,
            afterSizeFilter: firstBreakdown.afterSizeFilter,
            afterBudgetFilter: firstBreakdown.afterBudgetFilter,
            afterStyleFilter: firstBreakdown.afterStyleFilter,
            afterWardrobeFilter: firstBreakdown.afterWardrobeFilter,
            finalCount: items.length,
          }
        : undefined,
      experimentId: effectiveExpId,
      degraded: isDegraded ?? false,
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
      const result = await this.featureFlagService.evaluate("recommendation_algorithm_v2", userId);

      if (result.variant) {
        return {
          experimentId: `exp-${result.variant}-${Date.now()}`,
          variant: result.variant,
        };
      }

      return { experimentId: this.generateExperimentId() };
    } catch (error) {
      this.logger.debug(`Feature flag evaluation failed, using fallback experiment ID: ${error}`);
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

    // Fetch full ClothingItem records to populate name, price, category, images, brand
    const itemIds = degradedRecs.map((rec) => rec.itemId);
    const fullItems = await this.prisma.clothingItem.findMany({
      where: { id: { in: itemIds } },
      include: { brand: { select: { id: true, name: true, logo: true } } },
    });
    const itemMap = new Map(fullItems.map((i) => [i.id, i]));

    return degradedRecs.map((rec) => {
      const fullItem = itemMap.get(rec.itemId);

      return {
        item: {
          id: rec.itemId,
          name: fullItem?.name ?? "",
          price: fullItem ? Number(fullItem.price) : 0,
          category: fullItem ? String(fullItem.category) : "",
          images: fullItem ? (fullItem.images as string[]) : [],
          brand: fullItem?.brand
            ? { id: fullItem.brand.id, name: fullItem.brand.name, logo: fullItem.brand.logo }
            : null,
        },
        score: rec.score,
        sources: ["degraded-rule-engine"],
        reasons: [rec.reason],
        experimentId,
        explanation: rec.explanation,
        breakdown: {
          totalCandidates: degradedRecs.length,
          afterCompliance: degradedRecs.length,
          afterSceneFilter: degradedRecs.length,
          afterSizeFilter: degradedRecs.length,
          afterBudgetFilter: degradedRecs.length,
          afterStyleFilter: degradedRecs.length,
          afterWardrobeFilter: degradedRecs.length,
          ruleScore: rec.score,
          vectorScore: 0,
          preferenceScore: 0,
          finalScore: rec.score,
        },
      };
    });
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

  private async getComplementaryItems(
    userId: string,
    fused: ScoredCandidate[],
    context?: RecommendationRequest["context"]
  ): Promise<RecommendationResult[]> {
    try {
      const isColdStart = await this.isColdStartUser(userId);
      if (isColdStart) {
        return [];
      }

      const existingIds = new Set(fused.map((sc) => sc.candidate.id));

      const [bridgeRecs, categoryGaps] = await Promise.all([
        this.wardrobeComplementary.getComplementaryRecommendations(userId, context),
        this.wardrobeComplementary.getStyleGaps(userId),
      ]);

      const complementaryResults: RecommendationResult[] = [];

      for (const rec of bridgeRecs) {
        if (existingIds.has(rec.itemId)) {
          continue;
        }
        existingIds.add(rec.itemId);

        const item = await this.prisma.clothingItem.findUnique({
          where: { id: rec.itemId },
          include: { brand: { select: { id: true, name: true, logo: true } } },
        });

        if (!item) {
          continue;
        }

        complementaryResults.push({
          item: {
            id: item.id,
            name: item.name,
            price: Number(item.price),
            category: String(item.category),
            images: item.images as string[],
            brand: item.brand
              ? { id: item.brand.id, name: item.brand.name, logo: item.brand.logo }
              : null,
          },
          score: 60,
          sources: ["wardrobe-complementary"],
          reasons: [rec.reason],
          explanation: {
            why: rec.reason,
            alternative:
              rec.bridgeType === "bridge"
                ? `也可以看看纯${rec.newStyle}风格的更多单品`
                : `或者回到你熟悉的${rec.dominantStyle}风格`,
            nextAction: "试穿看看效果",
            confidence: 0.6,
          },
        });
      }

      const gapCategories = categoryGaps.filter((g) => g.isGap).map((g) => g.category);
      if (gapCategories.length > 0 && complementaryResults.length < 2) {
        const gapCategory = gapCategories[0];
        if (gapCategory) {
          const gapFilling = await this.prisma.clothingItem.findFirst({
            where: {
              isActive: true,
              isDeleted: false,
              category: gapCategory as ClothingCategory,
              id: { notIn: [...existingIds] },
            },
            include: { brand: { select: { id: true, name: true, logo: true } } },
            orderBy: { viewCount: "desc" },
          });

          if (gapFilling && gapFilling.brand) {
            complementaryResults.push({
              item: {
                id: gapFilling.id,
                name: gapFilling.name,
                price: Number(gapFilling.price),
                category: String(gapFilling.category),
                images: gapFilling.images as string[],
                brand: {
                  id: gapFilling.brand.id,
                  name: gapFilling.brand.name,
                  logo: gapFilling.brand.logo,
                },
              },
              score: 55,
              sources: ["wardrobe-complementary"],
              reasons: [`你的衣橱缺少${gapCategory}，这件能补全整体搭配`],
              explanation: {
                why: `你的衣橱缺少${gapCategory}，这件能补全整体搭配`,
                alternative: "查看更多同类型单品",
                nextAction: "试穿看看效果",
                confidence: 0.55,
              },
            });
          } else if (gapFilling) {
            complementaryResults.push({
              item: {
                id: gapFilling.id,
                name: gapFilling.name,
                price: Number(gapFilling.price),
                category: String(gapFilling.category),
                images: gapFilling.images as string[],
                brand: null,
              },
              score: 55,
              sources: ["wardrobe-complementary"],
              reasons: [`你的衣橱缺少${gapCategory}，这件能补全整体搭配`],
              explanation: {
                why: `你的衣橱缺少${gapCategory}，这件能补全整体搭配`,
                alternative: "查看更多同类型单品",
                nextAction: "试穿看看效果",
                confidence: 0.55,
              },
            });
          }
        }
      }

      return complementaryResults.slice(0, 2);
    } catch (error) {
      this.logger.debug(
        `Complementary recommendations failed: ${
          error instanceof Error ? error.message : "unknown"
        }`
      );
      return [];
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
          afterCompliance: itemIds.length,
          afterSceneFilter: itemIds.length,
          afterSizeFilter: itemIds.length,
          afterBudgetFilter: itemIds.length,
          afterStyleFilter: itemIds.length,
          afterWardrobeFilter: itemIds.length,
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
