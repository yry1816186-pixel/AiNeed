import type { ClothingItem } from '@prisma/client';

export type RecommendationChannelType = 'content' | 'collaborative' | 'trending';

export interface ChannelCandidate {
  clothing: ClothingItem;
  score: number;
  reason: string;
}

export interface IRecommendationChannel {
  readonly channelType: RecommendationChannelType;
  recommend(userId: string, limit: number, filters?: RecommendationFilters): Promise<ChannelCandidate[]>;
}

export interface RecommendationFilters {
  occasion?: string;
  style?: string;
  budgetRange?: string;
  excludeIds?: string[];
}

export interface SimilarItemResult {
  clothing: ClothingItem;
  similarity: number;
}

export interface TrendingItem {
  clothing: ClothingItem;
  score: number;
}

export const CHANNEL_WEIGHTS = {
  content: 0.5,
  collaborative: 0.3,
  trending: 0.2,
} as const;

export const INTERACTION_TYPE_WEIGHTS: Record<string, number> = {
  view: 1,
  like: 3,
  favorite: 5,
  purchase: 10,
  skip: -1,
};

export const REDIS_TRENDING_PREFIX = 'aineed:trending';
export const REDIS_TRENDING_TTL_SECONDS = 30 * 24 * 60 * 60;
