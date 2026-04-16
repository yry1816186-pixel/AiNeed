import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import { TrackEventDto } from "../dto/track-event.dto";

import {
  BehaviorTrackerService,
  BehaviorProfile,
} from "./behavior-tracker.service";

describe("BehaviorTrackerService", () => {
  let service: BehaviorTrackerService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn(),
    lpush: jest.fn(),
    lrange: jest.fn(),
    ltrim: jest.fn(),
    rpop: jest.fn(),
    zadd: jest.fn(),
    zincrby: jest.fn(),
    zrevrange: jest.fn(),
    expire: jest.fn(),
  };

  const mockPrismaService = {
    userConsent: {
      findUnique: jest.fn(),
    },
    userBehaviorEvent: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    userPreferenceWeight: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  beforeEach(async () => {
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setex.mockResolvedValue("OK");
    mockRedisClient.lpush.mockResolvedValue(1);
    mockRedisClient.lrange.mockResolvedValue([]);
    mockRedisClient.ltrim.mockResolvedValue("OK");
    mockRedisClient.rpop.mockResolvedValue(null);
    mockRedisClient.zadd.mockResolvedValue(1);
    mockRedisClient.zincrby.mockResolvedValue("1");
    mockRedisClient.zrevrange.mockResolvedValue([]);
    mockRedisClient.expire.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BehaviorTrackerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BehaviorTrackerService>(BehaviorTrackerService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("track", () => {
    it("应该成功追踪事件（匿名用户）", async () => {
      const event: TrackEventDto = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventType: "page_view" as any,
        sessionId: "session-123",
        category: "page",
        action: "view",
        targetType: "page",
        targetId: "home",
      };

      await service.track(event);

      expect(mockRedisClient.lpush).toHaveBeenCalled();
    });

    it("应该成功追踪事件（已登录用户，已授权）", async () => {
      mockPrismaService.userConsent.findUnique.mockResolvedValue({
        granted: true,
      });

      const event: TrackEventDto = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventType: "item_view" as any,
        userId: "user-123",
        sessionId: "session-123",
        category: "clothing",
        action: "view",
        targetType: "clothing",
        targetId: "item-123",
      };

      await service.track(event);

      expect(mockPrismaService.userConsent.findUnique).toHaveBeenCalled();
      expect(mockRedisClient.lpush).toHaveBeenCalled();
    });

    it("应该跳过未授权用户的追踪", async () => {
      mockPrismaService.userConsent.findUnique.mockResolvedValue({
        granted: false,
      });

      const event: TrackEventDto = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventType: "item_view" as any,
        userId: "user-123",
        sessionId: "session-123",
        category: "clothing",
        action: "view",
        targetType: "clothing",
        targetId: "item-123",
      };

      await service.track(event);

      expect(mockRedisClient.lpush).not.toHaveBeenCalled();
    });

    it("应该更新热门商品统计", async () => {
      const event: TrackEventDto = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventType: "item_view" as any,
        sessionId: "session-123",
        category: "clothing",
        action: "view",
        targetType: "clothing",
        targetId: "item-123",
      };

      await service.track(event);

      expect(mockRedisClient.zincrby).toHaveBeenCalledWith(
        "trending:items",
        1,
        "item-123",
      );
    });

    it("应该更新热门搜索统计", async () => {
      const event: TrackEventDto = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventType: "search" as any,
        sessionId: "session-123",
        category: "search",
        action: "query",
        targetType: "search",
        metadata: { query: "连衣裙" },
      };

      await service.track(event);

      expect(mockRedisClient.zincrby).toHaveBeenCalledWith(
        "trending:searches",
        1,
        "连衣裙",
      );
    });
  });

  describe("getUserBehaviorProfile", () => {
    it("应该返回用户行为画像", async () => {
      mockPrismaService.userPreferenceWeight.findMany.mockResolvedValue([
        { category: "style", key: "casual", weight: 0.8 },
        { category: "color", key: "blue", weight: 0.6 },
        { category: "brand", key: "brand-1", weight: 0.5 },
      ]);
      mockPrismaService.userBehaviorEvent.findMany.mockResolvedValue([]);
      mockPrismaService.userBehaviorEvent.count.mockResolvedValue(10);
      mockPrismaService.userBehaviorEvent.findFirst.mockResolvedValue({
        createdAt: new Date(),
      });

      const result = await service.getUserBehaviorProfile("user-123");
      const firstStyle = result.preferences.styles[0];

      expect(result.preferences.styles).toHaveLength(1);
      expect(firstStyle?.key).toBe("casual");
      expect(result.stats.totalEvents).toBe(10);
    });

    it("应该返回空画像当用户没有行为数据", async () => {
      mockPrismaService.userPreferenceWeight.findMany.mockResolvedValue([]);
      mockPrismaService.userBehaviorEvent.findMany.mockResolvedValue([]);
      mockPrismaService.userBehaviorEvent.count.mockResolvedValue(0);
      mockPrismaService.userBehaviorEvent.findFirst.mockResolvedValue(null);

      const result = await service.getUserBehaviorProfile("user-123");

      expect(result.preferences.styles).toEqual([]);
      expect(result.stats.totalEvents).toBe(0);
      expect(result.stats.lastEventTime).toBeNull();
    });
  });

  describe("getTrending", () => {
    it("应该返回热门商品", async () => {
      mockRedisClient.zrevrange.mockResolvedValue([
        "item-1",
        "10",
        "item-2",
        "5",
      ]);

      const result = await service.getTrending("items", 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "item-1", score: 10 });
      expect(result[1]).toEqual({ id: "item-2", score: 5 });
    });

    it("应该返回热门搜索", async () => {
      mockRedisClient.zrevrange.mockResolvedValue([
        "连衣裙",
        "100",
        "T恤",
        "50",
      ]);

      const result = await service.getTrending("searches", 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "连衣裙", score: 100 });
    });

    it("应该返回空数组当没有数据", async () => {
      mockRedisClient.zrevrange.mockResolvedValue([]);

      const result = await service.getTrending("items", 10);

      expect(result).toEqual([]);
    });
  });
});
