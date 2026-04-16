/**
 * @fileoverview 统一推荐引擎类型定义
 * @description 定义推荐系统中使用的所有类型接口，替代 any 类型以提高类型安全性
 * @module recommendations/types
 */

import {
  BodyType,
  SkinTone,
  ColorSeason,
  ClothingCategory,
} from "@prisma/client";

/**
 * 服装商品属性接口
 * @description 定义服装商品的扩展属性结构
 */
export interface ClothingItemAttributes {
  /** 适合的体型列表 */
  bodyTypeFit?: BodyType[];
  /** 适合的色彩季型列表 */
  colorSeasons?: ColorSeason[];
  /** 风格标签列表 */
  style?: string[];
  /** 适用场合列表 */
  occasions?: string[];
  /** 适用季节列表 */
  seasons?: string[];
  /** 材质列表 */
  materials?: string[];
  /** 图案类型 */
  patterns?: string[];
  /** 版型类型 */
  fit?: string;
  /** 天气适用性 */
  weather?: string[];
}

/**
 * 服装商品完整信息接口
 * @description 包含品牌信息的完整服装商品数据
 */
export interface ClothingItemWithBrand {
  id: string;
  brandId: string | null;
  name: string;
  description: string | null;
  category: ClothingCategory;
  subcategory: string | null;
  colors: string[];
  sizes: string[];
  tags: string[];
  price: number;
  originalPrice: number | null;
  currency: string;
  images: string[];
  mainImage: string | null;
  externalUrl: string | null;
  externalId: string | null;
  attributes: ClothingItemAttributes | null;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  brand: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
}

/**
 * 用户档案接口
 * @description 用户个人资料和偏好设置
 */
export interface UserProfileData {
  id: string;
  userId: string;
  bodyType: BodyType | null;
  skinTone: SkinTone | null;
  faceShape: string | null;
  colorSeason: ColorSeason | null;
  height: number | null;
  weight: number | null;
  shoulder: number | null;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  inseam: number | null;
  stylePreferences: StylePreferenceItem[] | null;
  colorPreferences: string[] | null;
  priceRangeMin: number | null;
  priceRangeMax: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 风格偏好项接口
 * @description 单个风格偏好的结构
 */
export interface StylePreferenceItem {
  id?: string;
  name: string;
  category?: string;
}

/**
 * 用户行为数据接口
 * @description 用户收藏、试穿、订单等行为数据
 */
export interface UserBehaviorData {
  /** 用户收藏列表 */
  favorites: Array<{
    item: ClothingItemWithBrand | null;
  }>;
  /** 用户试穿记录 */
  tryOns: Array<{
    item: ClothingItemWithBrand | null;
  }>;
  /** 用户订单记录 */
  orders: Array<{
    items: Array<{
      item: ClothingItemWithBrand | null;
    }>;
  }>;
}

/**
 * 推荐上下文接口
 * @description 推荐请求的上下文信息
 */
export interface RecommendationContext {
  /** 场合（如约会、工作、派对等） */
  occasion?: string;
  /** 季节 */
  season?: string;
  /** 天气 */
  weather?: string;
  /** 基础商品ID（用于搭配推荐） */
  baseItemId?: string;
}

/**
 * 推荐分数明细接口
 * @description 各推荐策略的分数明细
 */
export interface RecommendationScoreBreakdown {
  /** 基于内容的推荐分数 */
  contentBased: number;
  /** 协同过滤推荐分数 */
  collaborative: number;
  /** 知识图谱推荐分数 */
  knowledgeGraph: number;
  /** 搭配理论推荐分数 */
  theoryBased: number;
  /** 序列推荐分数（SASRec） */
  sasrec?: number;
  /** 热门度分数 */
  popularity?: number;
}

/**
 * 推荐解释接口
 * @description 推荐结果的详细解释
 */
export interface RecommendationExplanation {
  /** 推荐摘要 */
  summary: string;
  /** 详细原因列表 */
  detailedReasons: string[];
  /** 搭配建议 */
  styleTips: string[];
  /** 推荐置信度 */
  confidence: number;
}

/**
 * 推荐结果接口
 * @description 单个推荐商品的完整结果
 */
export interface RecommendationResult {
  /** 推荐商品 */
  item: ClothingItemWithBrand;
  /** 推荐总分 */
  score: number;
  /** 推荐来源列表 */
  sources: string[];
  /** 推荐原因列表 */
  reasons: string[];
  /** 分数明细 */
  breakdown: RecommendationScoreBreakdown;
  /** 推荐解释 */
  explanation?: RecommendationExplanation;
  /** 相似商品ID列表 */
  similarItems?: string[];
}

/**
 * 推荐策略权重接口
 * @description 各推荐策略的权重配置
 */
export interface StrategyWeights {
  /** 基于内容的权重 */
  contentBased: number;
  /** 协同过滤的权重 */
  collaborative: number;
  /** 知识图谱的权重 */
  knowledgeGraph: number;
  /** 搭配理论的权重 */
  theoryBased: number;
  /** 序列推荐的权重 */
  sasrec: number;
  /** 热门度的权重 */
  popularity: number;
}

/**
 * 用户行为摘要接口
 * @description 用户行为的统计摘要
 */
export interface UserBehaviorSummary {
  /** 总交互次数 */
  totalInteractions: number;
  /** 喜欢的分类及次数 */
  favoriteCategories: Map<string, number>;
  /** 喜欢的品牌及次数 */
  favoriteBrands: Map<string, number>;
  /** 喜欢的风格集合 */
  favoriteStyles: Set<string>;
  /** 最近浏览的商品ID列表 */
  recentItems: string[];
  /** 是否为新用户 */
  isNewUser: boolean;
}

/**
 * 统一推荐请求接口
 * @description 推荐请求的完整参数
 */
export interface UnifiedRecommendationRequest {
  /** 用户ID */
  userId: string;
  /** 推荐上下文 */
  context?: RecommendationContext;
  /** 推荐选项 */
  options?: {
    /** 返回数量限制 */
    limit?: number;
    /** 商品分类过滤 */
    category?: ClothingCategory;
    /** 最低价格 */
    minPrice?: number;
    /** 最高价格 */
    maxPrice?: number;
    /** 是否包含推荐原因 */
    includeReasons?: boolean;
  };
}

/**
 * 解释原因项接口
 * @description 用于构建推荐解释的原因项
 */
export interface ExplanationReasonItem {
  /** 原因类型 */
  type: string;
  /** 权重 */
  weight: number;
  /** 描述 */
  description: string;
}

/**
 * 匹配因素项接口
 * @description 用户偏好与商品属性的匹配因素
 */
export interface MatchingFactorItem {
  /** 因素类型 */
  factor: string;
  /** 用户值 */
  userValue: string;
  /** 商品值 */
  itemValue: string;
  /** 匹配分数 */
  matchScore: number;
  /** 解释说明 */
  explanation: string;
}

/**
 * Prisma Where 条件类型
 * @description 用于 Prisma 查询的 where 条件
 */
export interface PrismaWhereCondition {
  isActive: boolean;
  isDeleted?: boolean;
  category?: ClothingCategory;
  brandId?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  colors?: {
    hasSome?: string[];
  };
  sizes?: {
    hasSome?: string[];
  };
  tags?: {
    hasSome?: string[];
  };
}

/**
 * 收藏记录接口（含商品信息）
 */
export interface FavoriteWithItem {
  item: Pick<ClothingItemWithBrand, "category" | "brandId" | "attributes"> | null;
}

/**
 * 试穿记录接口（含商品信息）
 */
export interface TryOnWithItem {
  item: Pick<ClothingItemWithBrand, "category" | "brandId" | "attributes"> | null;
}

/**
 * 订单项接口（含商品信息）
 */
export interface OrderItemWithItem {
  item: Pick<ClothingItemWithBrand, "category" | "brandId" | "attributes"> | null;
}

/**
 * 订单接口（含订单项）
 */
export interface OrderWithItems {
  items: OrderItemWithItem[];
}

/**
 * 用户行为记录接口
 */
export interface UserBehaviorRecord {
  itemId: string | null;
  createdAt: Date;
}

/**
 * 搭配推荐结果接口
 */
export interface OutfitRecommendationResult {
  tops?: RecommendationResult[];
  bottoms?: RecommendationResult[];
  footwear?: RecommendationResult[];
  accessories?: RecommendationResult[];
  outerwear?: RecommendationResult[];
  overallScore: number;
}

/**
 * 推荐原因类型
 */
export type RecommendationReasonType =
  | "style_match"
  | "body_match"
  | "color_match"
  | "occasion_match"
  | "trending"
  | "similar_users"
  | "complementary"
  | "budget_friendly";

/**
 * 推荐原因接口（用于推荐解释器）
 */
export interface RecommendationReason {
  type: RecommendationReasonType;
  weight: number;
  description: string;
  details?: string;
}

/**
 * 用户偏好摘要接口
 */
export interface UserPreferenceSummary {
  preferredStyles: string[];
  preferredColors: string[];
  bodyType?: BodyType;
  skinTone?: SkinTone;
  colorSeason?: ColorSeason;
  budgetRange?: { min: number; max: number };
}

/**
 * 商品属性摘要接口
 */
export interface ItemAttributeSummary {
  category: ClothingCategory;
  style: string[];
  colors: string[];
  occasions: string[];
  price: number;
  brand?: string;
}

/**
 * 匹配因素接口
 */
export interface MatchingFactor {
  factor: string;
  userValue: string;
  itemValue: string;
  matchScore: number;
  explanation: string;
}

/**
 * 推荐解释上下文接口
 */
export interface RecommendationExplanationContext {
  userId: string;
  itemId: string;
  score: number;
  reasons: RecommendationReason[];
  userPreferences?: UserPreferenceSummary;
  itemAttributes?: ItemAttributeSummary;
  matchingFactors: MatchingFactor[];
}
