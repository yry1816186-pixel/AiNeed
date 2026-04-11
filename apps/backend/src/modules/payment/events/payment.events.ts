/**
 * Payment Events - Event-driven architecture for payment module
 * These events decouple Payment from Subscription and Notification modules
 */

import { PaymentOrderMetadata } from "../types/common.types";

// Event constants for type safety
export const PAYMENT_EVENTS = {
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_CLOSED: 'payment.closed',
  SUBSCRIPTION_ACTIVATION_REQUIRED: 'payment.subscription.activation',
} as const;

export type PaymentEventType = typeof PAYMENT_EVENTS[keyof typeof PAYMENT_EVENTS];

// Event payloads
export interface PaymentSucceededPayload {
  userId: string;
  orderId: string;
  paymentRecordId: string;
  amount: number;
  currency: string;
  provider: string;
  tradeNo?: string;
  paidAt?: Date;
  metadata?: PaymentOrderMetadata;
}

export interface PaymentFailedPayload {
  userId: string;
  orderId: string;
  paymentRecordId: string;
  reason?: string;
  metadata?: PaymentOrderMetadata;
}

export interface PaymentRefundedPayload {
  userId: string;
  orderId: string;
  paymentRecordId: string;
  refundId: string;
  amount: number;
  reason?: string;
  metadata?: PaymentOrderMetadata;
}

export interface SubscriptionActivationPayload {
  userId: string;
  orderId: string;
  planId: string;
  paymentRecordId: string;
  metadata?: PaymentOrderMetadata;
}

// Union type for all payment event payloads
export type PaymentEventPayload =
  | PaymentSucceededPayload
  | PaymentFailedPayload
  | PaymentRefundedPayload
  | SubscriptionActivationPayload;
