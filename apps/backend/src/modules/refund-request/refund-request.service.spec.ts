import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RefundType, RefundRequestStatus, OrderStatus } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { PaymentService } from "../payment/payment.service";

import { RefundRequestService } from "./refund-request.service";

describe("RefundRequestService", () => {
  let service: RefundRequestService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
    refundRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    clothingItem: {
      update: jest.fn(),
    },
    $transaction: jest.fn((arg) => {
      if (typeof arg === "function") {
        return arg(mockPrismaService);
      }
      return Promise.all(arg);
    }),
  };

  const mockPaymentService = {
    refund: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundRequestService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<RefundRequestService>(RefundRequestService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const userId = "user-1";
    const dto = {
      orderId: "order-1",
      type: "REFUND_ONLY" as RefundType,
      reason: "Item defective",
    };

    const paidOrder = {
      id: "order-1",
      userId: "user-1",
      status: OrderStatus.paid,
      finalAmount: 200,
      items: [{ id: "item-1", itemId: "ci-1", quantity: 1, price: 200 }],
    };

    it("should create refund request successfully", async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(paidOrder);
      mockPrismaService.refundRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.create.mockResolvedValue({
        id: "refund-1",
        orderId: "order-1",
        userId,
        type: RefundType.REFUND_ONLY,
        reason: "Item defective",
        amount: 200,
        status: RefundRequestStatus.PENDING,
      });

      const result = await service.create(userId, dto);

      expect(result).toBeDefined();
      expect(result.status).toBe(RefundRequestStatus.PENDING);
      expect(result.amount).toBe(200);
      expect(mockPrismaService.refundRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: "order-1",
          userId,
          type: RefundType.REFUND_ONLY,
          status: RefundRequestStatus.PENDING,
        }),
      });
    });

    it("should throw error when order not found", async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw error when user is not the order owner", async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...paidOrder,
        userId: "user-2",
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw error when order status does not allow refund", async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...paidOrder,
        status: OrderStatus.pending,
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw error when existing PENDING refund exists", async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(paidOrder);
      mockPrismaService.refundRequest.findFirst.mockResolvedValue({
        id: "refund-existing",
        status: RefundRequestStatus.PENDING,
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw error when total refunded exceeds order amount", async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(paidOrder);
      mockPrismaService.refundRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([
        { amount: 150 },
        { amount: 100 },
      ]);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw error when order amount is zero or negative", async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...paidOrder,
        finalAmount: 0,
      });
      mockPrismaService.refundRequest.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("approve", () => {
    const refundRequestId = "refund-1";

    it("should approve a PENDING refund request", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        status: RefundRequestStatus.PENDING,
      });
      mockPrismaService.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        status: RefundRequestStatus.APPROVED,
        adminNote: "Approved",
      });

      const result = await service.approve(refundRequestId, "Approved");

      expect(result.status).toBe(RefundRequestStatus.APPROVED);
      expect(mockPrismaService.refundRequest.update).toHaveBeenCalledWith({
        where: { id: refundRequestId },
        data: {
          status: RefundRequestStatus.APPROVED,
          adminNote: "Approved",
        },
      });
    });

    it("should throw error when refund request not found", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue(null);

      await expect(service.approve(refundRequestId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw error when status is not PENDING", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        status: RefundRequestStatus.APPROVED,
      });

      await expect(service.approve(refundRequestId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("reject", () => {
    const refundRequestId = "refund-1";

    it("should reject a PENDING refund request", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        status: RefundRequestStatus.PENDING,
      });
      mockPrismaService.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        status: RefundRequestStatus.REJECTED,
        adminNote: "Not eligible",
      });

      const result = await service.reject(refundRequestId, "Not eligible");

      expect(result.status).toBe(RefundRequestStatus.REJECTED);
      expect(mockPrismaService.refundRequest.update).toHaveBeenCalledWith({
        where: { id: refundRequestId },
        data: {
          status: RefundRequestStatus.REJECTED,
          adminNote: "Not eligible",
        },
      });
    });

    it("should throw error when status is not PENDING", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        status: RefundRequestStatus.COMPLETED,
      });

      await expect(
        service.reject(refundRequestId, "Too late"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when refund request not found", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.reject(refundRequestId, "Not found"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("addTrackingNumber", () => {
    const refundRequestId = "refund-1";
    const userId = "user-1";
    const trackingNumber = "SF1234567890";

    it("should add tracking number for RETURN_REFUND with APPROVED status", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        userId,
        type: RefundType.RETURN_REFUND,
        status: RefundRequestStatus.APPROVED,
      });
      mockPrismaService.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        trackingNumber,
        status: RefundRequestStatus.PROCESSING,
      });

      const result = await service.addTrackingNumber(
        refundRequestId,
        userId,
        trackingNumber,
      );

      expect(result.trackingNumber).toBe(trackingNumber);
      expect(mockPrismaService.refundRequest.update).toHaveBeenCalledWith({
        where: { id: refundRequestId },
        data: {
          trackingNumber,
          status: RefundRequestStatus.PROCESSING,
        },
      });
    });

    it("should throw error when refund request not found", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.addTrackingNumber(refundRequestId, userId, trackingNumber),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw error when user is not the owner", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        userId: "user-2",
        type: RefundType.RETURN_REFUND,
        status: RefundRequestStatus.APPROVED,
      });

      await expect(
        service.addTrackingNumber(refundRequestId, userId, trackingNumber),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when type is REFUND_ONLY", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        userId,
        type: RefundType.REFUND_ONLY,
        status: RefundRequestStatus.APPROVED,
      });

      await expect(
        service.addTrackingNumber(refundRequestId, userId, trackingNumber),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when status is not APPROVED", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        userId,
        type: RefundType.RETURN_REFUND,
        status: RefundRequestStatus.PENDING,
      });

      await expect(
        service.addTrackingNumber(refundRequestId, userId, trackingNumber),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("completeRefund", () => {
    const refundRequestId = "refund-1";

    it("should complete refund for REFUND_ONLY with APPROVED status", async () => {
      const request = {
        id: refundRequestId,
        orderId: "order-1",
        userId: "user-1",
        type: RefundType.REFUND_ONLY,
        status: RefundRequestStatus.APPROVED,
        amount: 200,
        reason: "Defective",
      };

      mockPrismaService.refundRequest.findUnique
        .mockResolvedValueOnce(request);
      mockPaymentService.refund.mockResolvedValue({ success: true });
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: "order-1",
        items: [
          { id: "item-1", itemId: "ci-1", quantity: 2 },
        ],
      });
      mockPrismaService.clothingItem.update.mockResolvedValue({ id: "ci-1", stock: 12 });
      mockPrismaService.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        status: RefundRequestStatus.COMPLETED,
        processedAt: expect.any(Date),
      });
      mockPrismaService.refundRequest.findUnique
        .mockResolvedValueOnce(request);

      const result = await service.completeRefund(refundRequestId);

      expect(result.status).toBe(RefundRequestStatus.COMPLETED);
      expect(mockPaymentService.refund).toHaveBeenCalledWith("user-1", {
        orderId: "order-1",
        amount: 200,
        reason: "Defective",
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "REFUND_COMPLETED",
        expect.objectContaining({
          refundRequestId,
          orderId: "order-1",
          userId: "user-1",
          amount: 200,
        }),
      );
    });

    it("should complete refund for RETURN_REFUND with PROCESSING status", async () => {
      const request = {
        id: refundRequestId,
        orderId: "order-1",
        userId: "user-1",
        type: RefundType.RETURN_REFUND,
        status: RefundRequestStatus.PROCESSING,
        amount: 150,
        reason: "Wrong size",
      };

      mockPrismaService.refundRequest.findUnique.mockResolvedValue(request);
      mockPaymentService.refund.mockResolvedValue({ success: true });
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: "order-1",
        items: [],
      });
      mockPrismaService.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        status: RefundRequestStatus.COMPLETED,
      });

      const result = await service.completeRefund(refundRequestId);

      expect(result.status).toBe(RefundRequestStatus.COMPLETED);
    });

    it("should throw error when refund request not found", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue(null);

      await expect(service.completeRefund(refundRequestId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw error when status is not valid for completion", async () => {
      mockPrismaService.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        type: RefundType.REFUND_ONLY,
        status: RefundRequestStatus.PENDING,
      });

      await expect(service.completeRefund(refundRequestId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should restore stock when order has items", async () => {
      const request = {
        id: refundRequestId,
        orderId: "order-1",
        userId: "user-1",
        type: RefundType.REFUND_ONLY,
        status: RefundRequestStatus.APPROVED,
        amount: 200,
        reason: "Defective",
      };

      mockPrismaService.refundRequest.findUnique.mockResolvedValue(request);
      mockPaymentService.refund.mockResolvedValue({ success: true });
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: "order-1",
        items: [
          { id: "oi-1", itemId: "ci-1", quantity: 2 },
          { id: "oi-2", itemId: "ci-2", quantity: 1 },
        ],
      });
      mockPrismaService.clothingItem.update.mockResolvedValue({});
      mockPrismaService.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        status: RefundRequestStatus.COMPLETED,
      });

      await service.completeRefund(refundRequestId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe("getUserRefundRequests", () => {
    it("should return user refund requests", async () => {
      const mockRefunds = [
        { id: "refund-1", userId: "user-1", orderId: "order-1" },
        { id: "refund-2", userId: "user-1", orderId: "order-2" },
      ];

      mockPrismaService.refundRequest.findMany.mockResolvedValue(mockRefunds);

      const result = await service.getUserRefundRequests("user-1");

      expect(result).toHaveLength(2);
      expect(mockPrismaService.refundRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
        }),
      );
    });

    it("should filter by orderId when provided", async () => {
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      await service.getUserRefundRequests("user-1", "order-1");

      expect(mockPrismaService.refundRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1", orderId: "order-1" },
        }),
      );
    });
  });

  describe("getOrderRefundRequests", () => {
    it("should return refund requests for an order", async () => {
      const mockRefunds = [
        { id: "refund-1", orderId: "order-1" },
      ];

      mockPrismaService.refundRequest.findMany.mockResolvedValue(mockRefunds);

      const result = await service.getOrderRefundRequests("order-1");

      expect(result).toHaveLength(1);
      expect(mockPrismaService.refundRequest.findMany).toHaveBeenCalledWith({
        where: { orderId: "order-1" },
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
