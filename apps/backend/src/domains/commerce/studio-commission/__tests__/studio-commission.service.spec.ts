import { Test } from "@nestjs/testing";
import { PrismaService } from "../../../../common/prisma/prisma.service";

import { StudioCommissionService } from "../studio-commission.service";

describe("StudioCommissionService", () => {
  let service: StudioCommissionService;
  let prismaService: {
    studioReferral: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    studioCommissionBill: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    studioCommissionRate: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      studioReferral: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      studioCommissionBill: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      studioCommissionRate: {
        findUnique: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        StudioCommissionService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<StudioCommissionService>(StudioCommissionService);
  });

  describe("recordReferral", () => {
    it("should create StudioReferral with studioId + userId + source + status='pending'", async () => {
      // No existing recent referral
      prismaService.studioReferral.findFirst.mockResolvedValueOnce(null);

      const mockReferral = {
        id: "referral-1",
        studioId: "studio-1",
        userId: "user-1",
        source: "chat_recommend",
        status: "pending",
        referredAt: new Date(),
      };
      prismaService.studioReferral.create.mockResolvedValueOnce(mockReferral);

      const result = await service.recordReferral("user-1", {
        studioId: "studio-1",
        source: "chat_recommend",
      });

      expect(prismaService.studioReferral.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            studioId: "studio-1",
          }),
        })
      );

      expect(prismaService.studioReferral.create).toHaveBeenCalledWith({
        data: {
          studioId: "studio-1",
          userId: "user-1",
          source: "chat_recommend",
          status: "pending",
        },
      });

      expect(result).toEqual(mockReferral);
    });

    it("should not create duplicate if same userId+studioId referral exists within last 24 hours", async () => {
      const existingReferral = {
        id: "referral-1",
        studioId: "studio-1",
        userId: "user-1",
        source: "chat_recommend",
        status: "pending",
        referredAt: new Date(),
      };
      prismaService.studioReferral.findFirst.mockResolvedValueOnce(existingReferral);

      const result = await service.recordReferral("user-1", {
        studioId: "studio-1",
        source: "chat_recommend",
      });

      // Should return existing record without creating a new one
      expect(result).toEqual(existingReferral);
      expect(prismaService.studioReferral.create).not.toHaveBeenCalled();
    });
  });

  describe("associateOrder", () => {
    it("should find most recent pending StudioReferral within 7-day window and update status='converted' + orderId + convertedAt", async () => {
      const mockReferral = {
        id: "referral-1",
        studioId: "studio-1",
        userId: "user-1",
        status: "pending",
        referredAt: new Date(),
      };

      prismaService.studioReferral.findFirst.mockResolvedValueOnce(mockReferral);

      const updatedReferral = {
        ...mockReferral,
        orderId: "order-123",
        convertedAt: new Date(),
        status: "converted",
      };
      prismaService.studioReferral.update.mockResolvedValueOnce(updatedReferral);

      const result = await service.associateOrder("user-1", "order-123");

      expect(prismaService.studioReferral.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            status: "pending",
          }),
        })
      );

      expect(prismaService.studioReferral.update).toHaveBeenCalledWith({
        where: { id: "referral-1" },
        data: expect.objectContaining({
          orderId: "order-123",
          status: "converted",
        }),
      });

      expect(result).toEqual(updatedReferral);
    });

    it("should return null when no pending referral found within 7-day window", async () => {
      prismaService.studioReferral.findFirst.mockResolvedValueOnce(null);

      const result = await service.associateOrder("user-1", "order-123");

      expect(result).toBeNull();
      expect(prismaService.studioReferral.update).not.toHaveBeenCalled();
    });
  });

  describe("generateMonthlyBill", () => {
    it("should calculate commission from converted referrals for the period, creates StudioCommissionBill", async () => {
      // Mock commission rate
      prismaService.studioCommissionRate.findUnique.mockResolvedValueOnce({
        id: "rate-1",
        studioId: "studio-1",
        rate: 0.18,
      });

      // Mock referral count
      prismaService.studioReferral.count.mockResolvedValueOnce(5);

      // Mock converted referrals
      const convertedReferrals = [
        { id: "r1", orderId: "order-1", status: "converted" },
        { id: "r2", orderId: "order-2", status: "converted" },
        { id: "r3", orderId: "order-3", status: "converted" },
      ];
      prismaService.studioReferral.findMany.mockResolvedValueOnce(convertedReferrals);

      const mockBill = {
        id: "bill-1",
        studioId: "studio-1",
        period: "2026-04",
        totalReferrals: 5,
        convertedOrders: 3,
        totalOrderAmount: 1500,
        commissionRate: 0.18,
        commissionAmount: 270,
      };
      prismaService.studioCommissionBill.upsert.mockResolvedValueOnce(mockBill);

      const result = await service.generateMonthlyBill("studio-1", "2026-04");

      expect(result.convertedOrders).toBe(3);
      expect(result.commissionRate).toBe(0.18);
      expect(result.commissionAmount).toBe(270);
    });

    it("should use default 0.15 commission rate when no StudioCommissionRate configured", async () => {
      // No configured rate
      prismaService.studioCommissionRate.findUnique.mockResolvedValueOnce(null);

      // Mock referral count
      prismaService.studioReferral.count.mockResolvedValueOnce(2);

      // Mock converted referrals
      prismaService.studioReferral.findMany.mockResolvedValueOnce([
        { id: "r1", orderId: "order-1", status: "converted" },
      ]);

      const mockBill = {
        id: "bill-1",
        studioId: "studio-1",
        period: "2026-04",
        totalReferrals: 2,
        convertedOrders: 1,
        totalOrderAmount: 100,
        commissionRate: 0.15,
        commissionAmount: 15,
      };
      prismaService.studioCommissionBill.upsert.mockResolvedValueOnce(mockBill);

      const result = await service.generateMonthlyBill("studio-1", "2026-04");

      expect(result.commissionRate).toBe(0.15);
      expect(result.commissionAmount).toBe(15);
    });
  });

  describe("getCommissionBills", () => {
    it("should return bills for a specific studioId, sorted by period DESC", async () => {
      const mockBills = [
        { id: "bill-2", studioId: "studio-1", period: "2026-04" },
        { id: "bill-1", studioId: "studio-1", period: "2026-03" },
      ];
      prismaService.studioCommissionBill.findMany.mockResolvedValueOnce(mockBills);

      const result = await service.getCommissionBills({ studioId: "studio-1" });

      expect(result).toEqual(mockBills);
      expect(prismaService.studioCommissionBill.findMany).toHaveBeenCalledWith({
        where: { studioId: "studio-1" },
        orderBy: { period: "desc" },
      });
    });
  });
});
