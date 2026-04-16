/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "../../../../../../../common/redis/redis.service";

const BLACKLIST_KEY_PREFIX = "token:blacklist:";
const USER_TOKENS_KEY_PREFIX = "user:tokens:";

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private redisService: RedisService) {}

  async blacklistToken(jti: string, expiresInSeconds: number): Promise<void> {
    if (!jti) {
      this.logger.warn("Attempted to blacklist token without jti");
      return;
    }
    const key = `${BLACKLIST_KEY_PREFIX}${jti}`;
    await this.redisService.setex(key, expiresInSeconds, "1");
    this.logger.debug(`Token blacklisted: ${jti.substring(0, 8)}... TTL: ${expiresInSeconds}s`);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    if (!jti) {
      return false;
    }
    const key = `${BLACKLIST_KEY_PREFIX}${jti}`;
    return this.redisService.exists(key);
  }

  async blacklistAllUserTokens(userId: string): Promise<void> {
    const userTokensKey = `${USER_TOKENS_KEY_PREFIX}${userId}`;
    const jtis = await this.redisService.lrange(userTokensKey, 0, -1);

    if (jtis.length === 0) {
      this.logger.debug(`No tracked tokens found for user: ${userId.substring(0, 8)}...`);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const maxTtl = 15 * 60;

    for (const jti of jtis) {
      const key = `${BLACKLIST_KEY_PREFIX}${jti}`;
      const ttl = await this.redisService.ttl(key);
      if (ttl < 0) {
        await this.redisService.setex(key, maxTtl, "1");
      }
    }

    await this.redisService.del(userTokensKey);
    this.logger.log(`All tokens blacklisted for user: ${userId.substring(0, 8)}... (${jtis.length} tokens)`);
  }

  async trackUserToken(userId: string, jti: string, expiresInSeconds: number): Promise<void> {
    if (!jti || !userId) {
      return;
    }
    const userTokensKey = `${USER_TOKENS_KEY_PREFIX}${userId}`;
    await this.redisService.lpush(userTokensKey, jti);
    // 仅在 key 首次创建时设置 expire，避免每次 lpush 都重置 TTL
    // 检查当前 TTL：-1 表示 key 存在但无过期时间（需要设置），-2 表示 key 不存在
    const currentTtl = await this.redisService.ttl(userTokensKey);
    if (currentTtl === -1 || currentTtl === -2) {
      await this.redisService.expire(userTokensKey, expiresInSeconds);
    }
    // currentTtl > 0 表示 key 已有 TTL，保留不重置
  }
}
