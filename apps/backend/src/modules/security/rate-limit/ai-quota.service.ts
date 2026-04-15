import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../../common/redis/redis.service';

export type QuotaType = 'ai-stylist' | 'try-on';

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface QuotaConsumeResult {
  consumed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface QuotaStatus {
  used: number;
  limit: number;
  resetAt: Date;
}

const DEFAULT_LIMITS: Record<QuotaType, number> = {
  'ai-stylist': 10,
  'try-on': 3,
};

const ENV_LIMIT_KEYS: Record<QuotaType, string> = {
  'ai-stylist': 'AI_STYLIST_DAILY_LIMIT',
  'try-on': 'TRY_ON_DAILY_LIMIT',
};

@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);
  private readonly limits: Record<QuotaType, number>;

  /**
   * Lua script for atomic check-and-increment:
   * - If key does not exist, set to 1 with TTL and return {1, ttl}
   * - If current count >= limit, return {current, ttl} without incrementing
   * - Otherwise, increment and return {newCount, ttl}
   */
  private static readonly CHECK_AND_INCREMENT_SCRIPT = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local ttl_seconds = tonumber(ARGV[2])

    local current = tonumber(redis.call('GET', key) or '0')

    if current >= limit then
      local existing_ttl = redis.call('TTL', key)
      return {current, existing_ttl}
    end

    local new_count = redis.call('INCR', key)

    if new_count == 1 then
      redis.call('EXPIRE', key, ttl_seconds)
    end

    local final_ttl = redis.call('TTL', key)
    return {new_count, final_ttl}
  `;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.limits = {
      'ai-stylist': this.configService.get<number>(
        ENV_LIMIT_KEYS['ai-stylist'],
        DEFAULT_LIMITS['ai-stylist'],
      ),
      'try-on': this.configService.get<number>(
        ENV_LIMIT_KEYS['try-on'],
        DEFAULT_LIMITS['try-on'],
      ),
    };
  }

  async checkQuota(
    userId: string,
    quotaType: QuotaType,
  ): Promise<QuotaCheckResult> {
    const key = this.buildKey(userId, quotaType);
    const limit = this.limits[quotaType];
    const ttl = await this.redis.ttl(key);
    const resetAt = this.calculateResetAt(ttl);

    const current = await this.redis.get(key);
    const used = current ? parseInt(current, 10) : 0;
    const remaining = Math.max(0, limit - used);

    return {
      allowed: used < limit,
      remaining,
      resetAt,
    };
  }

  async consumeQuota(
    userId: string,
    quotaType: QuotaType,
  ): Promise<QuotaConsumeResult> {
    const key = this.buildKey(userId, quotaType);
    const limit = this.limits[quotaType];
    const ttlSeconds = this.getSecondsUntilMidnight();

    // Use Lua script for atomic check-and-increment to prevent race conditions
    const result = await this.redis.eval(
      AiQuotaService.CHECK_AND_INCREMENT_SCRIPT,
      1,
      key,
      limit,
      ttlSeconds,
    ) as [number, number];

    const [newCount, ttl] = result;

    if (newCount > limit) {
      return {
        consumed: false,
        remaining: 0,
        resetAt: this.calculateResetAt(ttl),
      };
    }

    return {
      consumed: true,
      remaining: Math.max(0, limit - newCount),
      resetAt: this.calculateResetAt(ttl),
    };
  }

  async getQuotaStatus(
    userId: string,
  ): Promise<Record<string, QuotaStatus>> {
    const result: Record<string, QuotaStatus> = {};

    for (const quotaType of Object.keys(this.limits) as QuotaType[]) {
      const key = this.buildKey(userId, quotaType);
      const limit = this.limits[quotaType];
      const current = await this.redis.get(key);
      const used = current ? parseInt(current, 10) : 0;
      const ttl = await this.redis.ttl(key);

      result[quotaType] = {
        used,
        limit,
        resetAt: this.calculateResetAt(ttl),
      };
    }

    return result;
  }

  async resetQuota(userId: string, quotaType?: string): Promise<void> {
    if (quotaType) {
      const key = this.buildKey(userId, quotaType as QuotaType);
      await this.redis.del(key);
      this.logger.log(`Quota reset for user ${userId}, type: ${quotaType}`);
    } else {
      for (const type of Object.keys(this.limits) as QuotaType[]) {
        const key = this.buildKey(userId, type);
        await this.redis.del(key);
      }
      this.logger.log(`All quotas reset for user ${userId}`);
    }
  }

  private buildKey(userId: string, quotaType: QuotaType): string {
    const date = new Date().toISOString().slice(0, 10);
    return `xuno:quota:${userId}:${date}:${quotaType}`;
  }

  private getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }

  private calculateResetAt(ttl: number): Date {
    if (ttl < 0) {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      return midnight;
    }
    return new Date(Date.now() + ttl * 1000);
  }
}
