import { Injectable, Logger } from "@nestjs/common";
import {
  BodyType,
  SkinTone,
  ColorSeason,
  ClothingCategory,
} from "@prisma/client";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";
import { AIIntegrationService } from "../../../../ai-core/ai/services/ai-integration.service";
import {
  ClothingItemWithBrand,
  ClothingItemAttributes,
  UserProfileData,
  UserBehaviorSummary,
  RecommendationResult,
  RecommendationScoreBreakdown,
  RecommendationExplanation,
  StrategyWeights,
  RecommendationContext,
  ExplanationReasonItem,
  MatchingFactorItem,
  PrismaWhereCondition,
  FavoriteWithItem,
  TryOnWithItem,
  OrderWithItems,
  UserBehaviorRecord,
  UnifiedRecommendationRequest,
  StylePreferenceItem,
  OutfitRecommendationResult,
  RecommendationExplanationContext,
  RecommendationReason,
} from "../types/recommendation.types";

import { ColdStartService } from "./cold-start.service";
import { CollaborativeFilteringService } from "./collaborative-filtering.service";
import { KnowledgeGraphService } from "./knowledge-graph.service";
import { MatchingTheoryService } from "./matching-theory.service";
import { MultimodalFusionService } from "./multimodal-fusion.service";
import { RecommendationExplainerService } from "./recommendation-explainer.service";
import { SASRecService } from "./sasrec.service";
import { VectorSimilarityService } from "./vector-similarity.service";

export interface DataMaturitySignals {
  totalUsers: number;
  totalInteractions: number;
  userInteractions: number;
  sequenceLength: number;
  hasProfile: boolean;
  hasColorSeason: boolean;
  cfDataAvailable: boolean;
  kgDataAvailable: boolean;
  sasrecDataAvailable: boolean;
}

@Injectable()
export class UnifiedRecommendationEngine {
  private readonly logger = new Logger(UnifiedRecommendationEngine.name);

  // Default strategy weights - can be dynamically adjusted based on user behavior
  private readonly defaultWeights: StrategyWeights = {
    contentBased: 0.20,
    collaborative: 0.20,
    knowledgeGraph: 0.15,
    theoryBased: 0.15,
    sasrec: 0.20,
    popularity: 0.10,
  };

  // Cold start weights - more emphasis on popularity and content
  private readonly coldStartWeights: StrategyWeights = {
    contentBased: 0.30,
    collaborative: 0.05,
    knowledgeGraph: 0.15,
    theoryBased: 0.20,
    sasrec: 0.05,
    popularity: 0.25,
  };

  // Adaptive weight adjustment thresholds
  private readonly MIN_INTERACTIONS_FOR_CF = 5;
  private readonly MIN_INTERACTIONS_FOR_SASREC = 3;

  constructor(
    private prisma: PrismaService,
    private multimodalFusion: MultimodalFusionService,
    private knowledgeGraph: KnowledgeGraphService,
    private matchingTheory: MatchingTheoryService,
    private aiIntegration: AIIntegrationService,
    private collaborativeFiltering: CollaborativeFilteringService,
    private coldStart: ColdStartService,
    private sasrec: SASRecService,
    private vectorSimilarity: VectorSimilarityService,
    private explainer: RecommendationExplainerService,
  ) {}

  async getRecommendations(
    request: UnifiedRecommendationRequest,
  ): Promise<RecommendationResult[]> {
    const { userId, context, options } = request;
    const limit = options?.limit || 20;

    // Get user profile and behavior summary
    const [userProfile, behaviorSummary] = await Promise.all([
      this.getUserProfile(userId),
      this.getUserBehaviorSummary(userId),
    ]);

    // Determine adaptive weights based on user behavior
    const weights = this.getAdaptiveWeights(behaviorSummary);

    // Get candidates
    const candidates = await this.getCandidates(options);

    // Get SASRec recommendations if available
    const sasrecRecommendations = await this.getSASRecRecommendations(
      userId,
      behaviorSummary,
    );

    // Get collaborative filtering recommendations
    const cfRecommendations = await this.getCFRecommendations(
      userId,
      behaviorSummary,
    );

    // Calculate scores for all candidates
    const scoredResults = await Promise.all(
      candidates.map(async (item) => {
        const scores = await this.calculateAllScores(
          item,
          userProfile,
          behaviorSummary,
          context,
          sasrecRecommendations,
          cfRecommendations,
        );

        const totalScore = this.combineScores(scores, weights);

        // Generate explanation
        const explanation = await this.generateExplanation(
          item,
          scores,
          userProfile,
          context,
        );

        // Find similar items
        const similarItems = await this.findSimilarItems(item.id);

        return {
          item,
          score: totalScore,
          sources: this.getSources(scores, weights),
          reasons: this.generateReasons(item, scores, userProfile, context),
          breakdown: scores,
          explanation,
          similarItems,
        };
      }),
    );

    // Sort by score
    scoredResults.sort((a, b) => b.score - a.score);

    // Apply diversity optimization
    const diverseResults = this.optimizeDiversity(scoredResults, limit);

    return diverseResults;
  }

  /**
   * Get adaptive weights based on user behavior
   */
  private getAdaptiveWeights(behaviorSummary: UserBehaviorSummary): StrategyWeights {
    if (behaviorSummary.isNewUser) {
      return { ...this.coldStartWeights };
    }

    const weights = { ...this.defaultWeights };

    if (behaviorSummary.totalInteractions < this.MIN_INTERACTIONS_FOR_CF) {
      weights.collaborative = 0.05;
      weights.popularity += 0.15;
    }

    if (behaviorSummary.recentItems.length < this.MIN_INTERACTIONS_FOR_SASREC) {
      weights.sasrec = 0.05;
      weights.contentBased += 0.15;
    }

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    for (const key of Object.keys(weights)) {
      weights[key as keyof StrategyWeights] /= totalWeight;
    }

    return weights;
  }

  getAdaptiveWeightsFromSignals(signals: DataMaturitySignals): StrategyWeights & { vector: number } {
    if (signals.userInteractions < 5) {
      return {
        contentBased: signals.hasProfile ? 0.4 : 0.6,
        collaborative: 0,
        knowledgeGraph: signals.kgDataAvailable ? 0.15 : 0,
        theoryBased: signals.hasColorSeason ? 0.3 : 0.15,
        sasrec: 0,
        popularity: 0.1,
        vector: 0.05,
      };
    }

    if (signals.totalInteractions < 10000 || !signals.cfDataAvailable) {
      return {
        contentBased: 0.25,
        collaborative: 0.1,
        knowledgeGraph: signals.kgDataAvailable ? 0.15 : 0.05,
        theoryBased: 0.2,
        sasrec: signals.sequenceLength >= 3 ? 0.05 : 0,
        popularity: 0.15,
        vector: 0.1,
      };
    }

    return {
      contentBased: 0.15,
      collaborative: 0.2,
      knowledgeGraph: 0.15,
      theoryBased: 0.15,
      sasrec: signals.sasrecDataAvailable ? 0.1 : 0,
      popularity: 0.1,
      vector: 0.1,
    };
  }

  async assessDataMaturity(userId: string): Promise<DataMaturitySignals> {
    const [totalUsers, totalInteractions, userBehaviors, userProfile] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.userBehavior.count(),
        this.prisma.userBehavior.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        this.prisma.userProfile.findUnique({ where: { userId } }),
      ]);

    const sequenceLength = userBehaviors.filter(
      (b) => b.type === "page_view" || b.type === "click",
    ).length;

    return {
      totalUsers,
      totalInteractions,
      userInteractions: userBehaviors.length,
      sequenceLength,
      hasProfile: !!userProfile,
      hasColorSeason: !!userProfile?.colorSeason,
      cfDataAvailable: totalInteractions >= 10000,
      kgDataAvailable: true,
      sasrecDataAvailable: false,
    };
  }

  /**
   * Get user behavior summary for adaptive weighting
   */
  private async getUserBehaviorSummary(userId: string): Promise<UserBehaviorSummary> {
    const [favorites, tryOns, orders, behaviors] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        select: { item: { select: { category: true, brandId: true, attributes: true } } },
        take: 100,
      }),
      this.prisma.virtualTryOn.findMany({
        where: { userId },
        select: { item: { select: { category: true, brandId: true, attributes: true } } },
        take: 100,
      }),
      this.prisma.order.findMany({
        where: { userId },
        include: { items: { include: { item: { select: { category: true, brandId: true, attributes: true } } } } },
        take: 50,
      }),
      this.prisma.userBehavior.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { itemId: true, createdAt: true },
      }),
    ]);

    const favoriteCategories = new Map<string, number>();
    const favoriteBrands = new Map<string, number>();
    const favoriteStyles = new Set<string>();
    const recentItems: string[] = [];

    // Process favorites - 处理用户收藏记录
    for (const fav of favorites) {
      const cat = fav.item?.category;
      const brand = fav.item?.brandId;
      if (cat) {favoriteCategories.set(cat, (favoriteCategories.get(cat) || 0) + 2);}
      if (brand) {favoriteBrands.set(brand, (favoriteBrands.get(brand) || 0) + 2);}
      // 安全获取 attributes 中的 style 属性
      const attributes = fav.item?.attributes as ClothingItemAttributes | null;
      const styles = attributes?.style || [];
      styles.forEach((s: string) => favoriteStyles.add(s));
    }

    // Process try-ons - 处理用户试穿记录
    for (const tryOn of tryOns) {
      const cat = tryOn.item?.category;
      const brand = tryOn.item?.brandId;
      if (cat) {favoriteCategories.set(cat, (favoriteCategories.get(cat) || 0) + 1);}
      if (brand) {favoriteBrands.set(brand, (favoriteBrands.get(brand) || 0) + 1);}
      const attributes = tryOn.item?.attributes as ClothingItemAttributes | null;
      const styles = attributes?.style || [];
      styles.forEach((s: string) => favoriteStyles.add(s));
    }

    // Process orders (highest weight) - 处理用户订单记录（权重最高）
    for (const order of orders) {
      for (const orderItem of order.items) {
        const cat = orderItem.item?.category;
        const brand = orderItem.item?.brandId;
        if (cat) {favoriteCategories.set(cat, (favoriteCategories.get(cat) || 0) + 5);}
        if (brand) {favoriteBrands.set(brand, (favoriteBrands.get(brand) || 0) + 5);}
        const attributes = orderItem.item?.attributes as ClothingItemAttributes | null;
        const styles = attributes?.style || [];
        styles.forEach((s: string) => favoriteStyles.add(s));
      }
    }

    // Get recent items
    for (const behavior of behaviors) {
      if (behavior.itemId) {
        recentItems.push(behavior.itemId);
      }
    }

    const totalInteractions = favorites.length + tryOns.length + orders.length + behaviors.length;

    return {
      totalInteractions,
      favoriteCategories,
      favoriteBrands,
      favoriteStyles,
      recentItems: [...new Set(recentItems)],
      isNewUser: totalInteractions < this.MIN_INTERACTIONS_FOR_CF,
    };
  }

  /**
   * Get SASRec sequence-based recommendations
   */
  private async getSASRecRecommendations(
    userId: string,
    behaviorSummary: UserBehaviorSummary,
  ): Promise<Map<string, number>> {
    const scoreMap = new Map<string, number>();

    if (behaviorSummary.recentItems.length < this.MIN_INTERACTIONS_FOR_SASREC) {
      return scoreMap;
    }

    try {
      const result = await this.sasrec.getSequenceRecommendations(
        userId,
        50,
      );

      for (const rec of result.recommendations) {
        scoreMap.set(rec.itemId, rec.score);
      }
    } catch (error) {
      this.logger.debug(`SASRec recommendations failed: ${error}`);
    }

    return scoreMap;
  }

  /**
   * Get collaborative filtering recommendations
   */
  private async getCFRecommendations(
    userId: string,
    behaviorSummary: UserBehaviorSummary,
  ): Promise<Map<string, number>> {
    const scoreMap = new Map<string, number>();

    if (behaviorSummary.isNewUser) {
      return scoreMap;
    }

    try {
      const result = await this.collaborativeFiltering.getHybridRecommendations(
        userId,
        { limit: 50, excludeViewed: true },
      );

      for (const rec of result) {
        scoreMap.set(rec.itemId, rec.score);
      }
    } catch (error) {
      this.logger.debug(`CF recommendations failed: ${error}`);
    }

    return scoreMap;
  }

  private async getUserProfile(userId: string): Promise<UserProfileData | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    
    if (!profile) {
      return null;
    }
    
    return {
      ...profile,
      stylePreferences: profile.stylePreferences as StylePreferenceItem[] | null,
      colorPreferences: profile.colorPreferences as string[] | null,
    };
  }

  private async getUserBehaviors(userId: string) {
    const [favorites, tryOns, orders] = await Promise.all([
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
      this.prisma.order.findMany({
        where: { userId },
        include: { items: { include: { item: true } } },
        take: 20,
      }),
    ]);

    return { favorites, tryOns, orders };
  }

  private async getCandidates(options?: {
    category?: ClothingCategory;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<ClothingItemWithBrand[]> {
    // 构建查询条件，使用明确的类型定义
    const where: PrismaWhereCondition = { isActive: true };

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
      where.price = {};
      if (options?.minPrice !== undefined) {where.price.gte = options.minPrice;}
      if (options?.maxPrice !== undefined) {where.price.lte = options.maxPrice;}
    }

    const items = await this.prisma.clothingItem.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
      take: 200,
    });
    
    return items.map(item => ({
      ...item,
      price: Number(item.price),
      originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
    })) as ClothingItemWithBrand[];
  }

  /**
   * 计算所有推荐策略的分数
   * @param item 商品信息
   * @param userProfile 用户档案
   * @param behaviorSummary 用户行为摘要
   * @param context 推荐上下文
   * @param sasrecScores SASRec 预计算分数
   * @param cfScores 协同过滤预计算分数
   * @returns 各策略分数明细
   */
  private async calculateAllScores(
    item: ClothingItemWithBrand,
    userProfile: UserProfileData | null,
    behaviorSummary: UserBehaviorSummary,
    context?: RecommendationContext,
    sasrecScores?: Map<string, number>,
    cfScores?: Map<string, number>,
  ): Promise<RecommendationScoreBreakdown> {
    // Content-based score
    const contentScore = await this.calculateContentBasedScore(
      item,
      userProfile,
      behaviorSummary,
      context,
    );

    // Collaborative filtering score (from pre-computed CF recommendations)
    const collaborativeScore = cfScores?.get(item.id) || 0;

    // Knowledge graph score
    const kgScore = await this.calculateKnowledgeGraphScore(item, context);

    // Theory-based score
    const theoryScore = this.calculateTheoryBasedScore(
      item,
      userProfile,
      context,
    );

    // SASRec sequence score (from pre-computed SASRec recommendations)
    const sasrecScore = sasrecScores?.get(item.id) || 0;

    // Popularity score
    const popularityScore = this.calculatePopularityScore(item);

    return {
      contentBased: contentScore,
      collaborative: collaborativeScore,
      knowledgeGraph: kgScore,
      theoryBased: theoryScore,
      sasrec: sasrecScore,
      popularity: popularityScore,
    };
  }

  /**
   * 计算热门度分数
   * 基于商品浏览量、点赞量、创建时间等因素计算
   * @param item 商品信息
   * @returns 热门度分数 (0-1)
   */
  private calculatePopularityScore(item: ClothingItemWithBrand): number {
    let score = 0.3; // 基础分数

    // 浏览量贡献（归一化）
    const viewScore = Math.min(item.viewCount / 1000, 0.2);
    score += viewScore;

    // 点赞量贡献（归一化）
    const likeScore = Math.min(item.likeCount / 500, 0.2);
    score += likeScore;

    // 新品加成（如果商品是新品）
    const createdAt = new Date(item.createdAt);
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 30) {
      score += 0.15; // 新品加成
    } else if (daysSinceCreation < 90) {
      score += 0.05; // 近期商品加成
    }

    // 品牌热度加成
    if (item.brand?.name) {
      const popularBrands = ["Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Gucci", "LV"];
      if (popularBrands.some(b => item.brand!.name.toLowerCase().includes(b.toLowerCase()))) {
        score += 0.1;
      }
    }

    return Math.min(score, 1);
  }

  /**
   * 计算基于内容的推荐分数
   * 根据用户档案、行为摘要和上下文计算商品匹配度
   * @param item 商品信息
   * @param userProfile 用户档案
   * @param behaviorSummary 用户行为摘要
   * @param context 推荐上下文
   * @returns 内容匹配分数 (0-1)
   */
  private async calculateContentBasedScore(
    item: ClothingItemWithBrand,
    userProfile: UserProfileData | null,
    behaviorSummary: UserBehaviorSummary,
    context?: RecommendationContext,
  ): Promise<number> {
    let score = 0.5;

    if (!userProfile) {return score;}

    // 获取商品属性
    const attributes = item.attributes;

    // 体型匹配
    if (userProfile.bodyType && attributes?.bodyTypeFit) {
      if (attributes.bodyTypeFit.includes(userProfile.bodyType)) {
        score += 0.15;
      }
    }

    // 色彩季型匹配
    if (userProfile.colorSeason && attributes?.colorSeasons) {
      if (attributes.colorSeasons.includes(userProfile.colorSeason)) {
        score += 0.1;
      }
    }

    // 肤色颜色匹配
    if (userProfile.skinTone && item.colors?.length > 0) {
      const flatteringColors = this.matchingTheory.getFlatteringColors(
        userProfile.skinTone,
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

    // 风格偏好匹配
    if (userProfile.stylePreferences && attributes?.style) {
      const userStyles = Array.isArray(userProfile.stylePreferences)
        ? userProfile.stylePreferences.map((s: StylePreferenceItem) => s.name || String(s))
        : [];
      const itemStyles = attributes.style || [];
      const matchingStyles = userStyles.filter((s: string) =>
        itemStyles.some((is: string) => is.toLowerCase() === s.toLowerCase()),
      );
      score += matchingStyles.length * 0.05;
    }

    // 基于行为的风格匹配
    if (behaviorSummary.favoriteStyles.size > 0 && attributes?.style) {
      const matchingStyles = attributes.style.filter((s: string) =>
        behaviorSummary.favoriteStyles.has(s),
      );
      score += matchingStyles.length * 0.03;
    }

    // 基于行为的品类匹配
    if (behaviorSummary.favoriteCategories.size > 0) {
      const categoryScore = behaviorSummary.favoriteCategories.get(item.category) || 0;
      score += Math.min(categoryScore * 0.01, 0.1);
    }

    // 基于行为的品牌匹配
    if (behaviorSummary.favoriteBrands.size > 0 && item.brandId) {
      const brandScore = behaviorSummary.favoriteBrands.get(item.brandId) || 0;
      score += Math.min(brandScore * 0.01, 0.08);
    }

    // 场合匹配
    if (context?.occasion && attributes?.occasions) {
      if (attributes.occasions.includes(context.occasion)) {
        score += 0.1;
      }
    }

    // 季节匹配
    if (context?.season && attributes?.seasons) {
      if (attributes.seasons.includes(context.season)) {
        score += 0.08;
      }
    }

    // 天气匹配
    if (context?.weather && attributes?.weather) {
      if (attributes.weather.includes(context.weather)) {
        score += 0.05;
      }
    }

    // 基础商品相似度（用于穿搭推荐）
    if (context?.baseItemId && item.id) {
      try {
        const baseEmbedding = await this.aiIntegration.getItemEmbedding(
          context.baseItemId,
        );
        const itemEmbedding = await this.aiIntegration.getItemEmbedding(
          item.id,
        );
        if (baseEmbedding && itemEmbedding) {
          const similarity = this.cosineSimilarity(
            baseEmbedding,
            itemEmbedding,
          );
          score += similarity * 0.15;
        }
      } catch (error) {
        this.logger.debug(`AI embedding comparison failed: ${error}`);
      }
    }

    return Math.min(score, 1);
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const len = Math.min(vec1.length, vec2.length);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < len; i++) {
      const value1 = vec1[i] ?? 0;
      const value2 = vec2[i] ?? 0;
      dotProduct += value1 * value2;
      norm1 += value1 * value1;
      norm2 += value2 * value2;
    }
    if (norm1 === 0 || norm2 === 0) {return 0;}
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 计算协同过滤分数
   * 基于用户行为数据计算协同过滤推荐分数
   * @param item 商品信息
   * @param userBehaviors 用户行为数据
   * @returns 协同过滤分数 (0-1)
   */
  private calculateCollaborativeScore(
    item: ClothingItemWithBrand,
    userBehaviors: {
      favorites: FavoriteWithItem[];
      tryOns: TryOnWithItem[];
      orders: OrderWithItems[];
    },
  ): number {
    let score = 0.5;

    // 提取用户喜欢的品类
    const favoriteCategories = new Set(
      userBehaviors.favorites.map((f) => f.item?.category).filter((c): c is ClothingCategory => c !== undefined),
    );
    if (favoriteCategories.has(item.category)) {
      score += 0.1;
    }

    // 提取用户试穿过的品牌
    const triedBrands = new Set(
      userBehaviors.tryOns.map((t) => t.item?.brandId).filter((b): b is string => typeof b === 'string'),
    );
    if (item.brandId && triedBrands.has(item.brandId)) {
      score += 0.05;
    }

    // 提取用户购买过的商品风格
    const orderedItems = userBehaviors.orders.flatMap((o) =>
      o.items.map((i) => i.item).filter((item): item is NonNullable<typeof item> => item !== null),
    );
    const orderedStyles = new Set(
      orderedItems.flatMap((i) => {
        const attrs = i?.attributes;
        return attrs?.style || [];
      }),
    );
    const itemAttrs = item.attributes;
    if (itemAttrs?.style) {
      const matchingStyles = itemAttrs.style.filter((s: string) =>
        orderedStyles.has(s),
      );
      score += matchingStyles.length * 0.03;
    }

    // 浏览量和点赞量贡献
    score += Math.min(item.viewCount / 200, 0.05);
    score += Math.min(item.likeCount / 100, 0.05);

    return Math.min(score, 1);
  }

  /**
   * 计算知识图谱分数
   * 基于知识图谱关系计算推荐分数
   * @param item 商品信息
   * @param context 推荐上下文
   * @returns 知识图谱分数 (0-1)
   */
  private async calculateKnowledgeGraphScore(
    item: ClothingItemWithBrand,
    context?: RecommendationContext,
  ): Promise<number> {
    let score = 0.5;

    // 查找相关商品（经常一起购买）
    const relatedItems = this.knowledgeGraph.findRelatedItems(item.id, [
      "frequently_bought_together",
    ]);
    score += Math.min(relatedItems.length * 0.02, 0.1);

    // 查找风格兼容的商品
    const compatibleItems = this.knowledgeGraph.findCompatibleItemsByStyle(
      item.id,
    );
    score += Math.min(compatibleItems.length * 0.01, 0.1);

    // 场合适配性
    if (context?.occasion) {
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

  /**
   * 计算搭配理论分数
   * 基于体型、肤色、色彩季型等理论计算推荐分数
   * @param item 商品信息
   * @param userProfile 用户档案
   * @param context 推荐上下文
   * @returns 搭配理论分数 (0-1)
   */
  private calculateTheoryBasedScore(
    item: ClothingItemWithBrand,
    userProfile: UserProfileData | null,
    context?: RecommendationContext,
  ): number {
    if (!userProfile) {return 0.5;}

    const itemAttrs = item.attributes;

    const outfitScore = this.matchingTheory.calculateOutfitScore({
      bodyType: userProfile.bodyType ?? undefined,
      skinTone: userProfile.skinTone ?? undefined,
      colorSeason: userProfile.colorSeason ?? undefined,
      itemColors: item.colors || [],
      itemStyles: itemAttrs?.style || [],
      occasion: context?.occasion,
    });

    return outfitScore.score;
  }

  private combineScores(
    scores: RecommendationScoreBreakdown,
    weights: StrategyWeights,
  ): number {
    return (
      scores.contentBased * weights.contentBased +
      scores.collaborative * weights.collaborative +
      scores.knowledgeGraph * weights.knowledgeGraph +
      scores.theoryBased * weights.theoryBased +
      (scores.sasrec ?? 0) * weights.sasrec +
      (scores.popularity ?? 0) * weights.popularity
    );
  }

  private getSources(
    scores: RecommendationScoreBreakdown,
    weights: StrategyWeights,
  ): string[] {
    const sources: string[] = [];
    const threshold = 0.5;

    const contributions = [
      { name: "内容匹配", score: scores.contentBased, weight: weights.contentBased },
      { name: "行为推荐", score: scores.collaborative, weight: weights.collaborative },
      { name: "知识图谱", score: scores.knowledgeGraph, weight: weights.knowledgeGraph },
      { name: "搭配理论", score: scores.theoryBased, weight: weights.theoryBased },
      { name: "序列推荐", score: scores.sasrec ?? 0, weight: weights.sasrec },
      { name: "热门推荐", score: scores.popularity ?? 0, weight: weights.popularity },
    ];

    // Sort by weighted score
    contributions.sort((a, b) => (b.score * b.weight) - (a.score * a.weight));

    // Add top sources
    for (const contrib of contributions) {
      if (contrib.score >= threshold && sources.length < 3) {
        sources.push(contrib.name);
      }
    }

    return sources.length > 0 ? sources : ["综合推荐"];
  }

  private generateReasons(
    item: ClothingItemWithBrand,
    scores: RecommendationScoreBreakdown,
    userProfile: UserProfileData | null,
    context?: RecommendationContext,
  ): string[] {
    const reasons: string[] = [];

    // Body type matching
    if (
      userProfile?.bodyType &&
      item.attributes?.bodyTypeFit?.includes(userProfile.bodyType)
    ) {
      reasons.push(`适合${this.getBodyTypeName(userProfile.bodyType)}体型`);
    }

    // Color season matching
    if (
      userProfile?.colorSeason &&
      item.attributes?.colorSeasons?.includes(userProfile.colorSeason)
    ) {
      reasons.push(
        `符合${this.getColorSeasonName(userProfile.colorSeason)}型色彩`,
      );
    }

    // Occasion matching
    if (
      context?.occasion &&
      item.attributes?.occasions?.includes(context.occasion)
    ) {
      reasons.push(`适合${context.occasion}场合`);
    }

    // Season matching
    if (
      context?.season &&
      item.attributes?.seasons?.includes(context.season)
    ) {
      reasons.push(`适合${context.season}季节`);
    }

    // High collaborative score
    if (scores.collaborative > 0.7) {
      reasons.push("相似用户喜欢");
    }

    // High SASRec score
    if ((scores.sasrec ?? 0) > 0.7) {
      reasons.push("基于您的浏览历史");
    }

    // High popularity
    if ((scores.popularity ?? 0) > 0.8) {
      reasons.push("热门单品");
    }

    // Brand
    if (item.brand) {
      reasons.push(`${item.brand.name}品牌`);
    }

    // Style matching
    if (item.attributes?.style && item.attributes.style.length > 0) {
      reasons.push(`${item.attributes.style[0]}风格`);
    }

    if (reasons.length === 0) {
      reasons.push("为您推荐");
    }

    return reasons.slice(0, 3);
  }

  /**
   * 生成推荐解释
   * 为推荐结果生成详细的解释说明
   * @param item 商品信息
   * @param scores 各策略分数
   * @param userProfile 用户档案
   * @param context 推荐上下文
   * @returns 推荐解释对象
   */
  private async generateExplanation(
    item: ClothingItemWithBrand,
    scores: RecommendationScoreBreakdown,
    userProfile: UserProfileData | null,
    context?: RecommendationContext,
  ): Promise<RecommendationExplanation> {
    try {
      // 计算平均分数
      const scoreValues: number[] = [
        scores.contentBased,
        scores.collaborative,
        scores.knowledgeGraph,
        scores.theoryBased,
        scores.sasrec || 0,
        scores.popularity || 1,
      ];
      const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;

      const explanationContext: RecommendationExplanationContext = {
        userId: userProfile?.userId || "unknown",
        itemId: item.id,
        score: avgScore,
        reasons: this.buildExplanationReasons(item, scores, userProfile, context),
        matchingFactors: this.buildMatchingFactors(item, scores, userProfile, context),
      };

      
      const explanation = await this.explainer.generateExplanation(explanationContext);
      return {
        ...explanation,
        confidence: explanation.confidence ?? 0.5,
      };
    } catch (error) {
      this.logger.debug(`Explanation generation failed: ${error}`);
      return {
        summary: "为您精选的推荐单品",
        detailedReasons: this.generateReasons(item, scores, userProfile, context),
        styleTips: [],
        confidence: 0.5,
      };
    }
  }

  /**
   * 构建解释原因列表
   * 用于推荐解释器生成详细说明
   * @param item 商品信息
   * @param scores 各策略分数
   * @param userProfile 用户档案
   * @param context 推荐上下文
   * @returns 解释原因列表
   */
  private buildExplanationReasons(
    item: ClothingItemWithBrand,
    scores: RecommendationScoreBreakdown,
    userProfile: UserProfileData | null,
    _context?: RecommendationContext,
  ): RecommendationReason[] {
    const reasons: RecommendationReason[] = [];
    const itemAttrs = item.attributes;

    // 内容匹配
    if (scores.contentBased > 0.6) {
      reasons.push({
        type: "style_match",
        weight: scores.contentBased,
        description: "与您的风格偏好匹配",
      });
    }

    // 协同过滤
    if (scores.collaborative > 0.5) {
      reasons.push({
        type: "similar_users",
        weight: scores.collaborative,
        description: "相似用户也喜欢这款",
      });
    }

    // 体型匹配
    if (scores.theoryBased > 0.6 && userProfile?.bodyType) {
      reasons.push({
        type: "body_match",
        weight: scores.theoryBased,
        description: `适合${this.getBodyTypeName(userProfile.bodyType)}体型`,
      });
    }

    // 序列推荐
    if (scores.sasrec && scores.sasrec > 0.5) {
      reasons.push({
        type: "complementary",
        weight: scores.sasrec,
        description: "基于您的浏览历史推荐",
      });
    }

    // 热门推荐
    if (scores.popularity && scores.popularity > 0.7) {
      reasons.push({
        type: "trending",
        weight: scores.popularity,
        description: "当前热门单品",
      });
    }

    return reasons;
  }

  /**
   * 构建匹配因素列表
   * 用于推荐解释器生成详细说明
   * @param item 商品信息
   * @param scores 各策略分数
   * @param userProfile 用户档案
   * @param context 推荐上下文
   * @returns 匹配因素列表
   */
  private buildMatchingFactors(
    item: ClothingItemWithBrand,
    scores: RecommendationScoreBreakdown,
    userProfile: UserProfileData | null,
    context?: RecommendationContext,
  ): MatchingFactorItem[] {
    const factors: MatchingFactorItem[] = [];
    const itemAttrs = item.attributes;

    // 风格匹配
    if (userProfile?.stylePreferences && itemAttrs?.style) {
      const userStyles = Array.isArray(userProfile.stylePreferences)
        ? userProfile.stylePreferences.map((s: StylePreferenceItem) => s.name || String(s))
        : [];
      const matchingStyles = itemAttrs.style.filter((s: string) =>
        userStyles.some((us: string) => us.toLowerCase() === s.toLowerCase()),
      );
      if (matchingStyles.length > 0) {
        factors.push({
          factor: "style",
          userValue: userStyles.join(", "),
          itemValue: matchingStyles.join(", "),
          matchScore: matchingStyles.length / itemAttrs.style.length,
          explanation: `风格匹配度 ${Math.round((matchingStyles.length / itemAttrs.style.length) * 100)}%`,
        });
      }
    }

    // 色彩季型匹配
    if (userProfile?.colorSeason && itemAttrs?.colorSeasons) {
      const matches = itemAttrs.colorSeasons.includes(userProfile.colorSeason);
      if (matches) {
        factors.push({
          factor: "color",
          userValue: this.getColorSeasonName(userProfile.colorSeason),
          itemValue: item.colors?.join(", ") || "",
          matchScore: 0.8,
          explanation: `符合您的${this.getColorSeasonName(userProfile.colorSeason)}色彩季型`,
        });
      }
    }

    // 场合匹配
    if (context?.occasion && itemAttrs?.occasions) {
      const matches = itemAttrs.occasions.includes(context.occasion);
      if (matches) {
        factors.push({
          factor: "occasion",
          userValue: context.occasion,
          itemValue: itemAttrs.occasions.join(", "),
          matchScore: 0.9,
          explanation: `适合${context.occasion}场合`,
        });
      }
    }

    return factors;
  }

  /**
   * Find similar items for recommendation explanation
   */
  private async findSimilarItems(itemId: string): Promise<string[]> {
    try {
      const similarItems = await this.collaborativeFiltering.getItemBasedRecommendations(
        itemId,
        { limit: 5 },
      );
      return similarItems.map((item) => item.itemId);
    } catch (error) {
      this.logger.debug(`Failed to find similar items: ${error}`);
      return [];
    }
  }

  private optimizeDiversity(
    items: RecommendationResult[],
    limit: number,
  ): RecommendationResult[] {
    const result: RecommendationResult[] = [];
    const categoryCount: Record<string, number> = {};
    const maxPerCategory = Math.ceil(limit / 4);

    for (const item of items) {
      const category = item.item.category;
      const count = categoryCount[category] || 0;

      if (count < maxPerCategory) {
        result.push(item);
        categoryCount[category] = count + 1;
      }

      if (result.length >= limit) {break;}
    }

    if (result.length < limit) {
      for (const item of items) {
        if (!result.some((r) => r.item.id === item.item.id)) {
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
      [ColorSeason.spring_light]: "春季轻型",
      [ColorSeason.summer_cool]: "夏季冷型",
      [ColorSeason.summer_light]: "夏季轻型",
      [ColorSeason.autumn_warm]: "秋季暖型",
      [ColorSeason.autumn_deep]: "秋季深型",
      [ColorSeason.winter_cool]: "冬季冷型",
      [ColorSeason.winter_deep]: "冬季深型",
    };
    return names[season] || season;
  }

  async getOutfitRecommendation(
    userId: string,
    baseItemId: string,
    options?: { occasion?: string; limit?: number },
  ): Promise<OutfitRecommendationResult> {
    const userProfile = await this.getUserProfile(userId);
    const baseItem = await this.prisma.clothingItem.findUnique({
      where: { id: baseItemId },
    });

    if (!baseItem) {
      throw new Error("Base item not found");
    }

    const baseFeatures =
      await this.multimodalFusion.extractItemFeatures(baseItemId);

    const categories = this.getComplementaryCategories(baseItem.category);

    const results: OutfitRecommendationResult = {
      overallScore: 0,
    };
    let totalScore = 0;
    let count = 0;

    for (const [key, category] of Object.entries(categories)) {
      const candidates = await this.prisma.clothingItem.findMany({
        where: { isActive: true, category },
        include: {
          brand: { select: { id: true, name: true, logo: true } },
        },
        take: 50,
      });

      const scored: RecommendationResult[] = await Promise.all(
        candidates.map(async (item) => {
          const features = await this.multimodalFusion.extractItemFeatures(
            item.id,
          );
          const compatibility =
            await this.multimodalFusion.calculateCompatibility(
              baseFeatures,
              features,
            );

          const theoryScore = this.matchingTheory.calculateTheoryBasedScore(
            item,
            userProfile ?? {},
            { occasion: options?.occasion },
          );

          const itemScore = compatibility.score * 0.6 + theoryScore * 0.4;

          return {
            item: {
              ...item,
              price: Number(item.price),
              originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
              brand: item.brand ? { id: item.brand.id, name: item.brand.name, logo: item.brand.logo } : null,
            } as ClothingItemWithBrand,
            score: itemScore,
            sources: ["搭配推荐"],
            reasons: compatibility.reasons,
            breakdown: {
              contentBased: compatibility.breakdown.visual,
              collaborative: compatibility.breakdown.textual,
              knowledgeGraph: compatibility.breakdown.attribute,
              theoryBased: theoryScore,
            },
          };
        }),
      );

      scored.sort((a, b) => b.score - a.score);
      
      if (key === 'tops') {results.tops = scored.slice(0, options?.limit || 5);}
      else if (key === 'bottoms') {results.bottoms = scored.slice(0, options?.limit || 5);}
      else if (key === 'footwear') {results.footwear = scored.slice(0, options?.limit || 5);}
      else if (key === 'accessories') {results.accessories = scored.slice(0, options?.limit || 5);}
      else if (key === 'outerwear') {results.outerwear = scored.slice(0, options?.limit || 5);}

      const topResult = scored[0];
      if (topResult) {
        totalScore += topResult.score;
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
}
