/**
 * AI 试衣服务提供商接口
 * 定义统一的试衣 API 接口，支持多个 AI 模型提供商
 */

import * as crypto from "crypto";

export interface TryOnRequest {
  /** 用户照片 URL */
  personImageUrl: string;
  /** 服装图片 URL */
  garmentImageUrl: string;
  /** 服装类别: upper_body, lower_body, full_body, dress */
  category?: "upper_body" | "lower_body" | "full_body" | "dress";
  /** 是否使用高清模式 */
  hd?: boolean;
}

export interface TryOnResponse {
  /** 生成的试衣结果图片 URL */
  resultImageUrl: string;
  /** 处理耗时（毫秒） */
  processingTime?: number;
  /** 置信度分数 (0-1) */
  confidence?: number;
  /** 提供商名称 */
  provider: string;
  /** 原始响应数据（可选） */
  rawResponse?: Record<string, unknown>;
  /** 元数据（模型版本、GPU使用等） */
  metadata?: Record<string, unknown>;
}

export interface TryOnProvider {
  /** 提供商名称 */
  readonly name: string;

  /** 提供商优先级（数字越小优先级越高） */
  readonly priority: number;

  /** 检查提供商是否可用 */
  isAvailable(): Promise<boolean>;

  /** 执行虚拟试衣 */
  virtualTryOn(request: TryOnRequest): Promise<TryOnResponse>;
}

/**
 * 试衣缓存键生成器
 */
export function generateTryOnCacheKey(
  personImageUrl: string,
  garmentImageUrl: string,
  category: string = "upper_body",
): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${personImageUrl}|${garmentImageUrl}|${category}`)
    .digest("hex");
  return `tryon:${hash}`;
}
