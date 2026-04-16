import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { RefundTypeDto } from "./dto";

jest.mock("@prisma/client", () => ({
  ...jest.requireActual("@prisma/client"),
  RefundType: { REFUND_ONLY: "REFUND_ONLY", RETURN_REFUND: "RETURN_REFUND" },
  RefundRequestStatus: { PENDING: "PENDING", APPROVED: "APPROVED", PROCESSING: "PROCESSING", COMPLETED: "COMPLETED", REJECTED: "REJECTED", CANCELLED: "CANCELLED" },
  OrderStatus: { pending: "pending", paid: "paid", shipped: "shipped", delivered: "delivered", cancelled: "cancelled", refunded: "refunded" },
}));

import { PrismaService } from "../../../common/prisma/prisma.service";
import { PaymentService } from "../payment/payment.service";

import { RefundRequestService } from "./refund-request.service";

describe("RefundRequestService", () => {
  let service: RefundRequestService;
  let prisma: {
    order: { findUnique: jest.Mock };
    refundRequest: { findUnique: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    clothingItem: { update: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockPaymentService = {
    refund: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    prisma = {
      order: { findUnique: jest.fn() },
      refundRequest: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      clothingItem: { update: jest.fn() },
      $transaction: jest.fn((arg) => {
        if (typeof arg === "function") {
          return arg(prisma);
        }
        return Promise.all(arg);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundRequestService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<RefundRequestService>(RefundRequestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const userId = "user-1";
    const dto = {
      orderId: "order-1",
      type: RefundTypeDto.REFUND_ONLY,
      reason: "Item defective",
    };

    const paidOrder = {
      id: "order-1",
      userId: "user-1",
      status: "paid",
      finalAmount: 200,
      items: [{ id: "item-1", itemId: "ci-1", quantity: 1, price: 200 }],
    };

    it("should create refund request successfully", async () => {
      prisma.order.findUnique.mockResolvedValue(paidOrder);
      prisma.refundRequest.findFirst.mockResolvedValue(null);
      prisma.refundRequest.findMany.mockResolvedValue([]);
      prisma.refundRequest.create.mockResolvedValue({
        id: "refund-1",
        orderId: "order-1",
        userId,
        type: "REFUND_ONLY",
        reason: "Item defective",
        amount: 200,
        status: "PENDING",
      });

      const result = await service.create(userId, dto);

      expect(result).toBeDefined();
      expect(result.status).toBe("PENDING");
      expect(result.amount).toBe(200);
    });

    it("should throw error when order not found", async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it("should throw error when user is not the order owner", async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...paidOrder,
        userId: "user-2",
      });

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it("should throw error when order status does not allow refund", async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...paidOrder,
        status: "pending",
      });

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it("should throw error when existing PENDING refund exists", async () => {
      prisma.order.findUnique.mockResolvedValue(paidOrder);
      prisma.refundRequest.findFirst.mockResolvedValue({
        id: "refund-existing",
        status: "PENDING",
      });

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it("should throw error when total refunded exceeds order amount", async () => {
      prisma.order.findUnique.mockResolvedValue(paidOrder);
      prisma.refundRequest.findFirst.mockResolvedValue(null);
      prisma.refundRequest.findMany.mockResolvedValue([
        { amount: 150 },
        { amount: 100 },
      ]);

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it("should throw error when order amount is zero or negative", async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...paidOrder,
        finalAmount: 0,
      });
      prisma.refundRequest.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("approve", () => {
    const refundRequestId = "refund-1";

    it("should approve a PENDING refund request", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        status: "PENDING",
      });
      prisma.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        status: "APPROVED",
        adminNote: "Approved",
      });

      const result = await service.approve(refundRequestId, "Approved");

      expect(result.status).toBe("APPROVED");
    });

    it("should throw error when refund request not found", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue(null);

      await expect(service.approve(refundRequestId)).rejects.toThrow(NotFoundException);
    });

    it("should throw error when status is not PENDING", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        status: "APPROVED",
      });

      await expect(service.approve(refundRequestId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("reject", () => {
    const refundRequestId = "refund-1";

    it("should reject a PENDING refund request", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        status: "PENDING",
      });
      prisma.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        status: "REJECTED",
        adminNote: "Not eligible",
      });

      const result = await service.reject(refundRequestId, "Not eligible");

      expect(result.status).toBe("REJECTED");
    });

    it("should throw error when status is not PENDING", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        status: "COMPLETED",
      });

      await expect(service.reject(refundRequestId, "Too late")).rejects.toThrow(BadRequestException);
    });

    it("should throw error when refund request not found", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue(null);

      await expect(service.reject(refundRequestId, "Not found")).rejects.toThrow(NotFoundException);
    });
  });

  describe("addTrackingNumber", () => {
    const refundRequestId = "refund-1";
    const userId = "user-1";
    const trackingNumber = "SF1234567890";

    it("should add tracking number for RETURN_REFUND with APPROVED status", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        userId,
        type: "RETURN_REFUND",
        status: "APPROVED",
      });
      prisma.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        trackingNumber,
        status: "PROCESSING",
      });

      const result = await service.addTrackingNumber(refundRequestId, userId, trackingNumber);

      expect(result.trackingNumber).toBe(trackingNumber);
    });

    it("should throw error when refund request not found", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue(null);

      await expect(service.addTrackingNumber(refundRequestId, userId, trackingNumber)).rejects.toThrow(NotFoundException);
    });

    it("should throw error when user is not the owner", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        userId: "user-2",
        type: "RETURN_REFUND",
        status: "APPROVED",
      });

      await expect(service.addTrackingNumber(refundRequestId, userId, trackingNumber)).rejects.toThrow(BadRequestException);
    });

    it("should throw error when type is REFUND_ONLY", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        userId,
        type: "REFUND_ONLY",
        status: "APPROVED",
      });

      await expect(service.addTrackingNumber(refundRequestId, userId, trackingNumber)).rejects.toThrow(BadRequestException);
    });

    it("should throw error when status is not APPROVED", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        userId,
        type: "RETURN_REFUND",
        status: "PENDING",
      });

      await expect(service.addTrackingNumber(refundRequestId, userId, trackingNumber)).rejects.toThrow(BadRequestException);
    });
  });

  describe("completeRefund", () => {
    const refundRequestId = "refund-1";

    it("should complete refund for REFUND_ONLY with APPROVED status", async () => {
      const request = {
        id: refundRequestId,
        orderId: "order-1",
        userId: "user-1",
        type: "REFUND_ONLY",
        status: "APPROVED",
        amount: 200,
        reason: "Defective",
      };

      prisma.refundRequest.findUnique.mockResolvedValue(request);
      mockPaymentService.refund.mockResolvedValue({ success: true });
      prisma.order.findUnique.mockResolvedValue({
        id: "order-1",
        items: [{ id: "item-1", itemId: "ci-1", quantity: 2 }],
      });
      prisma.refundRequest.update.mockResolvedValue({
        id: refundRequestId,
        status: "COMPLETED",
        processedAt: new Date(),
      });

      const result = await service.completeRefund(refundRequestId);

      expect(result.status).toBe("COMPLETED");
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

    it("should throw error when refund request not found", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue(null);

      await expect(service.completeRefund(refundRequestId)).rejects.toThrow(NotFoundException);
    });

    it("should throw error when status is not valid for completion", async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: refundRequestId,
        type: "REFUND_ONLY",
        status: "PENDING",
      });

      await expect(service.completeRefund(refundRequestId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("getUserRefundRequests", () => {
    it("should return user refund requests", async () => {
      const mockRefunds = [
        { id: "refund-1", userId: "user-1", orderId: "order-1" },
        { id: "refund-2", userId: "user-1", orderId: "order-2" },
      ];

      prisma.refundRequest.findMany.mockResolvedValue(mockRefunds);

      const result = await service.getUserRefundRequests("user-1");

      expect(result).toHaveLength(2);
    });

    it("should filter by orderId when provided", async () => {
      prisma.refundRequest.findMany.mockResolvedValue([]);

      await service.getUserRefundRequests("user-1", "order-1");

      expect(prisma.refundRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1", orderId: "order-1" }),
        }),
      );
    });
  });

  describe("getOrderRefundRequests", () => {
    it("should return refund requests for an order", async () => {
      const mockRefunds = [{ id: "refund-1", orderId: "order-1" }];

      prisma.refundRequest.findMany.mockResolvedValue(mockRefunds);

      const result = await service.getOrderRefundRequests("order-1");

      expect(result).toHaveLength(1);
    });
  });
});
