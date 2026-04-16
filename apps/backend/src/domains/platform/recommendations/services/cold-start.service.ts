import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";

import { ciede2000, rgbToLab } from "./ciede2000";

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

  async getDemographicRecommendations(
    userId: string,
    topK: number = 10,
  ): Promise<Array<{ itemId: string; score: number; reason: string }>> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {return [];}

    const reasons: string[] = [];

    if (user.gender) {
      reasons.push(`适合${user.gender === "male" ? "男性" : "女性"}`);
    }

    if (profile?.colorSeason) {
      reasons.push(`适合你的${this.translateColorSeason(profile.colorSeason)}色彩`);
    }

    if (profile?.bodyType) {
      reasons.push(`适配${profile.bodyType}体型`);
    }

    const items = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      take: topK * 3,
      orderBy: { createdAt: "desc" },
    });

    const scored = items.map((item) => ({
      itemId: item.id,
      score: 50 + this.deterministicOffset(userId, item.id, 30),
      reason: reasons.join("，") || "为你精选推荐",
    }));

    return scored.slice(0, topK);
  }

  async getHybridRecommendations(
    userId: string,
    topK: number = 10,
  ): Promise<Array<{ itemId: string; score: number; reason: string }>> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const hasProfile = !!profile;

    const [demographic, popular] = await Promise.all([
      this.getDemographicRecommendations(userId, topK),
      this.getPopularRecommendations(topK),
    ]);

    const weights = {
      demographic: hasProfile ? 0.5 : 0.2,
      popular: hasProfile ? 0.3 : 0.6,
    };

    const merged = new Map<string, { score: number; reason: string }>();
    for (const item of demographic) {
      merged.set(item.itemId, { score: item.score * weights.demographic, reason: item.reason });
    }
    for (const item of popular) {
      const existing = merged.get(item.itemId);
      if (existing) {
        existing.score += item.score * weights.popular;
      } else {
        merged.set(item.itemId, { score: item.score * weights.popular, reason: item.reason });
      }
    }

    return Array.from(merged.entries())
      .map(([itemId, data]) => ({ itemId, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private async getPopularRecommendations(
    topK: number,
  ): Promise<Array<{ itemId: string; score: number; reason: string }>> {
    const items = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      take: topK,
      select: { id: true },
    });

    return items.map((item) => ({
      itemId: item.id,
      score: 50,
      reason: "热门推荐",
    }));
  }

  private translateColorSeason(season: string): string {
    const map: Record<string, string> = {
      spring_warm: "暖春", spring_light: "浅春",
      summer_cool: "凉夏", summer_light: "浅夏",
      autumn_warm: "暖秋", autumn_deep: "深秋",
      winter_cool: "冷冬", winter_deep: "深冬",
      spring: "春", summer: "夏", autumn: "秋", winter: "冬",
    };
    return map[season] || season;
  }

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

    // 1. Popularity base (30% weight)
    const popularStrategy = await this.getPopularityStrategy(userId);
    recommendations.push(
      ...popularStrategy.recommendations.map((r) => ({
        ...r,
        score: r.score * 0.3,
        strategy: "hybrid" as const,
      })),
    );

    // 2. Survey preferences (25% weight)
    if (profile?.stylePreferences && profile.stylePreferences.length > 0) {
      const surveyStrategy = await this.getSurveyBasedStrategy(userId, profile);
      recommendations.push(
        ...surveyStrategy.recommendations.map((r) => ({
          ...r,
          score: r.score * 0.25,
          strategy: "hybrid" as const,
        })),
      );
    }

    // 3. Color season filtering via CIEDE2000 (25% weight)
    const colorSeasonRecs = await this.getColorSeasonFilteredItems(userId, 8);
    recommendations.push(
      ...colorSeasonRecs.map((r) => ({
        ...r,
        score: r.score * 0.25,
        strategy: "hybrid" as const,
      })),
    );

    // 4. Body type preference mapping (15% weight)
    const bodyTypeRecs = await this.getBodyTypeFilteredItems(userId, 6);
    recommendations.push(
      ...bodyTypeRecs.map((r) => ({
        ...r,
        score: r.score * 0.15,
        strategy: "hybrid" as const,
      })),
    );

    // 5. Demographic rules (5% weight - minimal)
    if (profile?.gender && profile?.age) {
      const demographicStrategy = await this.getDemographicStrategy(
        userId,
        profile,
      );
      recommendations.push(
        ...demographicStrategy.recommendations.map((r) => ({
          ...r,
          score: r.score * 0.05,
          strategy: "hybrid" as const,
        })),
      );
    }

    return {
      type: "hybrid",
      confidence: 0.75,
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

  /**
   * Color season-based filtering using CIEDE2000 perceptual distance.
   * Filters items whose colors are within the user's seasonal palette.
   */
  private async getColorSeasonFilteredItems(
    userId: string,
    limit: number,
  ): Promise<ColdStartRecommendation[]> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { colorSeason: true },
    });

    if (!profile?.colorSeason) {
      return [];
    }

    // Map color season to suitable color palette (CIELAB approximation)
    const seasonPalettes: Record<string, Array<[number, number, number]>> = {
      spring: [
        [75, 20, 15], [70, 15, 20], [80, 10, 10], [65, 25, 20],
      ],
      summer: [
        [70, 8, -10], [75, 5, -15], [65, 10, -5], [80, 3, -8],
      ],
      autumn: [
        [55, 15, 25], [50, 20, 30], [60, 10, 20], [45, 18, 22],
      ],
      winter: [
        [50, 25, -20], [45, 20, -25], [55, 15, -15], [40, 30, -30],
      ],
    };

    const season = profile.colorSeason.split("_")[0] ?? "spring";
    const palette = seasonPalettes[season];
    if (!palette) {
      return [];
    }

    // Fetch candidate items
    const items = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        colors: true,
        viewCount: true,
      },
      take: limit * 5,
      orderBy: { likeCount: "desc" },
    });

    const recommendations: ColdStartRecommendation[] = [];
    const colorNameToRgb: Record<string, [number, number, number]> = {
      black: [0, 0, 0], white: [255, 255, 255], gray: [128, 128, 128],
      red: [255, 0, 0], blue: [0, 0, 255], green: [0, 128, 0],
      yellow: [255, 255, 0], orange: [255, 165, 0], pink: [255, 192, 203],
      purple: [128, 0, 128], brown: [139, 69, 19], beige: [245, 245, 220],
      navy: [0, 0, 128], cream: [255, 253, 208], tan: [210, 180, 140],
      burgundy: [128, 0, 32], coral: [255, 127, 80], olive: [128, 128, 0],
      maroon: [128, 0, 0], teal: [0, 128, 128], ivory: [255, 255, 240],
      khaki: [195, 176, 145], charcoal: [54, 69, 79], camel: [193, 154, 107],
    };

    for (const item of items) {
      if (!item.colors || item.colors.length === 0) {continue;}

      let bestDeltaE = Infinity;
      for (const colorName of item.colors) {
        const rgb = colorNameToRgb[colorName.toLowerCase()];
        if (!rgb) {continue;}
        const itemLab = rgbToLab({ r: rgb[0], g: rgb[1], b: rgb[2] });
        for (const paletteLab of palette) {
          const delta = ciede2000(
            { L: itemLab.L, a: itemLab.a, b: itemLab.b },
            { L: paletteLab[0], a: paletteLab[1], b: paletteLab[2] },
          );
          bestDeltaE = Math.min(bestDeltaE, delta);
        }
      }

      // Score based on CIEDE2000 distance to seasonal palette
      // deltaE < 20 = very harmonious, 20-40 = acceptable, > 40 = mismatch
      if (bestDeltaE < 40) {
        const colorScore = Math.max(0, 1 - bestDeltaE / 50);
        const popularityBonus = Math.min(item.viewCount / 200, 0.2);
        recommendations.push({
          itemId: item.id,
          score: 60 + colorScore * 30 + popularityBonus * 10,
          reason: `适合你的${this.translateColorSeason(profile.colorSeason)}色彩`,
          strategy: "color-season",
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Body type-based preference mapping.
   * Uses body type from user profile to suggest suitable categories and styles.
   */
  private async getBodyTypeFilteredItems(
    userId: string,
    limit: number,
  ): Promise<ColdStartRecommendation[]> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { bodyType: true },
    });

    if (!profile?.bodyType) {
      return [];
    }

    // Body type -> suitable style/category mapping
    const bodyTypePreferences: Record<string, {
      styles: string[];
      categories: string[];
      avoid: string[];
    }> = {
      rectangle: {
        styles: ["casual", "streetwear", "minimalist"],
        categories: ["tops", "outerwear", "bottoms"],
        avoid: ["form-fitting"],
      },
      hourglass: {
        styles: ["elegant", "classic", "feminine"],
        categories: ["dresses", "tops", "bottoms"],
        avoid: ["oversized"],
      },
      triangle: {
        styles: ["casual", "elegant", "classic"],
        categories: ["tops", "outerwear"],
        avoid: ["tight-bottoms"],
      },
      inverted_triangle: {
        styles: ["casual", "sporty", "streetwear"],
        categories: ["bottoms", "tops"],
        avoid: ["shoulder-pads"],
      },
      oval: {
        styles: ["classic", "casual", "smart-casual"],
        categories: ["outerwear", "tops"],
        avoid: ["crop-tops"],
      },
    };

    const prefs = bodyTypePreferences[profile.bodyType];
    if (!prefs) {
      return [];
    }

    const items = await this.prisma.clothingItem.findMany({
      where: {
        isActive: true,
        OR: [
          { tags: { hasSome: prefs.styles } },
          { tags: { hasSome: prefs.categories } },
        ],
      },
      orderBy: { likeCount: "desc" },
      take: limit,
    });

    return items.map((item) => ({
      itemId: item.id,
      score: 55 + this.deterministicOffset(userId, item.id, 25),
      reason: `适合${profile.bodyType}体型的穿搭`,
      strategy: "body-type",
    }));
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
