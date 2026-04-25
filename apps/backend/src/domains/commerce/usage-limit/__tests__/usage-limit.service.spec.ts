import { Test } from "@nestjs/testing";
import { RedisService, REDIS_CLIENT } from "../../../../common/redis/redis.service";

import { UsageLimitService } from "../usage-limit.service";

describe("UsageLimitService", () => {
  let service: UsageLimitService;
  let redisService: {
    incr: jest.Mock;
    expire: jest.Mock;
    ttl: jest.Mock;
  };

  beforeEach(async () => {
    redisService = {
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsageLimitService,
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    service = module.get<UsageLimitService>(UsageLimitService);
  });

  describe("incrementUsage", () => {
    it("should create Redis key xuno:usage:{userId}:{actionType}:{date} with INCR and set TTL on first increment", async () => {
      // First increment returns 1 -- should trigger expire
      redisService.incr.mockResolvedValueOnce(1);
      redisService.expire.mockResolvedValueOnce(undefined);
      redisService.ttl.mockResolvedValueOnce(86400);

      const result = await service.incrementUsage("user-1", "ai_chat");

      // Verify Redis key format uses xuno prefix and Shanghai timezone date
      expect(redisService.incr).toHaveBeenCalledTimes(1);
      const calledKey = redisService.incr.mock.calls[0][0] as string;
      expect(calledKey).toMatch(/^xuno:usage:user-1:ai_chat:\d{4}-\d{2}-\d{2}$/);

      // First increment should set TTL
      expect(redisService.expire).toHaveBeenCalledTimes(1);
      const [expireKey, ttlSeconds] = redisService.expire.mock.calls[0];
      expect(expireKey).toBe(calledKey);
      expect(ttlSeconds).toBeGreaterThan(0);
      expect(ttlSeconds).toBeLessThanOrEqual(86400);

      expect(result.count).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    it("should NOT call expire on subsequent increments (count > 1)", async () => {
      // Second increment returns 2 -- should NOT trigger expire
      redisService.incr.mockResolvedValueOnce(2);
      redisService.ttl.mockResolvedValueOnce(86000);

      const result = await service.incrementUsage("user-1", "ai_chat");

      expect(redisService.incr).toHaveBeenCalledTimes(1);
      expect(redisService.expire).not.toHaveBeenCalled();

      expect(result.count).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(3);
    });

    it("should return remaining=0 when count exceeds limit", async () => {
      // Count exceeds limit
      redisService.incr.mockResolvedValueOnce(6);
      redisService.ttl.mockResolvedValueOnce(80000);

      const result = await service.incrementUsage("user-1", "ai_chat");

      expect(result.count).toBe(6);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(0);
    });
  });

  describe("getLimit", () => {
    it("should return 5 for ai_chat", () => {
      expect(service.getLimit("ai_chat")).toBe(5);
    });

    it("should return 3 for try_on", () => {
      expect(service.getLimit("try_on")).toBe(3);
    });

    it("should return 20 for wardrobe_item", () => {
      expect(service.getLimit("wardrobe_item")).toBe(20);
    });

    it("should return 10 for unknown types", () => {
      expect(service.getLimit("unknown_action")).toBe(10);
    });
  });

  describe("getSecondsUntilMidnight", () => {
    it("should return a positive number of seconds less than or equal to 86400", () => {
      const seconds = service.getSecondsUntilMidnight();
      expect(seconds).toBeGreaterThan(0);
      expect(seconds).toBeLessThanOrEqual(86400);
    });
  });
});
