/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Search Module Type Definitions
 * 搜索模块类型定义 - 消除 any 类型，提供类型安全
 */

import type { Prisma, ClothingCategory } from "@prisma/client";

// ============================================================================
// Prisma Where 条件类型
// ============================================================================

/**
 * 服装商品搜索 Where 条件
 * 用于 searchItems 和相关查询
 */
export type ClothingItemWhereInput = Prisma.ClothingItemWhereInput;

/**
 * 服装商品价格范围条件
 */
export interface PriceRangeFilter {
  gte?: number;
  lte?: number;
}

/**
 * 构建搜索 where 条件的输入参数
 */
export interface SearchWhereBuilderInput {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

// ============================================================================
// Prisma OrderBy 类型
// ============================================================================

/**
 * 服装商品排序选项
 */
export type ClothingItemOrderByWithRelationInput =
  Prisma.ClothingItemOrderByWithRelationInput;

/**
 * 排序方式枚举
 */
export type SortByOption =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "popular";

// ============================================================================
// ML 服务响应类型
// ============================================================================

/**
 * ML 服务相似商品响应项
 */
export interface MLSimilarItemResult {
  id: string;
  similarity: number;
  reasons?: string[];
}

/**
 * ML 服务相似商品搜索响应
 */
export interface MLSimilarItemsResponse {
  results: MLSimilarItemResult[];
}

/**
 * ML 服务图像分析响应 - 服装属性
 */
export interface MLAnalysisClothingData {
  category?: string;
  style?: string[];
  colors?: string[];
}

/**
 * ML 服务图像分析响应
 */
export interface MLAnalysisResponse {
  clothing?: MLAnalysisClothingData;
}

// ============================================================================
// 服装属性类型
// ============================================================================

/**
 * 服装商品属性结构
 * 对应 Prisma schema 中的 attributes Json 字段
 */
export interface ClothingAttributes {
  style?: string[];
  patterns?: string[];
  occasions?: string[];
  materials?: string[];
  season?: string[];
  fit?: string;
  [key: string]: string | string[] | number | boolean | undefined;
}

/**
 * 服装属性类型守卫
 */
export function isClothingAttributes(value: unknown): value is ClothingAttributes {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  // 检查可选字段类型
  if (obj.style !== undefined && !Array.isArray(obj.style)) {
    return false;
  }
  if (obj.patterns !== undefined && !Array.isArray(obj.patterns)) {
    return false;
  }
  if (obj.occasions !== undefined && !Array.isArray(obj.occasions)) {
    return false;
  }
  return true;
}

// ============================================================================
// 搜索结果类型
// ============================================================================

/**
 * 带品牌信息的服装商品
 */
export interface ClothingItemWithBrand {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  colors: string[];
  sizes: string[];
  tags: string[];
  price: Prisma.Decimal;
  originalPrice: Prisma.Decimal | null;
  currency: string;
  images: string[];
  mainImage: string | null;
  attributes: Prisma.JsonValue | null;
  isActive: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  brandId: string | null;
  brand: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
}

/**
 * 带相似度分数的搜索结果项
 */
export interface ScoredSearchResult extends ClothingItemWithBrand {
  similarityScore: number;
  matchReasons: string[];
}

/**
 * 分页搜索结果
 */
export interface PaginatedSearchResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  query: string;
}

/**
 * 搜索建议结果
 */
export interface SearchSuggestionsResult {
  itemNames: string[];
  tags: string[];
}

// ============================================================================
// AI 图像分析类型
// ============================================================================

/**
 * 阿里云图像分析响应样式项
 */
export interface AliyunStyleItem {
  Style?: string;
}

/**
 * 阿里云图像分析响应颜色项
 */
export interface AliyunColorItem {
  ColorName?: string;
}

/**
 * 阿里云图像分析响应数据
 */
export interface AliyunAnalysisData {
  Styles?: AliyunStyleItem[];
  Colors?: AliyunColorItem[];
}

/**
 * 阿里云图像分析完整响应
 */
export interface AliyunAnalysisResponse {
  Data?: AliyunAnalysisData;
}

/**
 * 百度图像分析结果项
 */
export interface BaiduAnalysisResultItem {
  keyword?: string;
}

/**
 * 百度图像分析响应
 */
export interface BaiduAnalysisResponse {
  result?: BaiduAnalysisResultItem[];
  color_result?: Array<{ color_name?: string }>;
}

/**
 * OpenAI 图像分析响应
 */
export interface OpenAIAnalysisContent {
  labels?: string[];
  colors?: string[];
  style?: string;
  category?: string;
}

// ============================================================================
// 辅助函数类型
// ============================================================================

/**
 * 构建 Prisma where 条件
 */
export function buildSearchWhereClause(
  input: SearchWhereBuilderInput,
): ClothingItemWhereInput {
  const where: ClothingItemWhereInput = { isActive: true };

  if (input.query) {
    where.OR = [
      { name: { contains: input.query, mode: "insensitive" } },
      { description: { contains: input.query, mode: "insensitive" } },
      { tags: { hasSome: [input.query] } },
      { brand: { name: { contains: input.query, mode: "insensitive" } } },
    ];
  }

  if (input.category) {
    where.category = input.category as ClothingCategory;
  }

  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    where.price = {};
    if (input.minPrice !== undefined) {
      (where.price as PriceRangeFilter).gte = input.minPrice;
    }
    if (input.maxPrice !== undefined) {
      (where.price as PriceRangeFilter).lte = input.maxPrice;
    }
  }

  return where;
}

/**
 * 构建排序条件
 */
export function buildOrderByClause(
  sortBy: SortByOption,
): ClothingItemOrderByWithRelationInput {
  switch (sortBy) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "popular":
      return { viewCount: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

/**
 * 安全获取服装属性
 */
export function getClothingAttributes(
  attributes: Prisma.JsonValue | null,
): ClothingAttributes | null {
  if (attributes === null || attributes === undefined) {
    return null;
  }
  if (isClothingAttributes(attributes)) {
    return attributes;
  }
  return null;
}
