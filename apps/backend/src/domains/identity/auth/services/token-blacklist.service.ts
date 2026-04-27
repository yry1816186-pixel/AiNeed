import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";

const BLACKLIST_KEY_PREFIX = "token:blacklist:";
const USER_TOKENS_KEY_PREFIX = "user:tokens:";

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private redisAvailable = true;

  constructor(private redisService: RedisService, private prisma: PrismaService) {}

  async blacklistToken(jti: string, expiresInSeconds: number): Promise<void> {
    if (!jti) {
      this.logger.warn("Attempted to blacklist token without jti");
      return;
    }
    const key = `${BLACKLIST_KEY_PREFIX}${jti}`;

    try {
      await this.redisService.setex(key, expiresInSeconds, "1");
      this.redisAvailable = true;
      this.logger.debug(`Token blacklisted: ${jti.substring(0, 8)}... TTL: ${expiresInSeconds}s`);
    } catch (error) {
      this.redisAvailable = false;
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Redis unavailable for blacklisting token ${jti.substring(
          0,
          8
        )}... Falling back to DB: ${msg}`
      );
      await this.blacklistTokenInDb(jti, expiresInSeconds);
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    if (!jti) {
      return false;
    }

    // Try Redis first
    if (this.redisAvailable) {
      try {
        const key = `${BLACKLIST_KEY_PREFIX}${jti}`;
        const exists = await this.redisService.exists(key);
        if (exists) {
          return true;
        }
        // Token not in Redis; also check DB in case it was stored during a Redis outage
      } catch (error) {
        this.redisAvailable = false;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Redis unavailable for checking blacklist, falling back to DB: ${msg}`);
      }
    }

    // Fallback: check database
    return this.isBlacklistedInDb(jti);
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
    this.logger.log(
      `All tokens blacklisted for user: ${userId.substring(0, 8)}... (${jtis.length} tokens)`
    );
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

  // ==================== DB fallback methods ====================

  /**
   * Store blacklisted token in database as fallback when Redis is unavailable.
   */
  private async blacklistTokenInDb(jti: string, expiresInSeconds: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO token_blacklist (jti, expires_at, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (jti) DO NOTHING`,
        jti,
        expiresAt
      );
    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      this.logger.error(
        `Failed to blacklist token in DB: ${msg}.` +
          ` Run migration: npx prisma migrate dev --name add_token_blacklist`
      );
    }
  }

  /**
   * Check if a JTI is blacklisted via database fallback.
   */
  private async isBlacklistedInDb(jti: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS(
          SELECT 1 FROM token_blacklist
          WHERE jti = $1 AND expires_at > NOW()
        ) as "exists"`,
        jti
      );
      return result[0]?.exists ?? false;
    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      this.logger.warn(`DB blacklist check failed for jti: ${msg}`);
      return false;
    }
  }
}
