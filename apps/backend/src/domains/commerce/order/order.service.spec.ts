/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { SoftDeleteService } from "../../../common/soft-delete";
import { NotificationService } from "../../../domains/platform/notification/services/notification.service";
import { PaymentService } from "../payment/payment.service";

import { OrderService } from "./order.service";

interface MockMethod {
  mockResolvedValue: jest.Mock;
  mockReturnValue: jest.Mock;
  toHaveBeenCalledWith: (...args: unknown[]) => boolean;
  toHaveBeenCalled: () => boolean;
}

interface MockModel {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  count: jest.Mock;
  deleteMany: jest.Mock;
}

interface MockPrisma {
  userAddress: MockModel;
  clothingItem: MockModel;
  order: MockModel;
  orderItem: MockModel;
  cartItem: MockModel;
  $transaction: jest.Mock;
}

describe("OrderService", () => {
  let service: OrderService;
  let prisma: PrismaService;

  const mockPrismaService: MockPrisma = {
    userAddress: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    clothingItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    orderItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    cartItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((arg: unknown): unknown => {
      if (typeof arg === "function") {
        return arg(mockPrismaService);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };

  const mockPaymentService = {
    createPayment: jest.fn(),
  };

  const mockNotificationService = {
    sendNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        SoftDeleteService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const userId = "user-1";
    const createDto = {
      items: [{ itemId: "item-1", color: "black", size: "M", quantity: 1 }],
      addressId: "address-1",
      remark: "Test order",
    };

    it("should throw error when items is empty", async () => {
      await expect(
        service.create(userId, { ...createDto, items: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when address not found", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw error when item not found", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue({
        id: "address-1",
        name: "Test User",
      });
      mockPrismaService.clothingItem.findMany.mockResolvedValue([]);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw error when item is inactive", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue({
        id: "address-1",
        name: "Test User",
      });
      mockPrismaService.clothingItem.findMany.mockResolvedValue([{
        id: "item-1",
        name: "Test Item",
        isActive: false,
        price: 100,
        images: [],
      }]);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should create order successfully", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue({
        id: "address-1",
        name: "Test User",
        phone: "13800138000",
        province: "Beijing",
        city: "Beijing",
        district: "Chaoyang",
        address: "Test Address",
      });
      mockPrismaService.clothingItem.findMany.mockResolvedValue([{
        id: "item-1",
        name: "Test Item",
        isActive: true,
        price: 100,
        images: ["image1.jpg"],
      }]);
      mockPrismaService.order.create.mockResolvedValue({
        id: "order-1",
        orderNo: "SM240101000001",
        status: "pending",
        totalAmount: 100,
        shippingFee: 0,
        discountAmount: 0,
        finalAmount: 100,
        items: [],
        address: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(userId, createDto);

      expect(result).toBeDefined();
      expect(result.orderNo).toBe("SM240101000001");
    });
  });

  describe("findAll", () => {
    it("should return orders with total count", async () => {
      const mockOrders = [
        { id: "order-1", orderNo: "SM240101000001" },
        { id: "order-2", orderNo: "SM240101000002" },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll("user-1", { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should filter by status", async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.findAll("user-1", { status: "pending" });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "pending",
          }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should throw error when order not found", async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne("user-1", "order-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return order when found", async () => {
      const mockOrder = {
        id: "order-1",
        orderNo: "SM240101000001",
        status: "pending",
        items: [],
        address: {},
      };

      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.findOne("user-1", "order-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("order-1");
    });
  });

  describe("cancel", () => {
    it("should throw error when order status is not pending or paid", async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });

      await expect(service.cancel("user-1", "order-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should cancel pending order", async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });
      mockPrismaService.order.update.mockResolvedValue({
        id: "order-1",
        status: "cancelled",
      });

      await service.cancel("user-1", "order-1");

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "cancelled" },
      });
    });
  });

  describe("confirm", () => {
    it("should throw error when order is not shipped", async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: "order-1",
        status: "pending",
      });

      await expect(service.confirm("user-1", "order-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should confirm shipped order", async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        id: "order-1",
        status: "shipped",
      });
      mockPrismaService.order.update.mockResolvedValue({
        id: "order-1",
        status: "delivered",
      });

      await service.confirm("user-1", "order-1");

      expect(mockPrismaService.order.update).toHaveBeenCalled();
    });
  });
});
