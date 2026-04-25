import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";

export const USAGE_LIMIT_KEY = "usage_limit";

/**
 * Custom exception thrown when a free user exceeds their daily usage limit.
 * HTTP 429 Too Many Requests with details about the limit and current usage.
 */
export class UsageLimitExceededException extends HttpException {
  public readonly actionType: string;
  public readonly limit: number;
  public readonly currentUsage: number;

  constructor(actionType: string, limit: number, currentUsage: number) {
    const body = {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: "Usage limit exceeded",
      error: "Usage Limit Exceeded",
      actionType,
      limit,
      currentUsage,
    };
    super(body, HttpStatus.TOO_MANY_REQUESTS);
    this.actionType = actionType;
    this.limit = limit;
    this.currentUsage = currentUsage;
  }
}

/**
 * Free-tier daily usage limits (D-02)
 */
const ACTION_LIMITS: Record<string, number> = {
  ai_chat: 5,
  try_on: 3,
  wardrobe_item: 20,
};

const DEFAULT_LIMIT = 10;

/**
 * NestJS Guard that enforces free-tier daily usage limits via Redis INCR counters.
 * Premium subscribers bypass all limits.
 *
 * Usage: @UseGuards(UsageLimitGuard) @RequireLimit('ai_chat')
 *
 * Response headers:
 * - X-Usage-Limit: daily limit (-1 for premium/unlimited)
 * - X-Usage-Remaining: remaining count (-1 for premium/unlimited)
 * - X-Usage-Reset: seconds until limit resets
 */
@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Step a: Get actionType from decorator metadata
    const actionType = this.reflector.getAllAndOverride<string>(USAGE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!actionType) {
      return true; // No @RequireLimit decorator, allow
    }

    // Step b: Get authenticated user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // Step c: Check if user has active premium subscription
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId: user.id,
        status: "active",
        expiresAt: { gt: new Date() },
      },
    });

    if (subscription) {
      // Step d: Premium users bypass limits, set unlimited headers
      this.setResponseHeaders(context, -1, -1);
      return true;
    }

    // Step e: Increment Redis counter for free user
    const shanghaiDateStr = this.getShanghaiDateString();
    const key = `xuno:usage:${user.id}:${actionType}:${shanghaiDateStr}`;
    const count = await this.redisService.incr(key);

    // Step f: Set TTL on first increment
    if (count === 1) {
      const secondsUntilMidnight = this.getSecondsUntilMidnight();
      await this.redisService.expire(key, secondsUntilMidnight);
    }

    // Step g: Calculate limit and remaining
    const limit = ACTION_LIMITS[actionType] ?? DEFAULT_LIMIT;
    const remaining = Math.max(0, limit - count);
    const secondsUntilMidnight = this.getSecondsUntilMidnight();

    // Step h: Set response headers
    this.setResponseHeaders(context, limit, remaining, secondsUntilMidnight);

    // Step i: Check if limit exceeded
    if (count > limit) {
      throw new UsageLimitExceededException(actionType, limit, count);
    }

    // Step j: Allow
    return true;
  }

  /**
   * Set X-Usage-* response headers for progressive hints (D-05)
   */
  private setResponseHeaders(
    context: ExecutionContext,
    limit: number,
    remaining: number,
    reset?: number
  ): void {
    const response = context.switchToHttp().getResponse();
    response.setHeader("X-Usage-Limit", limit);
    response.setHeader("X-Usage-Remaining", remaining);
    response.setHeader("X-Usage-Reset", reset ?? this.getSecondsUntilMidnight());
  }

  /**
   * Get today's date string in Asia/Shanghai timezone (YYYY-MM-DD)
   */
  private getShanghaiDateString(): string {
    const shanghaiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    return shanghaiNow.toISOString().slice(0, 10);
  }

  /**
   * Calculate seconds until next midnight in Asia/Shanghai timezone
   */
  private getSecondsUntilMidnight(): number {
    const shanghaiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const tomorrow = new Date(shanghaiNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return Math.floor((tomorrow.getTime() - shanghaiNow.getTime()) / 1000);
  }
}
