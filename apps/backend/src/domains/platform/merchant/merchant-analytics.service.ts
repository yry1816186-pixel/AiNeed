import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class MerchantAnalyticsService {
  private readonly logger = new Logger(MerchantAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(brandId: string, range: { start: Date; end: Date }) {
    const [products, orders, stats] = await Promise.all([
      this.prisma.clothingItem.count({ where: { brandId } }),
      this.getSalesStats(brandId, range),
      this.getProductStats(brandId),
    ]);

    return {
      overview: {
        totalProducts: products,
        totalViews: stats.totalViews,
        totalTryOns: stats.totalTryOns,
        totalFavorites: stats.totalFavorites,
      },
      sales: orders,
      topProducts: await this.getTopProducts(brandId, 5),
    };
  }

  async getTrendData(brandId: string, range: { start: Date; end: Date }) {
    const products = await this.prisma.clothingItem.findMany({
      where: { brandId },
      select: { id: true },
    });
    const productIds = products.map((p: { id: string }) => p.id);

    if (productIds.length === 0) {
      return {
        dailyStats: [],
        dailyTryOns: [],
      };
    }

    const dailyStats = await this.prisma.$queryRaw<
      { date: Date; event_type: string; count: bigint }[]
    >`
      SELECT
        DATE(created_at) as date,
        event_type,
        COUNT(*) as count
      FROM user_behavior_events
      WHERE target_id = ANY(${productIds}::uuid[])
        AND created_at >= ${range.start}
        AND created_at <= ${range.end}
      GROUP BY DATE(created_at), event_type
      ORDER BY date ASC
    `;

    const dailyTryOns = await this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM virtual_try_on
      WHERE item_id = ANY(${productIds}::uuid[])
        AND created_at >= ${range.start}
        AND created_at <= ${range.end}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return {
      dailyStats: dailyStats.map((s: { date: Date; event_type: string; count: bigint }) => ({
        date: s.date,
        eventType: s.event_type,
        count: Number(s.count),
      })),
      dailyTryOns: dailyTryOns.map((t: { date: Date; count: bigint }) => ({
        date: t.date,
        count: Number(t.count),
      })),
    };
  }

  async getAudienceInsights(brandId: string) {
    const productIds = (
      await this.prisma.clothingItem.findMany({
        where: { brandId },
        select: { id: true },
      })
    ).map((p: { id: string }) => p.id);

    const distinctUsers = await this.prisma.userBehaviorEvent.groupBy({
      by: ["userId"],
      where: {
        targetId: { in: productIds },
        userId: { not: null },
      },
    });

    const userIds = distinctUsers
      .map((i: { userId: string | null }) => i.userId)
      .filter(Boolean) as string[];

    if (userIds.length === 0) {
      return {
        totalUsers: 0,
        bodyTypeDistribution: {},
        colorSeasonDistribution: {},
        stylePreferences: {},
      };
    }

    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: userIds } },
      select: { bodyType: true, colorSeason: true, stylePreferences: true },
    });

    const bodyTypeDistribution: Record<string, number> = {};
    const colorSeasonDistribution: Record<string, number> = {};
    const stylePreferences: Record<string, number> = {};

    profiles.forEach((p) => {
      if (p.bodyType) {
        bodyTypeDistribution[p.bodyType] = (bodyTypeDistribution[p.bodyType] || 0) + 1;
      }
      if (p.colorSeason) {
        colorSeasonDistribution[p.colorSeason] = (colorSeasonDistribution[p.colorSeason] || 0) + 1;
      }
      if (p.stylePreferences && Array.isArray(p.stylePreferences)) {
        (p.stylePreferences as Array<string | { name?: string }>).forEach(
          (s: string | { name?: string }) => {
            const style = typeof s === "string" ? s : s?.name;
            if (style) {
              stylePreferences[style] = (stylePreferences[style] || 0) + 1;
            }
          }
        );
      }
    });

    return {
      totalUsers: userIds.length,
      bodyTypeDistribution,
      colorSeasonDistribution,
      stylePreferences,
    };
  }

  private async getSalesStats(brandId: string, range: { start: Date; end: Date }) {
    const eventTypeStats = await this.prisma.userBehaviorEvent.groupBy({
      by: ["eventType"],
      where: {
        createdAt: { gte: range.start, lte: range.end },
        eventType: {
          in: ["item_view", "add_to_cart", "favorite", "try_on_start", "try_on_complete"],
        },
      },
      _count: { eventType: true },
    });

    const stats: Record<string, number> = {};
    for (const s of eventTypeStats) {
      stats[s.eventType] = s._count.eventType;
    }

    const totalViews = stats["item_view"] ?? 0;
    const totalAddToCart = stats["add_to_cart"] ?? 0;
    const totalFavorites = stats["favorite"] ?? 0;
    const totalTryOns = (stats["try_on_start"] ?? 0) + (stats["try_on_complete"] ?? 0);

    return {
      totalViews,
      totalAddToCart,
      totalFavorites,
      totalTryOns,
      conversionRate: totalViews > 0 ? ((totalAddToCart / totalViews) * 100).toFixed(2) : "0",
      period: range,
    };
  }

  private async getProductStats(brandId: string) {
    const products = await this.prisma.clothingItem.findMany({
      where: { brandId },
      select: { viewCount: true, likeCount: true, id: true },
    });

    const productIds = products.map(
      (p: { id: string; viewCount: number; likeCount: number }) => p.id
    );
    const tryOnCount = await this.prisma.virtualTryOn.count({
      where: { itemId: { in: productIds } },
    });

    return {
      totalViews: products.reduce(
        (sum: number, p: { viewCount: number }) => sum + (p.viewCount || 0),
        0
      ),
      totalTryOns: tryOnCount,
      totalFavorites: products.reduce(
        (sum: number, p: { likeCount: number }) => sum + (p.likeCount || 0),
        0
      ),
    };
  }

  private async getTopProducts(brandId: string, limit: number) {
    const products = await this.prisma.clothingItem.findMany({
      where: { brandId },
      orderBy: { viewCount: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        price: true,
        viewCount: true,
        likeCount: true,
        images: true,
        category: true,
      },
    });

    const productIds = products.map((p: { id: string }) => p.id);
    const tryOnCounts = await this.prisma.virtualTryOn.groupBy({
      by: ["itemId"],
      where: { itemId: { in: productIds } },
      _count: { id: true },
    });

    const tryOnMap = new Map(
      tryOnCounts.map((t: { itemId: string; _count: { id: number } }) => [t.itemId, t._count.id])
    );

    return products.map(
      (p: {
        id: string;
        name: string;
        price: Prisma.Decimal;
        viewCount: number;
        likeCount: number;
        images: string[];
        category: string;
      }) => ({
        ...p,
        tryOnCount: tryOnMap.get(p.id) || 0,
      })
    );
  }
}
