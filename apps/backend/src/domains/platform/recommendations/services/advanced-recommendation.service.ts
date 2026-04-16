import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  BodyType,
  SkinTone,
  ColorSeason,
  ClothingCategory,
  ClothingItem,
  UserProfile as PrismaUserProfile,
  UserBehavior,
  VirtualTryOn,
  Favorite,
  Prisma,
} from "@prisma/client";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";

import { KnowledgeGraphService } from "./knowledge-graph.service";
import { MatchingTheoryService } from "./matching-theory.service";
import { MultimodalFusionService } from "./multimodal-fusion.service";

/**
 * 将 Prisma Decimal 类型转换为 number
 */
function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  return parseFloat(value.toString());
}

export interface RecommendationContext {
  userId?: string;
  occasion?: string;
  season?: string;
  weather?: string;
  trending?: boolean;
}

export interface ScoredItem {
  id: string;
  name: string;
  images: string[];
  price: number;
  currency: string;
  brand?: {
    id: string;
    name: string;
    logo?: string | null;
  } | null;
  score: number;
  matchReasons: string[];
  category: ClothingCategory;
  breakdown?: {
    contentBased: number;
    collaborative: number;
    knowledgeGraph: number;
    theoryBased: number;
  };
}

interface StylePreferenceItem {
  name: string;
  [key: string]: unknown;
}

type StylePreferences = StylePreferenceItem[] | string[] | null;

interface UserProfile {
  bodyType?: BodyType | null;
  skinTone?: SkinTone | null;
  colorSeason?: ColorSeason | null;
  stylePreferences?: StylePreferences;
  colorPreferences?: string[] | null;
}

interface UserBehaviorData {
  favorites: Array<{ item: Pick<ClothingItem, "category"> | null }>;
  tryOns: Array<{ item: Pick<ClothingItem, "brandId"> | null }>;
  views: Array<{
    query: string;
    id: string;
    createdAt: Date;
    userId: string | null;
    sessionId?: string | null;
  }>;
}

interface ItemAttributes {
  bodyTypeFit?: BodyType[];
  colorSeasons?: ColorSeason[];
  style?: string[];
  occasions?: string[];
}

function toUserProfile(profile: PrismaUserProfile | null): UserProfile | null {
  if (!profile) {return null;}

  let stylePrefs: StylePreferences = null;
  if (profile.stylePreferences) {
    if (Array.isArray(profile.stylePreferences)) {
      stylePrefs = profile.stylePreferences as StylePreferences;
    }
  }

  let colorPrefs: string[] | null = null;
  if (profile.colorPreferences) {
    if (Array.isArray(profile.colorPreferences)) {
      colorPrefs = profile.colorPreferences as string[];
    }
  }

  return {
    bodyType: profile.bodyType,
    skinTone: profile.skinTone,
    colorSeason: profile.colorSeason,
    stylePreferences: stylePrefs,
    colorPreferences: colorPrefs,
  };
}

@Injectable()
export class AdvancedRecommendationService implements OnModuleInit {
  private readonly logger = new Logger(AdvancedRecommendationService.name);

  private readonly strategyWeights = {
    contentBased: 0.25,
    collaborative: 0.25,
    knowledgeGraph: 0.25,
    theoryBased: 0.25,
  };

  constructor(
    private prisma: PrismaService,
    private multimodalFusion: MultimodalFusionService,
    private knowledgeGraph: KnowledgeGraphService,
    private matchingTheory: MatchingTheoryService,
  ) {}

  async onModuleInit() {
    this.logger.log("初始化知识图谱...");
    await this.knowledgeGraph.buildGraph();
    const stats = this.knowledgeGraph.getGraphStats();
    this.logger.log(
      `知识图谱构建完成: ${stats.nodeCount}节点, ${stats.edgeCount}边`,
    );
  }

  async getPersonalizedRecommendations(
    userId: string,
    context: RecommendationContext = {},
    limit: number = 20,
  ): Promise<ScoredItem[]> {
    const prismaProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    const profile = toUserProfile(prismaProfile);

    const userBehaviors = await this.getUserBehaviors(userId);

    const candidates = await this.getCandidateItems(limit * 4);

    const scoredItems = await Promise.all(
      candidates.map(async (item) => {
        const scores = await this.calculateAllScores(
          profile,
          item,
          userBehaviors,
          context,
        );

        const totalScore = this.combineScores(scores);

        const matchReasons = this.generateMatchReasons(
          profile,
          item,
          scores,
          context,
        );

        return {
          id: item.id,
          name: item.name,
          images: item.images,
          price: toNumber(item.price),
          currency: item.currency,
          brand: item.brand,
          category: item.category,
          score: totalScore,
          matchReasons,
          breakdown: scores,
        };
      }),
    );

    scoredItems.sort((a, b) => b.score - a.score);

    const diverseItems = this.optimizeDiversity(scoredItems, limit);

    return diverseItems;
  }

  private async calculateAllScores(
    profile: UserProfile | null,
    item: ClothingItem,
    userBehaviors: UserBehaviorData,
    context: RecommendationContext,
  ): Promise<{
    contentBased: number;
    collaborative: number;
    knowledgeGraph: number;
    theoryBased: number;
  }> {
    const contentScore = await this.contentBasedScore(profile, item, context);
    const collaborativeScore = this.collaborativeScore(item, userBehaviors);
    const kgScore = await this.knowledgeGraphScore(item, context);
    const theoryScore = this.theoryBasedScore(item, profile, context);

    return {
      contentBased: contentScore,
      collaborative: collaborativeScore,
      knowledgeGraph: kgScore,
      theoryBased: theoryScore,
    };
  }

  private async contentBasedScore(
    profile: UserProfile | null,
    item: ClothingItem,
    context: RecommendationContext,
  ): Promise<number> {
    if (!profile) {return 0.5;}

    const attrs = item.attributes as ItemAttributes | null;
    let score = 0.5;

    if (profile.bodyType && attrs?.bodyTypeFit) {
      if (attrs.bodyTypeFit.includes(profile.bodyType)) {
        score += 0.15;
      }
    }

    if (profile.colorSeason && attrs?.colorSeasons) {
      if (attrs.colorSeasons.includes(profile.colorSeason)) {
        score += 0.1;
      }
    }

    if (profile.skinTone && item.colors?.length > 0) {
      const flatteringColors = this.matchingTheory.getFlatteringColors(
        profile.skinTone,
      );
      const hasFlatteringColor = item.colors.some((c: string) =>
        flatteringColors.some((fc) =>
          c.toLowerCase().includes(fc.toLowerCase()),
        ),
      );
      if (hasFlatteringColor) {
        score += 0.1;
      }
    }

    if (profile.stylePreferences && attrs?.style) {
      const userStyles = Array.isArray(profile.stylePreferences)
        ? profile.stylePreferences.map((s) =>
            typeof s === "string" ? s : s.name,
          )
        : [];
      const itemStyles = attrs.style || [];
      const matchingStyles = userStyles.filter((s: string) =>
        itemStyles.some((is: string) => is.toLowerCase() === s.toLowerCase()),
      );
      score += matchingStyles.length * 0.05;
    }

    if (context.occasion && attrs?.occasions) {
      if (attrs.occasions.includes(context.occasion)) {
        score += 0.1;
      }
    }

    return Math.min(score, 1);
  }

  private collaborativeScore(
    item: ClothingItem,
    userBehaviors: UserBehaviorData,
  ): number {
    let score = 0.5;

    const favoriteCategories = new Set(
      userBehaviors.favorites
        .map((f) => f.item?.category)
        .filter((c): c is ClothingCategory => c !== undefined),
    );
    if (favoriteCategories.has(item.category)) {
      score += 0.1;
    }

    const triedBrands = new Set(
      userBehaviors.tryOns
        .map((t) => t.item?.brandId)
        .filter((id): id is string => id !== null),
    );
    if (item.brandId && triedBrands.has(item.brandId)) {
      score += 0.05;
    }

    score += Math.min(item.viewCount / 200, 0.05);
    score += Math.min(item.likeCount / 100, 0.05);

    return Math.min(score, 1);
  }

  private async knowledgeGraphScore(
    item: ClothingItem,
    context: RecommendationContext,
  ): Promise<number> {
    let score = 0.5;

    const relatedItems = this.knowledgeGraph.findRelatedItems(item.id, [
      "frequently_bought_together",
    ]);
    score += Math.min(relatedItems.length * 0.02, 0.1);

    const compatibleItems = this.knowledgeGraph.findCompatibleItemsByStyle(
      item.id,
    );
    score += Math.min(compatibleItems.length * 0.01, 0.1);

    if (context.occasion) {
      const occasionItems = this.knowledgeGraph.getItemsForOccasion(
        context.occasion,
      );
      const isSuitable = occasionItems.some((i) => i.id === `item_${item.id}`);
      if (isSuitable) {
        score += 0.1;
      }
    }

    return Math.min(score, 1);
  }

  private theoryBasedScore(
    item: ClothingItem,
    profile: UserProfile | null,
    context: RecommendationContext,
  ): number {
    if (!profile) {return 0.5;}

    const attrs = item.attributes as ItemAttributes | null;
    const outfitScore = this.matchingTheory.calculateOutfitScore({
      bodyType: profile.bodyType || undefined,
      skinTone: profile.skinTone || undefined,
      colorSeason: profile.colorSeason || undefined,
      itemColors: item.colors || [],
      itemStyles: attrs?.style || [],
      occasion: context.occasion,
    });

    return outfitScore.score;
  }

  private combineScores(scores: {
    contentBased: number;
    collaborative: number;
    knowledgeGraph: number;
    theoryBased: number;
  }): number {
    return (
      scores.contentBased * this.strategyWeights.contentBased +
      scores.collaborative * this.strategyWeights.collaborative +
      scores.knowledgeGraph * this.strategyWeights.knowledgeGraph +
      scores.theoryBased * this.strategyWeights.theoryBased
    );
  }

  async getOccasionRecommendations(
    userId: string,
    occasion: string,
    limit: number = 10,
  ): Promise<ScoredItem[]> {
    const prismaProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    const profile = toUserProfile(prismaProfile);

    const styleGuide = this.matchingTheory.getOccasionStyleGuide(occasion);

    const items = await this.prisma.clothingItem.findMany({
      where: {
        isActive: true,
        category: {
          in: [
            ClothingCategory.tops,
            ClothingCategory.bottoms,
            ClothingCategory.dresses,
          ],
        },
      },
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
      take: limit * 3,
    });

    const scoredItems = items.map((item) => {
      const attrs = item.attributes as ItemAttributes | null;

      let score = 50;

      if (attrs?.occasions?.includes(occasion)) {
        score += 20;
      }

      if (attrs?.style) {
        const matchingStyles = attrs.style.filter((s: string) =>
          styleGuide.suitableStyles.includes(s.toLowerCase()),
        );
        score += matchingStyles.length * 10;
      }

      if (item.colors) {
        const matchingColors = item.colors.filter((c: string) =>
          styleGuide.suitableColors.some((sc) =>
            c.toLowerCase().includes(sc.toLowerCase()),
          ),
        );
        score += matchingColors.length * 5;
      }

      if (profile) {
        const theoryScore = this.theoryBasedScore(item, profile, { occasion });
        score += theoryScore * 30;
      }

      return {
        id: item.id,
        name: item.name,
        images: item.images,
        price: toNumber(item.price),
        currency: item.currency,
        brand: item.brand,
        category: item.category,
        score: Math.min(score, 100),
        matchReasons: [`适合${this.getOccasionName(occasion)}场合`],
      };
    });

    scoredItems.sort((a, b) => b.score - a.score);

    return scoredItems.slice(0, limit);
  }

  async getOutfitRecommendation(
    baseItemId: string,
    userId?: string,
    occasion?: string,
  ): Promise<{
    tops?: ScoredItem[];
    bottoms?: ScoredItem[];
    accessories?: ScoredItem[];
    overallScore: number;
  }> {
    let profile: UserProfile | null = null;
    if (userId) {
      const prismaProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });
      profile = toUserProfile(prismaProfile);
    }

    const baseItem = await this.prisma.clothingItem.findUnique({
      where: { id: baseItemId },
    });

    if (!baseItem) {
      throw new Error("Base item not found");
    }

    const categories = this.getComplementaryCategories(baseItem.category);

    const results: Record<string, ScoredItem[]> = {};
    let totalScore = 0;
    let count = 0;

    for (const [key, category] of Object.entries(categories)) {
      const candidates = await this.prisma.clothingItem.findMany({
        where: { isActive: true, category },
        include: { brand: { select: { id: true, name: true, logo: true } } },
        take: 50,
      });

      const scored = await Promise.all(
        candidates.map(async (item) => {
          const scores = await this.calculateAllScores(
            profile,
            item,
            { favorites: [], tryOns: [], views: [] },
            { occasion },
          );

          const totalScore = this.combineScores(scores);

          return {
            id: item.id,
            name: item.name,
            images: item.images,
            price: toNumber(item.price),
            currency: item.currency,
            brand: item.brand,
            category: item.category,
            score: totalScore,
            matchReasons: this.generateMatchReasons(profile, item, scores, {
              occasion,
            }),
          };
        }),
      );

      scored.sort((a, b) => b.score - a.score);
      results[key] = scored.slice(0, 5);

      const firstScored = scored[0];
      if (firstScored) {
        totalScore += firstScored.score;
        count++;
      }
    }

    return {
      ...results,
      overallScore: count > 0 ? totalScore / count : 0,
    };
  }

  private getComplementaryCategories(
    baseCategory: ClothingCategory,
  ): Record<string, ClothingCategory> {
    const complementMap: Record<
      ClothingCategory,
      Record<string, ClothingCategory>
    > = {
      [ClothingCategory.tops]: {
        bottoms: ClothingCategory.bottoms,
        footwear: ClothingCategory.footwear,
        accessories: ClothingCategory.accessories,
      },
      [ClothingCategory.bottoms]: {
        tops: ClothingCategory.tops,
        footwear: ClothingCategory.footwear,
        accessories: ClothingCategory.accessories,
      },
      [ClothingCategory.dresses]: {
        footwear: ClothingCategory.footwear,
        accessories: ClothingCategory.accessories,
        outerwear: ClothingCategory.outerwear,
      },
      [ClothingCategory.outerwear]: {
        tops: ClothingCategory.tops,
        bottoms: ClothingCategory.bottoms,
        footwear: ClothingCategory.footwear,
      },
      [ClothingCategory.footwear]: {
        tops: ClothingCategory.tops,
        bottoms: ClothingCategory.bottoms,
      },
      [ClothingCategory.accessories]: {
        tops: ClothingCategory.tops,
        bottoms: ClothingCategory.bottoms,
      },
      [ClothingCategory.activewear]: {
        footwear: ClothingCategory.footwear,
        accessories: ClothingCategory.accessories,
      },
      [ClothingCategory.swimwear]: {
        footwear: ClothingCategory.footwear,
        accessories: ClothingCategory.accessories,
      },
    };

    return complementMap[baseCategory] || {};
  }

  async getTrendingRecommendations(limit: number = 20): Promise<ScoredItem[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const items = await this.prisma.clothingItem.findMany({
      where: {
        isActive: true,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      take: limit * 2,
    });

    const scoredItems = items.map((item) => {
      const viewScore = Math.min(item.viewCount / 50, 30);
      const likeScore = Math.min(item.likeCount / 25, 30);
      const recencyScore = 20;
      const featuredScore = item.isFeatured ? 20 : 0;

      return {
        id: item.id,
        name: item.name,
        images: item.images,
        price: toNumber(item.price),
        currency: item.currency,
        brand: item.brand,
        category: item.category,
        score: Math.min(
          viewScore + likeScore + recencyScore + featuredScore,
          100,
        ),
        matchReasons: ["热门单品", "近期爆款"],
      };
    });

    scoredItems.sort((a, b) => b.score - a.score);

    return scoredItems.slice(0, limit);
  }

  async getDailyOutfitRecommendation(userId: string): Promise<{
    items: ScoredItem[];
    outfitName: string;
    description: string;
  }> {
    const prismaProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    const profile = toUserProfile(prismaProfile);

    const outfitTemplates = [
      {
        name: "简约通勤风",
        categories: [
          ClothingCategory.tops,
          ClothingCategory.bottoms,
          ClothingCategory.footwear,
        ],
        description: "简洁大方的职场穿搭，展现专业气质",
      },
      {
        name: "休闲舒适风",
        categories: [ClothingCategory.tops, ClothingCategory.bottoms],
        description: "轻松自在的日常穿搭，舒适为主",
      },
      {
        name: "优雅知性风",
        categories: [ClothingCategory.dresses, ClothingCategory.accessories],
        description: "温柔优雅的气质穿搭",
      },
    ];

    const today = new Date();
    const templateIndex = today.getDate() % outfitTemplates.length;
    // 使用非空断言，因为取模运算保证了索引有效
    const selectedTemplate = outfitTemplates[templateIndex]!;

    const items: ScoredItem[] = [];

    for (const category of selectedTemplate.categories) {
      const categoryItems = await this.prisma.clothingItem.findMany({
        where: {
          isActive: true,
          category,
        },
        include: {
          brand: { select: { id: true, name: true, logo: true } },
        },
        take: 5,
      });

      if (categoryItems.length > 0) {
        const bestItem = await this.findBestItem(categoryItems, profile);
        if (bestItem) {
          items.push(bestItem);
        }
      }
    }

    return {
      items,
      outfitName: selectedTemplate.name,
      description: selectedTemplate.description,
    };
  }

  private async findBestItem(
    items: Array<
      ClothingItem & {
        brand: { id: string; name: string; logo: string | null } | null;
      }
    >,
    profile: UserProfile | null,
  ): Promise<ScoredItem | null> {
    // 如果数组为空，返回 null
    if (items.length === 0) {
      return null;
    }

    // 使用非空断言，因为已经检查了数组长度
    let bestItem: (typeof items)[number] = items[0]!;
    let bestScore = 0;

    for (const item of items) {
      const scores = await this.calculateAllScores(
        profile,
        item,
        { favorites: [], tryOns: [], views: [] },
        {},
      );
      const score = this.combineScores(scores);

      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    return {
      id: bestItem.id,
      name: bestItem.name,
      images: bestItem.images || [],
      price: toNumber(bestItem.price),
      currency: bestItem.currency,
      brand: bestItem.brand
        ? {
            id: bestItem.brand.id,
            name: bestItem.brand.name,
            logo: bestItem.brand.logo,
          }
        : null,
      category: bestItem.category,
      score: bestScore,
      matchReasons: ["今日推荐"],
    };
  }

  private async getUserBehaviors(userId: string) {
    const [favorites, tryOns, views] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        include: { item: true },
        take: 50,
      }),
      this.prisma.virtualTryOn.findMany({
        where: { userId },
        include: { item: true },
        take: 50,
      }),
      this.prisma.searchHistory.findMany({
        where: { userId },
        take: 20,
      }),
    ]);

    return { favorites, tryOns, views };
  }

  private async getCandidateItems(limit: number) {
    return this.prisma.clothingItem.findMany({
      where: { isActive: true },
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
      take: limit,
    });
  }

  private generateMatchReasons(
    profile: UserProfile | null,
    item: ClothingItem,
    scores: {
      contentBased: number;
      collaborative: number;
      knowledgeGraph: number;
      theoryBased: number;
    },
    context: RecommendationContext,
  ): string[] {
    const reasons: string[] = [];
    const attrs = item.attributes as ItemAttributes | null;

    if (profile?.bodyType && attrs?.bodyTypeFit?.includes(profile.bodyType)) {
      reasons.push(`适合${this.getBodyTypeName(profile.bodyType)}体型`);
    }

    if (
      profile?.colorSeason &&
      attrs?.colorSeasons?.includes(profile.colorSeason)
    ) {
      reasons.push(`符合${this.getColorSeasonName(profile.colorSeason)}型色彩`);
    }

    if (profile?.skinTone && item.colors?.length > 0) {
      const flatteringColors = this.matchingTheory.getFlatteringColors(
        profile.skinTone,
      );
      const matchedColor = item.colors.find((c: string) =>
        flatteringColors.some((fc) =>
          c.toLowerCase().includes(fc.toLowerCase()),
        ),
      );
      if (matchedColor) {
        reasons.push(`${matchedColor}色适合您的肤色`);
      }
    }

    if (context.occasion && attrs?.occasions?.includes(context.occasion)) {
      reasons.push(`适合${this.getOccasionName(context.occasion)}场合`);
    }

    if (scores.knowledgeGraph > 0.6) {
      reasons.push("搭配热门组合");
    }

    if (reasons.length === 0) {
      reasons.push("为您推荐");
    }

    return reasons.slice(0, 3);
  }

  private optimizeDiversity(items: ScoredItem[], limit: number): ScoredItem[] {
    const result: ScoredItem[] = [];
    const categoryCount: Record<string, number> = {};
    const maxPerCategory = Math.ceil(limit / 4);

    for (const item of items) {
      const count = categoryCount[item.category] || 0;
      if (count < maxPerCategory) {
        result.push(item);
        categoryCount[item.category] = count + 1;
      }

      if (result.length >= limit) {break;}
    }

    if (result.length < limit) {
      for (const item of items) {
        if (!result.some((r) => r.id === item.id)) {
          result.push(item);
          if (result.length >= limit) {break;}
        }
      }
    }

    return result;
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

  private getOccasionName(occasion: string): string {
    const names: Record<string, string> = {
      daily: "日常",
      work: "工作",
      date: "约会",
      party: "派对",
      sport: "运动",
      travel: "旅行",
    };
    return names[occasion] || occasion;
  }
}
