import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { ClothingCategory } from "../../../types/prisma-enums";

import type { CreateProductDto, UpdateProductDto } from "./dto";
import { MerchantProductService } from "./merchant-product.service";

describe("MerchantProductService", () => {
  let service: MerchantProductService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    brand: {
      findUnique: jest.fn(),
    },
    clothingItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockProduct = {
    id: "product-id",
    brandId: "brand-id",
    name: "测试商品",
    description: "测试描述",
    category: ClothingCategory.tops,
    colors: ["白色", "黑色"],
    sizes: ["M", "L"],
    price: 199,
    originalPrice: 299,
    currency: "CNY",
    images: ["https://example.com/img.jpg"],
    tags: ["夏季"],
    isActive: true,
    viewCount: 100,
    likeCount: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MerchantProductService>(MerchantProductService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProducts", () => {
    it("应该返回商品列表", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      const result = await service.getProducts("brand-id");

      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("应该按 active 状态过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getProducts("brand-id", { status: "active" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it("应该按 inactive 状态过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getProducts("brand-id", { status: "inactive" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: false }),
        })
      );
    });

    it("应该支持分页", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getProducts("brand-id", { limit: 10, offset: 20 });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it("当结果数量等于 limit 时 hasMore 应该为 true", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue(Array(20).fill(mockProduct));
      mockPrismaService.clothingItem.count.mockResolvedValue(50);

      const result = await service.getProducts("brand-id", { limit: 20 });

      expect(result.hasMore).toBe(true);
    });
  });

  describe("createProduct", () => {
    const createData: CreateProductDto = {
      name: "新商品",
      description: "新商品描述",
      category: ClothingCategory.tops,
      colors: ["红色"],
      sizes: ["M"],
      price: 299,
      images: ["https://example.com/img.jpg"],
    };

    it("应该成功创建商品", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue({ id: "brand-id" });
      mockPrismaService.clothingItem.create.mockResolvedValue({
        id: "new-product-id",
        ...createData,
        brandId: "brand-id",
      });

      const result = await service.createProduct("brand-id", createData);

      expect(result.name).toBe("新商品");
      expect(mockPrismaService.clothingItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: createData.name,
            brandId: "brand-id",
          }),
        })
      );
    });

    it("应该拒绝不存在的品牌", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue(null);

      await expect(service.createProduct("non-existent-brand", createData)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.createProduct("non-existent-brand", createData)).rejects.toThrow(
        "品牌不存在"
      );
    });

    it("当数据库写入失败时应该抛出 BadRequestException", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue({ id: "brand-id" });
      mockPrismaService.clothingItem.create.mockRejectedValue(new Error("DB error"));

      await expect(service.createProduct("brand-id", createData)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.createProduct("brand-id", createData)).rejects.toThrow("创建商品失败");
    });
  });

  describe("updateProduct", () => {
    it("应该成功更新商品", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.clothingItem.update.mockResolvedValue({
        ...mockProduct,
        name: "更新后的商品",
      });

      const result = await service.updateProduct("brand-id", "product-id", {
        name: "更新后的商品",
      });

      expect(result.name).toBe("更新后的商品");
    });

    it("应该拒绝不存在的商品", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProduct("brand-id", "non-existent-product", {
          name: "新名称",
        })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateProduct("brand-id", "non-existent-product", {
          name: "新名称",
        })
      ).rejects.toThrow("商品不存在或无权操作");
    });

    it("当数据库更新失败时应该抛出 BadRequestException", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.clothingItem.update.mockRejectedValue(new Error("DB error"));

      await expect(
        service.updateProduct("brand-id", "product-id", { name: "新名称" })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateProduct("brand-id", "product-id", { name: "新名称" })
      ).rejects.toThrow("更新商品失败");
    });

    it("应该只更新提供的字段", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.clothingItem.update.mockResolvedValue({
        ...mockProduct,
        price: 399,
      });

      await service.updateProduct("brand-id", "product-id", { price: 399 });

      expect(mockPrismaService.clothingItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: 399,
          }),
        })
      );
    });
  });

  describe("deleteProduct", () => {
    it("应该成功删除商品", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.clothingItem.delete.mockResolvedValue(mockProduct);

      const result = await service.deleteProduct("brand-id", "product-id");

      expect(result.success).toBe(true);
    });

    it("应该拒绝不存在的商品", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(null);

      await expect(service.deleteProduct("brand-id", "non-existent-product")).rejects.toThrow(
        NotFoundException
      );
      await expect(service.deleteProduct("brand-id", "non-existent-product")).rejects.toThrow(
        "商品不存在或无权操作"
      );
    });

    it("当数据库删除失败时应该抛出 BadRequestException", async () => {
      mockPrismaService.clothingItem.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.clothingItem.delete.mockRejectedValue(new Error("DB error"));

      await expect(service.deleteProduct("brand-id", "product-id")).rejects.toThrow(
        BadRequestException
      );
      await expect(service.deleteProduct("brand-id", "product-id")).rejects.toThrow("删除商品失败");
    });
  });
});
