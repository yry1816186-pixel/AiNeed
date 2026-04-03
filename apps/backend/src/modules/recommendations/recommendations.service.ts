import { Injectable, Logger } from "@nestjs/common";
import {
  BodyType,
  SkinTone,
  ColorSeason,
  ClothingCategory,
  ClothingItem,
  Prisma,
} from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { CacheKeyBuilder, CACHE_TTL } from "../cache/cache.constants";
import { CacheService } from "../cache/cache.service";

interface UserProfile {
  bodyType?: BodyType | null;
  skinTone?: SkinTone | null;
  colorSeason?: ColorSeason | null;
  stylePreferences?: string[];
  colorPreferences?: string[];
}

export interface RecommendedItem {
  item: {
    id: string;
    name: string;
    category: ClothingCategory;
    price: Prisma.Decimal;
    originalPrice: Prisma.Decimal | null;
    mainImage: string | null;
    images: string[];
    colors: string[];
    attributes: Prisma.JsonValue;
    viewCount: number;
    likeCount: number;
    brand: {
      id: string;
      name: string;
      logo: string | null;
    } | null;
    // 可选字段，兼容 ClothingItem 完整类型
    description?: string | null;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  };
  score: number;
  matchReasons: string[];
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getPersonalizedRecommendations(
    userId: string,
    options: {
      category?: ClothingCategory;
      occasion?: string;
      season?: string;
      limit?: number;
    } = {},
  ): Promise<RecommendedItem[]> {
    const { category, occasion, season, limit = 20 } = options;

    // Build cache key for recommendations
    const cacheKey = CacheKeyBuilder.outfitRecommendations(userId, {
      category,
      occasion,
      season,
      limit,
    });

    const cached = await this.cacheService.getOrSet<RecommendedItem[]>(
      cacheKey,
      async () => {
        const profileData = await this.prisma.userProfile.findUnique({
          where: { userId },
        });

        if (!profileData) {
          return this.getPopularItems(category, limit);
        }

        // 转换 profile 数据类型
        const profile: UserProfile = {
          bodyType: profileData.bodyType,
          skinTone: profileData.skinTone,
          colorSeason: profileData.colorSeason,
          stylePreferences: Array.isArray(profileData.stylePreferences)
            ? (profileData.stylePreferences as string[])
            : undefined,
          colorPreferences: Array.isArray(profileData.colorPreferences)
            ? (profileData.colorPreferences as string[])
            : undefined,
        };

        const items = await this.prisma.clothingItem.findMany({
          where: {
            isActive: true,
            isDeleted: false,
            ...(category && { category }),
          },
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            originalPrice: true,
            mainImage: true,
            images: true,
            colors: true,
            attributes: true,
            viewCount: true,
            likeCount: true,
            brand: {
              select: { id: true, name: true, logo: true },
            },
          },
          take: limit * 3,
        });

        const scoredItems = items.map((item) => ({
          item,
          score: this.calculateMatchScore(profile, item, { occasion, season }),
          matchReasons: this.generateMatchReasons(profile, item),
        }));

        scoredItems.sort((a, b) => b.score - a.score);

        return scoredItems.slice(0, limit);
      },
      CACHE_TTL.OUTFIT_RECOMMENDATIONS,
    );

    return cached ?? [];
  }

  private calculateMatchScore(
    profile: UserProfile,
    item: {
      attributes?: Prisma.JsonValue;
      colors: string[];
      price: Prisma.Decimal;
      category: ClothingCategory;
      viewCount: number;
      likeCount: number;
      name: string;
      mainImage: string | null;
      images: string[];
    },
    context: { occasion?: string; season?: string },
  ): number {
    let score = 50;

    // Type guard for attributes
    const attrs = item.attributes as Record<string, unknown> | null;

    if (profile.bodyType && attrs?.bodyTypeFit) {
      if (Array.isArray(attrs.bodyTypeFit) && attrs.bodyTypeFit.includes(profile.bodyType)) {
        score += 20;
      }
    }

    if (profile.colorSeason && attrs?.colorSeasons) {
      if (Array.isArray(attrs.colorSeasons) && attrs.colorSeasons.includes(profile.colorSeason)) {
        score += 15;
      }
    }

    if (profile.skinTone && item.colors) {
      const flatteringColors = this.getFlatteringColors(profile.skinTone);
      const hasFlatteringColor = item.colors.some((c: string) =>
        flatteringColors.includes(c.toLowerCase()),
      );
      if (hasFlatteringColor) {
        score += 10;
      }
    }

    if (context.occasion) {
      // Occasion-based scoring (simplified)
      if (attrs?.styleTags && Array.isArray(attrs.styleTags)) {
        const occasionKeywords: Record<string, string[]> = {
          interview: ["formal", "professional", "business"],
          work: ["business", "smart-casual", "professional"],
          date: ["romantic", "elegant", "stylish"],
          travel: ["comfortable", "casual", "practical"],
          party: ["trendy", "stylish", "bold"],
          daily: ["casual", "comfortable", "practical"],
          campus: ["casual", "youthful", "trendy"],
        };
        const keywords = occasionKeywords[context.occasion] || [];
        const hasMatchingStyle = attrs.styleTags.some((s: unknown) =>
          typeof s === "string" && keywords.some(k => s.toLowerCase().includes(k)),
        );
        if (hasMatchingStyle) {
          score += 15;
        }
      }
    }

    // Boost by popularity
    if (item.viewCount > 1000) {
      score += 10;
    }
    if (item.likeCount > 100) {
      score += 5;
    }

    // Price range preference (if available in profile)
    const price = Number(item.price);
    if (profile.stylePreferences?.includes("budget-friendly") && price < 500) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private generateMatchReasons(
    profile: UserProfile,
    item: {
      attributes?: Prisma.JsonValue;
      colors: string[];
      category: ClothingCategory;
      name: string;
      mainImage: string | null;
      images: string[];
    },
  ): string[] {
    const reasons: string[] = [];

    // Type guard for attributes
    const attrs = item.attributes as Record<string, unknown> | null;

    if (
      profile.bodyType &&
      attrs?.bodyTypeFit &&
      Array.isArray(attrs.bodyTypeFit) &&
      attrs.bodyTypeFit.includes(profile.bodyType)
    ) {
      reasons.push(`适合${this.getBodyTypeName(profile.bodyType)}体型`);
    }

    if (
      profile.colorSeason &&
      attrs?.colorSeasons &&
      Array.isArray(attrs.colorSeasons) &&
      attrs.colorSeasons.includes(profile.colorSeason)
    ) {
      reasons.push(`符合${this.getColorSeasonName(profile.colorSeason)}型色彩`);
    }

    if (profile.skinTone && item.colors?.length > 0) {
      const flatteringColors = this.getFlatteringColors(profile.skinTone);
      const matchedColor = item.colors.find((c: string) =>
        flatteringColors.includes(c.toLowerCase()),
      );
      if (matchedColor) {
        reasons.push(`${matchedColor}衬托你的肤色`);
      }
    }

    if (item.category) {
      const categoryNames: Record<ClothingCategory, string> = {
        [ClothingCategory.tops]: "上装",
        [ClothingCategory.bottoms]: "下装",
        [ClothingCategory.dresses]: "连衣裙",
        [ClothingCategory.outerwear]: "外套",
        [ClothingCategory.footwear]: "鞋履",
        [ClothingCategory.accessories]: "配饰",
        [ClothingCategory.activewear]: "运动装",
        [ClothingCategory.swimwear]: "泳装",
      };
      reasons.push(`${categoryNames[item.category]}单品`);
    }

    return reasons.length > 0 ? reasons : ["热门单品"];
  }

  private getFlatteringColors(skinTone: SkinTone): string[] {
    const colorMap: Record<SkinTone, string[]> = {
      [SkinTone.fair]: ["white", "pink", "light blue", "lavender", "peach"],
      [SkinTone.light]: ["coral", "turquoise", "warm beige", "rose", "mint"],
      [SkinTone.medium]: ["olive", "mustard", "burgundy", "teal", "rust"],
      [SkinTone.olive]: [
        "earth tones",
        "gold",
        "cream",
        "forest green",
        "maroon",
      ],
      [SkinTone.tan]: ["white", "bright colors", "coral", "emerald", "navy"],
      [SkinTone.dark]: [
        "jewel tones",
        "bright white",
        "vibrant colors",
        "gold",
        "silver",
      ],
    };
    return colorMap[skinTone] || [];
  }

  private getBodyTypeName(bodyType: BodyType): string {
    const names: Record<BodyType, string> = {
      [BodyType.rectangle]: "H型",
      [BodyType.triangle]: "A型",
      [BodyType.inverted_triangle]: "Y型",
      [BodyType.hourglass]: "X型",
      [BodyType.oval]: "O型",
    };
    return names[bodyType] || bodyType;
  }

  private getColorSeasonName(season: ColorSeason): string {
    const names: Record<ColorSeason, string> = {
      [ColorSeason.spring]: "春季",
      [ColorSeason.summer]: "夏季",
      [ColorSeason.autumn]: "秋季",
      [ColorSeason.winter]: "冬季",
    };
    return names[season] || season;
  }

  private getCategoryName(category: ClothingCategory): string {
    const names: Record<ClothingCategory, string> = {
      [ClothingCategory.tops]: "上装",
      [ClothingCategory.bottoms]: "下装",
      [ClothingCategory.dresses]: "连衣裙",
      [ClothingCategory.outerwear]: "外套",
      [ClothingCategory.footwear]: "鞋履",
      [ClothingCategory.accessories]: "配饰",
      [ClothingCategory.activewear]: "运动装",
      [ClothingCategory.swimwear]: "泳装",
    };
    return names[category] || category;
  }

  private getOccasionStyles(occasion: string): string[] {
    const occasionStylesMap: Record<string, string[]> = {
      interview: ["minimalist", "smart casual", "formal"],
      work: ["smart casual", "minimalist", "business"],
      date: ["romantic", "elegant", "chic"],
      travel: ["casual", "comfortable", "practical"],
      party: ["glamorous", "trendy", "bold"],
      daily: ["casual", "comfortable", "practical"],
      campus: ["casual", "youthful", "trendy"],
    };
    return occasionStylesMap[occasion.toLowerCase()] || [];
  }

  private async getPopularItems(
    category?: ClothingCategory,
    limit: number = 20,
  ): Promise<RecommendedItem[]> {
    const items = await this.prisma.clothingItem.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        ...(category && { category }),
      },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        originalPrice: true,
        mainImage: true,
        images: true,
        colors: true,
        attributes: true,
        viewCount: true,
        likeCount: true,
        brand: {
          select: { id: true, name: true, logo: true },
        },
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { viewCount: "desc" },
      take: limit,
    });

    return items.map((item) => ({
      item: {
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        originalPrice: item.originalPrice,
        mainImage: item.mainImage,
        images: item.images,
        colors: item.colors,
        attributes: item.attributes,
        viewCount: item.viewCount,
        likeCount: item.likeCount,
        brand: item.brand,
        description: item.description,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
      score: 60,
      matchReasons: ["热门单品"],
    }));
  }

  async getStyleGuide(userId: string): Promise<{
    bodyType: string | null;
    skinTone: string | null;
    colorSeason: string | null;
    recommendations: string[];
  }> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        bodyType: null,
        skinTone: null,
        colorSeason: null,
        recommendations: ["请先完善您的形象档案"],
      };
    }

    const recommendations: string[] = [];

    if (profile.bodyType) {
      recommendations.push(
        ...this.getBodyTypeRecommendations(profile.bodyType),
      );
    }

    if (profile.colorSeason) {
      recommendations.push(
        ...this.getColorSeasonRecommendations(profile.colorSeason),
      );
    }

    return {
      bodyType: profile.bodyType
        ? this.getBodyTypeName(profile.bodyType)
        : null,
      skinTone: profile.skinTone || null,
      colorSeason: profile.colorSeason
        ? this.getColorSeasonName(profile.colorSeason)
        : null,
      recommendations,
    };
  }

  private getBodyTypeRecommendations(bodyType: BodyType): string[] {
    const guides: Record<BodyType, string[]> = {
      [BodyType.rectangle]: [
        "选择有腰线的款式来创造曲线感",
        "尝试层叠穿搭增加层次感",
        "高腰裤/裙可以优化比例",
      ],
      [BodyType.triangle]: [
        "上身选择亮色或有图案的款式",
        "A字裙非常适合您的体型",
        "避免紧身裤和紧身裙",
      ],
      [BodyType.inverted_triangle]: [
        "选择V领或圆领来平衡肩宽",
        "下身可以选择有图案或亮色的款式",
        "避免垫肩设计",
      ],
      [BodyType.hourglass]: [
        "突出腰线的款式最适合您",
        "合身的剪裁比宽松款更好",
        "高腰设计可以强调您的优势",
      ],
      [BodyType.oval]: [
        "选择V领或开领设计",
        "垂直条纹可以拉长视觉效果",
        "避免过于紧身或过于宽松的款式",
      ],
    };
    return guides[bodyType] || [];
  }

  private getColorSeasonRecommendations(season: ColorSeason): string[] {
    const guides: Record<ColorSeason, string[]> = {
      [ColorSeason.spring]: [
        "暖色调非常适合您，如珊瑚色、桃色",
        "避免过于冷峻的灰黑色",
        "金色饰品比银色更适合",
      ],
      [ColorSeason.summer]: [
        "柔和的冷色调最适合您",
        "粉色、薰衣草色、浅蓝色都是好选择",
        "银色饰品比金色更适合",
      ],
      [ColorSeason.autumn]: [
        "大地色系是您的最佳选择",
        "驼色、棕色、橄榄绿都很适合",
        "金色和铜色饰品非常适合",
      ],
      [ColorSeason.winter]: [
        "高饱和度的冷色调最适合",
        "正红色、纯白色、黑色都很适合",
        "银色饰品是最佳选择",
      ],
    };
    return guides[season] || [];
  }
}
