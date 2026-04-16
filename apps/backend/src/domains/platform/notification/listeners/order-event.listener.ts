/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationType } from "@prisma/client";

import { NotificationTemplateService } from "../services/notification-template.service";
import { NotificationService } from "../services/notification.service";
import { PushNotificationService } from "../services/push-notification.service";

import {
  ORDER_EVENTS,
  OrderPaymentEvent,
  OrderShippedEvent,
  OrderDeliveredEvent,
  OrderCancelledEvent,
  OrderRefundEvent,
} from '@xuno/types';

/**
 * Listener for order-related events.
 * Sends templated notifications when order status changes.
 */
@Injectable()
export class OrderEventNotificationListener {
  private readonly logger = new Logger(OrderEventNotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly templateService: NotificationTemplateService,
    private readonly pushService: PushNotificationService,
  ) {}

  @OnEvent(ORDER_EVENTS.ORDER_PAYMENT_SUCCESS)
  async handlePaymentSuccess(event: OrderPaymentEvent) {
    this.logger.log(`Order payment success: ${event.orderNo}`);
    await this.sendTemplatedNotification(event.userId, "order_payment_success", {
      orderId: event.orderId,
      orderNo: event.orderNo,
      amount: event.amount,
    });
  }

  @OnEvent(ORDER_EVENTS.ORDER_SHIPPED)
  async handleShipped(event: OrderShippedEvent) {
    this.logger.log(`Order shipped: ${event.orderNo}`);
    await this.sendTemplatedNotification(event.userId, "order_shipped", {
      orderId: event.orderId,
      orderNo: event.orderNo,
      trackingNo: event.trackingNo,
    });
  }

  @OnEvent(ORDER_EVENTS.ORDER_DELIVERED)
  async handleDelivered(event: OrderDeliveredEvent) {
    this.logger.log(`Order delivered: ${event.orderNo}`);
    await this.sendTemplatedNotification(event.userId, "order_delivered", {
      orderId: event.orderId,
      orderNo: event.orderNo,
    });
  }

  @OnEvent(ORDER_EVENTS.ORDER_CANCELLED)
  async handleCancelled(event: OrderCancelledEvent) {
    this.logger.log(`Order cancelled: ${event.orderNo}`);
    await this.sendTemplatedNotification(event.userId, "order_cancelled", {
      orderId: event.orderId,
      orderNo: event.orderNo,
    });
  }

  @OnEvent(ORDER_EVENTS.ORDER_REFUND_APPROVED)
  async handleRefundApproved(event: OrderRefundEvent) {
    this.logger.log(`Order refund approved: ${event.orderNo}`);
    await this.sendTemplatedNotification(event.userId, "order_refund_approved", {
      orderId: event.orderId,
      orderNo: event.orderNo,
      amount: event.amount,
    });
  }

  @OnEvent(ORDER_EVENTS.ORDER_REFUND_REJECTED)
  async handleRefundRejected(event: OrderRefundEvent) {
    this.logger.log(`Order refund rejected: ${event.orderNo}`);
    await this.sendTemplatedNotification(event.userId, "order_refund_rejected", {
      orderId: event.orderId,
      orderNo: event.orderNo,
      reason: event.reason || "商家审核未通过",
    });
  }

  /**
   * Send a notification using a template: in-app (DB + WebSocket) + push.
   */
  private async sendTemplatedNotification(
    userId: string,
    templateKey: string,
    variables: Record<string, string>,
  ) {
    const rendered = this.templateService.render(templateKey, variables);

    if (!rendered) {
      this.logger.warn(`Template ${templateKey} not found, skipping notification`);
      return;
    }

    // 1. Create in-app notification (DB + WebSocket)
    try {
      await this.notificationService.send(userId, {
        type: this.mapTemplateKeyToNotificationType(templateKey),
        title: rendered.title,
        content: rendered.body,
        targetType: rendered.actionUrl ? "deeplink" : undefined,
        targetId: rendered.actionUrl || undefined,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send in-app notification: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }

    // 2. Send push notification
    try {
      await this.pushService.sendToUser(userId, {
        title: rendered.title,
        body: rendered.body,
        data: {
          actionUrl: rendered.actionUrl,
          category: rendered.category,
          templateKey,
        },
        category: rendered.category,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send push notification: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }
  }

  /**
   * Map template key to NotificationType enum value.
   */
  private mapTemplateKeyToNotificationType(
    templateKey: string,
  ): NotificationType {
    const mapping: Record<string, NotificationType> = {
      order_payment_success: "system_update" as NotificationType,
      order_shipped: "system_update" as NotificationType,
      order_delivered: "system_update" as NotificationType,
      order_cancelled: "system_update" as NotificationType,
      order_refund_approved: "system_update" as NotificationType,
      order_refund_rejected: "system_update" as NotificationType,
      daily_recommendation: "daily_recommendation" as NotificationType,
      new_style_discovery: "daily_recommendation" as NotificationType,
      price_drop: "price_drop" as NotificationType,
      stock_back_in: "price_drop" as NotificationType,
      new_follower: "new_follower" as NotificationType,
      post_liked: "like" as NotificationType,
      post_commented: "comment" as NotificationType,
      blogger_new_post: "system_update" as NotificationType,
      reply_mention: "reply_mention" as NotificationType,
      app_update: "system_update" as NotificationType,
      activity_promo: "system_update" as NotificationType,
      privacy_policy_update: "privacy_reminder" as NotificationType,
      account_security: "system_update" as NotificationType,
      try_on_completed: "try_on_completed" as NotificationType,
      try_on_failed: "try_on_failed" as NotificationType,
    };
    return mapping[templateKey] || ("system_update" as NotificationType);
  }
}
