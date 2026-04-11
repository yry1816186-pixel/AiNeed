/**
 * 通用支付类型定义
 * 金融级安全类型，确保支付数据类型安全
 */

/**
 * 支付订单元数据
 */
export interface PaymentOrderMetadata {
  planId?: string;
  planName?: string;
  duration?: number; // 订阅时长（天）
  originalPrice?: number;
  discount?: number;
  couponCode?: string;
  [key: string]: unknown; // 允许扩展字段
}

/**
 * 支付记录元数据
 */
export interface PaymentRecordMetadata {
  subject?: string;
  body?: string;
  originalOrderId?: string;
  planId?: string;
  planName?: string;
  [key: string]: unknown; // 允许扩展字段
}

/**
 * 支付回调原始数据（通用）
 */
export interface PaymentRawCallbackData {
  [key: string]: unknown;
}

/**
 * 支付 API 错误响应
 */
export interface PaymentApiError {
  code: string;
  message: string;
  detail?: string;
  stack?: string;
}

/**
 * 支付 HTTPS Agent 类型
 * Node.js https.Agent 或 undefined
 */
export type PaymentHttpsAgent = unknown;

/**
 * 支付金额（以分为单位）
 */
export type PaymentAmountInCents = number;

/**
 * 支付金额（以元为单位）
 */
export type PaymentAmountInYuan = number;

/**
 * 支付货币类型
 */
export type PaymentCurrency = "CNY" | "USD" | "EUR";

/**
 * 支付时间范围
 */
export interface PaymentTimeRange {
  start: Date;
  end: Date;
}

/**
 * 支付统计信息
 */
export interface PaymentStatistics {
  totalAmount: number;
  totalCount: number;
  successCount: number;
  failedCount: number;
  refundedAmount: number;
}

/**
 * 支付错误处理辅助函数类型
 */
export type PaymentErrorExtractor = (error: unknown) => {
  message: string;
  stack?: string;
  code?: string;
};
