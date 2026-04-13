export enum CacheInvalidationEvent {
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  STYLE_QUIZ_COMPLETED = 'STYLE_QUIZ_COMPLETED',
  ADMIN_QUIZ_UPDATED = 'ADMIN_QUIZ_UPDATED',
  USER_BEHAVIOR_CHANGED = 'USER_BEHAVIOR_CHANGED',
  ITEM_UPDATED = 'ITEM_UPDATED',
  NEW_POST = 'NEW_POST',
}

export interface CacheStrategy {
  name: string;
  ttl: number;
  nullTtl: number;
  invalidationEvents: CacheInvalidationEvent[];
  description: string;
}

export const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  userProfile: {
    name: 'userProfile',
    ttl: 1800,
    nullTtl: 60,
    invalidationEvents: [CacheInvalidationEvent.PROFILE_UPDATED],
    description: 'User profile cache, invalidated on profile update',
  },
  styleProfile: {
    name: 'styleProfile',
    ttl: 3600,
    nullTtl: 60,
    invalidationEvents: [CacheInvalidationEvent.STYLE_QUIZ_COMPLETED],
    description: 'Style profile cache, invalidated on style quiz completion',
  },
  quizQuestions: {
    name: 'quizQuestions',
    ttl: 86400,
    nullTtl: 60,
    invalidationEvents: [CacheInvalidationEvent.ADMIN_QUIZ_UPDATED],
    description: 'Quiz questions cache, invalidated on admin quiz update',
  },
  recommendations: {
    name: 'recommendations',
    ttl: 900,
    nullTtl: 60,
    invalidationEvents: [CacheInvalidationEvent.USER_BEHAVIOR_CHANGED],
    description: 'Recommendations cache, invalidated on user behavior change',
  },
  aiResult: {
    name: 'aiResult',
    ttl: 3600,
    nullTtl: 60,
    invalidationEvents: [],
    description: 'AI result cache, no automatic invalidation',
  },
  clothingItem: {
    name: 'clothingItem',
    ttl: 86400,
    nullTtl: 60,
    invalidationEvents: [CacheInvalidationEvent.ITEM_UPDATED],
    description: 'Clothing item cache, invalidated on item update',
  },
  communityPosts: {
    name: 'communityPosts',
    ttl: 300,
    nullTtl: 60,
    invalidationEvents: [CacheInvalidationEvent.NEW_POST],
    description: 'Community posts cache, invalidated on new post',
  },
};

export function getJitteredTtl(baseTtl: number): number {
  const jitter = baseTtl * 0.1;
  const offset = (Math.random() * 2 - 1) * jitter;
  return Math.max(1, Math.round(baseTtl + offset));
}

export function getStrategyTtl(strategyName: string): number {
  const strategy = CACHE_STRATEGIES[strategyName];
  if (!strategy) {
    return getJitteredTtl(3600);
  }
  return getJitteredTtl(strategy.ttl);
}
