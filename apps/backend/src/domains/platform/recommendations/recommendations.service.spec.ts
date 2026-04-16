/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Test, TestingModule } from "@nestjs/testing";
import {
  BodyType,
  SkinTone,
  ColorSeason,
  ClothingCategory,
} from '../../../types/prisma-enums';

import { PrismaService } from "../../../common/prisma/prisma.service";
import { CacheService } from "../../../modules/cache/cache.service";

import { RecommendationsService } from "./recommendations.service";


describe("RecommendationsService", () => {
  let service: RecommendationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userProfile: {
      findUnique: jest.fn(),
    },
    clothingItem: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    getOrSet: jest.fn().mockImplementation(async (key, fetcher) => fetcher()),
    ttl: jest.fn(),
    exists: jest.fn(),
    refresh: jest.fn(),
  };

  const mockProfile = {
    userId: "test-user-id",
    bodyType: BodyType.hourglass,
    skinTone: SkinTone.medium,
    colorSeason: ColorSeason.autumn_warm,
    stylePreferences: ["casual", "elegant"],
    colorPreferences: ["blue", "black"],
  };

  const mockClothingItem = {
    id: "item-id",
    name: "测试服装",
    price: 199,
    colors: ["olive", "mustard"],
    viewCount: 150,
    likeCount: 80,
    attributes: {
      bodyTypeFit: [BodyType.hourglass],
      colorSeasons: [ColorSeason.autumn_warm],
      style: ["casual"],
      season: ["fall"],
      occasions: ["daily"],
    },
    brand: {
      id: "brand-id",
      name: "测试品牌",
      logo: "https://example.com/logo.jpg",
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getPersonalizedRecommendations", () => {
    it("应该返回个性化推荐", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      // Service returns RecommendedItem[] directly (not wrapped in { items: [...] })
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("item");
      expect(result[0]).toHaveProperty("score");
      expect(result[0]).toHaveProperty("matchReasons");
    });

    it("应该返回热门商品当没有用户档案时", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");
      const firstRecommendation = result[0];

      expect(firstRecommendation?.score).toBe(60);
      expect(firstRecommendation?.matchReasons).toContain("热门单品");
    });

    it("应该按分类筛选", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      await service.getPersonalizedRecommendations("test-user-id", {
        category: ClothingCategory.tops,
      });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: ClothingCategory.tops,
          }),
        }),
      );
    });

    it("应该限制返回数量", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      await service.getPersonalizedRecommendations("test-user-id", {
        limit: 5,
      });

      // Service optimized: uses pageSize * 1.5 instead of limit * 3
      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 15, // pageSize * 1.5 = 15
        }),
      );
    });
  });

  describe("getStyleGuide", () => {
    it("应该返回风格指南", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getStyleGuide("test-user-id");

      expect(result.bodyType).toBe("X型");
      expect(result.colorSeason).toBe("秋季暖型");
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("应该返回默认提示当没有用户档案时", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.getStyleGuide("test-user-id");

      expect(result.bodyType).toBeNull();
      expect(result.skinTone).toBeNull();
      expect(result.colorSeason).toBeNull();
      expect(result.recommendations).toContain("请先完善您的形象档案");
    });

    it("应该返回矩形体型推荐", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        bodyType: BodyType.rectangle,
        colorSeason: null,
      });

      const result = await service.getStyleGuide("test-user-id");

      expect(result.bodyType).toBe("H型");
      expect(result.recommendations).toContain("选择有腰线的款式来创造曲线感");
    });

    it("应该返回春季型色彩推荐", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        bodyType: null,
        colorSeason: ColorSeason.spring_warm,
      });

      const result = await service.getStyleGuide("test-user-id");

      expect(result.colorSeason).toBe("春季暖型");
      expect(result.recommendations.some((r) => r.includes("暖色调"))).toBe(
        true,
      );
    });
  });

  describe("匹配分数计算", () => {
    it("应该为匹配体型的服装加分", async () => {
      const itemWithBodyTypeFit = {
        ...mockClothingItem,
        attributes: {
          ...mockClothingItem.attributes,
          bodyTypeFit: [BodyType.hourglass, BodyType.rectangle],
        },
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        itemWithBodyTypeFit,
      ]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      // 体型匹配应该获得加分
      expect(result[0]!.score).toBeGreaterThan(50);
    });

    it("应该为匹配色彩季型的服装加分", async () => {
      const itemWithColorSeason = {
        ...mockClothingItem,
        attributes: {
          ...mockClothingItem.attributes,
          colorSeasons: [ColorSeason.autumn_warm, ColorSeason.winter_cool],
        },
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        itemWithColorSeason,
      ]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      expect(result[0]!.score).toBeGreaterThan(50);
    });

    it("应该为匹配肤色的服装颜色加分", async () => {
      const itemWithFlatteringColor = {
        ...mockClothingItem,
        colors: ["olive", "mustard", "burgundy"],
        attributes: {},
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        itemWithFlatteringColor,
      ]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      expect(result[0]!.score).toBeGreaterThanOrEqual(50);
    });

    it("应该为匹配风格的服装加分", async () => {
      const itemWithStyle = {
        ...mockClothingItem,
        attributes: {
          bodyTypeFit: [BodyType.hourglass],
        },
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([itemWithStyle]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      expect(result[0]!.score).toBeGreaterThan(50);
    });

    it("应该为匹配季节的服装加分", async () => {
      const itemWithSeason = {
        ...mockClothingItem,
        attributes: {
          seasons: ["fall", "winter"],
        },
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([itemWithSeason]);

      const result = await service.getPersonalizedRecommendations(
        "test-user-id",
        { season: "fall" },
      );

      expect(result[0]!.score).toBeGreaterThan(50);
    });

    it("应该为匹配场合的服装加分", async () => {
      const itemWithOccasion = {
        ...mockClothingItem,
        attributes: {
          styleTags: ["business", "formal"],
        },
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        itemWithOccasion,
      ]);

      const result = await service.getPersonalizedRecommendations(
        "test-user-id",
        { occasion: "work" },
      );

      expect(result[0]!.score).toBeGreaterThan(50);
    });

    it("应该为高浏览量的服装加分", async () => {
      const popularItem = {
        ...mockClothingItem,
        viewCount: 500,
        likeCount: 200,
        attributes: {},
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([popularItem]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      expect(result[0]!.score).toBeGreaterThan(50);
    });

    it("分数不应该超过100", async () => {
      const perfectItem = {
        ...mockClothingItem,
        viewCount: 10000,
        likeCount: 5000,
        attributes: {
          bodyTypeFit: [BodyType.hourglass],
          colorSeasons: [ColorSeason.autumn_warm],
          style: ["casual", "elegant"],
          season: ["fall"],
          occasions: ["daily"],
        },
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([perfectItem]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      expect(result[0]!.score).toBeLessThanOrEqual(100);
    });
  });

  describe("缓存测试", () => {
    it("应该使用缓存存储推荐结果", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      // 第一次调用
      await service.getPersonalizedRecommendations("test-user-id");

      // 验证 getOrSet 被调用
      expect(mockCacheService.getOrSet).toHaveBeenCalled();
    });

    it("应该为不同的用户生成不同的缓存键", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      await service.getPersonalizedRecommendations("user-1");
      await service.getPersonalizedRecommendations("user-2");

      const calls = mockCacheService.getOrSet.mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });

    it("应该为不同的筛选条件生成不同的缓存键", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      await service.getPersonalizedRecommendations("test-user-id", {
        category: ClothingCategory.tops,
      });
      await service.getPersonalizedRecommendations("test-user-id", {
        category: ClothingCategory.bottoms,
      });

      const calls = mockCacheService.getOrSet.mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });
  });

  describe("匹配原因生成", () => {
    it("应该生成体型匹配原因", async () => {
      const itemWithBodyTypeFit = {
        ...mockClothingItem,
        attributes: {
          bodyTypeFit: [BodyType.hourglass],
        },
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        itemWithBodyTypeFit,
      ]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      expect(
        result[0]!.matchReasons.some((r) => r.includes("体型")),
      ).toBe(true);
    });

    it("应该生成色彩季型匹配原因", async () => {
      const itemWithColorSeason = {
        ...mockClothingItem,
        attributes: {
          colorSeasons: [ColorSeason.autumn_warm],
        },
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        itemWithColorSeason,
      ]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      expect(
        result[0]!.matchReasons.some((r) => r.includes("色彩")),
      ).toBe(true);
    });

    it("应该生成肤色匹配原因", async () => {
      const itemWithColor = {
        ...mockClothingItem,
        colors: ["olive"],
        attributes: {},
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([itemWithColor]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      expect(
        result[0]!.matchReasons.some((r) => r.includes("肤色")),
      ).toBe(true);
    });
  });

  describe("体型和色彩季型名称映射", () => {
    it("应该正确映射所有体型名称", async () => {
      const bodyTypes = [
        { type: BodyType.rectangle, expected: "H型" },
        { type: BodyType.triangle, expected: "A型" },
        { type: BodyType.inverted_triangle, expected: "Y型" },
        { type: BodyType.hourglass, expected: "X型" },
        { type: BodyType.oval, expected: "O型" },
      ];

      for (const { type, expected } of bodyTypes) {
        mockPrismaService.userProfile.findUnique.mockResolvedValue({
          ...mockProfile,
          bodyType: type,
          colorSeason: null,
        });

        const result = await service.getStyleGuide("test-user-id");
        expect(result.bodyType).toBe(expected);
      }
    });

    it("应该正确映射所有色彩季型名称", async () => {
      const colorSeasons = [
        { season: ColorSeason.spring_warm, expected: "春季暖型" },
        { season: ColorSeason.spring_light, expected: "春季亮型" },
        { season: ColorSeason.summer_cool, expected: "夏季冷型" },
        { season: ColorSeason.summer_light, expected: "夏季亮型" },
        { season: ColorSeason.autumn_warm, expected: "秋季暖型" },
        { season: ColorSeason.autumn_deep, expected: "秋季深型" },
        { season: ColorSeason.winter_cool, expected: "冬季冷型" },
        { season: ColorSeason.winter_deep, expected: "冬季深型" },
      ];

      for (const { season, expected } of colorSeasons) {
        mockPrismaService.userProfile.findUnique.mockResolvedValue({
          ...mockProfile,
          bodyType: null,
          colorSeason: season,
        });

        const result = await service.getStyleGuide("test-user-id");
        expect(result.colorSeason).toBe(expected);
      }
    });
  });

  describe("边界情况测试", () => {
    it("应该处理空的服装列表", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      // Service returns RecommendedItem[] directly
      expect(result).toEqual([]);
    });

    it("应该处理缺少属性的服装", async () => {
      const itemWithoutAttributes = {
        id: "item-id",
        name: "测试服装",
        price: 199,
        colors: [],
        viewCount: 0,
        likeCount: 0,
        attributes: null,
        brand: null,
      };

      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        itemWithoutAttributes,
      ]);

      const result =
        await service.getPersonalizedRecommendations("test-user-id");

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.score).toBeGreaterThanOrEqual(40);
    });

    it("应该处理 limit 参数", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result = await service.getPersonalizedRecommendations(
        "test-user-id",
        { limit: 5 },
      );

      // Service returns array with limit applied
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });
});
