/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { PriceRange, ClothingCategory } from "@prisma/client";

import { EncryptionService } from "../../../common/encryption/encryption.service";
import { PrismaService } from "../../../common/prisma/prisma.service";

import { BrandsService } from "./brands.service";

describe("BrandsService", () => {
  let service: BrandsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    brand: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    clothingItem: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    brandMerchant: {
      findFirst: jest.fn(),
    },
  };

  const mockEncryptionService = {
    encrypt: jest.fn((value: string) => `enc:${value}`),
    decrypt: jest.fn((value: string) => value.replace(/^enc:/, "")),
    hash: jest.fn((value: string) => `hash:${value}`),
    verifyHash: jest.fn((value: string, hash: string) => hash === `hash:${value}`),
    isEncrypted: jest.fn((value: string) => value?.startsWith("enc:")),
  };

  const mockBrand = {
    id: "brand-id",
    name: "测试品牌",
    slug: "test-brand",
    logo: "https://example.com/logo.jpg",
    description: "这是一个测试品牌",
    website: "https://example.com",
    categories: [ClothingCategory.tops],
    priceRange: PriceRange.mid_range,
    isActive: true,
    _count: { products: 10 },
  };

  const mockClothingItem = {
    id: "item-id",
    name: "测试商品",
    price: 199,
    brandId: "brand-id",
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllBrands", () => {
    it("应该返回品牌列表", async () => {
      mockPrismaService.brand.findMany.mockResolvedValue([mockBrand]);
      mockPrismaService.brand.count.mockResolvedValue(1);

      const result = await service.getAllBrands();
      const firstItem = result.items[0];

      expect(result.items).toHaveLength(1);
      expect(firstItem?.name).toBe("测试品牌");
      expect(firstItem?.productCount).toBe(10);
      expect(result.total).toBe(1);
    });

    it("应该按价格范围过滤", async () => {
      mockPrismaService.brand.findMany.mockResolvedValue([]);
      mockPrismaService.brand.count.mockResolvedValue(0);

      await service.getAllBrands({ priceRange: PriceRange.luxury });

      expect(mockPrismaService.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priceRange: PriceRange.luxury,
          }),
        }),
      );
    });

    it("应该按分类过滤", async () => {
      mockPrismaService.brand.findMany.mockResolvedValue([]);
      mockPrismaService.brand.count.mockResolvedValue(0);

      await service.getAllBrands({ category: ClothingCategory.tops });

      expect(mockPrismaService.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: { has: ClothingCategory.tops },
          }),
        }),
      );
    });

    it("应该支持分页", async () => {
      mockPrismaService.brand.findMany.mockResolvedValue([]);
      mockPrismaService.brand.count.mockResolvedValue(50);

      const result = await service.getAllBrands({ page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
    });
  });

  describe("getBrandBySlug", () => {
    it("应该返回品牌详情", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue(mockBrand);

      const result = await service.getBrandBySlug("test-brand");

      expect(result).not.toBeNull();
      expect(result?.slug).toBe("test-brand");
      expect(result?.productCount).toBe(10);
    });

    it("应该返回 null 当品牌不存在", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue(null);

      const result = await service.getBrandBySlug("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getBrandProducts", () => {
    it("应该返回品牌商品列表", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue(mockBrand);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([
        mockClothingItem,
      ]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      const result = await service.getBrandProducts("test-brand");

      expect(result).not.toBeNull();
      expect(result?.brand.name).toBe("测试品牌");
      expect(result?.items).toHaveLength(1);
    });

    it("应该返回 null 当品牌不存在", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue(null);

      const result = await service.getBrandProducts("non-existent");

      expect(result).toBeNull();
    });

    it("应该按价格范围过滤", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue(mockBrand);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getBrandProducts("test-brand", {
        minPrice: 100,
        maxPrice: 500,
      });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 100, lte: 500 },
          }),
        }),
      );
    });

    it("应该支持排序", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue(mockBrand);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getBrandProducts("test-brand", {
        sortBy: "price",
        sortOrder: "asc",
      });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: "asc" },
        }),
      );
    });
  });

  describe("getFeaturedBrands", () => {
    it("应该返回精选品牌", async () => {
      mockPrismaService.brand.findMany.mockResolvedValue([mockBrand]);

      const result = await service.getFeaturedBrands(5);
      const firstBrand = result[0];

      expect(result).toHaveLength(1);
      expect(firstBrand?.name).toBe("测试品牌");
      expect(mockPrismaService.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it("应该使用默认数量限制", async () => {
      mockPrismaService.brand.findMany.mockResolvedValue([]);

      await service.getFeaturedBrands();

      expect(mockPrismaService.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe("getBrandsByCategory", () => {
    it("应该返回分类下的品牌", async () => {
      mockPrismaService.brand.findMany.mockResolvedValue([mockBrand]);

      const result = await service.getBrandsByCategory(ClothingCategory.tops);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: { has: ClothingCategory.tops },
          }),
        }),
      );
    });
  });

  describe("getPriceRangeStats", () => {
    it("应该返回价格范围统计", async () => {
      mockPrismaService.brand.groupBy.mockResolvedValue([
        { priceRange: PriceRange.mid_range, _count: { id: 5 } },
        { priceRange: PriceRange.luxury, _count: { id: 2 } },
      ]);

      const result = await service.getPriceRangeStats();
      const firstStat = result[0];
      const secondStat = result[1];

      expect(result).toHaveLength(2);
      expect(firstStat?.label).toBe("中档");
      expect(secondStat?.label).toBe("奢侈");
    });
  });
});
