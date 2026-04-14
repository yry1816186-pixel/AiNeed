import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

interface BodyProfile {
  height?: number;
  weight?: number;
  bust?: number;
  waist?: number;
  hip?: number;
}

interface SizeRange {
  size: string;
  chestMin?: number;
  chestMax?: number;
  waistMin?: number;
  waistMax?: number;
  hipsMin?: number;
  hipsMax?: number;
  heightMin?: number;
  heightMax?: number;
}

interface RecommendationResult {
  recommendedSize: string;
  confidence: "high" | "medium" | "low";
  reasons: string[];
}

@Injectable()
export class SizeRecommendationService {
  private readonly logger = new Logger(SizeRecommendationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get AI size recommendation based on body profile + order history.
   * Per D-06: Returns null when no body profile data exists.
   */
  async getRecommendation(
    userId: string,
    itemId: string,
  ): Promise<RecommendationResult | null> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (
      !userProfile ||
      (userProfile.bust === null &&
        userProfile.waist === null &&
        userProfile.hip === null &&
        userProfile.height === null)
    ) {
      return null;
    }

    const bodyProfile: BodyProfile = {
      height: userProfile.height ?? undefined,
      weight: userProfile.weight ?? undefined,
      bust: userProfile.bust ?? undefined,
      waist: userProfile.waist ?? undefined,
      hip: userProfile.hip ?? undefined,
    };

    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
      include: { brand: true },
    });

    if (!item) {
      throw new NotFoundException("商品不存在");
    }

    const sizeChart = this.buildSizeRanges(item.sizes);
    const matchResult = this.matchBodyToSizes(bodyProfile, sizeChart);
    const historyBonus = await this.getOrderHistoryBonus(userId, item.brandId);
    const returnPenalty = await this.getReturnPenalty(userId, item.brandId);

    const reasons: string[] = [];

    if (matchResult.matchScore > 0) {
      reasons.push(`体型匹配度 ${Math.round(matchResult.matchScore * 100)}%`);
    }

    if (historyBonus.size) {
      reasons.push(`曾购买该品牌 ${historyBonus.size} 码`);
      if (historyBonus.size === matchResult.recommendedSize) {
        matchResult.confidence = this.boostConfidence(matchResult.confidence);
      }
    }

    if (returnPenalty.size) {
      reasons.push(`曾退换该品牌 ${returnPenalty.size} 码`);
      matchResult.confidence = this.lowerConfidence(matchResult.confidence);
    }

    return {
      recommendedSize: matchResult.recommendedSize,
      confidence: matchResult.confidence,
      reasons,
    };
  }

  /**
   * Get size chart for an item (public endpoint).
   */
  async getSizeChart(itemId: string) {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException("商品不存在");
    }

    return this.buildSizeChartResponse(item.sizes);
  }

  private buildSizeRanges(sizes: string[]): SizeRange[] {
    const defaultChart: SizeRange[] = [
      { size: "XS", chestMin: 76, chestMax: 80, waistMin: 60, waistMax: 64, hipsMin: 84, hipsMax: 88, heightMin: 150, heightMax: 158 },
      { size: "S", chestMin: 80, chestMax: 84, waistMin: 64, waistMax: 68, hipsMin: 88, hipsMax: 92, heightMin: 155, heightMax: 162 },
      { size: "M", chestMin: 84, chestMax: 88, waistMin: 68, waistMax: 72, hipsMin: 92, hipsMax: 96, heightMin: 160, heightMax: 168 },
      { size: "L", chestMin: 88, chestMax: 92, waistMin: 72, waistMax: 76, hipsMin: 96, hipsMax: 100, heightMin: 165, heightMax: 172 },
      { size: "XL", chestMin: 92, chestMax: 96, waistMin: 76, waistMax: 80, hipsMin: 100, hipsMax: 104, heightMin: 168, heightMax: 176 },
      { size: "XXL", chestMin: 96, chestMax: 100, waistMin: 80, waistMax: 84, hipsMin: 104, hipsMax: 108, heightMin: 170, heightMax: 180 },
    ];

    const upperSizes = sizes.map((s) => s.toUpperCase());
    return defaultChart.filter((sc) => upperSizes.includes(sc.size.toUpperCase()));
  }

  private buildSizeChartResponse(sizes: string[]) {
    const defaultSizes = [
      { size: "XS", chest: "76-80", waist: "60-64", hips: "84-88", height: "150-158" },
      { size: "S", chest: "80-84", waist: "64-68", hips: "88-92", height: "155-162" },
      { size: "M", chest: "84-88", waist: "68-72", hips: "92-96", height: "160-168" },
      { size: "L", chest: "88-92", waist: "72-76", hips: "96-100", height: "165-172" },
      { size: "XL", chest: "92-96", waist: "76-80", hips: "100-104", height: "168-176" },
      { size: "XXL", chest: "96-100", waist: "80-84", hips: "104-108", height: "170-180" },
    ];

    const upperSizes = sizes.map((s) => s.toUpperCase());
    const filtered = defaultSizes.filter((s) => upperSizes.includes(s.size.toUpperCase()));
    return { sizes: filtered };
  }

  private matchBodyToSizes(
    body: BodyProfile,
    sizeChart: SizeRange[],
  ): { recommendedSize: string; matchScore: number; confidence: "high" | "medium" | "low" } {
    if (sizeChart.length === 0) {
      return { recommendedSize: "M", matchScore: 0, confidence: "low" };
    }

    let bestSize = sizeChart[0]?.size ?? "M";
    let bestScore = 0;

    for (const sizeRange of sizeChart) {
      let score = 0;
      let totalWeights = 0;

      if (body.bust && sizeRange.chestMin !== undefined && sizeRange.chestMax !== undefined) {
        const inRange = body.bust >= sizeRange.chestMin && body.bust <= sizeRange.chestMax;
        score += inRange ? 3 : 0;
        totalWeights += 3;
      }

      if (body.waist && sizeRange.waistMin !== undefined && sizeRange.waistMax !== undefined) {
        const inRange = body.waist >= sizeRange.waistMin && body.waist <= sizeRange.waistMax;
        score += inRange ? 3 : 0;
        totalWeights += 3;
      }

      if (body.hip && sizeRange.hipsMin !== undefined && sizeRange.hipsMax !== undefined) {
        const inRange = body.hip >= sizeRange.hipsMin && body.hip <= sizeRange.hipsMax;
        score += inRange ? 2 : 0;
        totalWeights += 2;
      }

      if (body.height && sizeRange.heightMin !== undefined && sizeRange.heightMax !== undefined) {
        const inRange = body.height >= sizeRange.heightMin && body.height <= sizeRange.heightMax;
        score += inRange ? 1 : 0;
        totalWeights += 1;
      }

      const normalizedScore = totalWeights > 0 ? score / totalWeights : 0;
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestSize = sizeRange.size;
      }
    }

    const confidence: "high" | "medium" | "low" =
      bestScore >= 0.8 ? "high" : bestScore >= 0.5 ? "medium" : "low";

    return { recommendedSize: bestSize, matchScore: bestScore, confidence };
  }

  private async getOrderHistoryBonus(
    userId: string,
    brandId: string | null,
  ): Promise<{ size: string | null }> {
    if (!brandId) return { size: null };

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          userId,
          status: { in: ["delivered", "paid", "shipped"] },
        },
        item: { brandId },
      },
      select: { size: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    if (orderItems.length === 0) return { size: null };

    const sizeCounts: Record<string, number> = {};
    for (const oi of orderItems) {
      sizeCounts[oi.size] = (sizeCounts[oi.size] || 0) + 1;
    }

    const mostCommon = Object.entries(sizeCounts).sort((a, b) => b[1] - a[1])[0];
    return { size: mostCommon?.[0] ?? null };
  }

  private async getReturnPenalty(
    userId: string,
    brandId: string | null,
  ): Promise<{ size: string | null }> {
    if (!brandId) return { size: null };

    const refundRequests = await this.prisma.refundRequest.findMany({
      where: {
        userId,
        order: {
          items: {
            some: {
              item: { brandId },
            },
          },
        },
      },
      include: {
        order: {
          select: {
            items: {
              where: { item: { brandId } },
              select: { size: true },
            },
          },
        },
      },
      take: 3,
      orderBy: { createdAt: "desc" },
    });

    if (refundRequests.length === 0) return { size: null };

    const sizes = refundRequests.flatMap((r) => r.order.items.map((i) => i.size));
    if (sizes.length === 0) return { size: null };

    return { size: sizes[0] ?? null };
  }

  private boostConfidence(
    confidence: "high" | "medium" | "low",
  ): "high" | "medium" | "low" {
    if (confidence === "low") return "medium";
    if (confidence === "medium") return "high";
    return "high";
  }

  private lowerConfidence(
    confidence: "high" | "medium" | "low",
  ): "high" | "medium" | "low" {
    if (confidence === "high") return "medium";
    if (confidence === "medium") return "low";
    return "low";
  }
}
