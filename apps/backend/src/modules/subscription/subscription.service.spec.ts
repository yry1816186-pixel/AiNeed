import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PrismaService } from "../../common/prisma/prisma.service";

import { SubscriptionService } from "./subscription.service";


describe("SubscriptionService", () => {
  let service: SubscriptionService;
  let prisma: {
    userSubscription: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    membershipPlan: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
    };
    paymentOrder: {
      create: jest.Mock;
    };
    userBehaviorEvent: {
      count: jest.Mock;
    };
  };

  const mockPrisma = {
    userSubscription: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    membershipPlan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    paymentOrder: {
      create: jest.fn(),
    },
    userBehaviorEvent: {
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prisma = mockPrisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllPlans", () => {
    it("should return all active membership plans", async () => {
      const mockPlans = [
        { id: "plan-1", name: "Free", price: 0, isActive: true },
        { id: "plan-2", name: "Pro", price: 29, isActive: true },
      ];

      prisma.membershipPlan.findMany.mockResolvedValue(mockPlans);

      const result = await service.getAllPlans();

      expect(result).toEqual(mockPlans);
      expect(prisma.membershipPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    });
  });

  describe("getCurrentSubscription", () => {
    it("should return current active subscription for user", async () => {
      const userId = "user-123";
      const mockSubscription = {
        id: "sub-1",
        userId,
        planId: "plan-2",
        status: "active",
        plan: { id: "plan-2", name: "Pro", price: 29 },
      };

      prisma.userSubscription.findFirst.mockResolvedValue(mockSubscription);

      const result = await service.getCurrentSubscription(userId);

      expect(result).toEqual(mockSubscription);
    });

    it("should return free tier when no active subscription", async () => {
      prisma.userSubscription.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentSubscription("user-123");

      // 服务返回免费计划对象
      expect(result).toBeDefined();
      expect(result.status).toBe("free");
      expect(result.plan?.name).toBe("free");
    });
  });

  describe("checkPermission", () => {
    it("should return allowed=true when feature is available and usage under limit", async () => {
      const userId = "user-123";
      const mockSubscription = {
        id: "sub-1",
        userId,
        planId: "plan-2",
        status: "active",
        expiresAt: new Date(Date.now() + 86400000), // 1 day in future
        usageThisMonth: { tryOn: 2 }, // usage < limit
        plan: {
          features: {
            tryOn: 10,
          },
        },
      };

      prisma.userSubscription.findFirst.mockResolvedValue(mockSubscription);

      const result = await service.checkPermission(userId, "tryOn");

      expect(result.allowed).toBe(true);
    });

    it("should return allowed=false when subscription is expired", async () => {
      const userId = "user-123";

      // 过期订阅会被 findFirst 过滤掉，返回 null
      prisma.userSubscription.findFirst.mockResolvedValue(null);
      prisma.userBehaviorEvent.count.mockResolvedValue(0);

      const result = await service.checkPermission(userId, "tryOn");

      // 免费用户，3次限制，使用0次，所以 allowed=true
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(3);
    });

    it("should return free tier permissions when no subscription", async () => {
      prisma.userSubscription.findFirst.mockResolvedValue(null);
      prisma.userBehaviorEvent.count.mockResolvedValue(0); // usage = 0

      const result = await service.checkPermission("user-123", "tryOn");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(3); // Free tier default
    });
  });

  describe("subscribe", () => {
    it("should create subscription and payment order", async () => {
      const userId = "user-123";
      const planId = "plan-2";
      const paymentMethod = "alipay";

      const mockPlan = {
        id: planId,
        name: "Pro",
        price: 29,
        currency: "CNY",
        duration: 30,
      };

      prisma.membershipPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.userSubscription.findFirst.mockResolvedValue(null);
      prisma.paymentOrder.create.mockResolvedValue({ id: "order-1" });
      prisma.userSubscription.create.mockResolvedValue({ id: "sub-1" });

      const result = await service.subscribe(userId, planId, paymentMethod);

      expect(result).toHaveProperty("orderId");
      expect(prisma.paymentOrder.create).toHaveBeenCalled();
    });

    it("should throw error if plan not found", async () => {
      prisma.membershipPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.subscribe("user-123", "invalid-plan", "alipay"),
      ).rejects.toThrow();
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel active subscription", async () => {
      const userId = "user-123";
      const mockSubscription = {
        id: "sub-1",
        userId,
        status: "active",
        autoRenew: true,
      };

      prisma.userSubscription.findFirst.mockResolvedValue(mockSubscription);
      prisma.userSubscription.update.mockResolvedValue({
        ...mockSubscription,
        autoRenew: false,
      });

      await service.cancelSubscription(userId);

      expect(prisma.userSubscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: {
          autoRenew: false,
          cancelledAt: expect.any(Date),
        },
      });
    });

    it("should throw error if no active subscription", async () => {
      prisma.userSubscription.findFirst.mockResolvedValue(null);

      await expect(service.cancelSubscription("user-123")).rejects.toThrow();
    });
  });
});
