/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import {
  PAYMENT_EVENTS,
  SubscriptionActivationPayload,
  PaymentSucceededPayload,
  PaymentRefundedPayload,
} from '@xuno/types';
import { SubscriptionService } from "../subscription.service";

/**
 * Payment Event Listener for Subscription Module
 * Listens to payment events and triggers subscription-related actions
 * This decouples Subscription from Payment module using event-driven architecture
 */
@Injectable()
export class PaymentEventListener {
  private readonly logger = new Logger(PaymentEventListener.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Handle subscription activation when payment succeeds
   */
  @OnEvent(PAYMENT_EVENTS.SUBSCRIPTION_ACTIVATION_REQUIRED)
  async handleSubscriptionActivation(
    payload: SubscriptionActivationPayload,
  ): Promise<void> {
    this.logger.log(
      `Processing subscription activation for user ${payload.userId}, order ${payload.orderId}`,
    );

    try {
      await this.subscriptionService.activateSubscription(
        payload.userId,
        payload.planId,
        payload.orderId,
      );

      this.logger.log(
        `Subscription activated successfully for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to activate subscription for user ${payload.userId}: ${this.getErrorMessage(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Consider emitting a failure event for retry logic or alerting
    }
  }

  /**
   * Handle payment succeeded event for logging/auditing
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_SUCCEEDED)
  async handlePaymentSucceeded(payload: PaymentSucceededPayload): Promise<void> {
    this.logger.log(
      `Payment succeeded for user ${payload.userId}, order ${payload.orderId}, amount ${payload.amount} ${payload.currency}`,
    );
    // Additional logic can be added here (e.g., analytics, notifications)
  }

  /**
   * Handle payment refunded event - potentially downgrade subscription
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_REFUNDED)
  async handlePaymentRefunded(payload: PaymentRefundedPayload): Promise<void> {
    this.logger.log(
      `Payment refunded for user ${payload.userId}, order ${payload.orderId}, amount ${payload.amount}`,
    );

    // If full refund, we might need to cancel/downgrade the subscription
    // This can be implemented based on business requirements
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
