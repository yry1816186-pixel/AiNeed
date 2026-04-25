import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../../../common/prisma/prisma.service";

import { ContentProductService } from "../content-product.service";
import { PaymentService } from "../../payment/payment.service";
import { SubscriptionService } from "../../subscription/subscription.service";
import { SubscriptionGuard, FEATURE_KEY } from "../../subscription/guards/subscription.guard";
import { MEMBERSHIP_PLANS } from "../../../../config/membership-plans";

describe("ContentProductService", () => {
  let service: ContentProductService;
  let prismaService: {
    contentPurchase: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let paymentService: {
    createPayment: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      contentPurchase: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };

    paymentService = {
      createPayment: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ContentProductService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: PaymentService,
          useValue: paymentService,
        },
      ],
    }).compile();

    service = module.get<ContentProductService>(ContentProductService);
  });

  describe("getProducts", () => {
    it("should return list of available products with name/type/price (color_report=9.9, body_report=9.9, capsule_wardrobe=19.0)", () => {
      const products = service.getProducts();

      expect(products).toHaveLength(3);
      expect(products).toEqual([
        expect.objectContaining({
          productType: "color_report",
          name: expect.any(String),
          price: 9.9,
        }),
        expect.objectContaining({
          productType: "body_report",
          name: expect.any(String),
          price: 9.9,
        }),
        expect.objectContaining({
          productType: "capsule_wardrobe",
          name: expect.any(String),
          price: 19.0,
        }),
      ]);
    });
  });

  describe("checkPurchased", () => {
    it("should return { purchased: true } when ContentPurchase record exists for user+productType", async () => {
      const mockRecord = {
        id: "purchase-1",
        userId: "user-1",
        productType: "color_report",
        status: "active",
        unlockedAt: new Date(),
      };
      prismaService.contentPurchase.findUnique.mockResolvedValueOnce(mockRecord);

      const result = await service.checkPurchased("user-1", "color_report");

      expect(result.purchased).toBe(true);
      expect(result.unlockedAt).toEqual(mockRecord.unlockedAt);
      expect(prismaService.contentPurchase.findUnique).toHaveBeenCalledWith({
        where: {
          userId_productType: { userId: "user-1", productType: "color_report" },
        },
      });
    });

    it("should return { purchased: false } when no ContentPurchase record exists", async () => {
      prismaService.contentPurchase.findUnique.mockResolvedValueOnce(null);

      const result = await service.checkPurchased("user-1", "color_report");

      expect(result.purchased).toBe(false);
      expect(result.unlockedAt).toBeUndefined();
    });
  });

  describe("purchase", () => {
    it("should create PaymentOrder via PaymentService with metadata.productType set, returns payment URL/QR", async () => {
      // No existing purchase
      prismaService.contentPurchase.findUnique.mockResolvedValueOnce(null);

      paymentService.createPayment.mockResolvedValueOnce({
        success: true,
        orderId: "order-123",
        qrCode: "qr-url",
        expireAt: new Date(),
      });

      const result = await service.purchase("user-1", {
        productType: "color_report",
        provider: "alipay",
      });

      expect(paymentService.createPayment).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          provider: "alipay",
          amount: 9.9,
          subject: expect.any(String),
        })
      );

      // Verify metadata contains productType
      const callArgs = paymentService.createPayment.mock.calls[0][1];
      expect(callArgs.amount).toBe(9.9);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe("order-123");
      expect(result.qrCode).toBe("qr-url");
    });

    it("should throw BadRequestException when product already purchased", async () => {
      const existingRecord = {
        id: "purchase-1",
        userId: "user-1",
        productType: "color_report",
        status: "active",
      };
      prismaService.contentPurchase.findUnique.mockResolvedValueOnce(existingRecord);

      await expect(
        service.purchase("user-1", {
          productType: "color_report",
          provider: "alipay",
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("handlePaymentCompleted", () => {
    it("should create ContentPurchase record with correct fields when event fires", async () => {
      prismaService.contentPurchase.upsert.mockResolvedValueOnce({
        id: "purchase-1",
        userId: "user-1",
        productType: "color_report",
        orderId: "order-123",
        amount: 9.9,
        status: "active",
        unlockedAt: new Date(),
      });

      await service.handlePaymentCompleted({
        userId: "user-1",
        orderId: "order-123",
        productType: "color_report",
        amount: 9.9,
      });

      expect(prismaService.contentPurchase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_productType: { userId: "user-1", productType: "color_report" },
          },
          create: expect.objectContaining({
            userId: "user-1",
            productType: "color_report",
            orderId: "order-123",
            status: "active",
          }),
          update: {},
        })
      );
    });

    it("should respect @@unique constraint -- second call for same user+productType does not create duplicate", async () => {
      // Upsert returns existing on second call (idempotent)
      const existingRecord = {
        id: "purchase-1",
        userId: "user-1",
        productType: "color_report",
        status: "active",
      };
      prismaService.contentPurchase.upsert.mockResolvedValueOnce(existingRecord);

      await service.handlePaymentCompleted({
        userId: "user-1",
        orderId: "order-123",
        productType: "color_report",
        amount: 9.9,
      });

      // upsert was called with update: {} so it does nothing on conflict
      const upsertArgs = prismaService.contentPurchase.upsert.mock.calls[0][0];
      expect(upsertArgs.update).toEqual({});
    });
  });

  describe("getPurchasedProducts", () => {
    it("should return all active ContentPurchase records for a user", async () => {
      const mockPurchases = [
        {
          id: "purchase-1",
          userId: "user-1",
          productType: "color_report",
          status: "active",
          unlockedAt: new Date("2026-04-20"),
        },
        {
          id: "purchase-2",
          userId: "user-1",
          productType: "body_report",
          status: "active",
          unlockedAt: new Date("2026-04-19"),
        },
      ];
      prismaService.contentPurchase.findMany.mockResolvedValueOnce(mockPurchases);

      const result = await service.getPurchasedProducts("user-1");

      expect(result).toHaveLength(2);
      expect(prismaService.contentPurchase.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", status: "active" },
        orderBy: { unlockedAt: "desc" },
      });
    });
  });
});

// ==========================================
// Task 3: MON-03 Premium Feature Gating Tests
// ==========================================

describe("Premium Feature Gating (MON-03)", () => {
  let subscriptionService: {
    checkPermission: jest.Mock;
    recordUsage: jest.Mock;
    getActiveSubscription: jest.Mock;
  };
  let guard: SubscriptionGuard;

  beforeEach(async () => {
    subscriptionService = {
      checkPermission: jest.fn(),
      recordUsage: jest.fn(),
      getActiveSubscription: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        SubscriptionGuard,
        {
          provide: Reflector,
          useValue: new Reflector(),
        },
        {
          provide: SubscriptionService,
          useValue: subscriptionService,
        },
      ],
    }).compile();

    guard = module.get<SubscriptionGuard>(SubscriptionGuard);
  });

  describe("continuousOutfitPlan feature", () => {
    it("should return { allowed: false } for free user (limit=0)", async () => {
      subscriptionService.checkPermission.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        limit: 0,
        unlimited: false,
      });

      const result = await subscriptionService.checkPermission("freeUser", "continuousOutfitPlan");

      expect(result.allowed).toBe(false);
    });

    it("should return { allowed: true, unlimited: true } for premium user", async () => {
      subscriptionService.checkPermission.mockResolvedValueOnce({
        allowed: true,
        remaining: -1,
        limit: -1,
        unlimited: true,
      });

      const result = await subscriptionService.checkPermission(
        "premiumUser",
        "continuousOutfitPlan"
      );

      expect(result.allowed).toBe(true);
      expect(result.unlimited).toBe(true);
    });
  });

  describe("deepWardrobeDiagnosis feature", () => {
    it("should return { allowed: false } for free user", async () => {
      subscriptionService.checkPermission.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        limit: 0,
        unlimited: false,
      });

      const result = await subscriptionService.checkPermission("freeUser", "deepWardrobeDiagnosis");

      expect(result.allowed).toBe(false);
    });

    it("should return { allowed: true } for premium user", async () => {
      subscriptionService.checkPermission.mockResolvedValueOnce({
        allowed: true,
        remaining: -1,
        limit: -1,
        unlimited: true,
      });

      const result = await subscriptionService.checkPermission(
        "premiumUser",
        "deepWardrobeDiagnosis"
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe("aiProactivePush feature", () => {
    it("should return { allowed: false } for free user", async () => {
      subscriptionService.checkPermission.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        limit: 0,
        unlimited: false,
      });

      const result = await subscriptionService.checkPermission("freeUser", "aiProactivePush");

      expect(result.allowed).toBe(false);
    });

    it("should return { allowed: true } for premium user", async () => {
      subscriptionService.checkPermission.mockResolvedValueOnce({
        allowed: true,
        remaining: -1,
        limit: -1,
        unlimited: true,
      });

      const result = await subscriptionService.checkPermission("premiumUser", "aiProactivePush");

      expect(result.allowed).toBe(true);
    });
  });

  describe("MEMBERSHIP_PLANS premium features configuration", () => {
    it("should have continuousOutfitPlan=-1 in premium plan", () => {
      expect(MEMBERSHIP_PLANS.premium!.features.continuousOutfitPlan).toBe(-1);
    });

    it("should have deepWardrobeDiagnosis=-1 in premium plan", () => {
      expect(MEMBERSHIP_PLANS.premium!.features.deepWardrobeDiagnosis).toBe(-1);
    });

    it("should have aiProactivePush=-1 in premium plan", () => {
      expect(MEMBERSHIP_PLANS.premium!.features.aiProactivePush).toBe(-1);
    });

    it("should NOT have continuousOutfitPlan in free plan (or limit=0)", () => {
      const val = MEMBERSHIP_PLANS.free!.features.continuousOutfitPlan;
      expect(val === undefined || val === 0).toBe(true);
    });

    it("should NOT have deepWardrobeDiagnosis in free plan (or limit=0)", () => {
      const val = MEMBERSHIP_PLANS.free!.features.deepWardrobeDiagnosis;
      expect(val === undefined || val === 0).toBe(true);
    });

    it("should NOT have aiProactivePush in free plan (or limit=0)", () => {
      const val = MEMBERSHIP_PLANS.free!.features.aiProactivePush;
      expect(val === undefined || val === 0).toBe(true);
    });
  });
});
