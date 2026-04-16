/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { CouponService } from "../coupon/coupon.service";

import { CartService } from "./cart.service";

describe("CartService", () => {
  let service: CartService;
  let prisma: PrismaService;

  const decimal = (n: number) => ({ toNumber: () => n });

  const mockPrismaService = {
    cartItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    clothingItem: {
      findUnique: jest.fn(),
    },
  };

  const mockCouponService = {
    validateCoupon: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CouponService,
          useValue: mockCouponService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCart", () => {
    it("should return cart items for user", async () => {
      const mockCartItems = [
        {
          id: "cart-1",
          itemId: "item-1",
          color: "black",
          size: "M",
          quantity: 1,
          selected: true,
          createdAt: new Date(),
          item: {
            id: "item-1",
            name: "Test Item",
            price: 100,
            images: ["image1.jpg"],
            brand: { id: "brand-1", name: "Test Brand" },
          },
        },
      ];

      mockPrismaService.cartItem.findMany.mockResolvedValue(mockCartItems);

      const result = await service.getCart("user-1");
      const firstItem = result[0];

      expect(result).toHaveLength(1);
      expect(firstItem?.itemId).toBe("item-1");
    });
  });

  describe("addItem", () => {
    const userId = "user-1";
    const itemId = "item-1";

    it("should throw error when item not found", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(userId, itemId, "black", "M", 1),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw error when item is inactive", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue({
        id: itemId,
        isActive: false,
      });

      await expect(
        service.addItem(userId, itemId, "black", "M", 1),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when color not available", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue({
        id: itemId,
        isActive: true,
        colors: ["white", "blue"],
      });

      await expect(
        service.addItem(userId, itemId, "black", "M", 1),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when size not available", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue({
        id: itemId,
        isActive: true,
        colors: ["black"],
        sizes: ["S", "L"],
      });

      await expect(
        service.addItem(userId, itemId, "black", "M", 1),
      ).rejects.toThrow(BadRequestException);
    });

    it("should update quantity when item already in cart", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue({
        id: itemId,
        isActive: true,
        colors: ["black"],
        sizes: ["M"],
        price: decimal(100),
        images: ["image1.jpg"],
        brand: null,
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: "cart-1",
        quantity: 1,
      });
      mockPrismaService.cartItem.update.mockResolvedValue({
        id: "cart-1",
        quantity: 2,
        item: {
          id: itemId,
          name: "Test Item",
          description: null,
          category: "tops",
          colors: ["black"],
          sizes: ["M"],
          price: decimal(100),
          originalPrice: null,
          currency: "CNY",
          images: ["image1.jpg"],
          tags: [],
          viewCount: 0,
          likeCount: 0,
          brand: null,
        },
      });

      const result = await service.addItem(userId, itemId, "black", "M", 1);

      expect(mockPrismaService.cartItem.update).toHaveBeenCalled();
    });

    it("should create new cart item when not exists", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue({
        id: itemId,
        isActive: true,
        colors: ["black"],
        sizes: ["M"],
        price: decimal(100),
        images: ["image1.jpg"],
        brand: null,
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);
      mockPrismaService.cartItem.create.mockResolvedValue({
        id: "cart-1",
        itemId,
        color: "black",
        size: "M",
        quantity: 1,
        selected: true,
        item: {
          id: itemId,
          name: "Test Item",
          description: null,
          category: "tops",
          colors: ["black"],
          sizes: ["M"],
          price: decimal(100),
          originalPrice: null,
          currency: "CNY",
          images: ["image1.jpg"],
          tags: [],
          viewCount: 0,
          likeCount: 0,
          brand: null,
        },
      });

      const result = await service.addItem(userId, itemId, "black", "M", 1);

      expect(mockPrismaService.cartItem.create).toHaveBeenCalled();
    });
  });

  describe("updateItem", () => {
    it("should throw error when cart item not found", async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem("user-1", "cart-1", { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw error when quantity is 0", async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: "cart-1",
      });

      await expect(
        service.updateItem("user-1", "cart-1", { quantity: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should update quantity successfully", async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: "cart-1",
      });
      mockPrismaService.cartItem.update.mockResolvedValue({
        id: "cart-1",
        quantity: 2,
        item: {
          id: "item-1",
          name: "Test Item",
          description: null,
          category: "tops",
          colors: ["black"],
          sizes: ["M"],
          price: decimal(100),
          originalPrice: null,
          currency: "CNY",
          images: ["image1.jpg"],
          tags: [],
          viewCount: 0,
          likeCount: 0,
          brand: null,
        },
      });

      const result = await service.updateItem("user-1", "cart-1", {
        quantity: 2,
      });

      expect(result.quantity).toBe(2);
    });

    it("should update selected status successfully", async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: "cart-1",
      });
      mockPrismaService.cartItem.update.mockResolvedValue({
        id: "cart-1",
        selected: false,
        item: {
          id: "item-1",
          name: "Test Item",
          description: null,
          category: "tops",
          colors: ["black"],
          sizes: ["M"],
          price: decimal(100),
          originalPrice: null,
          currency: "CNY",
          images: ["image1.jpg"],
          tags: [],
          viewCount: 0,
          likeCount: 0,
          brand: null,
        },
      });

      const result = await service.updateItem("user-1", "cart-1", {
        selected: false,
      });

      expect(result.selected).toBe(false);
    });
  });

  describe("removeItem", () => {
    it("should throw error when cart item not found", async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem("user-1", "cart-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should remove item successfully", async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: "cart-1",
      });
      mockPrismaService.cartItem.delete.mockResolvedValue({});

      await service.removeItem("user-1", "cart-1");

      expect(mockPrismaService.cartItem.delete).toHaveBeenCalledWith({
        where: { id: "cart-1" },
      });
    });
  });

  describe("clearCart", () => {
    it("should delete all cart items for user", async () => {
      mockPrismaService.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      await service.clearCart("user-1");

      expect(mockPrismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });

  describe("selectAll", () => {
    it("should update all items selection status", async () => {
      mockPrismaService.cartItem.updateMany.mockResolvedValue({ count: 5 });

      await service.selectAll("user-1", true);

      expect(mockPrismaService.cartItem.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { selected: true },
      });
    });
  });

  describe("getCartSummary", () => {
    it("should return correct summary", async () => {
      mockPrismaService.cartItem.findMany.mockResolvedValue([
        { quantity: 2, selected: true, item: { price: 100 } },
        { quantity: 1, selected: false, item: { price: 50 } },
      ]);

      const result = await service.getCartSummary("user-1");

      expect(result.totalItems).toBe(3);
      expect(result.selectedItems).toBe(2);
      expect(result.totalPrice).toBe(250);
      expect(result.selectedPrice).toBe(200);
    });
  });
});
