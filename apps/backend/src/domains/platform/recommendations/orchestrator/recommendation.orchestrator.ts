/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { ClothingCategory } from "../../../../types/prisma-enums";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { CacheKeyBuilder, CACHE_TTL } from "../../../../modules/cache/cache.constants";
import { CacheService } from "../../../../modules/cache/cache.service";

import { AdvancedRecommendationService } from "../services/advanced-recommendation.service";
import { ColdStartService } from "../services/cold-start.service";
import { CollaborativeFilteringService } from "../services/collaborative-filtering.service";
import { ColorMatchingService } from "../services/color-matching.service";
import { GNNCompatibilityService } from "../services/gnn-compatibility.service";
import { KnowledgeGraphService } from "../services/knowledge-graph.service";
import { LearningToRankService } from "../services/learning-to-rank.service";
import { MatchingTheoryService } from "../services/matching-theory.service";
import { MultimodalFusionService } from "../services/multimodal-fusion.service";
import { PreferenceLearningService } from "../services/preference-learning.service";
import { RecommendationExplainerService } from "../services/recommendation-explainer.service";
import { SASRecService } from "../services/sasrec.service";
import { TransformerEncoderService } from "../services/transformer-encoder.service";
import { VectorSimilarityService } from "../services/vector-similarity.service";

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
    algorithm?: RecommendationAlgorithm;
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
  breakdown?: {
    contentBased: number;
    collaborative: number;
    knowledgeGraph: number;
    theoryBased: number;
    preferenceLearning?: number;
    sasrec?: number;
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

export type RecommendationAlgorithm =
  | "unified"
  | "collaborative"
  | "content"
  | "knowledge"
  | "hybrid";

export interface AlgorithmWeights {
  contentBased: number;
  collaborative: number;
  knowledgeGraph: number;
  theoryBased: number;
}

interface ScoredCandidate {
  itemId: string;
  score: number;
  source: string;
  reason: string;
}

@Injectable()
export class RecommendationOrchestrator {
  private readonly logger = new Logger(RecommendationOrchestrator.name);

  private readonly defaultWeights: AlgorithmWeights = {
    contentBased: 0.25,
    collaborative: 0.25,
    knowledgeGraph: 0.25,
    theoryBased: 0.25,
  };

  private readonly COLD_START_THRESHOLD = 10;

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
    private readonly advancedRecommendation: AdvancedRecommendationService,
    private readonly collaborativeFiltering: CollaborativeFilteringService,
    private readonly coldStart: ColdStartService,
    private readonly preferenceLearning: PreferenceLearningService,
    private readonly vectorSimilarity: VectorSimilarityService,
    private readonly colorMatching: ColorMatchingService,
    private readonly multimodalFusion: MultimodalFusionService,
    private readonly transformerEncoder: TransformerEncoderService,
    private readonly sasrec: SASRecService,
    private readonly knowledgeGraph: KnowledgeGraphService,
    private readonly matchingTheory: MatchingTheoryService,
    private readonly gnnCompatibility: GNNCompatibilityService,
    private readonly learningToRank: LearningToRankService,
    private readonly explainer: RecommendationExplainerService
  ) {}

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult[]> {
    const { userId, context, options } = request;
    const algorithm = options?.algorithm || "unified";
    const limit = options?.limit || 20;

    const cacheKey = CacheKeyBuilder.outfitRecommendations(userId, {
      algorithm,
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

          switch (algorithm) {
            case "collaborative":
              return this.getCollaborativeRecommendations(request);
            case "content":
              return this.getContentRecommendations(request);
            case "knowledge":
              return this.getKnowledgeRecommendations(request);
            case "hybrid":
              return this.getHybridRecommendations(request);
            case "unified":
            default:
              return this.getUnifiedRecommendations(request);
          }
        },
        CACHE_TTL.OUTFIT_RECOMMENDATIONS
      )
      .then((result) => result ?? []);
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

  async recordImpressions(
    userId: string,
    items: Array<{ id: string; score: number; source: string }>,
    recommendationId: string
  ): Promise<void> {
    if (items.length === 0) {return;}

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
    const { userId, context, options } = request;
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
      if (!item) {continue;}

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
          contentBased: strategy.type === "survey" ? 0.7 : 0.3,
          collaborative: 0,
          knowledgeGraph: strategy.type === "demographic" ? 0.5 : 0.2,
          theoryBased: 0.3,
        },
      });
    }

    const preferenceBoosted = await this.applyPreferenceLearningBoost(userId, results);

    await this.recordImpressions(
      userId,
      preferenceBoosted.slice(0, limit).map((r, i) => ({
        id: r.item.id,
        score: r.score,
        source: r.sources[0] || "cold-start",
      })),
      `cold-${userId}-${Date.now()}`
    );

    return preferenceBoosted.slice(0, limit);
  }

  private async getUnifiedRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    const { userId, context, options } = request;
    const limit = options?.limit || 20;

    this.logger.log("Computing unified recommendations with all strategies");

    const [sasrecCandidates, cfCandidates, preferenceScores] = await Promise.allSettled([
      this.getSASRecCandidates(userId),
      this.getCFCandidates(userId),
      this.preferenceLearning.getUserPreferences(userId),
    ]);

    const scoredItems = await this.advancedRecommendation.getPersonalizedRecommendations(
      userId,
      {
        occasion: context?.occasion,
        season: context?.season,
        weather: context?.weather,
      },
      limit * 2
    );

    const sasrecMap = new Map<string, number>();
    if (sasrecCandidates.status === "fulfilled") {
      for (const c of sasrecCandidates.value) {
        sasrecMap.set(c.itemId, c.score);
      }
    }

    const cfMap = new Map<string, number>();
    if (cfCandidates.status === "fulfilled") {
      for (const c of cfCandidates.value) {
        cfMap.set(c.itemId, c.score);
      }
    }

    const prefMap = new Map<string, number>();
    if (preferenceScores.status === "fulfilled") {
      for (const pref of preferenceScores.value) {
        prefMap.set(`${pref.category}:${pref.key}`, pref.value);
      }
    }

    const results: RecommendationResult[] = scoredItems.map((item) => {
      const sasrecScore = sasrecMap.get(item.id) || 0;
      const cfScore = cfMap.get(item.id) || 0;

      let prefBoost = 0;
      if (item.category) {
        const catScore = prefMap.get(`category:${item.category.toLowerCase()}`);
        if (catScore) {prefBoost += catScore * 2;}
      }
      if (item.brand?.name) {
        const brandScore = prefMap.get(`brand:${item.brand.name.toLowerCase()}`);
        if (brandScore) {prefBoost += brandScore;}
      }

      const sasrecWeight = sasrecScore > 0 ? 0.15 : 0;
      const cfWeight = cfScore > 0 ? 0.1 : 0;
      const prefWeight = prefBoost > 0 ? 0.1 : 0;
      const baseWeight = 1 - sasrecWeight - cfWeight - prefWeight;

      const adjustedScore =
        item.score * baseWeight +
        sasrecScore * sasrecWeight +
        Math.min(cfScore / 100, 1) * cfWeight +
        Math.min(prefBoost / 10, 1) * prefWeight;

      const sources: string[] = ["unified"];
      if (sasrecScore > 0) {sources.push("sasrec");}
      if (cfScore > 0) {sources.push("collaborative");}
      if (prefBoost > 0) {sources.push("preference-learning");}

      return {
        item: {
          id: item.id,
          name: item.name,
          price: item.price,
          category: String(item.category),
          images: item.images,
          brand: item.brand,
        },
        score: adjustedScore,
        sources,
        reasons: item.matchReasons,
        breakdown: {
          contentBased: item.breakdown?.contentBased ?? 0,
          collaborative: item.breakdown?.collaborative ?? 0,
          knowledgeGraph: item.breakdown?.knowledgeGraph ?? 0,
          theoryBased: item.breakdown?.theoryBased ?? 0,
          preferenceLearning: prefBoost > 0 ? Math.min(prefBoost / 10, 1) : undefined,
          sasrec: sasrecScore > 0 ? sasrecScore : undefined,
        },
      };
    });

    results.sort((a, b) => b.score - a.score);

    await this.recordImpressions(
      userId,
      results.slice(0, limit).map((r) => ({
        id: r.item.id,
        score: r.score,
        source: r.sources.join(","),
      })),
      `unified-${userId}-${Date.now()}`
    );

    return results.slice(0, limit);
  }

  private async getCollaborativeRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    this.logger.log("Computing collaborative recommendations");
    const { userId, context, options } = request;
    const limit = options?.limit || 20;

    const scoredItems = await this.advancedRecommendation.getPersonalizedRecommendations(
      userId,
      {
        occasion: context?.occasion,
        season: context?.season,
        weather: context?.weather,
      },
      limit
    );

    return scoredItems
      .map((item) => {
        const collabWeight = item.breakdown?.collaborative ?? 0.5;
        const adjustedScore = collabWeight * 0.6 + item.score * 0.4;
        return {
          item: {
            id: item.id,
            name: item.name,
            price: item.price,
            category: String(item.category),
            images: item.images,
            brand: item.brand,
          },
          score: adjustedScore,
          sources: ["collaborative"],
          reasons: item.matchReasons,
          breakdown: item.breakdown,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async getContentRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    this.logger.log("Computing content-based recommendations");
    const { userId, context, options } = request;
    const limit = options?.limit || 20;

    const scoredItems = await this.advancedRecommendation.getPersonalizedRecommendations(
      userId,
      {
        occasion: context?.occasion,
        season: context?.season,
        weather: context?.weather,
      },
      limit
    );

    return scoredItems
      .map((item) => {
        const contentWeight = item.breakdown?.contentBased ?? 0.5;
        const adjustedScore = contentWeight * 0.6 + item.score * 0.4;
        return {
          item: {
            id: item.id,
            name: item.name,
            price: item.price,
            category: String(item.category),
            images: item.images,
            brand: item.brand,
          },
          score: adjustedScore,
          sources: ["content"],
          reasons: item.matchReasons,
          breakdown: item.breakdown,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async getKnowledgeRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    this.logger.log("Computing knowledge-based recommendations");
    const { userId, context, options } = request;
    const limit = options?.limit || 20;

    const scoredItems = await this.advancedRecommendation.getPersonalizedRecommendations(
      userId,
      {
        occasion: context?.occasion,
        season: context?.season,
        weather: context?.weather,
      },
      limit
    );

    return scoredItems
      .map((item) => {
        const kgWeight = item.breakdown?.knowledgeGraph ?? 0.5;
        const theoryWeight = item.breakdown?.theoryBased ?? 0.5;
        const adjustedScore = (kgWeight + theoryWeight) * 0.3 + item.score * 0.4;
        return {
          item: {
            id: item.id,
            name: item.name,
            price: item.price,
            category: String(item.category),
            images: item.images,
            brand: item.brand,
          },
          score: adjustedScore,
          sources: ["knowledge"],
          reasons: item.matchReasons,
          breakdown: item.breakdown,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async getHybridRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    this.logger.log("Computing hybrid recommendations");
    return this.getUnifiedRecommendations(request);
  }

  private async getSASRecCandidates(userId: string): Promise<ScoredCandidate[]> {
    try {
      const result = await this.sasrec.getSequenceRecommendations(userId, 50);
      return result.recommendations.map((r) => ({
        itemId: r.itemId,
        score: r.score,
        source: "sasrec",
        reason: r.reason,
      }));
    } catch (error) {
      this.logger.debug(`SASRec candidates failed: ${error}`);
      return [];
    }
  }

  private async getCFCandidates(userId: string): Promise<ScoredCandidate[]> {
    try {
      const result = await this.collaborativeFiltering.getHybridRecommendations(userId, {
        limit: 50,
        excludeViewed: true,
      });
      return result.map((r) => ({
        itemId: r.itemId,
        score: r.score,
        source: "collaborative-filtering",
        reason: r.reasons.join("，"),
      }));
    } catch (error) {
      this.logger.debug(`CF candidates failed: ${error}`);
      return [];
    }
  }

  private async applyPreferenceLearningBoost(
    userId: string,
    results: RecommendationResult[]
  ): Promise<RecommendationResult[]> {
    try {
      const preferences = await this.preferenceLearning.getUserPreferences(userId);
      if (preferences.length === 0) {return results;}

      const prefMap = new Map<string, number>();
      for (const pref of preferences) {
        prefMap.set(`${pref.category}:${pref.key}`, pref.value);
      }

      return results.map((r) => {
        let boost = 0;
        const cat = r.item.category?.toLowerCase();
        if (cat) {
          const catScore = prefMap.get(`category:${cat}`);
          if (catScore) {boost += catScore * 3;}
        }
        if (r.item.brand?.name) {
          const brandScore = prefMap.get(`brand:${r.item.brand.name.toLowerCase()}`);
          if (brandScore) {boost += brandScore * 2;}
        }

        return {
          ...r,
          score: r.score + boost,
          sources: boost > 0 ? [...r.sources, "preference-learning"] : r.sources,
        };
      });
    } catch (error) {
      this.logger.debug(`Preference learning boost failed: ${error}`);
      return results;
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
    const scoredItems = await this.advancedRecommendation.getOccasionRecommendations(
      userId,
      occasion,
      limit
    );
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
      sources: ["occasion"],
      reasons: item.matchReasons,
    }));
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
}
