import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { StockNotificationStatus } from "../../../../types/prisma-enums";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { StockNotificationService } from "./stock-notification.service";

const mockPrismaService = {
  clothingItem: {
    findUnique: jest.fn(),
  },
  stockNotification: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockEventEmitter = {
  emit: jest.fn(),
};

describe("StockNotificationService", () => {
  let service: StockNotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockNotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<StockNotificationService>(StockNotificationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("subscribe", () => {
    const userId = "user-1";
    const itemId = "item-1";
    const color = "red";
    const size = "M";

    it("should create a new subscription successfully", async () => {
      const mockItem = { id: itemId, name: "Test Item" };
      const mockNotification = {
        id: "notif-1",
        userId,
        itemId,
        color,
        size,
        status: StockNotificationStatus.PENDING,
      };

      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.stockNotification.findFirst.mockResolvedValue(null);
      mockPrismaService.stockNotification.create.mockResolvedValue(mockNotification);

      const result = await service.subscribe(userId, itemId, color, size);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.clothingItem.findUnique).toHaveBeenCalledWith({
        where: { id: itemId },
      });
      expect(mockPrismaService.stockNotification.create).toHaveBeenCalledWith({
        data: {
          userId,
          itemId,
          color,
          size,
          status: StockNotificationStatus.PENDING,
        },
      });
    });

    it("should throw NotFoundException when item does not exist", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(null);

      await expect(service.subscribe(userId, itemId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.subscribe(userId, itemId)).rejects.toThrow(
        "商品不存在",
      );
    });

    it("should throw BadRequestException when already subscribed with PENDING status", async () => {
      const mockItem = { id: itemId, name: "Test Item" };
      const existingNotification = {
        id: "notif-existing",
        userId,
        itemId,
        status: StockNotificationStatus.PENDING,
      };

      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.stockNotification.findFirst.mockResolvedValue(existingNotification);

      await expect(service.subscribe(userId, itemId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.subscribe(userId, itemId)).rejects.toThrow(
        "您已订阅该商品的到货通知",
      );
    });

    it("should reactivate a CANCELLED subscription to PENDING", async () => {
      const mockItem = { id: itemId, name: "Test Item" };
      const existingNotification = {
        id: "notif-existing",
        userId,
        itemId,
        status: StockNotificationStatus.CANCELLED,
      };
      const reactivatedNotification = {
        ...existingNotification,
        status: StockNotificationStatus.PENDING,
        notifiedAt: null,
      };

      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.stockNotification.findFirst.mockResolvedValue(existingNotification);
      mockPrismaService.stockNotification.update.mockResolvedValue(reactivatedNotification);

      const result = await service.subscribe(userId, itemId);

      expect(result).toEqual(reactivatedNotification);
      expect(mockPrismaService.stockNotification.update).toHaveBeenCalledWith({
        where: { id: existingNotification.id },
        data: { status: StockNotificationStatus.PENDING, notifiedAt: null },
      });
      expect(mockPrismaService.stockNotification.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when already NOTIFIED", async () => {
      const mockItem = { id: itemId, name: "Test Item" };
      const existingNotification = {
        id: "notif-existing",
        userId,
        itemId,
        status: StockNotificationStatus.NOTIFIED,
      };

      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.stockNotification.findFirst.mockResolvedValue(existingNotification);

      await expect(service.subscribe(userId, itemId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.subscribe(userId, itemId)).rejects.toThrow(
        "该商品已到货，无需重复订阅",
      );
    });
  });

  describe("unsubscribe", () => {
    const userId = "user-1";
    const notificationId = "notif-1";

    it("should cancel subscription successfully", async () => {
      const mockNotification = {
        id: notificationId,
        userId,
        itemId: "item-1",
        status: StockNotificationStatus.PENDING,
      };
      const cancelledNotification = {
        ...mockNotification,
        status: StockNotificationStatus.CANCELLED,
      };

      mockPrismaService.stockNotification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.stockNotification.update.mockResolvedValue(cancelledNotification);

      const result = await service.unsubscribe(userId, notificationId);

      expect(result).toEqual(cancelledNotification);
      expect(mockPrismaService.stockNotification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { status: StockNotificationStatus.CANCELLED },
      });
    });

    it("should throw NotFoundException when notification does not exist", async () => {
      mockPrismaService.stockNotification.findUnique.mockResolvedValue(null);

      await expect(service.unsubscribe(userId, notificationId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.unsubscribe(userId, notificationId)).rejects.toThrow(
        "通知记录不存在",
      );
    });

    it("should throw BadRequestException when user does not own the notification", async () => {
      const mockNotification = {
        id: notificationId,
        userId: "user-other",
        itemId: "item-1",
        status: StockNotificationStatus.PENDING,
      };

      mockPrismaService.stockNotification.findUnique.mockResolvedValue(mockNotification);

      await expect(service.unsubscribe(userId, notificationId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.unsubscribe(userId, notificationId)).rejects.toThrow(
        "无权操作此通知",
      );
    });
  });

  describe("getUserSubscriptions", () => {
    it("should return PENDING subscriptions with item details", async () => {
      const userId = "user-1";
      const mockSubscriptions = [
        {
          id: "notif-1",
          userId,
          itemId: "item-1",
          status: StockNotificationStatus.PENDING,
          item: {
            id: "item-1",
            name: "Test Item",
            mainImage: "image.jpg",
            images: ["image.jpg"],
            stock: 0,
          },
        },
      ];

      mockPrismaService.stockNotification.findMany.mockResolvedValue(mockSubscriptions);

      const result = await service.getUserSubscriptions(userId);

      expect(result).toEqual(mockSubscriptions);
      expect(mockPrismaService.stockNotification.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: StockNotificationStatus.PENDING,
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              mainImage: true,
              images: true,
              stock: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("checkAndNotify", () => {
    const itemId = "item-1";

    it("should mark PENDING subscriptions as NOTIFIED and emit event", async () => {
      const mockSubscriptions = [
        { id: "notif-1", userId: "user-1", itemId, status: StockNotificationStatus.PENDING },
        { id: "notif-2", userId: "user-2", itemId, status: StockNotificationStatus.PENDING },
      ];

      mockPrismaService.stockNotification.findMany.mockResolvedValue(mockSubscriptions);
      mockPrismaService.stockNotification.updateMany.mockResolvedValue({ count: 2 });

      await service.checkAndNotify(itemId);

      expect(mockPrismaService.stockNotification.updateMany).toHaveBeenCalledWith({
        where: {
          itemId,
          status: StockNotificationStatus.PENDING,
        },
        data: {
          status: StockNotificationStatus.NOTIFIED,
          notifiedAt: expect.any(Date),
        },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith("STOCK_RESTOCKED", {
        itemId,
        notifiedUserIds: ["user-1", "user-2"],
        count: 2,
      });
    });

    it("should do nothing when no PENDING subscriptions exist", async () => {
      mockPrismaService.stockNotification.findMany.mockResolvedValue([]);

      await service.checkAndNotify(itemId);

      expect(mockPrismaService.stockNotification.updateMany).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe("checkLowStock", () => {
    const itemId = "item-1";

    it("should emit LOW_STOCK event when stock is at or below threshold", async () => {
      const mockItem = {
        id: itemId,
        name: "Low Stock Item",
        stock: 3,
        lowStockThreshold: 5,
      };

      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);

      await service.checkLowStock(itemId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith("LOW_STOCK", {
        itemId: mockItem.id,
        itemName: mockItem.name,
        currentStock: mockItem.stock,
        threshold: mockItem.lowStockThreshold,
      });
    });

    it("should not emit event when stock is above threshold", async () => {
      const mockItem = {
        id: itemId,
        name: "In Stock Item",
        stock: 50,
        lowStockThreshold: 5,
      };

      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);

      await service.checkLowStock(itemId);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should do nothing when item does not exist", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(null);

      await service.checkLowStock(itemId);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe("cleanupExpired", () => {
    it("should cancel PENDING subscriptions older than 90 days", async () => {
      const mockResult = { count: 5 };
      mockPrismaService.stockNotification.updateMany.mockResolvedValue(mockResult);

      const result = await service.cleanupExpired();

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.stockNotification.updateMany).toHaveBeenCalledWith({
        where: {
          status: StockNotificationStatus.PENDING,
          createdAt: expect.any(Object),
        },
        data: {
          status: StockNotificationStatus.CANCELLED,
        },
      });

      const callArgs = mockPrismaService.stockNotification.updateMany.mock.calls[0][0];
      const dateCondition = callArgs.where.createdAt;
      expect(dateCondition.lt).toBeInstanceOf(Date);
    });
  });
});
