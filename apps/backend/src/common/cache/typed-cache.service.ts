import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';
import { CacheKey, CacheKeyBuilder } from './cache-key-builder';
import { CACHE_STRATEGIES, CacheInvalidationEvent, getJitteredTtl } from './cache-strategies';

@Injectable()
export class TypedCacheService {
  private readonly logger = new Logger(TypedCacheService.name);
  private readonly nullPlaceholder = '__NULL__';
  private readonly defaultNullTtl = 60;
  private readonly lockPrefix = 'lock:';

  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: CacheKey | string): Promise<T | null> {
    const resolvedKey = this.resolveKey(key);
    const value = await this.redisService.get(resolvedKey);

    if (value === null) {
      return null;
    }

    if (value === this.nullPlaceholder) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      this.logger.warn(`Failed to parse cached value for key '${resolvedKey}'`);
      return null;
    }
  }

  async set<T>(key: CacheKey | string, value: T, ttl?: number): Promise<void> {
    const resolvedKey = this.resolveKey(key);

    if (value === null || value === undefined) {
      await this.redisService.setex(resolvedKey, this.defaultNullTtl, this.nullPlaceholder);
      return;
    }

    const serialized = JSON.stringify(value);
    const effectiveTtl = ttl ?? this.resolveTtl(key);
    await this.redisService.setex(resolvedKey, effectiveTtl, serialized);
  }

  async invalidate(pattern: string): Promise<number> {
    const client = this.redisService.getClient();
    let deletedCount = 0;
    let cursor = '0';

    do {
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await client.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');

    this.logger.log(`Invalidated ${deletedCount} keys matching pattern: ${pattern}`);
    return deletedCount;
  }

  async invalidateByEvent(event: CacheInvalidationEvent): Promise<void> {
    const strategies = Object.values(CACHE_STRATEGIES).filter(
      (s) => s.invalidationEvents.includes(event),
    );

    for (const strategy of strategies) {
      const pattern = CacheKeyBuilder.pattern(strategy.name, '*');
      await this.invalidate(pattern);
    }
  }

  async warmup(keys: CacheKey[], fetcher: (key: CacheKey) => Promise<unknown>): Promise<void> {
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const data = await fetcher(key);
        await this.set(key, data);
      }),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(`Cache warmup completed with ${failures.length} failures out of ${keys.length} keys`);
    }
  }

  async getWithLock<T>(
    key: CacheKey | string,
    fetcher: () => Promise<T | null>,
    ttl?: number,
  ): Promise<T | null> {
    const resolvedKey = this.resolveKey(key);

    const cached = await this.get<T>(resolvedKey);
    if (cached !== null) {
      return cached;
    }

    const rawValue = await this.redisService.get(resolvedKey);
    if (rawValue === this.nullPlaceholder) {
      return null;
    }

    const lockKey = `${this.lockPrefix}${resolvedKey}`;
    const lockToken = await this.redisService.acquireLock(lockKey, 10000, 1);

    if (!lockToken) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const waitMs = Math.min(50 * Math.pow(2, attempt) + Math.random() * 50, 2000);
        await new Promise((resolve) => setTimeout(resolve, waitMs));

        const retryCached = await this.get<T>(resolvedKey);
        if (retryCached !== null) {
          return retryCached;
        }

        const retryRaw = await this.redisService.get(resolvedKey);
        if (retryRaw === this.nullPlaceholder) {
          return null;
        }

        const retryToken = await this.redisService.acquireLock(lockKey, 10000, 1);
        if (retryToken) {
          try {
            const data = await fetcher();
            if (data === null || data === undefined) {
              await this.redisService.setex(resolvedKey, this.defaultNullTtl, this.nullPlaceholder);
              return null;
            }
            const effectiveTtl = ttl ?? this.resolveTtl(key);
            await this.redisService.setex(resolvedKey, effectiveTtl, JSON.stringify(data));
            return data;
          } finally {
            await this.redisService.releaseLock(lockKey, retryToken);
          }
        }
      }

      this.logger.warn(`Cache lock acquisition failed after max retries: ${resolvedKey}`);
      return fetcher();
    }

    try {
      const data = await fetcher();
      if (data === null || data === undefined) {
        await this.redisService.setex(resolvedKey, this.defaultNullTtl, this.nullPlaceholder);
        return null;
      }
      const effectiveTtl = ttl ?? this.resolveTtl(key);
      await this.redisService.setex(resolvedKey, effectiveTtl, JSON.stringify(data));
      return data;
    } finally {
      await this.redisService.releaseLock(lockKey, lockToken);
    }
  }

  private resolveKey(key: CacheKey | string): string {
    if (typeof key === 'string') {
      return key;
    }
    return CacheKeyBuilder.build(key);
  }

  private resolveTtl(key: CacheKey | string): number {
    if (typeof key === 'string') {
      return getJitteredTtl(3600);
    }

    const strategyName = key.module;
    const strategy = CACHE_STRATEGIES[strategyName];
    if (strategy) {
      return getJitteredTtl(strategy.ttl);
    }

    for (const s of Object.values(CACHE_STRATEGIES)) {
      if (s.name === key.entity) {
        return getJitteredTtl(s.ttl);
      }
    }

    return getJitteredTtl(3600);
  }
}
