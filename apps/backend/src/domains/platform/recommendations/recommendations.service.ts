/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Injectable, Logger } from "@nestjs/common";
import {
  BodyType,
  SkinTone,
  ColorSeason,
  ClothingCategory,
  ClothingItem,
  Prisma,
} from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { CacheKeyBuilder, CACHE_TTL } from "../../../modules/cache/cache.constants";
import { CacheService } from "../../../modules/cache/cache.service";

interface UserProfile {
  bodyType?: BodyType | null;
  skinTone?: SkinTone | null;
  colorSeason?: ColorSeason | null;
  stylePreferences?: string[];
  colorPreferences?: string[];
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
}

interface UserInteractionSummary {
  favoriteItemIds: string[];
  viewedCategories: Record<string, number>;
  cartItemIds: string[];
  preferredColors: string[];
  recentBehaviorTypes: string[];
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
    description?: string | null;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  };
  score: number;
  matchReasons: string[];
}

export interface OutfitRecommendation {
  id: string;
  name: string;
  items: RecommendedItem[];
  occasion?: string;
  totalScore: number;
  reasoning: string;
}

interface ScoredItem {
  item: RecommendedItem["item"];
  score: number;
  matchReasons: string[];
}

// 权重配置 - 基于规则的推荐引擎权重
const WEIGHTS = {
  bodyTypeMatch: 20,
  colorSeasonMatch: 15,
  skinToneColorMatch: 10,
  occasionMatch: 15,
  userFavoriteBoost: 20,
  categoryPreferenceBoost: 12,
  popularityBoost: 8,
  priceRangeMatch: 10,
  collaborativeSimilarity: 15,
  diversityPenalty: -5,
};

// 场合-风格关键词映射
const OCCASION_STYLE_MAP: Record<string, string[]> = {
  interview: ["formal", "professional", "business", "minimalist", "smart casual"],
  work: ["business", "smart-casual", "professional", "minimalist"],
  date: ["romantic", "elegant", "stylish", "chic", "feminine"],
  travel: ["comfortable", "casual", "practical", "lightweight"],
  party: ["trendy", "stylish", "bold", "glamorous", "elegant"],
  daily: ["casual", "comfortable", "practical", "versatile"],
  campus: ["casual", "youthful", "trendy", "sporty"],
  workout: ["athletic", "comfortable", "stretchy", "breathable"],
};

// 季节-分类适配映射
const SEASON_CATEGORY_MAP: Record<string, ClothingCategory[]> = {
  spring: [ClothingCategory.tops, ClothingCategory.bottoms, ClothingCategory.dresses, ClothingCategory.outerwear, ClothingCategory.footwear],
  summer: [ClothingCategory.tops, ClothingCategory.bottoms, ClothingCategory.dresses, ClothingCategory.swimwear, ClothingCategory.footwear],
  autumn: [ClothingCategory.tops, ClothingCategory.bottoms, ClothingCategory.outerwear, ClothingCategory.footwear, ClothingCategory.accessories],
  winter: [ClothingCategory.outerwear, ClothingCategory.tops, ClothingCategory.bottoms, ClothingCategory.footwear, ClothingCategory.accessories],
};

// 搭配模板：上衣+下装+鞋包
const OUTFIT_TEMPLATES: Array<{
  name: string;
  slots: ClothingCategory[];
  occasion?: string;
}> = [
  { name: "日常通勤", slots: [ClothingCategory.tops, ClothingCategory.bottoms, ClothingCategory.footwear], occasion: "daily" },
  { name: "商务正装", slots: [ClothingCategory.tops, ClothingCategory.bottoms, ClothingCategory.outerwear, ClothingCategory.footwear], occasion: "work" },
  { name: "休闲出行", slots: [ClothingCategory.tops, ClothingCategory.bottoms, ClothingCategory.footwear, ClothingCategory.accessories], occasion: "travel" },
  { name: "约会穿搭", slots: [ClothingCategory.tops, ClothingCategory.bottoms, ClothingCategory.footwear, ClothingCategory.accessories], occasion: "date" },
  { name: "派对造型", slots: [ClothingCategory.dresses, ClothingCategory.footwear, ClothingCategory.accessories], occasion: "party" },
  { name: "面试着装", slots: [ClothingCategory.tops, ClothingCategory.bottoms, ClothingCategory.outerwear, ClothingCategory.footwear], occasion: "interview" },
];

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  // ==================== 主推荐入口 ====================

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

        const profile = this.buildUserProfile(profileData);
        const interactions = await this.buildUserInteractionSummary(userId);

        const candidateItems = await this.fetchCandidateItems(
          profile,
          interactions,
          { category, season, occasion },
          limit * 3,
        );

        const scoredItems = candidateItems.map((item) => {
          const { score, reasons } = this.computeRuleBasedScore(
            profile,
            interactions,
            item,
            { occasion, season },
          );
          return { item, score, matchReasons: reasons };
        });

        // 多样性重排：避免同类别/同品牌过于集中
        const diversified = this.applyDiversityReranking(scoredItems);

        return diversified.slice(0, limit);
      },
      CACHE_TTL.OUTFIT_RECOMMENDATIONS,
    );

    return cached ?? [];
  }

  // ==================== 搭配推荐（Outfit Recommendation）====================

  async getOutfitRecommendations(
    userId: string,
    options: { occasion?: string; season?: string; limit?: number } = {},
  ): Promise<OutfitRecommendation[]> {
    const { occasion, season, limit = 5 } = options;

    const cacheKey = CacheKeyBuilder.outfitCombinations(userId, {
      occasion,
      season,
      limit,
    });

    const cached = await this.cacheService.getOrSet<OutfitRecommendation[]>(
      cacheKey,
      async () => {
        const profileData = await this.prisma.userProfile.findUnique({
          where: { userId },
        });
        const profile = profileData ? this.buildUserProfile(profileData) : null;
        const interactions = await this.buildUserInteractionSummary(userId);

        // 根据场合筛选搭配模板
        let templates: Array<{ name: string; slots: ClothingCategory[]; occasion?: string }> = [...OUTFIT_TEMPLATES];
        if (occasion) {
          const matched = templates.filter((t) => t.occasion === occasion);
          templates = matched.length > 0 ? matched : [OUTFIT_TEMPLATES[0] as { name: string; slots: ClothingCategory[]; occasion?: string }];
        }

        const outfits: OutfitRecommendation[] = [];

        for (const template of templates.slice(0, limit)) {
          const outfit = await this.assembleOutfit(template, profile, interactions, {
            occasion: template.occasion || occasion,
            season,
          });
          if (outfit) {
            outfits.push(outfit);
          }
        }

        return outfits.sort((a, b) => b.totalScore - a.totalScore);
      },
      CACHE_TTL.OUTFIT_COMBINATIONS,
    );

    return cached ?? [];
  }

  // ==================== 风格指南 ====================

  async getStyleGuide(userId: string): Promise<{
    bodyType: string | null;
    skinTone: string | null;
    colorSeason: string | null;
    recommendations: string[];
  }> {
    const cacheKey = CacheKeyBuilder.styleGuide(userId);

    const cached = await this.cacheService.getOrSet<{
      bodyType: string | null;
      skinTone: string | null;
      colorSeason: string | null;
      recommendations: string[];
    }>(
      cacheKey,
      async () => {
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
          recommendations.push(...this.getBodyTypeGuide(profile.bodyType));
        }

        if (profile.colorSeason) {
          recommendations.push(...this.getColorSeasonGuide(profile.colorSeason));
        }

        // 基于用户行为数据补充建议
        const interactions = await this.buildUserInteractionSummary(userId);
        if (interactions.viewedCategories && Object.keys(interactions.viewedCategories).length > 0) {
          const topCategory = Object.entries(interactions.viewedCategories)
            .sort((a, b) => b[1] - a[1])[0];
          if (topCategory) {
            const categoryName = this.getClothingCategoryName(topCategory[0] as ClothingCategory);
            recommendations.push(`您经常浏览${categoryName}类单品，可尝试更多该品类搭配`);
          }
        }

        return {
          bodyType: profile.bodyType ? this.getBodyTypeName(profile.bodyType) : null,
          skinTone: profile.skinTone || null,
          colorSeason: profile.colorSeason ? this.getColorSeasonName(profile.colorSeason) : null,
          recommendations,
        };
      },
      CACHE_TTL.STYLE_GUIDE,
    );

    return (
      cached ?? {
        bodyType: null,
        skinTone: null,
        colorSeason: null,
        recommendations: [],
      }
    );
  }

  // ==================== 私有方法：用户画像构建 ====================

  private buildUserProfile(profileData: {
    bodyType?: BodyType | null;
    skinTone?: SkinTone | null;
    colorSeason?: ColorSeason | null;
    stylePreferences?: unknown;
    colorPreferences?: unknown;
    priceRangeMin?: number | null;
    priceRangeMax?: number | null;
  }): UserProfile {
    return {
      bodyType: profileData.bodyType,
      skinTone: profileData.skinTone,
      colorSeason: profileData.colorSeason,
      stylePreferences: Array.isArray(profileData.stylePreferences)
        ? (profileData.stylePreferences as string[])
        : undefined,
      colorPreferences: Array.isArray(profileData.colorPreferences)
        ? (profileData.colorPreferences as string[])
        : undefined,
      priceRangeMin: profileData.priceRangeMin ?? undefined,
      priceRangeMax: profileData.priceRangeMax ?? undefined,
    };
  }

  // ==================== 私有方法：用户行为摘要构建 ====================

  private async buildUserInteractionSummary(userId: string): Promise<UserInteractionSummary> {
    try {
      const [favorites, behaviors, cartItems] = await Promise.all([
        this.prisma.favorite.findMany({
          where: { userId },
          select: { itemId: true },
          take: 100,
        }),
        this.prisma.userBehavior.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { itemId: true, type: true },
          take: 200,
        }),
        this.prisma.cartItem.findMany({
          where: { userId },
          select: { itemId: true },
          take: 50,
        }),
      ]);

      // 收藏的商品ID集合
      const favoriteItemIds = favorites.map((f) => f.itemId);

      // 浏览过的商品ID -> 用于协同过滤
      const viewedItemIds = behaviors
        .filter((b) => b.itemId && b.type === "page_view")
        .map((b) => b.itemId!);

      // 购物车中的商品ID
      const cartItemIds = cartItems.map((c) => c.itemId);

      // 从收藏/浏览商品中提取偏好颜色
      const preferredColors = await this.extractPreferredColors([
        ...favoriteItemIds,
        ...viewedItemIds.slice(0, 50),
      ]);

      // 统计浏览类别分布
      const viewedCategories: Record<string, number> = {};
      if (viewedItemIds.length > 0) {
        const viewedItems = await this.prisma.clothingItem.findMany({
          where: { id: { in: viewedItemIds } },
          select: { category: true },
        });
        for (const item of viewedItems) {
          viewedCategories[item.category] = (viewedCategories[item.category] || 0) + 1;
        }
      }

      // 最近的行为类型（用于判断用户活跃度）
      const recentBehaviorTypes = behaviors.slice(0, 20).map((b) => b.type);

      return {
        favoriteItemIds,
        viewedCategories,
        cartItemIds,
        preferredColors,
        recentBehaviorTypes,
      };
    } catch (error) {
      this.logger.warn(`构建用户行为摘要失败: ${error instanceof Error ? error.message : "unknown"}`);
      return {
        favoriteItemIds: [],
        viewedCategories: {},
        cartItemIds: [],
        preferredColors: [],
        recentBehaviorTypes: [],
      };
    }
  }

  private async extractPreferredColors(itemIds: string[]): Promise<string[]> {
    if (itemIds.length === 0) {return [];}

    const items = await this.prisma.clothingItem.findMany({
      where: { id: { in: itemIds.slice(0, 100) } },
      select: { colors: true },
    });

    const colorFreq: Record<string, number> = {};
    for (const item of items) {
      for (const color of item.colors) {
        const normalized = color.toLowerCase().trim();
        colorFreq[normalized] = (colorFreq[normalized] || 0) + 1;
      }
    }

    return Object.entries(colorFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([color]) => color);
  }

  // ==================== 私有方法：候选集获取 ====================

  private async fetchCandidateItems(
    profile: UserProfile,
    interactions: UserInteractionSummary,
    filters: { category?: ClothingCategory; season?: string; occasion?: string },
    take: number,
  ) {
    const where: Prisma.ClothingItemWhereInput = {
      isActive: true,
      isDeleted: false,
    };

    // 分类过滤
    if (filters.category) {
      where.category = filters.category;
    } else if (filters.season) {
      // 季节性过滤：优先展示当季适合的分类
      const seasonCategories = SEASON_CATEGORY_MAP[filters.season];
      if (seasonCategories) {
        where.category = { in: seasonCategories };
      }
    }

    // 排除已收藏/已加购的商品（避免重复推荐过多）
    const excludeIds = [
      ...interactions.favoriteItemIds,
      ...interactions.cartItemIds,
    ].slice(0, 50);

    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    return this.prisma.clothingItem.findMany({
      where,
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
        brand: { select: { id: true, name: true, logo: true } },
      },
      orderBy: [
        { viewCount: "desc" },
        { likeCount: "desc" },
      ],
      take,
    });
  }

  // ==================== 核心评分引擎（基于规则）====================

  private computeRuleBasedScore(
    profile: UserProfile,
    interactions: UserInteractionSummary,
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
      id: string;
    },
    context: { occasion?: string; season?: string },
  ): { score: number; reasons: string[] } {
    let score = 40; // 基础分
    const reasons: string[] = [];
    const attrs = item.attributes as Record<string, unknown> | null;

    // 1. 体型匹配 (+20)
    if (profile.bodyType && attrs?.bodyTypeFit) {
      if (Array.isArray(attrs.bodyTypeFit) && attrs.bodyTypeFit.includes(profile.bodyType)) {
        score += WEIGHTS.bodyTypeMatch;
        reasons.push(`适合${this.getBodyTypeName(profile.bodyType)}体型`);
      }
    }

    // 2. 色彩季型匹配 (+15)
    if (profile.colorSeason && attrs?.colorSeasons) {
      if (Array.isArray(attrs.colorSeasons) && attrs.colorSeasons.includes(profile.colorSeason)) {
        score += WEIGHTS.colorSeasonMatch;
        reasons.push(`符合${this.getColorSeasonName(profile.colorSeason)}型色彩`);
      }
    }

    // 3. 肤色-颜色匹配 (+10)
    if (profile.skinTone && item.colors?.length > 0) {
      const flatteringColors = this.getFlatteringColors(profile.skinTone);
      const matchedColor = item.colors.find((c: string) =>
        flatteringColors.includes(c.toLowerCase()),
      );
      if (matchedColor) {
        score += WEIGHTS.skinToneColorMatch;
        reasons.push(`${matchedColor}衬托你的肤色`);
      }
    }

    // 4. 场合匹配 (+15)
    if (context.occasion && attrs?.styleTags && Array.isArray(attrs.styleTags)) {
      const occasionKeywords = OCCASION_STYLE_MAP[context.occasion.toLowerCase()] || [];
      const hasMatch = attrs.styleTags.some((s: unknown) =>
        typeof s === "string" &&
        occasionKeywords.some((k) => s.toLowerCase().includes(k)),
      );
      if (hasMatch) {
        score += WEIGHTS.occasionMatch;
        reasons.push(`适合${this.getOccasionName(context.occasion)}场合`);
      }
    }

    // 5. 用户历史协同过滤：同类目偏好提升 (+12)
    const categoryPrefScore = interactions.viewedCategories[item.category] || 0;
    if (categoryPrefScore >= 3) {
      score += WEIGHTS.categoryPreferenceBoost;
      reasons.push("符合你的浏览偏好");
    } else if (categoryPrefScore >= 1) {
      score += Math.floor(WEIGHTS.categoryPreferenceBoost * 0.5);
    }

    // 6. 颜色偏好匹配
    if (interactions.preferredColors.length > 0 && item.colors.length > 0) {
      const colorOverlap = item.colors.filter((c) =>
        interactions.preferredColors.includes(c.toLowerCase()),
      );
      if (colorOverlap.length > 0) {
        score += 5;
        reasons.push(`${colorOverlap[0]}是你偏好的颜色`);
      }
    }

    // 7. 热门度加权 (+8)
    if (item.viewCount > 1000) {
      score += WEIGHTS.popularityBoost;
      reasons.push("热门单品");
    } else if (item.likeCount > 100) {
      score += Math.floor(WEIGHTS.popularityBoost * 0.6);
      reasons.push("受用户喜爱");
    }

    // 8. 价格范围匹配 (+10)
    const itemPrice = Number(item.price);
    // eslint-disable-next-line eqeqeq
    if (profile.priceRangeMin != null && profile.priceRangeMax != null) {
      if (itemPrice >= profile.priceRangeMin! && itemPrice <= profile.priceRangeMax!) {
        score += WEIGHTS.priceRangeMatch;
        reasons.push("价格在你的预算范围内");
      } else if (profile.stylePreferences?.includes("budget-friendly") && itemPrice < 500) {
        score += 8;
        reasons.push("高性价比选择");
      }
    }

    // 9. 协同过滤：基于相似用户的简化实现
    if (interactions.favoriteItemIds.length > 0 && attrs?.styleTags && Array.isArray(attrs.styleTags)) {
      score += Math.min(WEIGHTS.collaborativeSimilarity, interactions.recentBehaviorTypes.length);
    }

    // 季节适配加成
    if (context.season && attrs?.seasons) {
      if (Array.isArray(attrs.seasons) && attrs.seasons.includes(context.season)) {
        score += 8;
        reasons.push(`${this.getSeasonName(context.season)}适穿`);
      }
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      reasons: reasons.length > 0 ? reasons : ["为你推荐"],
    };
  }

  // ==================== 私有方法：多样性重排 ====================

  private applyDiversityReranking(scoredItems: ScoredItem[]): ScoredItem[] {
    const result: ScoredItem[] = [];
    const usedCategories = new Set<string>();
    const usedBrands = new Set<string>();

    // 第一轮：每个类别取最高分
    const byCategory = new Map<string, ScoredItem[]>();
    for (const item of scoredItems) {
      const cat = item.item.category;
      if (!byCategory.has(cat)) {byCategory.set(cat, []);}
      byCategory.get(cat)!.push(item);
    }

    for (const [, items] of byCategory) {
      items.sort((a, b) => b.score - a.score);
      if (items.length > 0) {
        const top = items[0];
        if (top) {
          result.push(top);
          usedCategories.add(top.item.category);
          if (top.item.brand) {usedBrands.add(top.item.brand.id);}
        }
      }
    }

    // 第二轮：填充剩余位置，惩罚连续同类别/同品牌
    const remaining = scoredItems.filter(
      (item) => !result.includes(item),
    );

    for (const item of remaining) {
      if (result.length >= scoredItems.length) {break;}

      let penalty = 0;
      const last3 = result.slice(-3);
      for (const prev of last3) {
        if (prev.item.category === item.item.category) {penalty += WEIGHTS.diversityPenalty;}
        if (prev.item.brand?.id === item.item.brand?.id) {penalty += WEIGHTS.diversityPenalty;}
      }

      result.push({ ...item, score: item.score + penalty });
    }

    return result.sort((a, b) => b.score - a.score);
  }

  // ==================== 私有方法：搭配组装 ====================

  private async assembleOutfit(
    template: { name: string; slots: ClothingCategory[]; occasion?: string },
    profile: UserProfile | null,
    interactions: UserInteractionSummary,
    context: { occasion?: string; season?: string },
  ): Promise<OutfitRecommendation | null> {
    const outfitItems: RecommendedItem[] = [];
    let totalScore = 0;
    const allReasons: string[] = [];

    for (const slot of template.slots) {
      const slotCandidates = await this.fetchCandidateItems(
        profile || { stylePreferences: [], colorPreferences: [] },
        interactions,
        { category: slot, season: context.season, occasion: context.occasion },
        10,
      );

      if (slotCandidates.length === 0) {continue;}

      const scored = slotCandidates.map((item) => {
        const { score, reasons } = this.computeRuleBasedScore(
          profile || { stylePreferences: [], colorPreferences: [] },
          interactions,
          item,
          context,
        );
        return { item, score, matchReasons: reasons };
      });

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      if (best) {
        outfitItems.push(best);
        totalScore += best.score;
        allReasons.push(...best.matchReasons);
      }
    }

    if (outfitItems.length < 2) {return null;} // 至少需要2件单品才算有效搭配

    // 生成搭配理由
    const uniqueReasons = [...new Set(allReasons)];
    const reasoning =
      uniqueReasons.length > 0
        ? `${template.name}搭配：${uniqueReasons.slice(0, 3).join("，")}`
        : `${template.name}精选搭配`;

    return {
      id: `outfit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: template.name,
      items: outfitItems,
      occasion: template.occasion || context.occasion,
      totalScore: Math.round(totalScore / outfitItems.length),
      reasoning,
    };
  }

  // ==================== 私有方法：热门回退 ====================

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
        brand: { select: { id: true, name: true, logo: true } },
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
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

  // ==================== 辅助方法：色彩/体型/季节名称映射 ====================

  private getFlatteringColors(skinTone: SkinTone): string[] {
    const map: Record<SkinTone, string[]> = {
      [SkinTone.fair]: ["white", "pink", "light blue", "lavender", "peach"],
      [SkinTone.light]: ["coral", "turquoise", "warm beige", "rose", "mint"],
      [SkinTone.medium]: ["olive", "mustard", "burgundy", "teal", "rust"],
      [SkinTone.olive]: ["earth tones", "gold", "cream", "forest green", "maroon"],
      [SkinTone.tan]: ["white", "bright colors", "coral", "emerald", "navy"],
      [SkinTone.dark]: ["jewel tones", "bright white", "vibrant colors", "gold", "silver"],
    };
    return map[skinTone] || [];
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
      [ColorSeason.spring_warm]: "春季暖型",
      [ColorSeason.spring_light]: "春季亮型",
      [ColorSeason.summer_cool]: "夏季冷型",
      [ColorSeason.summer_light]: "夏季亮型",
      [ColorSeason.autumn_warm]: "秋季暖型",
      [ColorSeason.autumn_deep]: "秋季深型",
      [ColorSeason.winter_cool]: "冬季冷型",
      [ColorSeason.winter_deep]: "冬季深型",
    };
    return names[season] || season;
  }

  private getSeasonName(season: string): string {
    const names: Record<string, string> = {
      spring: "春季",
      summer: "夏季",
      autumn: "秋季",
      winter: "冬季",
    };
    return names[season] || season;
  }

  private getOccasionName(occasion: string): string {
    const names: Record<string, string> = {
      interview: "面试",
      work: "职场",
      date: "约会",
      travel: "出行",
      party: "派对",
      daily: "日常",
      campus: "校园",
      workout: "运动",
    };
    return names[occasion] || occasion;
  }

  private getClothingCategoryName(category: ClothingCategory): string {
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

  // ==================== 风格指南内容生成 ====================

  private getBodyTypeGuide(bodyType: BodyType): string[] {
    const guides: Record<BodyType, string[]> = {
      [BodyType.rectangle]: [
        "选择有腰线的款式来创造曲线感",
        "尝试层叠穿搭增加层次感",
        "高腰裤/裙可以优化比例",
      ],
      [BodyType.triangle]: [
        "上身选择亮色或有图案的款式吸引视线",
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
        "选择V领或开领设计拉长颈部线条",
        "垂直条纹可以拉长视觉效果",
        "避免过于紧身或过于宽松的款式",
      ],
    };
    return guides[bodyType] || [];
  }

  private getColorSeasonGuide(season: ColorSeason): string[] {
    const guides: Record<ColorSeason, string[]> = {
      [ColorSeason.spring_warm]: [
        "暖色调非常适合您，如珊瑚色、桃色",
        "避免过于冷峻的灰黑色",
        "金色饰品比银色更适合",
      ],
      [ColorSeason.spring_light]: [
        "明亮清新的色彩最适合您",
        "浅桃色、鹅黄色、淡绿色都是好选择",
        "金色饰品比银色更适合",
      ],
      [ColorSeason.summer_cool]: [
        "柔和的冷色调最适合您",
        "粉色、薰衣草色、浅蓝色都是好选择",
        "银色饰品比金色更适合",
      ],
      [ColorSeason.summer_light]: [
        "柔和淡雅的色彩最适合您",
        "浅粉、淡紫、雾霾蓝都是好选择",
        "银色饰品比金色更适合",
      ],
      [ColorSeason.autumn_warm]: [
        "大地色系是您的最佳选择",
        "驼色、棕色、橄榄绿都很适合",
        "金色和铜色饰品非常适合",
      ],
      [ColorSeason.autumn_deep]: [
        "浓郁深沉的色彩最适合您",
        "砖红色、深棕色、墨绿色都很适合",
        "金色和铜色饰品非常适合",
      ],
      [ColorSeason.winter_cool]: [
        "高饱和度的冷色调最适合",
        "正红色、纯白色、黑色都很适合",
        "银色饰品是最佳选择",
      ],
      [ColorSeason.winter_deep]: [
        "深邃对比强烈的色彩最适合",
        "深红、纯黑、宝蓝都很适合",
        "银色饰品是最佳选择",
      ],
    };
    return guides[season] || [];
  }
}
