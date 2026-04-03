/**
 * 通用类型定义
 * 用于替代 any 类型，提高类型安全性
 */

import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

// ==================== 错误处理类型 ====================

/**
 * 带有 message 属性的错误对象
 */
export interface ErrorWithMessage {
  message: string;
}

/**
 * 带有 code 属性的错误对象
 */
export interface ErrorWithCode {
  code: string;
}

/**
 * 带有 stack 属性的错误对象
 */
export interface ErrorWithStack {
  stack: string;
}

/**
 * 完整的错误对象
 */
export interface FullError extends ErrorWithMessage, ErrorWithCode, ErrorWithStack {
  name: string;
}

/**
 * 类型守卫：检查对象是否有 message 属性
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ErrorWithMessage).message === "string"
  );
}

/**
 * 类型守卫：检查对象是否有 code 属性
 */
export function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as ErrorWithCode).code === "string"
  );
}

/**
 * 类型守卫：检查是否为 Error 实例
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * 安全获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

/**
 * 安全获取错误代码
 */
export function getErrorCode(error: unknown): string | null {
  if (isErrorWithCode(error)) {
    return error.code;
  }
  return null;
}

// ==================== Express Request 扩展类型 ====================

/**
 * JWT 用户信息
 */
export interface JwtUserPayload {
  id: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * 扩展的 Express Request 类型（包含用户信息）
 */
export interface RequestWithUser extends Request {
  user: JwtUserPayload;
  session?: { id: string };
  csrfToken?: string;
}

/**
 * 会话信息
 */
export interface SessionInfo {
  id: string;
  userId?: string;
}

// ==================== Prisma 相关类型 ====================

/**
 * Prisma 查询事件
 */
export interface PrismaQueryEvent {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
}

/**
 * Prisma 扩展上下文
 */
export interface PrismaExtensionContext {
  model: string;
  operation: string;
  args: Prisma.Args<any, any>;
  query: (args: Prisma.Args<any, any>) => Promise<any>;
}

/**
 * Prisma Where 条件基础类型
 */
export type PrismaWhereInput = Record<string, unknown>;

/**
 * Prisma 更新数据类型
 */
export type PrismaUpdateData = Record<string, unknown>;

/**
 * 软删除参数类型
 */
export interface SoftDeleteArgs {
  where: PrismaWhereInput;
  data?: PrismaUpdateData;
}

/**
 * 批量软删除参数类型
 */
export interface SoftDeleteManyArgs {
  where: PrismaWhereInput;
  data?: PrismaUpdateData;
}

// ==================== 通用业务类型 ====================

/**
 * 风格偏好项
 */
export interface StylePreference {
  id?: string;
  name: string;
  category?: string;
}

/**
 * 颜色偏好项
 */
export interface ColorPreference {
  name: string;
  hex?: string;
}

/**
 * 用户档案更新数据
 */
export interface UserProfileUpdateData {
  nickname?: string;
  avatar?: string;
  gender?: string;
  birthDate?: Date;
}

/**
 * 形象档案更新数据
 */
export interface StyleProfileUpdateData {
  height?: number;
  weight?: number;
  shoulder?: number;
  bust?: number;
  waist?: number;
  hip?: number;
  inseam?: number;
  bodyType?: string;
  skinTone?: string;
  faceShape?: string;
  colorSeason?: string;
  stylePreferences?: StylePreference[];
  colorPreferences?: string[];
}

/**
 * 地址数据（含加密字段）
 */
export interface AddressData {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 购物车项数据
 */
export interface CartItemData {
  id: string;
  itemId: string;
  color: string;
  size: string;
  quantity: number;
  selected: boolean;
  createdAt: Date;
  item: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    colors: string[];
    sizes: string[];
    price: number | { toNumber(): number };
    originalPrice: number | null | { toNumber(): number };
    currency: string;
    images: string[];
    tags: string[];
    viewCount: number;
    likeCount: number;
    brand: {
      id: string;
      name: string;
      logo: string | null;
    } | null;
  };
}

/**
 * 收藏项数据
 */
export interface FavoriteData {
  item: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    colors: string[];
    sizes: string[];
    price: number;
    images: string[];
    mainImage: string | null;
    brand: {
      id: string;
      name: string;
      logo: string | null;
    } | null;
  } | null;
}

/**
 * 推荐商品数据
 */
export interface RecommendedItemData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  colors: string[];
  sizes: string[];
  tags: string[];
  price: number;
  originalPrice: number | null;
  currency: string;
  images: string[];
  mainImage: string | null;
  attributes: Record<string, unknown> | null;
  viewCount: number;
  likeCount: number;
  brand: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
}

/**
 * 品牌查询条件
 */
export interface BrandWhereCondition {
  isActive: boolean;
  priceRange?: string;
  categories?: { has: string };
}

/**
 * 商品查询条件
 */
export interface ProductWhereCondition {
  isActive: boolean;
  brandId?: string;
  category?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
}

// ==================== AI 服务类型 ====================

/**
 * ML 服务体型分析响应
 */
export interface MLBodyAnalysisResponse {
  success?: boolean;
  body_type?: string;
  body_type_confidence?: number;
  skin_tone?: string;
  color_season?: string;
  measurements?: {
    shoulder_width?: number;
    hip_width?: number;
    waist_width?: number;
    bust_width?: number;
    torso_height?: number;
    leg_height?: number;
    estimated_height?: number;
  };
  proportions?: {
    shoulder_to_hip_ratio?: number;
    waist_to_hip_ratio?: number;
    waist_to_shoulder_ratio?: number;
  };
  recommendations?: {
    suitable_styles?: string[];
    avoid_styles?: string[];
    body_type_name?: string;
    description?: string;
  };
  processing_time?: number;
  error?: string;
}

/**
 * 前端体型分析结果
 */
export interface BodyAnalysisResult {
  success: boolean;
  bodyType: string;
  bodyTypeConfidence: number;
  skinTone: string;
  colorSeason: string;
  measurements: {
    shoulderWidth: number;
    hipWidth: number;
    waistWidth: number;
    bustWidth: number;
    torsoHeight: number;
    legHeight: number;
    estimatedHeight: number;
  };
  proportions: {
    shoulderToHipRatio: number;
    waistToHipRatio: number;
    waistToShoulderRatio: number;
  };
  recommendations?: {
    suitableStyles: string[];
    avoidStyles: string[];
    bodyTypeName: string;
    description: string;
  };
  processingTime: number;
  error?: string;
}

/**
 * 颜色推荐结果
 */
export interface ColorRecommendationResult {
  season: string;
  bestColors: string[];
  neutralColors: string[];
  avoidColors: string[];
  metalPreference: string;
}

// ==================== WebSocket 类型 ====================

/**
 * WebSocket 通知数据
 */
export interface WebSocketNotificationData {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * WebSocket 客户端数据
 */
export interface WebSocketClientData {
  userId?: string;
  [key: string]: unknown;
}

// ==================== XSS 过滤类型 ====================

/**
 * 可递归过滤的对象类型
 */
export type SanitizableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SanitizableValue[]
  | { [key: string]: SanitizableValue };

// ==================== 队列任务类型 ====================

/**
 * 队列任务数据
 */
export interface QueueJobData {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  delay?: number;
  attempts?: number;
  createdAt: Date;
}

/**
 * 队列任务结果
 */
export interface QueueJobResult {
  success: boolean;
  data?: unknown;
  error?: string;
  processedAt: Date;
}

// ==================== Qdrant 向量数据库类型 ====================

/**
 * Qdrant 过滤条件
 */
export interface QdrantFilterCondition {
  must?: QdrantFieldCondition[];
  must_not?: QdrantFieldCondition[];
  should?: QdrantFieldCondition[];
}

/**
 * Qdrant 字段条件
 */
export interface QdrantFieldCondition {
  key: string;
  match?: { value: string | number | boolean };
  range?: {
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
}

// ==================== 算法编排类型 ====================

/**
 * 算法输入数据
 */
export interface AlgorithmInput {
  userId: string;
  context?: Record<string, unknown>;
  options?: {
    limit?: number;
    offset?: number;
    includeMetadata?: boolean;
  };
}

/**
 * 算法输出数据
 */
export interface AlgorithmOutput {
  success: boolean;
  results: unknown[];
  metadata?: Record<string, unknown>;
  processingTime: number;
}

/**
 * 云通信消息
 */
export interface CloudCommunicationMessage {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * 云通信响应
 */
export interface CloudCommunicationResponse {
  success: boolean;
  result?: unknown;
  error?: string;
}
