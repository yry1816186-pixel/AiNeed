/**
 * Cross-domain event payload types
 * Shared event contracts for decoupled domain communication
 */

// ==================== Payment Events ====================

export const PAYMENT_EVENTS = {
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_CLOSED: 'payment.closed',
  SUBSCRIPTION_ACTIVATION_REQUIRED: 'payment.subscription.activation',
} as const;

export type PaymentEventType = (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];

export interface PaymentSucceededPayload {
  userId: string;
  orderId: string;
  paymentRecordId: string;
  amount: number;
  currency: string;
  provider: string;
  tradeNo?: string;
  paidAt?: Date;
  metadata?: import('./commerce').PaymentOrderMetadata;
}

export interface PaymentFailedPayload {
  userId: string;
  orderId: string;
  paymentRecordId: string;
  reason?: string;
  metadata?: import('./commerce').PaymentOrderMetadata;
}

export interface PaymentRefundedPayload {
  userId: string;
  orderId: string;
  paymentRecordId: string;
  refundId: string;
  amount: number;
  reason?: string;
  metadata?: import('./commerce').PaymentOrderMetadata;
}

export interface SubscriptionActivationPayload {
  userId: string;
  orderId: string;
  planId: string;
  paymentRecordId: string;
  metadata?: import('./commerce').PaymentOrderMetadata;
}

export type PaymentEventPayload =
  | PaymentSucceededPayload
  | PaymentFailedPayload
  | PaymentRefundedPayload
  | SubscriptionActivationPayload;

// ==================== Order Events ====================

export const ORDER_EVENTS = {
  ORDER_PAYMENT_SUCCESS: 'order.payment.success',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUND_APPROVED: 'order.refund.approved',
  ORDER_REFUND_REJECTED: 'order.refund.rejected',
} as const;

export type OrderEventType = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];

export interface OrderPaymentEvent {
  userId: string;
  orderId: string;
  orderNo: string;
  amount: string;
}

export interface OrderShippedEvent {
  userId: string;
  orderId: string;
  orderNo: string;
  trackingNo: string;
}

export interface OrderDeliveredEvent {
  userId: string;
  orderId: string;
  orderNo: string;
}

export interface OrderCancelledEvent {
  userId: string;
  orderId: string;
  orderNo: string;
  reason?: string;
}

export interface OrderRefundEvent {
  userId: string;
  orderId: string;
  orderNo: string;
  amount: string;
  reason?: string;
}

// ==================== Profile Events ====================

export const PROFILE_EVENTS = {
  PROFILE_UPDATED: 'profile:updated',
  QUIZ_COMPLETED: 'quiz:completed',
} as const;

export type ProfileEventType = (typeof PROFILE_EVENTS)[keyof typeof PROFILE_EVENTS];

export interface ProfileUpdatedPayload {
  userId: string;
  changedFields: string[];
  timestamp: number;
}

export interface QuizCompletedPayload {
  userId: string;
  quizId: string;
  timestamp: number;
}

// ==================== Stock Events ====================

export const STOCK_EVENTS = {
  STOCK_RESTOCKED: 'STOCK_RESTOCKED',
  LOW_STOCK: 'LOW_STOCK',
} as const;

export type StockEventType = (typeof STOCK_EVENTS)[keyof typeof STOCK_EVENTS];

export interface StockRestockedPayload {
  clothingItemId: string;
  size: string;
  quantity: number;
}

export interface LowStockPayload {
  clothingItemId: string;
  size: string;
  remainingQuantity: number;
}

// ==================== Subscription Events ====================

export const SUBSCRIPTION_EVENTS = {
  RENEWAL_REQUIRED: 'subscription.renewal.required',
} as const;

export type SubscriptionEventType = (typeof SUBSCRIPTION_EVENTS)[keyof typeof SUBSCRIPTION_EVENTS];

export interface SubscriptionRenewalPayload {
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  subscriptionId: string;
  expiresAt: Date;
}
