import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "../../../common/redis/redis.service";
import type { UsageLimitResult } from "./dto/usage-limit.dto";

/**
 * Free-tier daily usage limits per action type (D-02/D-03)
 */
const ACTION_LIMITS: Record<string, number> = {
  ai_chat: 5,
  try_on: 3,
  wardrobe_item: 20,
};

const DEFAULT_LIMIT = 10;

@Injectable()
export class UsageLimitService {
  private readonly logger = new Logger(UsageLimitService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Increment daily usage counter for a user action.
   * Redis key format: xuno:usage:{userId}:{actionType}:{date}
   * Date uses Asia/Shanghai timezone.
   * TTL is set to seconds until next midnight in Shanghai timezone on first increment.
   */
  async incrementUsage(userId: string, actionType: string): Promise<UsageLimitResult> {
    const shanghaiDateStr = this.getShanghaiDateString();
    const key = `xuno:usage:${userId}:${actionType}:${shanghaiDateStr}`;

    const count = await this.redisService.incr(key);

    // First increment: set TTL to seconds until next midnight in Shanghai
    if (count === 1) {
      const ttlSeconds = this.getSecondsUntilMidnight();
      await this.redisService.expire(key, ttlSeconds);
    }

    const ttl = await this.redisService.ttl(key);
    const limit = this.getLimit(actionType);
    const remaining = Math.max(0, limit - count);

    return { count, ttl, limit, remaining };
  }

  /**
   * Get the daily limit for a given action type.
   */
  getLimit(actionType: string): number {
    return ACTION_LIMITS[actionType] ?? DEFAULT_LIMIT;
  }

  /**
   * Calculate seconds until next midnight in Asia/Shanghai timezone.
   */
  getSecondsUntilMidnight(): number {
    const shanghaiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const tomorrow = new Date(shanghaiNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return Math.floor((tomorrow.getTime() - shanghaiNow.getTime()) / 1000);
  }

  /**
   * Get today's date string in Asia/Shanghai timezone (YYYY-MM-DD)
   */
  private getShanghaiDateString(): string {
    const shanghaiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    return shanghaiNow.toISOString().slice(0, 10);
  }
}
