import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";

jest.mock("@prisma/client", () => ({
  ...jest.requireActual("@prisma/client"),
  CouponType: { PERCENTAGE: "PERCENTAGE", FIXED: "FIXED", SHIPPING: "SHIPPING" },
  UserCouponStatus: { AVAILABLE: "AVAILABLE", USED: "USED", EXPIRED: "EXPIRED" },
}));

import { PrismaService } from "../../../common/prisma/prisma.service";

import { CouponService } from "./coupon.service";

describe("CouponService", () => {
  let service: CouponService;
  let prisma: {
    coupon: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; updateMany: jest.Mock; findMany: jest.Mock };
    userCoupon: { create: jest.Mock; count: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockCoupon = {
    id: "coupon-1",
    code: "TESTCODE",
    name: "Test Coupon",
    type: "PERCENTAGE",
    value: 10,
    minOrderAmount: 0,
    maxDiscount: null,
    validFrom: new Date("2025-01-01"),
    validUntil: new Date("2027-01-01"),
    usageLimit: 100,
    perUserLimit: 1,
    usedCount: 0,
    isActive: true,
    applicableCategories: [],
    applicableBrandIds: [],
  };

  beforeEach(async () => {
    prisma = {
      coupon: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      userCoupon: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((fn) => {
        if (typeof fn === "function") {
          return fn({
            userCoupon: { findUnique: jest.fn().mockResolvedValue({ id: "uc-1", couponId: "coupon-1", status: "AVAILABLE" }), update: jest.fn().mockResolvedValue({}) },
            coupon: { findUnique: jest.fn().mockResolvedValue(mockCoupon), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn().mockResolvedValue({}) },
          });
        }
        return Promise.all(fn);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCoupon", () => {
    it("should create coupon with provided code", async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue(mockCoupon);

      const result = await service.createCoupon({
        code: "TESTCODE",
        name: "Test Coupon",
        type: "PERCENTAGE" as never,
        value: 10,
        validFrom: "2025-01-01",
        validUntil: "2027-01-01",
      });

      expect(result).toEqual(mockCoupon);
      expect(prisma.coupon.create).toHaveBeenCalled();
    });

    it("should throw BadRequestException when code already exists", async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon);

      await expect(
        service.createCoupon({
          code: "TESTCODE",
          name: "Test Coupon",
          type: "PERCENTAGE" as never,
          value: 10,
          validFrom: "2025-01-01",
          validUntil: "2027-01-01",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should auto-generate code when not provided", async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue(mockCoupon);

      const result = await service.createCoupon({
        name: "Test Coupon",
        type: "FIXED" as never,
        value: 20,
        validFrom: "2025-01-01",
        validUntil: "2027-01-01",
      });

      expect(result).toBeDefined();
      expect(prisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Test Coupon" }),
        }),
      );
    });
  });

  describe("validateCoupon", () => {
    it("should return invalid when coupon not found", async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      const result = await service.validateCoupon("INVALID", "user-1", 100);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("优惠码不存在");
    });

    it("should return invalid when coupon is inactive", async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...mockCoupon, isActive: false });

      const result = await service.validateCoupon("TESTCODE", "user-1", 100);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("优惠码已停用");
    });

    it("should return invalid when coupon is expired", async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        validFrom: new Date("2020-01-01"),
        validUntil: new Date("2020-12-31"),
      });

      const result = await service.validateCoupon("TESTCODE", "user-1", 100);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("优惠码不在有效期内");
    });

    it("should return valid for active coupon", async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      prisma.userCoupon.count.mockResolvedValue(0);

      const result = await service.validateCoupon("TESTCODE", "user-1", 100);

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(10);
      expect(result.coupon).toBeDefined();
    });
  });

  describe("calculateDiscount", () => {
    it("should calculate percentage discount", () => {
      const result = service.calculateDiscount(
        { type: "PERCENTAGE", value: 10, maxDiscount: null },
        200,
      );

      expect(result).toBe(20);
    });

    it("should cap percentage discount at maxDiscount", () => {
      const result = service.calculateDiscount(
        { type: "PERCENTAGE", value: 50, maxDiscount: 50 },
        200,
      );

      expect(result).toBe(50);
    });

    it("should calculate fixed discount", () => {
      const result = service.calculateDiscount(
        { type: "FIXED", value: 30, maxDiscount: null },
        200,
      );

      expect(result).toBe(30);
    });

    it("should cap fixed discount at order amount", () => {
      const result = service.calculateDiscount(
        { type: "FIXED", value: 300, maxDiscount: null },
        200,
      );

      expect(result).toBe(200);
    });

    it("should return shipping value for SHIPPING type", () => {
      const result = service.calculateDiscount(
        { type: "SHIPPING", value: 15, maxDiscount: null },
        200,
      );

      expect(result).toBe(15);
    });

    it("should return 0 for unknown type", () => {
      const result = service.calculateDiscount(
        { type: "UNKNOWN", value: 10, maxDiscount: null },
        200,
      );

      expect(result).toBe(0);
    });
  });

  describe("deactivateCoupon", () => {
    it("should deactivate coupon successfully", async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      prisma.coupon.update.mockResolvedValue({ ...mockCoupon, isActive: false });

      const result = await service.deactivateCoupon("coupon-1");

      expect(result.isActive).toBe(false);
      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: "coupon-1" },
        data: { isActive: false },
      });
    });

    it("should throw NotFoundException when coupon not found", async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.deactivateCoupon("non-existent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("generateFirstOrderCoupon", () => {
    it("should generate first order coupon for new user", async () => {
      const firstOrderCoupon = { ...mockCoupon, code: "FIRSTABC12345" };
      prisma.coupon.findFirst.mockResolvedValue(firstOrderCoupon);
      prisma.userCoupon.findUnique.mockResolvedValue(null);
      prisma.userCoupon.create.mockResolvedValue({
        id: "uc-2",
        userId: "user-1",
        couponId: "coupon-1",
        status: "AVAILABLE",
        coupon: firstOrderCoupon,
      });

      const result = await service.generateFirstOrderCoupon("user-1");

      expect(result).toBeDefined();
      expect(prisma.userCoupon.create).toHaveBeenCalled();
    });

    it("should return existing coupon if already generated", async () => {
      const firstOrderCoupon = { ...mockCoupon, code: "FIRSTABC12345" };
      prisma.coupon.findFirst.mockResolvedValue(firstOrderCoupon);
      prisma.userCoupon.findUnique.mockResolvedValue({
        id: "uc-existing",
        userId: "user-1",
        couponId: "coupon-1",
        status: "AVAILABLE",
      });

      const result = await service.generateFirstOrderCoupon("user-1");

      expect(result.id).toBe("uc-existing");
      expect(prisma.userCoupon.create).not.toHaveBeenCalled();
    });

    it("should return null when no first order coupon template found", async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);

      const result = await service.generateFirstOrderCoupon("user-1");

      expect(result).toBeNull();
    });
  });
});
