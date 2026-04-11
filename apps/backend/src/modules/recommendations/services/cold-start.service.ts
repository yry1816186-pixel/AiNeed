import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

export interface ColdStartStrategy {
  type: "demographic" | "content" | "popularity" | "survey" | "hybrid";
  confidence: number;
  recommendations: ColdStartRecommendation[];
}

export interface ColdStartRecommendation {
  itemId: string;
  score: number;
  reason: string;
  strategy: string;
}

export interface UserProfile {
  age?: number;
  gender?: string;
  location?: string;
  occupation?: string;
  stylePreferences?: string[];
  priceRange?: { min: number; max: number };
  colorPreferences?: string[];
}

@Injectable()
export class ColdStartService {
  private readonly logger = new Logger(ColdStartService.name);

  private readonly demographicRules = {
    male: {
      young: {
        styles: ["casual", "streetwear"],
        categories: ["tops", "outerwear"],
      },
      middle: {
        styles: ["formal", "smart-casual"],
        categories: ["tops", "bottoms"],
      },
      senior: {
        styles: ["classic", "formal"],
        categories: ["outerwear", "tops"],
      },
    },
    female: {
      young: {
        styles: ["trendy", "feminine"],
        categories: ["dresses", "tops"],
      },
      middle: {
        styles: ["elegant", "classic"],
        categories: ["dresses", "outerwear"],
      },
      senior: {
        styles: ["classic", "elegant"],
        categories: ["outerwear", "dresses"],
      },
    },
  };

  private readonly styleItemMapping: Record<string, string[]> = {
    casual: ["t-shirt", "jeans", "sneakers", "hoodie"],
    formal: ["blazer", "dress-shirt", "dress-pants", "oxfords"],
    streetwear: ["hoodie", "sneakers", "cargo-pants", "cap"],
    elegant: ["blouse", "skirt", "heels", "blazer"],
    trendy: ["crop-top", "high-waisted-pants", "boots", "accessories"],
    classic: ["white-shirt", "trousers", "blazer", "loafers"],
    sporty: ["activewear", "running-shoes", "sports-jacket", "shorts"],
    bohemian: ["maxi-dress", "floral-top", "sandals", "accessories"],
  };

  constructor(private prisma: PrismaService) {}

  async handleNewUser(
    userId: string,
    profile?: UserProfile,
  ): Promise<ColdStartStrategy> {
    const userBehaviorCount = await this.prisma.userBehavior.count({
      where: { userId },
    });

    if (userBehaviorCount >= 10) {
      return this.getHybridStrategy(userId, profile);
    }

    if (profile?.stylePreferences && profile.stylePreferences.length > 0) {
      return this.getSurveyBasedStrategy(userId, profile);
    }

    if (profile?.gender && profile?.age) {
      return this.getDemographicStrategy(userId, profile);
    }

    return this.getPopularityStrategy(userId);
  }

  private async getDemographicStrategy(
    userId: string,
    profile: UserProfile,
  ): Promise<ColdStartStrategy> {
    const ageGroup = this.getAgeGroup(profile.age!);
    const genderRules =
      this.demographicRules[
        profile.gender as keyof typeof this.demographicRules
      ];

    if (!genderRules) {
      return this.getPopularityStrategy(userId);
    }

    const groupRules = genderRules[ageGroup as keyof typeof genderRules];
    if (!groupRules) {
      return this.getPopularityStrategy(userId);
    }

    const recommendations: ColdStartRecommendation[] = [];

    for (const style of groupRules.styles) {
      const items = await this.getItemsByStyle(style, 5);
      for (const item of items) {
        recommendations.push({
          itemId: item.id,
          score: this.deterministicScore(userId, item.id, 70, 20, style),
          reason: `适合${this.getAgeGroupName(ageGroup)}${profile.gender === "male" ? "男性" : "女性"}的${style}风格`,
          strategy: "demographic",
        });
      }
    }

    return {
      type: "demographic",
      confidence: 0.6,
      recommendations: this.deduplicateAndSort(recommendations).slice(0, 20),
    };
  }

  private async getSurveyBasedStrategy(
    userId: string,
    profile: UserProfile,
  ): Promise<ColdStartStrategy> {
    const recommendations: ColdStartRecommendation[] = [];

    for (const style of profile.stylePreferences || []) {
      const items = await this.getItemsByStyle(style, 4);
      for (const item of items) {
        recommendations.push({
          itemId: item.id,
          score: this.deterministicScore(userId, item.id, 75, 15, style),
          reason: `符合您选择的${style}风格`,
          strategy: "survey",
        });
      }
    }

    if (profile.colorPreferences && profile.colorPreferences.length > 0) {
      const colorItems = await this.getItemsByColors(
        profile.colorPreferences,
        6,
      );
      for (const item of colorItems) {
        recommendations.push({
          itemId: item.id,
          score: this.deterministicScore(
            userId,
            item.id,
            70,
            10,
            profile.colorPreferences.join(","),
          ),
          reason: `包含您喜欢的颜色`,
          strategy: "survey",
        });
      }
    }

    if (profile.priceRange) {
      const priceItems = await this.getItemsByPriceRange(
        profile.priceRange.min,
        profile.priceRange.max,
        5,
      );
      for (const item of priceItems) {
        recommendations.push({
          itemId: item.id,
          score: this.deterministicScore(
            userId,
            item.id,
            65,
            10,
            `${profile.priceRange.min}-${profile.priceRange.max}`,
          ),
          reason: `符合您的预算范围`,
          strategy: "survey",
        });
      }
    }

    return {
      type: "survey",
      confidence: 0.75,
      recommendations: this.deduplicateAndSort(recommendations).slice(0, 20),
    };
  }

  private async getPopularityStrategy(
    userId: string,
  ): Promise<ColdStartStrategy> {
    const popularItems = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      take: 30,
      select: { id: true, viewCount: true, likeCount: true },
    });

    const maxViews = popularItems[0]?.viewCount || 1;

    const recommendations: ColdStartRecommendation[] = popularItems.map(
      (item) => ({
        itemId: item.id,
        score:
          50 +
          (item.viewCount / maxViews) * 30 +
          this.deterministicOffset(userId, item.id, 10),
        reason: "热门推荐",
        strategy: "popularity",
      }),
    );

    return {
      type: "popularity",
      confidence: 0.4,
      recommendations,
    };
  }

  private async getHybridStrategy(
    userId: string,
    profile?: UserProfile,
  ): Promise<ColdStartStrategy> {
    const recommendations: ColdStartRecommendation[] = [];

    const popularStrategy = await this.getPopularityStrategy(userId);
    recommendations.push(
      ...popularStrategy.recommendations.map((r) => ({
        ...r,
        score: r.score * 0.3,
        strategy: "hybrid",
      })),
    );

    if (profile?.stylePreferences && profile.stylePreferences.length > 0) {
      const surveyStrategy = await this.getSurveyBasedStrategy(userId, profile);
      recommendations.push(
        ...surveyStrategy.recommendations.map((r) => ({
          ...r,
          score: r.score * 0.5,
          strategy: "hybrid",
        })),
      );
    }

    if (profile?.gender && profile?.age) {
      const demographicStrategy = await this.getDemographicStrategy(
        userId,
        profile,
      );
      recommendations.push(
        ...demographicStrategy.recommendations.map((r) => ({
          ...r,
          score: r.score * 0.2,
          strategy: "hybrid",
        })),
      );
    }

    return {
      type: "hybrid",
      confidence: 0.7,
      recommendations: this.deduplicateAndSort(recommendations).slice(0, 20),
    };
  }

  private async getItemsByStyle(style: string, limit: number) {
    const keywords = this.styleItemMapping[style] || [];

    return this.prisma.clothingItem.findMany({
      where: {
        isActive: true,
        OR: [{ tags: { hasSome: keywords } }, { tags: { has: style } }],
      },
      orderBy: { likeCount: "desc" },
      take: limit,
    });
  }

  private async getItemsByColors(colors: string[], limit: number) {
    return this.prisma.clothingItem.findMany({
      where: {
        isActive: true,
        colors: { hasSome: colors },
      },
      orderBy: { likeCount: "desc" },
      take: limit,
    });
  }

  private async getItemsByPriceRange(min: number, max: number, limit: number) {
    return this.prisma.clothingItem.findMany({
      where: {
        isActive: true,
        price: { gte: min, lte: max },
      },
      orderBy: { likeCount: "desc" },
      take: limit,
    });
  }

  private getAgeGroup(age: number): string {
    if (age < 25) {return "young";}
    if (age < 45) {return "middle";}
    return "senior";
  }

  private getAgeGroupName(group: string): string {
    const names: Record<string, string> = {
      young: "年轻",
      middle: "中年",
      senior: "中老年",
    };
    return names[group] || "";
  }

  private deterministicScore(
    userId: string,
    itemId: string,
    base: number,
    variance: number,
    salt: string,
  ): number {
    return (
      base + this.deterministicOffset(userId, `${itemId}:${salt}`, variance)
    );
  }

  private deterministicOffset(
    seedA: string,
    seedB: string,
    max: number,
  ): number {
    const combined = `${seedA}:${seedB}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash = hash & hash;
    }

    return ((Math.abs(hash) % 1000) / 1000) * max;
  }

  private deduplicateAndSort(
    recommendations: ColdStartRecommendation[],
  ): ColdStartRecommendation[] {
    const seen = new Set<string>();
    const unique: ColdStartRecommendation[] = [];

    for (const rec of recommendations) {
      if (!seen.has(rec.itemId)) {
        seen.add(rec.itemId);
        unique.push(rec);
      }
    }

    return unique.sort((a, b) => b.score - a.score);
  }

  async getOnboardingQuestions(): Promise<
    {
      category: string;
      question: string;
      options: { value: string; label: string; image?: string }[];
    }[]
  > {
    return [
      {
        category: "style",
        question: "您平时喜欢什么风格的穿搭？",
        options: [
          {
            value: "casual",
            label: "休闲舒适",
            image: "/images/style-casual.jpg",
          },
          {
            value: "formal",
            label: "正式商务",
            image: "/images/style-formal.jpg",
          },
          {
            value: "streetwear",
            label: "街头潮流",
            image: "/images/style-streetwear.jpg",
          },
          {
            value: "elegant",
            label: "优雅知性",
            image: "/images/style-elegant.jpg",
          },
          {
            value: "sporty",
            label: "运动活力",
            image: "/images/style-sporty.jpg",
          },
        ],
      },
      {
        category: "color",
        question: "您偏好的服装颜色是？",
        options: [
          {
            value: "neutral",
            label: "黑白灰驼",
            image: "/images/color-neutral.jpg",
          },
          {
            value: "earth",
            label: "大地色系",
            image: "/images/color-earth.jpg",
          },
          {
            value: "pastel",
            label: "柔和浅色",
            image: "/images/color-pastel.jpg",
          },
          {
            value: "vibrant",
            label: "鲜艳亮色",
            image: "/images/color-vibrant.jpg",
          },
          { value: "dark", label: "深色系", image: "/images/color-dark.jpg" },
        ],
      },
      {
        category: "price",
        question: "您日常服装消费预算是？",
        options: [
          { value: "budget", label: "经济实惠 (100-300元)" },
          { value: "moderate", label: "适中价位 (300-800元)" },
          { value: "premium", label: "品质优先 (800-2000元)" },
          { value: "luxury", label: "高端消费 (2000元以上)" },
        ],
      },
      {
        category: "occasion",
        question: "您主要在哪些场合穿着？",
        options: [
          { value: "work", label: "工作通勤" },
          { value: "casual", label: "日常休闲" },
          { value: "social", label: "社交聚会" },
          { value: "date", label: "约会场合" },
          { value: "travel", label: "旅行出游" },
        ],
      },
    ];
  }

  async saveOnboardingAnswers(
    userId: string,
    answers: Record<string, string[]>,
  ): Promise<UserProfile> {
    const profile: UserProfile = {};

    if (answers.style) {
      profile.stylePreferences = answers.style;
    }

    if (answers.color) {
      const colorMapping: Record<string, string[]> = {
        neutral: ["black", "white", "gray", "beige"],
        earth: ["brown", "tan", "olive", "camel"],
        pastel: ["pink", "lavender", "mint", "sky-blue"],
        vibrant: ["red", "orange", "yellow", "green"],
        dark: ["navy", "black", "burgundy", "charcoal"],
      };
      profile.colorPreferences = answers.color.flatMap(
        (c) => colorMapping[c] || [],
      );
    }

    if (answers.price) {
      const priceMapping: Record<string, { min: number; max: number }> = {
        budget: { min: 100, max: 300 },
        moderate: { min: 300, max: 800 },
        premium: { min: 800, max: 2000 },
        luxury: { min: 2000, max: 10000 },
      };
      const priceRanges = answers.price
        .map((p) => priceMapping[p])
        .filter(
          (range): range is { min: number; max: number } => Boolean(range),
        );
      if (priceRanges.length > 0) {
        profile.priceRange = {
          min: Math.min(...priceRanges.map((r) => r.min)),
          max: Math.max(...priceRanges.map((r) => r.max)),
        };
      }
    }

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        stylePreferences: profile.stylePreferences,
        colorPreferences: profile.colorPreferences,
      },
      create: {
        userId,
        stylePreferences: profile.stylePreferences,
        colorPreferences: profile.colorPreferences,
      },
    });

    return profile;
  }
}
