import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";

import { BloggerDashboardService } from "./blogger-dashboard.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService, REDIS_KEY_PREFIX, REDIS_KEY_SEPARATOR } from "../../../common/redis/redis.service";

const DASHBOARD_KEY_PREFIX = `${REDIS_KEY_PREFIX}${REDIS_KEY_SEPARATOR}blogger${REDIS_KEY_SEPARATOR}dashboard`;

describe("BloggerDashboardService", () => {
  let service: BloggerDashboardService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUserId = "user-123";
  const mockPeriod = "7d";
  const cacheKey = `${DASHBOARD_KEY_PREFIX}${REDIS_KEY_SEPARATOR}${mockUserId}${REDIS_KEY_SEPARATOR}${mockPeriod}`;

  const mockBasicResult = {
    period: "7d",
    basic: {
      viewTrend: 100,
      totalLikes: 50,
      totalBookmarks: 20,
      totalComments: 30,
      postCount: 10,
    },
  };

  const mockUserWithBloggerLevel = {
    bloggerLevel: "blogger",
    followerCount: 500,
  };

  const mockUserWithoutBloggerLevel = {
    bloggerLevel: null,
    followerCount: 100,
  };

  const mockPostStats = {
    _sum: {
      viewCount: 100,
      likeCount: 50,
      commentCount: 30,
      bookmarkCount: 20,
    },
    _count: 10,
  };

  const mockProductStats = {
    _sum: {
      salesCount: 25,
    },
  };

  const mockBloggerProducts = [
    { price: 99.9, salesCount: 10, createdAt: new Date() },
    { price: 49.5, salesCount: 5, createdAt: new Date() },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BloggerDashboardService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            communityPost: {
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
            bloggerProduct: {
              aggregate: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            setex: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BloggerDashboardService>(BloggerDashboardService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getDashboard", () => {
    it("should return cached data on cache hit", async () => {
      const cachedData = JSON.stringify(mockBasicResult);
      (redisService.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await service.getDashboard(mockUserId, mockPeriod);

      expect(redisService.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(mockBasicResult);
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it("should fetch from database and cache on cache miss", async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithoutBloggerLevel);
      (prismaService.communityPost.aggregate as jest.Mock).mockResolvedValue(mockPostStats);

      const result = await service.getDashboard(mockUserId, mockPeriod);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { bloggerLevel: true, followerCount: true },
      });
      expect(prismaService.communityPost.aggregate).toHaveBeenCalled();
      expect(redisService.setex).toHaveBeenCalledWith(
        cacheKey,
        300,
        expect.any(String),
      );
      expect(result.period).toBe("7d");
      expect(result.basic).toEqual({
        viewTrend: 100,
        totalLikes: 50,
        totalBookmarks: 20,
        totalComments: 30,
        postCount: 10,
      });
    });

    it("should include enhanced stats when user has bloggerLevel", async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithBloggerLevel);
      (prismaService.communityPost.aggregate as jest.Mock).mockResolvedValue(mockPostStats);
      (prismaService.bloggerProduct.aggregate as jest.Mock).mockResolvedValue(mockProductStats);
      (prismaService.bloggerProduct.findMany as jest.Mock).mockResolvedValue(mockBloggerProducts);

      const result = await service.getDashboard(mockUserId, mockPeriod) as Record<string, unknown>;

      expect(result.enhanced).toBeDefined();
      const enhanced = result.enhanced as Record<string, unknown>;
      expect(enhanced).toHaveProperty("followerGrowth");
      expect(enhanced).toHaveProperty("conversionRate");
      expect(enhanced).toHaveProperty("revenue");
      expect(enhanced).toHaveProperty("totalSales");
      expect(enhanced.totalSales).toBe(25);
      expect(typeof enhanced.conversionRate).toBe("number");
    });

    it("should delete corrupted cache and re-fetch from database", async () => {
      (redisService.get as jest.Mock).mockResolvedValue("invalid-json{{{");
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithoutBloggerLevel);
      (prismaService.communityPost.aggregate as jest.Mock).mockResolvedValue(mockPostStats);

      const result = await service.getDashboard(mockUserId, mockPeriod);

      expect(redisService.del).toHaveBeenCalledWith(cacheKey);
      expect(prismaService.communityPost.aggregate).toHaveBeenCalled();
      expect(result.period).toBe("7d");
    });
  });

  describe("getTrendData", () => {
    it("should throw BadRequestException for invalid metric", async () => {
      await expect(
        service.getTrendData(mockUserId, "invalid_metric" as never, "7d"),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.getTrendData(mockUserId, "invalid_metric" as never, "7d"),
      ).rejects.toThrow("Invalid metric: invalid_metric");
    });

    it("should return trend data for views metric", async () => {
      const mockGroupByResult = [
        {
          createdAt: new Date("2026-04-15"),
          _sum: { viewCount: 30 },
        },
        {
          createdAt: new Date("2026-04-16"),
          _sum: { viewCount: 70 },
        },
      ];
      (prismaService.communityPost.groupBy as jest.Mock).mockResolvedValue(mockGroupByResult);

      const result = await service.getTrendData(mockUserId, "views", "7d");

      expect(prismaService.communityPost.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ["createdAt"],
          where: expect.objectContaining({
            authorId: mockUserId,
            isDeleted: false,
          }),
          _sum: { viewCount: true },
        }),
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(7);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("value");
    });
  });
});
