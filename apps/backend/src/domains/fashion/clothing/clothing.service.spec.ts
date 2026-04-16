import { Test, TestingModule } from "@nestjs/testing";
import { ClothingCategory } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { CacheService } from "../../../modules/cache/cache.service";

import { ClothingService } from "./clothing.service";


describe("ClothingService", () => {
  let service: ClothingService;
  let prisma: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    clothingItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    brand: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
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

  const mockClothingItem = {
    id: "item-id",
    name: "测试服装",
    description: "这是一个测试服装",
    price: 199.0,
    originalPrice: 299.0,
    currency: "CNY",
    colors: ["红色", "蓝色"],
    sizes: ["S", "M", "L"],
    tags: ["夏季", "休闲"],
    category: ClothingCategory.tops,
    brandId: "brand-id",
    mainImage: "https://example.com/main.jpg",
    images: ["https://example.com/main.jpg", "https://example.com/second.jpg"],
    viewCount: 100,
    likeCount: 50,
    isActive: true,
    isDeleted: false,
    isFeatured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    brand: {
      id: "brand-id",
      name: "测试品牌",
      logo: "https://example.com/logo.jpg",
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClothingService,
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

    service = module.get<ClothingService>(ClothingService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getItems", () => {
    it("应该返回商品列表", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      const result = await service.getItems({});
      const firstItem = result.items[0];

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(firstItem?.name).toBe("测试服装");
      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, isDeleted: false },
        }),
      );
    });

    it("应该按分类过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.getItems({ category: ClothingCategory.tops });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: ClothingCategory.tops,
          }),
        }),
      );
    });

    it("应该按品牌过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.getItems({ brandId: "brand-id" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            brandId: "brand-id",
          }),
        }),
      );
    });

    it("应该按价格范围过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.getItems({ minPrice: 100, maxPrice: 500 });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 100, lte: 500 },
          }),
        }),
      );
    });

    it("应该按颜色过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.getItems({ colors: ["红色"] });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            colors: { hasSome: ["红色"] },
          }),
        }),
      );
    });

    it("应该正确分页", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(50);

      const result = await service.getItems({ page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it("应该正确排序", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getItems({ sortBy: "price", sortOrder: "asc" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: "asc" },
        }),
      );
    });

    it("应该返回空列表", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      const result = await service.getItems({});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe("getItemById", () => {
    it("应该返回商品详情", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.clothingItem.update.mockResolvedValue({
        ...mockClothingItem,
        viewCount: 101,
      });

      const result = await service.getItemById("item-id");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("item-id");
      expect(result?.name).toBe("测试服装");
      // View count update is async, wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockPrismaService.clothingItem.update).toHaveBeenCalledWith({
        where: { id: "item-id" },
        data: { viewCount: { increment: 1 } },
      });
    });

    it("应该返回 null 当商品不存在", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(null);

      const result = await service.getItemById("non-existent-id");

      expect(result).toBeNull();
    });

    it("应该过滤软删除的商品", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(null);

      await service.getItemById("item-id");

      expect(mockPrismaService.clothingItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-id", isDeleted: false },
        }),
      );
    });

    it("应该静默处理浏览量更新错误", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(mockClothingItem);
      mockPrismaService.clothingItem.update.mockRejectedValue(new Error("Update failed"));

      // Should not throw
      const result = await service.getItemById("item-id");

      expect(result).not.toBeNull();
    });
  });

  describe("getFeaturedItems", () => {
    it("应该返回精选商品", async () => {
      const featuredItem = { ...mockClothingItem, isFeatured: true };
      mockPrismaService.clothingItem.findMany.mockResolvedValue([featuredItem]);

      const result = await service.getFeaturedItems(5);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("item-id");
      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, isFeatured: true, isDeleted: false },
          take: 5,
        }),
      );
    });

    it("应该使用默认数量限制", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);

      await service.getFeaturedItems();

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it("应该返回空数组当缓存返回 null", async () => {
      mockCacheService.getOrSet.mockResolvedValueOnce(null);

      const result = await service.getFeaturedItems(10);

      expect(result).toEqual([]);
    });
  });

  describe("getCategories", () => {
    it("应该返回所有分类", async () => {
      const result = await service.getCategories();

      expect(result).toContain(ClothingCategory.tops);
      expect(result).toContain(ClothingCategory.bottoms);
      expect(result).toContain(ClothingCategory.dresses);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getPopularTags", () => {
    it("应该返回热门标签", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        { tag: "夏季", count: BigInt(100) },
        { tag: "休闲", count: BigInt(80) },
      ]);

      const result = await service.getPopularTags(20);

      expect(result).toEqual(["夏季", "休闲"]);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it("应该使用默认数量限制", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await service.getPopularTags();

      // 验证 $queryRaw 被调用
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it("应该返回空数组当没有标签", async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getPopularTags();

      expect(result).toEqual([]);
    });

    it("应该返回空数组当缓存返回 null", async () => {
      mockCacheService.getOrSet.mockResolvedValueOnce(null);

      const result = await service.getPopularTags(20);

      expect(result).toEqual([]);
    });
  });

  describe("缓存集成", () => {
    it("应该使用缓存获取商品列表", async () => {
      mockCacheService.getOrSet.mockResolvedValueOnce({
        items: [mockClothingItem],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });

      const result = await service.getItems({});

      expect(cacheService.getOrSet).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it("应该返回默认结果当缓存返回 null", async () => {
      mockCacheService.getOrSet.mockResolvedValueOnce(null);

      const result = await service.getItems({ page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(0);
    });
  });

  describe("边界条件", () => {
    it("应该处理空的过滤器参数", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      const result = await service.getItems({
        colors: [],
        sizes: [],
        tags: [],
      });

      expect(result.items).toEqual([]);
    });

    it("应该处理只有最低价格", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getItems({ minPrice: 100 });

      const findManyCall = mockPrismaService.clothingItem.findMany.mock.calls[0][0];
      expect(findManyCall.where.price.gte).toBe(100);
      expect(findManyCall.where.price.lte).toBeUndefined();
    });

    it("应该处理只有最高价格", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getItems({ maxPrice: 500 });

      const findManyCall = mockPrismaService.clothingItem.findMany.mock.calls[0][0];
      expect(findManyCall.where.price.gte).toBeUndefined();
      expect(findManyCall.where.price.lte).toBe(500);
    });

    it("应该计算正确的总页数", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(45);

      const result = await service.getItems({ limit: 10 });

      expect(result.totalPages).toBe(5);
    });

    it("应该处理零总数商品", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      const result = await service.getItems({});

      expect(result.totalPages).toBe(0);
    });
  });

  describe("尺寸和标签过滤", () => {
    it("应该按尺寸过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.getItems({ sizes: ["M", "L"] });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sizes: { hasSome: ["M", "L"] },
          }),
        }),
      );
    });

    it("应该按标签过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.getItems({ tags: ["夏季", "休闲"] });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ["夏季", "休闲"] },
          }),
        }),
      );
    });

    it("应该组合多个过滤条件", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      await service.getItems({
        category: ClothingCategory.tops,
        colors: ["红色"],
        sizes: ["M"],
        tags: ["夏季"],
        minPrice: 100,
        maxPrice: 500,
      });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: ClothingCategory.tops,
            colors: { hasSome: ["红色"] },
            sizes: { hasSome: ["M"] },
            tags: { hasSome: ["夏季"] },
            price: { gte: 100, lte: 500 },
          }),
        }),
      );
    });
  });

  describe("价格类型处理", () => {
    it("应该正确处理 Decimal 类型的价格", async () => {
      const itemWithDecimalPrice = {
        ...mockClothingItem,
        price: { toString: () => "199.99", toNumber: () => 199.99 },
        originalPrice: { toString: () => "299.99", toNumber: () => 299.99 },
      };
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(
        itemWithDecimalPrice,
      );

      const result = await service.getItemById("item-id");

      expect(result).not.toBeNull();
      expect(result?.price).toBe(199.99);
      expect(result?.originalPrice).toBe(299.99);
    });

    it("应该处理 null 原价", async () => {
      const itemWithNullPrice = {
        ...mockClothingItem,
        originalPrice: null,
      };
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(
        itemWithNullPrice,
      );

      const result = await service.getItemById("item-id");

      expect(result).not.toBeNull();
      expect(result?.originalPrice).toBeNull();
    });
  });

  describe("排序功能", () => {
    it("应该按浏览量排序", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getItems({ sortBy: "viewCount", sortOrder: "desc" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viewCount: "desc" },
        }),
      );
    });

    it("应该按点赞数排序", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getItems({ sortBy: "likeCount", sortOrder: "asc" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { likeCount: "asc" },
        }),
      );
    });
  });

  describe("数据规范化", () => {
    it("应该正确规范化商品列表", async () => {
      const items = [
        {
          ...mockClothingItem,
          mainImage: null,
        },
        mockClothingItem,
      ];
      mockPrismaService.clothingItem.findMany.mockResolvedValue(items);
      mockPrismaService.clothingItem.count.mockResolvedValue(2);

      const result = await service.getItems({});

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.mainImage).toBeNull();
      expect(result.items[1]?.mainImage).toBe(mockClothingItem.mainImage);
    });

    it("应该处理空图片数组", async () => {
      const itemWithEmptyImages = {
        ...mockClothingItem,
        images: [],
        mainImage: null,
      };
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(
        itemWithEmptyImages,
      );

      const result = await service.getItemById("item-id");

      expect(result).not.toBeNull();
      expect(result?.mainImage).toBeNull();
      expect(result?.images).toEqual([]);
    });

    it("应该处理空颜色和尺寸数组", async () => {
      const itemWithEmptyArrays = {
        ...mockClothingItem,
        colors: null,
        sizes: null,
        tags: null,
      };
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(
        itemWithEmptyArrays,
      );

      const result = await service.getItemById("item-id");

      expect(result).not.toBeNull();
      expect(result?.colors).toEqual([]);
      expect(result?.sizes).toEqual([]);
      expect(result?.tags).toEqual([]);
    });
  });

  describe("异常处理", () => {
    it("应该处理数据库查询错误", async () => {
      mockPrismaService.clothingItem.findMany.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(service.getItems({})).rejects.toThrow("Database error");
    });

    it("应该处理原始查询错误", async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error("Raw query error"),
      );

      await expect(service.getPopularTags()).rejects.toThrow("Raw query error");
    });
  });
});
