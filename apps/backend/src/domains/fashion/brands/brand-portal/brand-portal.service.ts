import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";

@Injectable()
export class BrandPortalService {
  constructor(private prisma: PrismaService) {}

  async getBrandDashboard(brandId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalProducts, totalQRCodes, activeQRCodes, scanAgg] = await Promise.all([
      this.prisma.clothingItem.count({ where: { brandId, isActive: true } }),
      this.prisma.brandQRCode.count({ where: { brandId } }),
      this.prisma.brandQRCode.count({ where: { brandId, isActive: true } }),
      this.prisma.brandScanRecord.aggregate({
        _count: true,
        _max: { scannedAt: true },
        where: {
          qrCode: { brandId },
          scannedAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    const topScannedProducts = await this.prisma.brandQRCode.findMany({
      where: { brandId, isActive: true },
      orderBy: { scanCount: "desc" },
      take: 5,
      select: {
        productId: true,
        payload: true,
        scanCount: true,
      },
    });

    return {
      totalProducts,
      totalQRCodes,
      activeQRCodes,
      totalScans30d: scanAgg._count,
      lastScanAt: scanAgg._max.scannedAt,
      topScannedProducts,
    };
  }

  async getProductDataManagement(brandId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where = { brandId, isActive: true };

    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          price: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async updateProductData(
    brandId: string,
    productId: string,
    data: { materialNotes?: string; stylingTips?: string },
  ) {
    const product = await this.prisma.clothingItem.findFirst({
      where: { id: productId, brandId },
    });
    if (!product) {
      throw new Error("商品不存在或不属于该品牌");
    }

    return this.prisma.clothingItem.update({
      where: { id: productId },
      data: {
        description: [
          product.description || "",
          data.materialNotes ? `\n材质说明: ${data.materialNotes}` : "",
          data.stylingTips ? `\n搭配建议: ${data.stylingTips}` : "",
        ].join("").trim(),
      },
    });
  }

  async getScanStatistics(brandId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const where = {
      qrCode: { brandId },
      scannedAt: { gte: start, lte: end },
    };

    const [totalScans, uniqueUsers, scansByDate] = await Promise.all([
      this.prisma.brandScanRecord.count({ where }),
      this.prisma.brandScanRecord.findMany({
        where,
        select: { userId: true },
        distinct: ["userId"],
      }),
      this.prisma.brandScanRecord.groupBy({
        by: ["scannedAt"],
        where,
        _count: true,
        orderBy: { scannedAt: "asc" },
      }),
    ]);

    const popularProducts = await this.prisma.brandQRCode.findMany({
      where: { brandId, isActive: true },
      orderBy: { scanCount: "desc" },
      take: 10,
      select: { productId: true, payload: true, scanCount: true },
    });

    return {
      totalScans,
      uniqueUsers: uniqueUsers.filter((u) => u.userId !== null).length,
      dailyTrend: scansByDate.map((s) => ({
        date: s.scannedAt,
        count: s._count,
      })),
      popularProducts,
    };
  }

  async getUserPreferenceAnalysis(brandId: string) {
    const scannedUserIds = await this.prisma.brandScanRecord.findMany({
      where: {
        qrCode: { brandId },
        userId: { not: null },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const userIds = scannedUserIds
      .map((s) => s.userId)
      .filter((id): id is string => id !== null);

    if (userIds.length === 0) {
      return {
        totalScannedUsers: 0,
        ageDistribution: {},
        stylePreferences: [],
        colorPreferences: [],
        categoryInterests: {},
      };
    }

    const genderDist = await this.prisma.user.groupBy({
      by: ["gender"],
      where: { id: { in: userIds } },
      _count: true,
    });

    return {
      totalScannedUsers: userIds.length,
      genderDistribution: genderDist.reduce(
        (acc, g) => ({ ...acc, [g.gender || "unknown"]: g._count }),
        {} as Record<string, number>,
      ),
      stylePreferences: [],
      colorPreferences: [],
      categoryInterests: {},
    };
  }

  async getQRCodeStats(brandId: string) {
    const [totalCodes, activeCodes, scansAgg] = await Promise.all([
      this.prisma.brandQRCode.count({ where: { brandId } }),
      this.prisma.brandQRCode.count({ where: { brandId, isActive: true } }),
      this.prisma.brandQRCode.aggregate({
        where: { brandId },
        _sum: { scanCount: true },
        _avg: { scanCount: true },
      }),
    ]);

    return {
      totalCodes,
      activeCodes,
      totalScans: scansAgg._sum.scanCount || 0,
      averageScansPerCode: Math.round(scansAgg._avg.scanCount || 0),
    };
  }

  async getScanTrends(brandId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const scans = await this.prisma.brandScanRecord.findMany({
      where: {
        qrCode: { brandId },
        scannedAt: { gte: startDate },
      },
      select: { scannedAt: true },
      orderBy: { scannedAt: "asc" },
    });

    // Group by date
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0] ?? "";
      dailyMap.set(key, 0);
    }

    for (const scan of scans) {
      const key = scan.scannedAt.toISOString().split("T")[0] ?? "";
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
      }
    }

    return {
      days,
      trend: Array.from(dailyMap.entries()).map(([date, count]) => ({
        date,
        count,
      })),
    };
  }
}
