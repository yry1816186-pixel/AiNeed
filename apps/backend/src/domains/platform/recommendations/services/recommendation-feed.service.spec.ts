/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../../common/prisma/prisma.service";

import { ColdStartService } from "./cold-start.service";
import { ColorMatchingService } from "./color-matching.service";
import { RecommendationCacheService } from "./recommendation-cache.service";
import { RecommendationExplainerService } from "./recommendation-explainer.service";
import { RecommendationFeedService, FeedItem, FeedResult } from "./recommendation-feed.service";
import { UnifiedRecommendationEngine } from "./unified-recommendation.engine";

describe("RecommendationFeedService", () => {
  let service: RecommendationFeedService;
  let prismaService: jest.Mocked<PrismaService>;
  let cacheService: jest.Mocked<RecommendationCacheService>;
  let engine: jest.Mocked<UnifiedRecommendationEngine>;
  let coldStart: jest.Mocked<ColdStartService>;
  let explainer: jest.Mocked<RecommendationExplainerService>;
  let colorMatching: jest.Mocked<ColorMatchingService>;

  const mockFeedItems: FeedItem[] = [
    {
      id: "item_1",
      mainImage: "https://example.com/img1.jpg",
      brand: { id: "brand_1", name: "TestBrand" },
      price: 299,
      originalPrice: 399,
      styleTags: ["casual", "streetwear"],
      colorHarmony: { score: 85, colors: ["#000000", "#FFFFFF"] },
      matchReason: "适合你的休闲风格",
      category: "tops",
    },
    {
      id: "item_2",
      mainImage: "https://example.com/img2.jpg",
      brand: null,
      price: 199,
      styleTags: ["formal"],
      colorHarmony: { score: 70, colors: ["#000080"] },
      matchReason: "适合职场穿搭",
      category: "bottoms",
    },
  ];

  const mockPrismaService = {
    userBehavior: {
      count: jest.fn(),
    },
    clothingItem: {
      findMany: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  };

  const mockEngine = {
    getRecommendations: jest.fn(),
  };

  const mockColdStart = {
    getHybridRecommendations: jest.fn(),
  };

  const mockExplainer = {
    generateReason: jest.fn(),
  };

  const mockColorMatching = {
    hexToRgb: jest.fn(),
    rgbToLab: jest.fn(),
    deltaE2000: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationFeedService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UnifiedRecommendationEngine, useValue: mockEngine },
        { provide: RecommendationExplainerService, useValue: mockExplainer },
        { provide: ColdStartService, useValue: mockColdStart },
        { provide: RecommendationCacheService, useValue: mockCacheService },
        { provide: ColorMatchingService, useValue: mockColorMatching },
      ],
    }).compile();

    service = module.get<RecommendationFeedService>(RecommendationFeedService);
    prismaService = module.get(PrismaService);
    cacheService = module.get(RecommendationCacheService);
    engine = module.get(UnifiedRecommendationEngine);
    coldStart = module.get(ColdStartService);
    explainer = module.get(RecommendationExplainerService);
    colorMatching = module.get(ColorMatchingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getFeed", () => {
    const userId = "user_123";

    it("缓存命中时应该返回缓存数据", async () => {
      mockCacheService.get.mockResolvedValue({
        id: "cache_1",
        userId,
        category: "daily",
        subCategory: null,
        results: mockFeedItems,
        version: "v1",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      const result = await service.getFeed(userId, "daily");

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        userId,
        "daily",
        undefined,
      );
    });

    it("缓存命中时应该支持分页", async () => {
      const manyItems = Array.from({ length: 25 }, (_, i) => ({
        ...mockFeedItems[0],
        id: `item_${i}`,
      }));
      mockCacheService.get.mockResolvedValue({
        id: "cache_1",
        userId,
        category: "daily",
        subCategory: null,
        results: manyItems,
        version: "v1",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      const result = await service.getFeed(userId, "daily", undefined, 2, 10);

      expect(result.items).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(true);
    });

    it("新用户（行为数 < 5）应该使用冷启动推荐", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(3);
      mockColdStart.getHybridRecommendations.mockResolvedValue([
        { itemId: "item_1", score: 0.8, reason: "热门推荐" },
        { itemId: "item_2", score: 0.6, reason: "适合你的风格" },
      ]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        {
          id: "item_1",
          mainImage: "img1.jpg",
          brand: { id: "brand_1", name: "Brand1" },
          price: new (require("@prisma/client").Prisma).Decimal(299),
          originalPrice: null,
          attributes: { colors: ["#000000"], style: ["casual"] },
          category: "tops",
        },
        {
          id: "item_2",
          mainImage: "img2.jpg",
          brand: null,
          price: new (require("@prisma/client").Prisma).Decimal(199),
          originalPrice: null,
          attributes: { colors: ["#000080"], style: ["formal"] },
          category: "bottoms",
        },
      ]);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        colorPreferences: ["#000000"],
        colorSeason: "winter_cool",
      });
      mockColorMatching.hexToRgb.mockReturnValue({ r: 0, g: 0, b: 0 });
      mockColorMatching.rgbToLab.mockReturnValue({ L: 0, a: 0, b: 0 });
      mockColorMatching.deltaE2000.mockReturnValue(5);
      mockCacheService.set.mockResolvedValue({});

      const result = await service.getFeed(userId, "daily");

      expect(mockColdStart.getHybridRecommendations).toHaveBeenCalledWith(
        userId,
        expect.any(Number),
      );
      expect(mockEngine.getRecommendations).not.toHaveBeenCalled();
    });

    it("老用户（行为数 >= 5）应该使用推荐引擎", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue([
        {
          item: { id: "item_1", category: "tops" },
          score: 0.9,
          reasons: ["风格匹配"],
        },
      ]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        {
          id: "item_1",
          mainImage: "img1.jpg",
          brand: { id: "brand_1", name: "Brand1" },
          price: new (require("@prisma/client").Prisma).Decimal(299),
          originalPrice: null,
          attributes: { colors: ["#000000"], style: ["casual"] },
          category: "tops",
        },
      ]);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue({});

      const result = await service.getFeed(userId, "daily");

      expect(mockEngine.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          options: expect.objectContaining({ limit: expect.any(Number) }),
        }),
      );
      expect(mockColdStart.getHybridRecommendations).not.toHaveBeenCalled();
    });

    it("缓存未命中时应该将结果写入缓存", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue([]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockCacheService.set.mockResolvedValue({});

      await service.getFeed(userId, "daily");

      expect(mockCacheService.set).toHaveBeenCalledWith(
        userId,
        "daily",
        expect.any(Array),
        expect.objectContaining({
          subCategory: undefined,
          ttlMs: 30 * 60 * 1000,
        }),
      );
    });

    it("应该支持 subCategory 参数", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue([]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockCacheService.set.mockResolvedValue({});

      await service.getFeed(userId, "occasion", "date");

      expect(mockCacheService.get).toHaveBeenCalledWith(
        userId,
        "occasion",
        "date",
      );
      expect(mockEngine.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { occasion: "date" },
        }),
      );
    });

    it("应该支持不同分类的 feed", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue([]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockCacheService.set.mockResolvedValue({});

      await service.getFeed(userId, "trending");

      expect(mockCacheService.get).toHaveBeenCalledWith(
        userId,
        "trending",
        undefined,
      );
    });

    it("推荐结果为空时应该返回空列表", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue([]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockCacheService.set.mockResolvedValue({});

      const result = await service.getFeed(userId, "daily");

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("应该正确计算 hasMore 标志", async () => {
      const manyItems = Array.from({ length: 25 }, (_, i) => ({
        ...mockFeedItems[0],
        id: `item_${i}`,
      }));
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue(
        manyItems.map((item, i) => ({
          item: { id: item.id, category: "tops" },
          score: 0.9 - i * 0.01,
          reasons: ["推荐"],
        })),
      );
      mockPrismaService.clothingItem.findMany.mockResolvedValue(
        manyItems.map((item, i) => ({
          id: item.id,
          mainImage: `img${i}.jpg`,
          brand: null,
          price: new (require("@prisma/client").Prisma).Decimal(299),
          originalPrice: null,
          attributes: { colors: ["#000000"], style: ["casual"] },
          category: "tops",
        })),
      );
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue({});

      const result = await service.getFeed(userId, "daily", undefined, 1, 10);

      expect(result.hasMore).toBe(true);
    });
  });

  describe("enrichItems", () => {
    it("推荐列表为空时应该返回空数组", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);

      const result = await service.getFeed("user_1", "daily");

      expect(result.items).toEqual([]);
    });

    it("应该正确映射商品属性到 FeedItem", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue([
        {
          item: { id: "item_1", category: "tops" },
          score: 0.9,
          reasons: ["风格匹配"],
        },
      ]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        {
          id: "item_1",
          mainImage: "img1.jpg",
          brand: { id: "brand_1", name: "Brand1" },
          price: new (require("@prisma/client").Prisma).Decimal(299),
          originalPrice: new (require("@prisma/client").Prisma).Decimal(399),
          attributes: {
            colors: ["#000000", "#FFFFFF"],
            style: ["casual", "streetwear"],
            primaryColor: "#000000",
          },
          category: "tops",
        },
      ]);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue({});

      const result = await service.getFeed("user_1", "daily");

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.price).toBe(299);
      expect(result.items[0]!.originalPrice).toBe(399);
      expect(result.items[0]!.brand).toEqual({ id: "brand_1", name: "Brand1" });
      expect(result.items[0]!.styleTags).toEqual(["casual", "streetwear"]);
    });

    it("商品不存在时应该跳过", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue([
        {
          item: { id: "item_nonexistent", category: "tops" },
          score: 0.9,
          reasons: ["推荐"],
        },
      ]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockCacheService.set.mockResolvedValue({});

      const result = await service.getFeed("user_1", "daily");

      expect(result.items).toHaveLength(0);
    });
  });

  describe("calculateColorHarmony", () => {
    it("没有商品颜色时应该返回默认分数 65", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue([
        {
          item: { id: "item_1", category: "tops" },
          score: 0.9,
          reasons: ["推荐"],
        },
      ]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        {
          id: "item_1",
          mainImage: "img1.jpg",
          brand: null,
          price: new (require("@prisma/client").Prisma).Decimal(299),
          originalPrice: null,
          attributes: {},
          category: "tops",
        },
      ]);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue({});

      const result = await service.getFeed("user_1", "daily");

      expect(result.items[0]!.colorHarmony.score).toBe(65);
    });

    it("用户没有颜色偏好时应该返回默认分数 65", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.userBehavior.count.mockResolvedValue(10);
      mockEngine.getRecommendations.mockResolvedValue([
        {
          item: { id: "item_1", category: "tops" },
          score: 0.9,
          reasons: ["推荐"],
        },
      ]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        {
          id: "item_1",
          mainImage: "img1.jpg",
          brand: null,
          price: new (require("@prisma/client").Prisma).Decimal(299),
          originalPrice: null,
          attributes: { colors: ["#000000"] },
          category: "tops",
        },
      ]);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue({});

      const result = await service.getFeed("user_1", "daily");

      expect(result.items[0]!.colorHarmony.score).toBe(65);
    });
  });

  describe("分页边界", () => {
    it("请求超出数据范围时应该返回空列表", async () => {
      mockCacheService.get.mockResolvedValue({
        id: "cache_1",
        userId: "user_1",
        category: "daily",
        subCategory: null,
        results: mockFeedItems,
        version: "v1",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      const result = await service.getFeed("user_1", "daily", undefined, 10, 10);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(2);
    });

    it("最后一页应该正确设置 hasMore 为 false", async () => {
      mockCacheService.get.mockResolvedValue({
        id: "cache_1",
        userId: "user_1",
        category: "daily",
        subCategory: null,
        results: mockFeedItems,
        version: "v1",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      const result = await service.getFeed("user_1", "daily", undefined, 1, 10);

      expect(result.hasMore).toBe(false);
    });
  });
});
