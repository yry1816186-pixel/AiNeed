import { Injectable, CanActivate, ExecutionContext, HttpException, Inject } from "@nestjs/common";

import {
  REDIS_CLIENT,
  REDIS_KEY_PREFIX,
  REDIS_KEY_SEPARATOR,
} from "../../../../common/redis/redis.service";
import Redis from "ioredis";

@Injectable()
export class PartnerRateLimitGuard implements CanActivate {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const keyData = request["partnerApiKey"];

    if (!keyData) {
      throw new HttpException("API key not found", 401);
    }

    const rateLimit = keyData.rateLimit || 60;
    const redisKey = [REDIS_KEY_PREFIX, "partner", "ratelimit", keyData.id].join(
      REDIS_KEY_SEPARATOR
    );
    const now = Date.now();
    const windowMs = 60_000;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, now - windowMs);
    pipeline.zadd(redisKey, now, String(now));
    pipeline.zcard(redisKey);
    pipeline.expire(redisKey, 120);

    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number;

    if (count > rateLimit) {
      const response = context.switchToHttp().getResponse();
      response.setHeader("Retry-After", "60");

      throw new HttpException({ message: "Rate limit exceeded", retryAfter: 60 }, 429);
    }

    return true;
  }
}
