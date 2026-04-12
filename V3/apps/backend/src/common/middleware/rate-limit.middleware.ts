import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { SHARED_REDIS_CLIENT } from '../providers/shared-redis.provider';
import { AppLogger } from '../logger/app.logger';

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  scope: 'ip' | 'user';
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
  auth: { windowMs: 60_000, maxRequests: 10, keyPrefix: 'rl:auth', scope: 'ip' },
  stylist: { windowMs: 60_000, maxRequests: 20, keyPrefix: 'rl:stylist', scope: 'user' },
  outfitImage: { windowMs: 60_000, maxRequests: 5, keyPrefix: 'rl:outfit', scope: 'user' },
  search: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'rl:search', scope: 'ip' },
};

const GLOBAL_RULE: RateLimitRule = {
  windowMs: 60_000,
  maxRequests: 100,
  keyPrefix: 'rl:global',
  scope: 'ip',
};

function matchRule(path: string): RateLimitRule | null {
  const normalized = path.replace(/^\/api\/v1/, '');
  if (normalized.startsWith('/auth')) return RATE_LIMIT_RULES.auth;
  if (normalized.startsWith('/stylist')) return RATE_LIMIT_RULES.stylist;
  if (normalized.startsWith('/outfit-image')) return RATE_LIMIT_RULES.outfitImage;
  if (normalized.startsWith('/search')) return RATE_LIMIT_RULES.search;
  return null;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new AppLogger('RateLimit');

  constructor(
    @Inject(SHARED_REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    const ip = this.extractIp(request);
    const userId = this.extractUserId(request);
    const path = request.originalUrl ?? request.url;

    const specificRule = matchRule(path);
    const rulesToCheck: RateLimitRule[] = specificRule
      ? [GLOBAL_RULE, specificRule]
      : [GLOBAL_RULE];

    let blocked: RateLimitResult | null = null;

    for (const rule of rulesToCheck) {
      const result = await this.checkRateLimit(rule, ip, userId);
      if (!result.allowed) {
        blocked = result;
        break;
      }
      this.setRateLimitHeaders(response, result);
    }

    if (blocked) {
      this.logger.warn(`Rate limit exceeded: ${ip} ${path}`);
      this.setRateLimitHeaders(response, blocked);
      response.status(429).json({
        success: false,
        data: null,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
        },
      });
      return;
    }

    next();
  }

  private async checkRateLimit(
    rule: RateLimitRule,
    ip: string,
    userId: string | undefined,
  ): Promise<RateLimitResult> {
    const identity = rule.scope === 'user' && userId ? `user:${userId}` : `ip:${ip}`;
    const key = `${rule.keyPrefix}:${identity}`;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    const multi = this.redis.multi();
    multi.zremrangebyscore(key, '-inf', windowStart);
    multi.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`);
    multi.zcard(key);
    multi.pexpire(key, rule.windowMs + 1000);

    const results = await multi.exec();
    const count = results?.[2]?.[1] as number;
    const remaining = Math.max(0, rule.maxRequests - count);
    const resetTime = now + rule.windowMs;

    return {
      allowed: count <= rule.maxRequests,
      limit: rule.maxRequests,
      remaining,
      resetTime,
    };
  }

  private setRateLimitHeaders(
    response: Response,
    result: RateLimitResult,
  ): void {
    response.setHeader('X-RateLimit-Limit', String(result.limit));
    response.setHeader('X-RateLimit-Remaining', String(result.remaining));
    response.setHeader('X-RateLimit-Reset', String(result.resetTime));
  }

  private extractIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? 'unknown';
  }

  private extractUserId(request: Request): string | undefined {
    const user = (request as Request & { user?: { id?: string } }).user;
    return user?.id;
  }
}
