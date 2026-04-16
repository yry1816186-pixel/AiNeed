/**
 * Commerce domain shared types
 * Aligned with Prisma schema enums for type safety across domains
 */

// ==================== Order ====================

export enum OrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Processing = 'processing',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

// ==================== Payment ====================

export enum PaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
  Refunded = 'refunded',
  Cancelled = 'cancelled',
}

export enum PaymentProvider {
  Alipay = 'alipay',
  Wechat = 'wechat',
}

export enum PaymentMethod {
  AlipayQr = 'alipay_qr',
  AlipayWap = 'alipay_wap',
  WechatJsapi = 'wechat_jsapi',
  WechatH5 = 'wechat_h5',
}

// ==================== Subscription ====================

export enum SubscriptionStatus {
  Active = 'active',
  Expired = 'expired',
  Cancelled = 'cancelled',
  PastDue = 'past_due',
}

// ==================== Coupon ====================

export enum CouponType {
  Percentage = 'PERCENTAGE',
  Fixed = 'FIXED',
  Shipping = 'SHIPPING',
}

export enum UserCouponStatus {
  Available = 'AVAILABLE',
  Used = 'USED',
  Expired = 'EXPIRED',
}

// ==================== Refund ====================

export enum RefundType {
  RefundOnly = 'REFUND_ONLY',
  ReturnRefund = 'RETURN_REFUND',
}

export enum RefundRequestStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
}

// ==================== Stock Notification ====================

export enum StockNotificationStatus {
  Pending = 'PENDING',
  Notified = 'NOTIFIED',
  Cancelled = 'CANCELLED',
}

// ==================== Payment Order Metadata ====================

export interface PaymentOrderMetadata {
  planId?: string;
  planName?: string;
  duration?: number;
  originalPrice?: number;
  discount?: number;
  couponCode?: string;
  [key: string]: unknown;
}

export interface PaymentRecordMetadata {
  subject?: string;
  body?: string;
  originalOrderId?: string;
  planId?: string;
  planName?: string;
  [key: string]: unknown;
}

export interface PaymentStatistics {
  totalAmount: number;
  totalCount: number;
  successCount: number;
  failedCount: number;
  refundedAmount: number;
}

export type PaymentCurrency = 'CNY' | 'USD' | 'EUR';
