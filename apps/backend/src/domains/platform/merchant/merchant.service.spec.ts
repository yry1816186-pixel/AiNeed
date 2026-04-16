/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ClothingCategory } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import * as bcrypt from "../../../common/security/bcrypt";


import { MerchantService } from "./merchant.service";

jest.mock("../../../common/security/bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe("MerchantService", () => {
  let service: MerchantService;
  let prisma: PrismaService;

  const mockPrismaService = {
    brandMerchant: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    brand: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    clothingItem: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userBehaviorEvent: {
      findMany: jest.fn(),
    },
    virtualTryOn: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    userProfile: {
      findMany: jest.fn(),
    },
    brandSettlement: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMerchant = {
    id: "merchant-id",
    brandId: "brand-id",
    email: "merchant@test.com",
    password: "hashed-password",
    name: "测试商家",
    role: "admin",
    brand: {
      id: "brand-id",
      name: "测试品牌",
      slug: "test-brand",
    },
  };

  const mockProduct = {
    id: "product-id",
    brandId: "brand-id",
    name: "测试商品",
    description: "测试描述",
    category: ClothingCategory.tops,
    price: 199,
    viewCount: 100,
    likeCount: 50,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MerchantService>(MerchantService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("applyForMerchant", () => {
    const applyData = {
      brandName: "测试品牌",
      email: "test@example.com",
      password: "Password123",
      name: "测试商家",
      phone: "13800138000",
      businessLicenseUrl: "91350100M000100Y43",
    };

    it("应该成功申请商家入驻", async () => {
      mockPrismaService.brand.findFirst.mockResolvedValue(null);
      mockPrismaService.brandMerchant.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          brand: {
            create: jest.fn().mockResolvedValue({ id: "brand-id" }),
          },
          brandMerchant: {
            create: jest.fn().mockResolvedValue({ id: "merchant-id" }),
          },
        });
      });

      const result = await service.applyForMerchant(applyData);

      expect(result).toHaveProperty("merchantId");
      expect(result).toHaveProperty("brandId");
    });

    it("应该拒绝已注册的邮箱", async () => {
      mockPrismaService.brand.findFirst.mockResolvedValue(null);
      mockPrismaService.brandMerchant.findUnique.mockResolvedValue(
        mockMerchant,
      );

      await expect(service.applyForMerchant(applyData)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("login", () => {
    it("应该成功登录", async () => {
      mockPrismaService.brand.findFirst.mockResolvedValue(null);
      mockPrismaService.brandMerchant.findUnique.mockResolvedValue(
        mockMerchant,
      );
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockPrismaService.brandMerchant.update.mockResolvedValue(mockMerchant);

      const result = await service.login("merchant@test.com", "Password123");

      expect(result.merchant.email).toBe("merchant@test.com");
      expect(result.brand.name).toBe("测试品牌");
    });

    it("应该拒绝不存在的商家", async () => {
      mockPrismaService.brand.findFirst.mockResolvedValue(null);
      mockPrismaService.brandMerchant.findUnique.mockResolvedValue(null);

      await expect(
        service.login("nonexistent@test.com", "Password123"),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该拒绝错误的密码", async () => {
      mockPrismaService.brand.findFirst.mockResolvedValue(null);
      mockPrismaService.brandMerchant.findUnique.mockResolvedValue(
        mockMerchant,
      );
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.login("merchant@test.com", "wrong-password"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getProducts", () => {
    it("应该返回商品列表", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      const result = await service.getProducts("brand-id");

      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("应该按状态过滤", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.count.mockResolvedValue(0);

      await service.getProducts("brand-id", { status: "active" });

      expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
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
        }),
      );
    });
  });

  describe("createProduct", () => {
    const createData = {
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
      expect(mockPrismaService.clothingItem.create).toHaveBeenCalled();
    });

    it("应该拒绝不存在的品牌", async () => {
      mockPrismaService.brand.findUnique.mockResolvedValue(null);

      await expect(
        service.createProduct("non-existent-brand", createData),
      ).rejects.toThrow(NotFoundException);
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
        }),
      ).rejects.toThrow(NotFoundException);
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

      await expect(
        service.deleteProduct("brand-id", "non-existent-product"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getSettlements", () => {
    it("应该返回结算记录", async () => {
      const mockSettlements = [
        { id: "settlement-1", brandId: "brand-id", amount: 1000 },
      ];
      mockPrismaService.brandSettlement.findMany.mockResolvedValue(
        mockSettlements,
      );

      const result = await service.getSettlements("brand-id");

      expect(result).toHaveLength(1);
    });
  });

  describe("getDashboard", () => {
    it("应该返回看板数据", async () => {
      mockPrismaService.clothingItem.count.mockResolvedValue(10);
      mockPrismaService.userBehaviorEvent.findMany.mockResolvedValue([]);
      mockPrismaService.clothingItem.findMany.mockResolvedValue([mockProduct]);
      // FIX: Mock groupBy instead of count for N+1 optimization
      mockPrismaService.virtualTryOn.groupBy.mockResolvedValue([
        { itemId: "product-id", _count: { id: 5 } },
      ]);

      const result = await service.getDashboard("brand-id", {
        start: new Date("2024-01-01"),
        end: new Date("2024-12-31"),
      });

      expect(result.overview.totalProducts).toBe(10);
      expect(result).toHaveProperty("sales");
      expect(result).toHaveProperty("topProducts");
    });
  });
});
