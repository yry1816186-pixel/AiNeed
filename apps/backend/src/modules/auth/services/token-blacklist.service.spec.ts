import { Test, TestingModule } from "@nestjs/testing";
import { RedisService } from "../../../common/redis/redis.service";
import { TokenBlacklistService } from "./token-blacklist.service";

describe("TokenBlacklistService", () => {
  let service: TokenBlacklistService;
  let redisService: RedisService;

  const mockRedisService = {
    setex: jest.fn().mockResolvedValue("OK"),
    exists: jest.fn().mockResolvedValue(false),
    lpush: jest.fn().mockResolvedValue(1),
    lrange: jest.fn().mockResolvedValue([]),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-2),
    del: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("blacklistToken", () => {
    it("should blacklist a token with correct key and TTL", async () => {
      const jti = "test-jti-123";
      const ttl = 900;

      await service.blacklistToken(jti, ttl);

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        `token:blacklist:${jti}`,
        ttl,
        "1",
      );
    });

    it("should not blacklist when jti is empty", async () => {
      await service.blacklistToken("", 900);

      expect(mockRedisService.setex).not.toHaveBeenCalled();
    });

    it("should not blacklist when jti is undefined", async () => {
      await service.blacklistToken(undefined as any, 900);

      expect(mockRedisService.setex).not.toHaveBeenCalled();
    });
  });

  describe("isBlacklisted", () => {
    it("should return true when token is blacklisted", async () => {
      mockRedisService.exists.mockResolvedValue(true);
      const jti = "blacklisted-jti";

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(true);
      expect(mockRedisService.exists).toHaveBeenCalledWith(`token:blacklist:${jti}`);
    });

    it("should return false when token is not blacklisted", async () => {
      mockRedisService.exists.mockResolvedValue(false);
      const jti = "valid-jti";

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(false);
    });

    it("should return false when jti is empty", async () => {
      const result = await service.isBlacklisted("");

      expect(result).toBe(false);
      expect(mockRedisService.exists).not.toHaveBeenCalled();
    });

    it("should return false when jti is undefined", async () => {
      const result = await service.isBlacklisted(undefined as any);

      expect(result).toBe(false);
      expect(mockRedisService.exists).not.toHaveBeenCalled();
    });
  });

  describe("blacklistAllUserTokens", () => {
    it("should blacklist all tracked tokens for a user", async () => {
      const userId = "user-123";
      const jtis = ["jti-1", "jti-2", "jti-3"];
      mockRedisService.lrange.mockResolvedValue(jtis);
      mockRedisService.ttl.mockResolvedValue(-2);

      await service.blacklistAllUserTokens(userId);

      expect(mockRedisService.lrange).toHaveBeenCalledWith(
        `user:tokens:${userId}`,
        0,
        -1,
      );
      expect(mockRedisService.setex).toHaveBeenCalledTimes(3);
      expect(mockRedisService.del).toHaveBeenCalledWith(`user:tokens:${userId}`);
    });

    it("should not setex when token already has a TTL", async () => {
      const userId = "user-123";
      const jtis = ["jti-1"];
      mockRedisService.lrange.mockResolvedValue(jtis);
      mockRedisService.ttl.mockResolvedValue(500);

      await service.blacklistAllUserTokens(userId);

      expect(mockRedisService.setex).not.toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalledWith(`user:tokens:${userId}`);
    });

    it("should handle user with no tracked tokens", async () => {
      const userId = "user-no-tokens";
      mockRedisService.lrange.mockResolvedValue([]);

      await service.blacklistAllUserTokens(userId);

      expect(mockRedisService.setex).not.toHaveBeenCalled();
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });
  });

  describe("trackUserToken", () => {
    it("should track a user token with correct key and TTL", async () => {
      const userId = "user-123";
      const jti = "jti-456";
      const ttl = 900;

      await service.trackUserToken(userId, jti, ttl);

      expect(mockRedisService.lpush).toHaveBeenCalledWith(
        `user:tokens:${userId}`,
        jti,
      );
      expect(mockRedisService.expire).toHaveBeenCalledWith(
        `user:tokens:${userId}`,
        ttl,
      );
    });

    it("should not track when jti is empty", async () => {
      await service.trackUserToken("user-123", "", 900);

      expect(mockRedisService.lpush).not.toHaveBeenCalled();
    });

    it("should not track when userId is empty", async () => {
      await service.trackUserToken("", "jti-456", 900);

      expect(mockRedisService.lpush).not.toHaveBeenCalled();
    });
  });

  describe("integration scenarios", () => {
    it("should support full blacklist-then-check flow", async () => {
      const jti = "integration-jti";
      const ttl = 900;

      mockRedisService.setex.mockResolvedValue("OK");
      await service.blacklistToken(jti, ttl);

      mockRedisService.exists.mockResolvedValue(true);
      const isBlacklisted = await service.isBlacklisted(jti);

      expect(isBlacklisted).toBe(true);
    });

    it("should support token not blacklisted flow", async () => {
      const jti = "valid-jti";

      mockRedisService.exists.mockResolvedValue(false);
      const isBlacklisted = await service.isBlacklisted(jti);

      expect(isBlacklisted).toBe(false);
    });
  });
});
