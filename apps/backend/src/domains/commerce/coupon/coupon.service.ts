/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { CouponType, UserCouponStatus, Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

type Decimal = Prisma.Decimal;
import { CreateCouponDto } from "./dto";

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  reason?: string;
  coupon?: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
  };
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new coupon (admin only).
   * Auto-generates code if not provided (prefix FIRST/PROMO + 8 random chars).
   */
  async createCoupon(dto: CreateCouponDto) {
    const code = dto.code || this.generateCode(dto.type as string);

    const existingCode = await this.prisma.coupon.findUnique({
      where: { code },
    });
    if (existingCode) {
      throw new BadRequestException("优惠码已存在");
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code,
        name: dto.name,
        type: dto.type as CouponType,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount ?? 0,
        maxDiscount: dto.maxDiscount,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit ?? 1,
        applicableCategories: dto.applicableCategories ?? [],
        applicableBrandIds: dto.applicableBrandIds ?? [],
      },
    });

    this.logger.log(`Coupon created: ${code}`);
    return coupon;
  }

  /**
   * Validate a coupon code for a given user and order.
   * Checks: isActive, date range, usage limits, per-user limit, min order amount, category/brand scope.
   */
  async validateCoupon(
    code: string,
    userId: string,
    orderAmount: number,
    categoryIds?: string[],
    brandId?: string,
  ): Promise<CouponValidationResult> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return { valid: false, discount: 0, reason: "优惠码不存在" };
    }

    if (!coupon.isActive) {
      return { valid: false, discount: 0, reason: "优惠码已停用" };
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return { valid: false, discount: 0, reason: "优惠码不在有效期内" };
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discount: 0, reason: "优惠码已达使用上限" };
    }

    const userUsage = await this.prisma.userCoupon.count({
      where: { userId, couponId: coupon.id },
    });
    if (userUsage >= coupon.perUserLimit) {
      return { valid: false, discount: 0, reason: "您已达到该优惠码使用上限" };
    }

    if (orderAmount < Number(coupon.minOrderAmount)) {
      return {
        valid: false,
        discount: 0,
        reason: `订单金额未达到最低消费 ¥${coupon.minOrderAmount}`,
      };
    }

    if (
      coupon.applicableCategories.length > 0 &&
      categoryIds &&
      categoryIds.length > 0
    ) {
      const hasMatch = categoryIds.some((c) =>
        coupon.applicableCategories.includes(c),
      );
      if (!hasMatch) {
        return { valid: false, discount: 0, reason: "该优惠码不适用于当前商品分类" };
      }
    }

    if (
      coupon.applicableBrandIds.length > 0 &&
      brandId &&
      !coupon.applicableBrandIds.includes(brandId)
    ) {
      return { valid: false, discount: 0, reason: "该优惠码不适用于当前品牌" };
    }

    const discount = this.calculateDiscount(coupon, orderAmount);

    return {
      valid: true,
      discount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: Number(coupon.value),
      },
    };
  }

  /**
   * Calculate discount amount based on coupon type.
   * PERCENTAGE: amount * value/100 (capped at maxDiscount)
   * FIXED: flat value
   * SHIPPING: returns shipping fee amount (caller provides via orderAmount)
   */
  calculateDiscount(
    coupon: { type: string; value: number | Decimal; maxDiscount: number | Decimal | null },
    orderAmount: number,
  ): number {
    const value = Number(coupon.value);

    switch (coupon.type) {
      case CouponType.PERCENTAGE: {
        const discount = (orderAmount * value) / 100;
        if (coupon.maxDiscount) {
          return Math.min(discount, Number(coupon.maxDiscount));
        }
        return discount;
      }
      case CouponType.FIXED:
        return Math.min(value, orderAmount);
      case CouponType.SHIPPING:
        return value;
      default:
        return 0;
    }
  }

  /**
   * Validate and apply a coupon for a user (creates UserCoupon).
   */
  async applyCoupon(userId: string, code: string) {
    const validation = await this.validateCoupon(userId, code, 0);
    if (!validation.valid || !validation.coupon) {
      throw new BadRequestException(validation.reason || "优惠码无效");
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });
    if (!coupon) {
      throw new NotFoundException("优惠码不存在");
    }

    const userCoupon = await this.prisma.userCoupon.create({
      data: {
        userId,
        couponId: coupon.id,
        status: UserCouponStatus.AVAILABLE,
      },
      include: { coupon: true },
    });

    this.logger.log(`Coupon applied: ${code} for user ${userId}`);
    return userCoupon;
  }

  /**
   * Mark a UserCoupon as USED in a transaction.
   * Uses atomic operation for usedCount increment to prevent overselling.
   */
  async useCoupon(userCouponId: string, orderId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const userCoupon = await tx.userCoupon.findUnique({
        where: { id: userCouponId },
      });
      if (!userCoupon) {
        throw new NotFoundException("用户优惠券不存在");
      }
      if (userCoupon.status !== UserCouponStatus.AVAILABLE) {
        throw new BadRequestException("优惠券不可用");
      }

      await tx.userCoupon.update({
        where: { id: userCouponId },
        data: {
          status: UserCouponStatus.USED,
          usedAt: new Date(),
          orderId,
        },
      });

      // 原子操作：仅在 usageLimit 未用完时递增 usedCount
      const coupon = await tx.coupon.findUnique({
        where: { id: userCoupon.couponId },
      });
      if (!coupon) {
        throw new NotFoundException("优惠券不存在");
      }

      if (coupon.usageLimit !== null) {
        const result = await tx.coupon.updateMany({
          where: {
            id: userCoupon.couponId,
            usedCount: { lt: coupon.usageLimit },
          },
          data: { usedCount: { increment: 1 } },
        });
        if (result.count === 0) {
          throw new BadRequestException("优惠券已用完");
        }
      } else {
        await tx.coupon.update({
          where: { id: userCoupon.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }
    });

    this.logger.log(`Coupon used: ${userCouponId} for order ${orderId}`);
  }

  /**
   * Get user's coupons with optional status filter.
   */
  async getUserCoupons(userId: string, status?: string) {
    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status as UserCouponStatus;
    }

    return this.prisma.userCoupon.findMany({
      where,
      include: { coupon: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get coupons applicable to the user's current cart contents.
   */
  async getApplicableCoupons(
    userId: string,
    cartItems: { itemId: string; price: number; category?: string; brandId?: string }[],
  ) {
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
    const categoryIds = [
      ...new Set(cartItems.map((i) => i.category).filter(Boolean)),
    ] as string[];
    const brandIds = [
      ...new Set(cartItems.map((i) => i.brandId).filter(Boolean)),
    ] as string[];

    const allCoupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    const results = [];
    for (const coupon of allCoupons) {
      const userUsage = await this.prisma.userCoupon.count({
        where: { userId, couponId: coupon.id },
      });
      if (userUsage >= coupon.perUserLimit) {continue;}
      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
        {continue;}
      if (totalAmount < Number(coupon.minOrderAmount)) {continue;}

      if (
        coupon.applicableCategories.length > 0 &&
        !categoryIds.some((c) => coupon.applicableCategories.includes(c))
      ) {
        continue;
      }
      if (
        coupon.applicableBrandIds.length > 0 &&
        !brandIds.some((b) => coupon.applicableBrandIds.includes(b))
      ) {
        continue;
      }

      const discount = this.calculateDiscount(coupon, totalAmount);
      results.push({
        ...coupon,
        calculatedDiscount: discount,
      });
    }

    return results;
  }

  /**
   * Deactivate a coupon (admin).
   */
  async deactivateCoupon(couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });
    if (!coupon) {
      throw new NotFoundException("优惠码不存在");
    }

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });
  }

  /**
   * Generate first-order coupon for a user.
   * Creates a UserCoupon linked to a system first-order template coupon.
   * Per D-07: auto-apply first-order discount.
   */
  async generateFirstOrderCoupon(userId: string) {
    const firstOrderCoupon = await this.prisma.coupon.findFirst({
      where: {
        code: { startsWith: "FIRST" },
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    if (!firstOrderCoupon) {
      this.logger.warn("No active first-order coupon template found");
      return null;
    }

    const existing = await this.prisma.userCoupon.findUnique({
      where: {
        userId_couponId: {
          userId,
          couponId: firstOrderCoupon.id,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.userCoupon.create({
      data: {
        userId,
        couponId: firstOrderCoupon.id,
        status: UserCouponStatus.AVAILABLE,
      },
      include: { coupon: true },
    });
  }

  private generateCode(type: string): string {
    const prefix = type === "SHIPPING" ? "PROMO" : type === "PERCENTAGE" || type === "FIXED" ? "PROMO" : "FIRST";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}${code}`;
  }
}
