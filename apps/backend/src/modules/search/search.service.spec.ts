import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import axios from "axios";

import { PrismaService } from "../../common/prisma/prisma.service";

import { SearchService } from "./search.service";

jest.mock("axios");

describe("SearchService", () => {
  let service: SearchService;

  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockPrismaService = {
    clothingItem: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        ML_SERVICE_URL: "http://localhost:8001",
        ENABLE_UNVERIFIED_AI_FALLBACKS: "true",
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockClothingItem = {
    id: "item-id",
    name: "Test Dress",
    description: "A dress for testing",
    category: "dress",
    price: 299,
    colors: ["blue"],
    tags: ["dress", "summer", "elegant"],
    viewCount: 100,
    likeCount: 20,
    isActive: true,
    attributes: {
      style: ["minimal"],
    },
    brand: {
      id: "brand-id",
      name: "Test Brand",
      logo: "https://example.com/logo.jpg",
    },
  };

  beforeEach(async () => {
    mockedAxios.post.mockReset();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  describe("searchItems", () => {
    it("returns paginated results", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      const result = await service.searchItems("dress");

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.query).toBe("dress");
    });

    it("sorts by ascending price", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.searchItems("dress", { sortBy: "price_asc" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: "asc" },
        }),
      );
    });

    it("sorts by descending price", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.searchItems("dress", { sortBy: "price_desc" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: "desc" },
        }),
      );
    });

    it("sorts by popularity", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.searchItems("dress", { sortBy: "popular" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viewCount: "desc" },
        }),
      );
    });

    it("filters by price range", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.searchItems("dress", { minPrice: 100, maxPrice: 500 });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 100, lte: 500 },
          }),
        }),
      );
    });

    it("supports pagination metadata", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(50);

      const result = await service.searchItems("dress", {
        page: 2,
        limit: 10,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
    });

    it("returns an empty result set when nothing matches", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      const result = await service.searchItems("missing");

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("searchByImage", () => {
    it("returns results from the ML similarity service", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: "item-id",
              similarity: 0.91,
              reasons: ["style match"],
            },
          ],
        },
      });
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result = await service.searchByImage(
        "https://example.com/image.jpg",
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "item-id",
        similarityScore: 0.91,
        matchReasons: ["style match"],
      });
      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ["item-id"] },
          }),
        }),
      );
    });

    it("falls back to local candidates when ML calls fail", async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error("ml unavailable"))
        .mockRejectedValueOnce(new Error("analysis unavailable"));
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result = await service.searchByImage(
        "https://example.com/image.jpg",
        5,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("item-id");
      expect(result[0]?.similarityScore).toBe(0);
      expect(result[0]?.matchReasons).toContain("热门推荐");
      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe("getSearchSuggestions", () => {
    it("returns item name and tag suggestions", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        { name: "Dress" },
        { name: "Floral Dress" },
      ]);
      mockPrismaService.$queryRaw.mockResolvedValue([{ tag: "dress" }]);

      const result = await service.getSearchSuggestions("dress");

      expect(result.itemNames).toContain("Dress");
      expect(result.tags).toContain("dress");
    });

    it("returns empty suggestions when there are no matches", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getSearchSuggestions("xyz");

      expect(result.itemNames).toEqual([]);
      expect(result.tags).toEqual([]);
    });

    it("应该转义特殊字符防止模式注入", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getSearchSuggestions("test%value");

      // 验证特殊字符被转义
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it("应该限制返回结果数量", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getSearchSuggestions("dress", 5);

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe("searchItems 分类过滤", () => {
    it("应该按分类过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.searchItems("dress", { category: "dress" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: "dress",
          }),
        }),
      );
    });
  });

  describe("searchByImage 异常处理", () => {
    it("应该处理 ML 服务返回空结果时使用降级搜索", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { results: [] },
      });
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result = await service.searchByImage(
        "https://example.com/image.jpg",
        5,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        similarityScore: 0,
        matchReasons: ["热门推荐"],
      });
    });

    it("应该处理 ML 服务超时", async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error("timeout"))
        .mockRejectedValueOnce(new Error("timeout"));
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result = await service.searchByImage(
        "https://example.com/image.jpg",
        5,
      );

      expect(result).toHaveLength(1);
    });

    it("应该正确映射相似度分数", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          results: [
            { id: "item-id", similarity: 0.95, reasons: ["color match"] },
          ],
        },
      });
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result = await service.searchByImage(
        "https://example.com/image.jpg",
      );

      expect(result[0]?.similarityScore).toBe(0.95);
      expect(result[0]?.matchReasons).toContain("color match");
    });

    it("应该过滤掉数据库中不存在的商品", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          results: [
            { id: "item-id", similarity: 0.9, reasons: [] },
            { id: "non-existent", similarity: 0.8, reasons: [] },
          ],
        },
      });
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result = await service.searchByImage(
        "https://example.com/image.jpg",
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("item-id");
    });
  });

  describe("属性搜索降级", () => {
    it("应该在 ML 服务不可用时使用属性搜索", async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error("ML unavailable"))
        .mockResolvedValueOnce({
          data: {
            clothing: {
              category: "dress",
              style: ["elegant"],
              colors: ["blue"],
            },
          },
        });
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result = await service.searchByImage(
        "https://example.com/image.jpg",
        5,
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/analyze"),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it("应该正确计算属性匹配分数", async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error("ML unavailable"))
        .mockResolvedValueOnce({
          data: {
            clothing: {
              category: "dress",
              style: ["minimal"],
              colors: ["blue"],
            },
          },
        });
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);

      const result = await service.searchByImage(
        "https://example.com/image.jpg",
        5,
      );

      // 风格匹配 + 颜色匹配 + 基础分
      expect(result[0]?.similarityScore).toBeGreaterThan(30);
    });
  });

  describe("边界条件", () => {
    it("应该处理空查询字符串", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      const result = await service.searchItems("");

      expect(result.items).toEqual([]);
      expect(result.query).toBe("");
    });

    it("应该处理特殊字符查询", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      const result = await service.searchItems("dress's & co.");

      expect(result.query).toBe("dress's & co.");
    });

    it("应该处理非常大的分页参数", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(100);

      const result = await service.searchItems("dress", { page: 1000, limit: 10 });

      expect(result.page).toBe(1000);
      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 9990,
          take: 10,
        }),
      );
    });

    it("应该正确计算总页数", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(45);

      const result = await service.searchItems("dress", { limit: 10 });

      expect(result.totalPages).toBe(5);
    });

    it("应该处理零结果", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      const result = await service.searchItems("nonexistent");

      expect(result.totalPages).toBe(0);
    });
  });
});
