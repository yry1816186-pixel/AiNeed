import { Injectable, Logger } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { PrismaService } from "../../../common/prisma/prisma.service";

const REVENUE_STATUSES: OrderStatus[] = ["delivered" as OrderStatus];

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverviewStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalOrders,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      revenueResult,
      revenueTodayResult,
      revenueWeekResult,
      revenueMonthResult,
      activeUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isDeleted: false } }),
      this.prisma.user.count({
        where: { isDeleted: false, createdAt: { gte: todayStart } },
      }),
      this.prisma.user.count({
        where: { isDeleted: false, createdAt: { gte: weekStart } },
      }),
      this.prisma.user.count({
        where: { isDeleted: false, createdAt: { gte: monthStart } },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: REVENUE_STATUSES } },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: weekStart },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.user.count({
        where: {
          isDeleted: false,
          updatedAt: { gte: weekStart },
        },
      }),
    ]);

    const safeAmount = (agg: any): number =>
      Number(agg?._sum?.totalAmount ?? 0);

    return {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        activeIn30Days: activeUsers,
      },
      orders: {
        total: totalOrders,
        today: ordersToday,
        thisWeek: ordersThisWeek,
        thisMonth: ordersThisMonth,
      },
      revenue: {
        total: safeAmount(revenueResult),
        today: safeAmount(revenueTodayResult),
        thisWeek: safeAmount(revenueWeekResult),
        thisMonth: safeAmount(revenueMonthResult),
      },
    };
  }

  async getTopProducts(limit: number = 20) {
    const topItems = await this.prisma.orderItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    const itemIds = topItems.map((item: { itemId: string }) => item.itemId);

    const items = await this.prisma.clothingItem.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        name: true,
        mainImage: true,
        price: true,
        category: true,
      },
    });

    const itemMap = new Map(items.map((item: { id: string }) => [item.id, item]));

    return topItems.map((entry: { itemId: string; _sum: { quantity: number | null }; _count: { id: number } }) => ({
      ...(itemMap.get(entry.itemId) ?? {}),
      totalSold: entry._sum.quantity ?? 0,
      orderCount: entry._count.id,
    }));
  }

  async getConversionRates() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalVisits, totalOrders, totalCarts, cartToOrders] =
      await Promise.all([
        this.prisma.userBehavior.count({
          where: {
            type: "page_view",
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.order.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.cartItem.count(),
        this.prisma.order.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            status: { notIn: ["cancelled" as OrderStatus] },
          },
        }),
      ]);

    return {
      visitToOrder: totalVisits > 0 ? totalOrders / totalVisits : 0,
      cartToOrder: totalCarts > 0 ? cartToOrders / totalCarts : 0,
      period: "30d",
    };
  }

  async getRetentionStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersActiveInPeriod = await this.prisma.user.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { id: true, createdAt: true },
    });

    if (usersActiveInPeriod.length === 0) {
      return { d1: 0, d7: 0, d30: 0 };
    }

    const userIds = usersActiveInPeriod.map((u: { id: string; createdAt: Date }) => u.id);

    const userCreatedAtMap = new Map<string, Date>(
      usersActiveInPeriod.map((u: { id: string; createdAt: Date }) => [u.id, u.createdAt]),
    );

    const returnBehaviors = await this.prisma.userBehavior.findMany({
      where: {
        userId: { in: userIds },
        type: "login",
      },
      select: { userId: true, createdAt: true },
    });

    const userReturnDates = new Map<string, Date[]>();
    for (const behavior of returnBehaviors) {
      const dates = userReturnDates.get(behavior.userId) ?? [];
      dates.push(behavior.createdAt);
      userReturnDates.set(behavior.userId, dates);
    }

    let d1 = 0;
    let d7 = 0;
    let d30 = 0;

    const oneDayMs = 86400000;

    for (const userId of userIds) {
      const created = userCreatedAtMap.get(userId);
      if (!created) continue;

      const returnDates = userReturnDates.get(userId) ?? [];
      const createdTime = created.getTime();

      const hasD1 = returnDates.some(
        (d: Date) => d.getTime() > createdTime && d.getTime() <= createdTime + oneDayMs,
      );
      const hasD7 = returnDates.some(
        (d: Date) => d.getTime() > createdTime && d.getTime() <= createdTime + 7 * oneDayMs,
      );
      const hasD30 = returnDates.some(
        (d: Date) => d.getTime() > createdTime && d.getTime() <= createdTime + 30 * oneDayMs,
      );

      if (hasD1) d1++;
      if (hasD7) d7++;
      if (hasD30) d30++;
    }

    const total = userIds.length;
    return {
      d1: total > 0 ? d1 / total : 0,
      d7: total > 0 ? d7 / total : 0,
      d30: total > 0 ? d30 / total : 0,
    };
  }
}
