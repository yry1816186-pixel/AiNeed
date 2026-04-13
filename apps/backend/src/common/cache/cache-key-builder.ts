import { REDIS_KEY_PREFIX, REDIS_KEY_SEPARATOR } from '../redis/redis.service';

export interface CacheKey {
  module: string;
  entity: string;
  id: string;
  version?: number;
  params?: Record<string, string>;
}

export class CacheKeyBuilder {
  private static join(...parts: string[]): string {
    return parts.filter(Boolean).join(REDIS_KEY_SEPARATOR);
  }

  static build(key: CacheKey): string {
    const parts = [REDIS_KEY_PREFIX, key.module, key.entity, key.id];
    if (key.version !== undefined) {
      parts.push(`v${key.version}`);
    }
    return CacheKeyBuilder.join(...parts);
  }

  static withHashTag(key: CacheKey, slotKey?: string): string {
    const built = CacheKeyBuilder.build(key);
    const slot = slotKey ?? key.id;
    const inner = `${REDIS_KEY_PREFIX}${REDIS_KEY_SEPARATOR}${slot}`;
    return `{${inner}}${REDIS_KEY_SEPARATOR}${CacheKeyBuilder.join(key.module, key.entity, key.id)}`;
  }

  static userProfile(userId: string): string {
    return CacheKeyBuilder.build({ module: 'user', entity: 'profile', id: userId });
  }

  static styleProfile(userId: string): string {
    return CacheKeyBuilder.build({ module: 'user', entity: 'style', id: userId });
  }

  static quizQuestions(quizId?: string): string {
    return CacheKeyBuilder.build({ module: 'quiz', entity: 'questions', id: quizId ?? 'all' });
  }

  static recommendations(userId: string, context?: string): string {
    const id = context ? `${userId}:${context}` : userId;
    return CacheKeyBuilder.build({ module: 'recommendation', entity: 'list', id });
  }

  static aiResult(userId: string, resultId: string): string {
    return CacheKeyBuilder.build({ module: 'ai', entity: 'result', id: `${userId}:${resultId}` });
  }

  static clothingItem(itemId: string): string {
    return CacheKeyBuilder.build({ module: 'clothing', entity: 'item', id: itemId });
  }

  static communityPosts(sortBy?: string, page?: number): string {
    const id = `${sortBy ?? 'latest'}:${page ?? 1}`;
    return CacheKeyBuilder.build({ module: 'community', entity: 'posts', id });
  }

  static pattern(module: string, entity: string): string {
    return CacheKeyBuilder.join(REDIS_KEY_PREFIX, module, entity) + `${REDIS_KEY_SEPARATOR}*`;
  }
}
