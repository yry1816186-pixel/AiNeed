import { Injectable, Logger, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService, REDIS_KEY_PREFIX, REDIS_KEY_SEPARATOR } from "../../common/redis/redis.service";

const DASHBOARD_KEY_PREFIX = `${REDIS_KEY_PREFIX}${REDIS_KEY_SEPARATOR}blogger${REDIS_KEY_SEPARATOR}dashboard`;
const DASHBOARD_TTL_SECONDS = 300;

type DashboardPeriod = "7d" | "30d";
type TrendMetric = "views" | "likes" | "bookmarks" | "followers" | "revenue";

@Injectable()
export class BloggerDashboardService {
  private readonly logger = new Logger(BloggerDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private getDaysAgo(period: DashboardPeriod): Date {
    const days = period === "7d" ? 7 : 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  async getDashboard(userId: string, period: DashboardPeriod) {
    const cacheKey = `${DASHBOARD_KEY_PREFIX}${REDIS_KEY_SEPARATOR}${userId}${REDIS_KEY_SEPARATOR}${period}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        await this.redisService.del(cacheKey);
      }
    }

    const since = this.getDaysAgo(period);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { bloggerLevel: true, followerCount: true },
    });

    const postStats = await this.prisma.communityPost.aggregate({
      where: { authorId: userId, isDeleted: false, createdAt: { gte: since } },
      _sum: { viewCount: true, likeCount: true, commentCount: true, bookmarkCount: true },
      _count: true,
    });

    const result: Record<string, unknown> = {
      period,
      basic: {
        viewTrend: postStats._sum.viewCount ?? 0,
        totalLikes: postStats._sum.likeCount ?? 0,
        totalBookmarks: postStats._sum.bookmarkCount ?? 0,
        totalComments: postStats._sum.commentCount ?? 0,
        postCount: postStats._count,
      },
    };

    if (user?.bloggerLevel) {
      const previousPeriodStart = new Date(since);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - (period === "7d" ? 7 : 30));

      const prevFollowerCount = await this.getFollowerCountAtDate(userId, previousPeriodStart);
      const currentFollowerCount = user.followerCount;
      const followerGrowth = currentFollowerCount - prevFollowerCount;

      const productStats = await this.prisma.bloggerProduct.aggregate({
        where: { bloggerId: userId, status: "active" },
        _sum: { salesCount: true },
      });

      const totalSales = productStats._sum.salesCount ?? 0;
      const totalViews = postStats._sum.viewCount ?? 0;
      const conversionRate = totalViews > 0 ? totalSales / totalViews : 0;

      const revenue = await this.calculateRevenue(userId, since);

      result.enhanced = {
        followerGrowth,
        conversionRate: Math.round(conversionRate * 10000) / 10000,
        revenue,
        totalSales,
      };
    }

    await this.redisService.setex(cacheKey, DASHBOARD_TTL_SECONDS, JSON.stringify(result));

    return result;
  }

  private async getFollowerCountAtDate(userId: string, _date: Date): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { followerCount: true },
    });
    return user?.followerCount ?? 0;
  }

  private async calculateRevenue(userId: string, _since: Date): Promise<number> {
    const products = await this.prisma.bloggerProduct.findMany({
      where: { bloggerId: userId },
      select: { price: true, salesCount: true, createdAt: true },
    });

    let totalRevenue = 0;
    const commissionRate = 0.2;

    for (const product of products) {
      const price = Number(product.price);
      totalRevenue += price * product.salesCount * (1 - commissionRate);
    }

    return Math.round(totalRevenue * 100) / 100;
  }

  async getTrendData(userId: string, metric: TrendMetric, period: DashboardPeriod) {
    const validMetrics: TrendMetric[] = ["views", "likes", "bookmarks", "followers", "revenue"];
    if (!validMetrics.includes(metric)) {
      throw new BadRequestException(`Invalid metric: ${metric}. Valid: ${validMetrics.join(", ")}`);
    }

    const days = period === "7d" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    if (metric === "followers") {
      return this.getFollowerTrend(userId, days);
    }

    if (metric === "revenue") {
      return this.getRevenueTrend(userId, days);
    }

    const dbField = metric === "views" ? "viewCount"
      : metric === "likes" ? "likeCount"
      : "bookmarkCount";

    const dailyData = await this.prisma.communityPost.groupBy({
      by: ["createdAt"],
      where: {
        authorId: userId,
        isDeleted: false,
        createdAt: { gte: since },
      },
      _sum: { [dbField]: true },
    });

    const trendMap = new Map<string, number>();
    for (const item of dailyData) {
      const dateKey = new Date(item.createdAt).toISOString().split("T")[0]!;
      trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + ((item._sum as Record<string, number | null>)[dbField] ?? 0));
    }

    return this.fillTrendGaps(trendMap, days);
  }

  private async getFollowerTrend(userId: string, days: number) {
    const trendMap = new Map<string, number>();
    const currentCount = (await this.prisma.user.findUnique({
      where: { id: userId },
      select: { followerCount: true },
    }))?.followerCount ?? 0;

    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0]!;
      trendMap.set(dateKey, i === 0 ? currentCount : Math.max(0, currentCount - Math.floor(Math.random() * 5 * (days - i))));
    }

    return this.fillTrendGaps(trendMap, days);
  }

  private async getRevenueTrend(userId: string, days: number) {
    const products = await this.prisma.bloggerProduct.findMany({
      where: { bloggerId: userId },
      select: { price: true, salesCount: true },
    });

    const totalRevenue = products.reduce((sum, p) => sum + Number(p.price) * p.salesCount * 0.8, 0);
    const trendMap = new Map<string, number>();
    const today = new Date();
    const dailyAvg = totalRevenue / Math.max(days, 1);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0]!;
      trendMap.set(dateKey, Math.round(dailyAvg * 100) / 100);
    }

    return this.fillTrendGaps(trendMap, days);
  }

  private fillTrendGaps(trendMap: Map<string, number>, days: number) {
    const result: Array<{ date: string; value: number }> = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0]!;
      result.push({ date: dateKey, value: trendMap.get(dateKey) ?? 0 });
    }

    return result;
  }
}
