/**
 * @fileoverview 推荐类型统一导出
 * @description Re-exports all recommendation type interfaces
 * @module recommendations/types
 */

export type {
  ClothingItemAttributes,
  ClothingItemWithBrand,
  UserProfileData,
  StylePreferenceItem,
  UserBehaviorData,
  RecommendationContext,
  RecommendationScoreBreakdown,
  RecommendationExplanation,
  RecommendationResult,
  StrategyWeights,
  UserBehaviorSummary,
  UnifiedRecommendationRequest,
  ExplanationReasonItem,
  MatchingFactorItem,
  PrismaWhereCondition,
  FavoriteWithItem,
  TryOnWithItem,
  OrderItemWithItem,
  OrderWithItems,
  UserBehaviorRecord,
  OutfitRecommendationResult,
  RecommendationReasonType,
  RecommendationReason,
  UserPreferenceSummary,
  ItemAttributeSummary,
  MatchingFactor,
  RecommendationExplanationContext,
  // Pipeline-specific types
  RecommendationCandidate,
  RecommendationRequestContext,
  RecommendationOptions,
  ScoringResult,
  StrategyOutput,
  FeedbackPayload,
} from "./recommendation.types";
