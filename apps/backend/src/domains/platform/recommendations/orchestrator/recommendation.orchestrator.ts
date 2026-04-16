/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Recommendation Orchestrator - Facade Pattern
 *
 * This service acts as the single entry point for all recommendation operations.
 * It coordinates between different algorithm submodules and provides a unified interface.
 *
 * Benefits:
 * - Decouples controllers from algorithm implementations
 * - Enables easy A/B testing of different algorithms
 * - Provides consistent API for all recommendation types
 * - Centralizes logging, caching, and monitoring
 */

import { Injectable, Logger } from "@nestjs/common";
import { ClothingCategory } from "../../../../types/prisma-enums";

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

// Request/Response types
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

/**
 * 推荐结果中的商品数据（简化版）
 */
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
  | "unified" // Default: combines all algorithms
  | "collaborative" // User behavior-based
  | "content" // Item attribute-based
  | "knowledge" // Knowledge graph-based
  | "hybrid"; // Custom weighted combination

export interface AlgorithmWeights {
  contentBased: number;
  collaborative: number;
  knowledgeGraph: number;
  theoryBased: number;
}

@Injectable()
export class RecommendationOrchestrator {
  private readonly logger = new Logger(RecommendationOrchestrator.name);

  // Default weights for unified algorithm
  private readonly defaultWeights: AlgorithmWeights = {
    contentBased: 0.25,
    collaborative: 0.25,
    knowledgeGraph: 0.25,
    theoryBased: 0.25,
  };

  constructor(
    private readonly cacheService: CacheService,
    // Core algorithm service
    private readonly advancedRecommendation: AdvancedRecommendationService,
    // Collaborative submodule services
    private readonly collaborativeFiltering: CollaborativeFilteringService,
    private readonly coldStart: ColdStartService,
    private readonly preferenceLearning: PreferenceLearningService,
    // Content submodule services
    private readonly vectorSimilarity: VectorSimilarityService,
    private readonly colorMatching: ColorMatchingService,
    private readonly multimodalFusion: MultimodalFusionService,
    private readonly transformerEncoder: TransformerEncoderService,
    private readonly sasrec: SASRecService,
    // Knowledge submodule services
    private readonly knowledgeGraph: KnowledgeGraphService,
    private readonly matchingTheory: MatchingTheoryService,
    private readonly gnnCompatibility: GNNCompatibilityService,
    private readonly learningToRank: LearningToRankService,
    // Explainer
    private readonly explainer: RecommendationExplainerService,
  ) {}

  /**
   * Main entry point for getting recommendations
   */
  async getRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResult[]> {
    const { userId, context, options } = request;
    const algorithm = options?.algorithm || "unified";
    const limit = options?.limit || 20;

    // Build cache key
    const cacheKey = CacheKeyBuilder.outfitRecommendations(userId, {
      algorithm,
      category: options?.category,
      occasion: context?.occasion,
      season: context?.season,
      limit,
    });

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
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
      CACHE_TTL.OUTFIT_RECOMMENDATIONS,
    ).then((result) => result ?? []);
  }

  /**
   * Get outfit recommendations based on a base item
   */
  async getOutfitRecommendations(
    userId: string,
    baseItemId: string,
    options?: { occasion?: string; limit?: number },
  ): Promise<OutfitRecommendation> {
    this.logger.log(
      `Getting outfit recommendations for user ${userId}, base item ${baseItemId}`,
    );

    const occasion = options?.occasion;
    const result = await this.advancedRecommendation.getOutfitRecommendation(
      baseItemId,
      userId,
      occasion,
    );

    // Map AdvancedRecommendationService result to OutfitRecommendation format
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
        item: { id: item.id, name: item.name, price: item.price, category: String(item.category), images: item.images, brand: item.brand ? { id: item.brand.id, name: item.brand.name, logo: item.brand.logo ?? null } : null },
        score: item.score,
        sources: ["outfit"],
        reasons: item.matchReasons || [],
      }));

    return {
      tops: result.tops ? mapItems(result.tops) : undefined,
      bottoms: result.bottoms ? mapItems(result.bottoms) : undefined,
      accessories: result.accessories ? mapItems(result.accessories) : undefined,
      footwear: "footwear" in result && result.footwear ? mapItems(result.footwear as OutfitItem[]) : undefined,
      outerwear: "outerwear" in result && result.outerwear ? mapItems(result.outerwear as OutfitItem[]) : undefined,
      overallScore: result.overallScore,
    };
  }

  /**
   * Explain why a recommendation was made
   */
  async explainRecommendation(
    userId: string,
    itemId: string,
  ): Promise<{
    reasons: string[];
    factors: Array<{ name: string; contribution: number }>;
    similarItems: string[];
  }> {
    return this.explainer.explain(userId, itemId);
  }

  /**
   * Learn from user feedback to improve future recommendations
   */
  async recordFeedback(
    userId: string,
    itemId: string,
    feedback: "like" | "dislike" | "purchase" | "view",
  ): Promise<void> {
    await this.preferenceLearning.recordFeedback(userId, itemId, feedback);
    this.logger.debug(`Recorded ${feedback} feedback for item ${itemId}`);
  }

  // ==================== Private Algorithm Methods ====================

  private async getUnifiedRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResult[]> {
    this.logger.log("Computing unified recommendations");
    const { userId, context, options } = request;
    const limit = options?.limit || 20;

    const scoredItems = await this.advancedRecommendation.getPersonalizedRecommendations(
      userId,
      {
        occasion: context?.occasion,
        season: context?.season,
        weather: context?.weather,
      },
      limit,
    );

    return scoredItems.map((item) => ({
      item: { id: item.id, name: item.name, price: item.price, category: String(item.category), images: item.images, brand: item.brand },
      score: item.score,
      sources: ["unified"],
      reasons: item.matchReasons,
      breakdown: item.breakdown,
    }));
  }

  private async getCollaborativeRecommendations(
    request: RecommendationRequest,
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
      limit,
    );

    // Collaborative-focused: weight collaborative component more heavily
    return scoredItems
      .map((item) => {
        const collabWeight = item.breakdown?.collaborative ?? 0.5;
        const adjustedScore = collabWeight * 0.6 + item.score * 0.4;
        return {
          item: { id: item.id, name: item.name, price: item.price, category: String(item.category), images: item.images, brand: item.brand },
          score: adjustedScore,
          sources: ["collaborative"],
          reasons: item.matchReasons,
          breakdown: item.breakdown,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async getContentRecommendations(
    request: RecommendationRequest,
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
      limit,
    );

    // Content-focused: weight content-based component more heavily
    return scoredItems
      .map((item) => {
        const contentWeight = item.breakdown?.contentBased ?? 0.5;
        const adjustedScore = contentWeight * 0.6 + item.score * 0.4;
        return {
          item: { id: item.id, name: item.name, price: item.price, category: String(item.category), images: item.images, brand: item.brand },
          score: adjustedScore,
          sources: ["content"],
          reasons: item.matchReasons,
          breakdown: item.breakdown,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async getKnowledgeRecommendations(
    request: RecommendationRequest,
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
      limit,
    );

    // Knowledge-focused: weight knowledge graph and theory-based components more heavily
    return scoredItems
      .map((item) => {
        const kgWeight = item.breakdown?.knowledgeGraph ?? 0.5;
        const theoryWeight = item.breakdown?.theoryBased ?? 0.5;
        const adjustedScore = (kgWeight + theoryWeight) * 0.3 + item.score * 0.4;
        return {
          item: { id: item.id, name: item.name, price: item.price, category: String(item.category), images: item.images, brand: item.brand },
          score: adjustedScore,
          sources: ["knowledge"],
          reasons: item.matchReasons,
          breakdown: item.breakdown,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async getHybridRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResult[]> {
    this.logger.log("Computing hybrid recommendations");
    // Hybrid uses the unified approach (already combines all algorithms)
    return this.getUnifiedRecommendations(request);
  }
}
