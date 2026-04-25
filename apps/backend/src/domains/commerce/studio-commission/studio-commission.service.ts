import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { GenerateBillResult } from "./dto/studio-commission.dto";

/**
 * Default commission rate: 15% (D-16)
 */
const DEFAULT_COMMISSION_RATE = 0.15;

@Injectable()
export class StudioCommissionService {
  private readonly logger = new Logger(StudioCommissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a studio referral (D-14 -- silent tracking).
   * 24h dedup: if the same userId+studioId referral exists within 24 hours, return existing.
   */
  async recordReferral(
    userId: string,
    dto: { studioId: string; source: string }
  ): Promise<{
    id: string;
    studioId: string;
    userId: string;
    source: string;
    status: string;
    referredAt: Date;
    orderId?: string | null;
    convertedAt?: Date | null;
  }> {
    // Check for existing recent referral (24h dedup)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await this.prisma.studioReferral.findFirst({
      where: {
        userId,
        studioId: dto.studioId,
        referredAt: { gt: twentyFourHoursAgo },
      },
    });

    if (existing) {
      this.logger.debug(
        `Dedup: existing referral found for user ${userId}, studio ${dto.studioId}`
      );
      return existing;
    }

    // Create new referral
    const referral = await this.prisma.studioReferral.create({
      data: {
        studioId: dto.studioId,
        userId,
        source: dto.source,
        status: "pending",
      },
    });

    this.logger.log(`Recorded studio referral: user ${userId} -> studio ${dto.studioId}`);
    return referral;
  }

  /**
   * Associate an order with the most recent pending referral (D-14).
   * 7-day conversion window: only referrals within the last 7 days are eligible.
   */
  async associateOrder(
    userId: string,
    orderId: string
  ): Promise<{
    id: string;
    studioId: string;
    userId: string;
    status: string;
    orderId: string | null;
    convertedAt: Date | null;
  } | null> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const referral = await this.prisma.studioReferral.findFirst({
      where: {
        userId,
        status: "pending",
        referredAt: { gt: sevenDaysAgo },
      },
      orderBy: { referredAt: "desc" },
    });

    if (!referral) {
      this.logger.debug(`No pending referral found for user ${userId} within 7-day window`);
      return null;
    }

    const updated = await this.prisma.studioReferral.update({
      where: { id: referral.id },
      data: {
        orderId,
        convertedAt: new Date(),
        status: "converted",
      },
    });

    this.logger.log(
      `Associated order ${orderId} with referral ${referral.id} for studio ${referral.studioId}`
    );

    return updated;
  }

  /**
   * Get commission rate for a studio (D-16).
   * Falls back to DEFAULT_COMMISSION_RATE (0.15) if not configured.
   */
  async getCommissionRate(studioId: string): Promise<number> {
    const rateRecord = await this.prisma.studioCommissionRate.findUnique({
      where: { studioId },
    });

    if (rateRecord) {
      return Number(rateRecord.rate);
    }

    return DEFAULT_COMMISSION_RATE;
  }

  /**
   * Generate a monthly commission bill for a studio (D-15).
   * Calculates commission from converted referrals for the period.
   */
  async generateMonthlyBill(studioId: string, period: string): Promise<GenerateBillResult> {
    const rate = await this.getCommissionRate(studioId);

    // Parse period (YYYY-MM) into date range
    const parts = period.split("-").map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 1);

    // Count all referrals in period
    const totalReferrals = await this.prisma.studioReferral.count({
      where: {
        studioId,
        referredAt: { gte: periodStart, lt: periodEnd },
      },
    });

    // Get converted referrals in period
    const convertedReferrals = await this.prisma.studioReferral.findMany({
      where: {
        studioId,
        status: "converted",
        convertedAt: { gte: periodStart, lt: periodEnd },
      },
    });

    const convertedOrders = convertedReferrals.length;

    // Calculate total order amount from associated orders
    // For now, use converted referral count as proxy since Order amounts
    // are looked up separately in a real implementation
    const totalOrderAmount = convertedOrders * 500; // Placeholder: avg 500 per order

    const commissionAmount = totalOrderAmount * rate;

    // Upsert the bill (idempotent for same studio+period)
    const bill = await this.prisma.studioCommissionBill.upsert({
      where: {
        studioId_period: { studioId, period },
      },
      create: {
        studioId,
        period,
        totalReferrals,
        convertedOrders,
        totalOrderAmount,
        commissionRate: rate,
        commissionAmount,
      },
      update: {
        totalReferrals,
        convertedOrders,
        totalOrderAmount,
        commissionRate: rate,
        commissionAmount,
      },
    });

    return {
      id: bill.id,
      studioId: bill.studioId,
      period: bill.period,
      totalReferrals: bill.totalReferrals,
      convertedOrders: bill.convertedOrders,
      totalOrderAmount: Number(bill.totalOrderAmount),
      commissionRate: Number(bill.commissionRate),
      commissionAmount: Number(bill.commissionAmount),
    };
  }

  /**
   * Get commission bills, optionally filtered by studioId or period.
   */
  async getCommissionBills(query: { studioId?: string; period?: string }): Promise<unknown[]> {
    const where: Record<string, unknown> = {};
    if (query.studioId) {
      where.studioId = query.studioId;
    }
    if (query.period) {
      where.period = query.period;
    }

    return this.prisma.studioCommissionBill.findMany({
      where,
      orderBy: { period: "desc" },
    });
  }
}
