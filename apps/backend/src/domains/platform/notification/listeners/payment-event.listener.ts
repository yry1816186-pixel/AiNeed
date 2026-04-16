import { NotificationType } from "@prisma/client";

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import {
  PAYMENT_EVENTS,
  PaymentSucceededPayload,
  PaymentFailedPayload,
  PaymentRefundedPayload,
} from "../../../../commerce/payment/events";
import { NotificationService } from "../services/notification.service";

/**
 * Payment Event Listener for Notification Module
 * Listens to payment events and sends appropriate notifications
 * This decouples Notification from Payment module using event-driven architecture
 */
@Injectable()
export class PaymentNotificationListener {
  private readonly logger = new Logger(PaymentNotificationListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Send notification when payment succeeds
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_SUCCEEDED)
  async handlePaymentSucceeded(payload: PaymentSucceededPayload): Promise<void> {
    this.logger.log(
      `Sending payment success notification to user ${payload.userId}`,
    );

    try {
      await this.notificationService.sendToUser(payload.userId, {
        type: "subscription_activated" as NotificationType,
        title: "支付成功",
        content: `您的订单 ${payload.orderId} 已支付成功，金额 ¥${payload.amount.toFixed(2)}。`,
        targetType: "payment",
        targetId: payload.paymentRecordId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send payment success notification: ${this.getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Send notification when payment fails
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_FAILED)
  async handlePaymentFailed(payload: PaymentFailedPayload): Promise<void> {
    this.logger.log(
      `Sending payment failure notification to user ${payload.userId}`,
    );

    try {
      await this.notificationService.sendToUser(payload.userId, {
        type: "system_update" as NotificationType,
        title: "支付失败",
        content: `您的订单 ${payload.orderId} 支付失败${payload.reason ? `: ${payload.reason}` : ""}，请重试或联系客服。`,
        targetType: "payment",
        targetId: payload.paymentRecordId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send payment failure notification: ${this.getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Send notification when payment is refunded
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_REFUNDED)
  async handlePaymentRefunded(payload: PaymentRefundedPayload): Promise<void> {
    this.logger.log(
      `Sending refund notification to user ${payload.userId}`,
    );

    try {
      await this.notificationService.sendToUser(payload.userId, {
        type: "system_update" as NotificationType,
        title: "退款通知",
        content: `您的订单 ${payload.orderId} 已退款 ¥${payload.amount.toFixed(2)}${payload.reason ? `，原因: ${payload.reason}` : ""}。`,
        targetType: "payment",
        targetId: payload.paymentRecordId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send refund notification: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
