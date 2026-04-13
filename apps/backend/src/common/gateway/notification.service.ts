import { Injectable } from "@nestjs/common";

import { NotificationGateway } from "./notification.gateway";
import type { NotificationPayload } from "./notification.gateway";

@Injectable()
export class NotificationService {
  constructor(private notificationGateway: NotificationGateway) {}

  async notifyTryOnComplete(
    userId: string,
    tryOnId: string,
    resultImageUrl: string,
  ) {
    return this.notificationGateway.sendNotification(userId, {
      type: "try_on_complete",
      title: "试穿完成",
      message: "您的虚拟试穿已完成，点击查看效果",
      data: { tryOnId, resultImageUrl },
    });
  }

  async notifyTryOnProgress(
    userId: string,
    tryOnId: string,
    progress: number,
    stage: string,
  ) {
    return this.notificationGateway.sendNotification(userId, {
      type: "try_on_progress",
      title: "试衣进度更新",
      message: `试衣进度: ${progress}%`,
      data: { tryOnId, progress, stage, timestamp: new Date().toISOString() },
    });
  }

  async notifyNewRecommendation(userId: string, count: number) {
    return this.notificationGateway.sendNotification(userId, {
      type: "recommendation",
      title: "新品推荐",
      message: `为您找到了 ${count} 件适合的新品`,
      data: { count },
    });
  }

  async notifyPriceDrop(
    userId: string,
    itemName: string,
    originalPrice: number,
    newPrice: number,
  ) {
    const discount = Math.round((1 - newPrice / originalPrice) * 100);
    return this.notificationGateway.sendNotification(userId, {
      type: "price_drop",
      title: "降价提醒",
      message: `${itemName} 降价了 ${discount}%！`,
      data: { itemName, originalPrice, newPrice, discount },
    });
  }

  async notifyCustomizationUpdate(
    userId: string,
    requestId: string,
    status: string,
    message: string,
  ) {
    return this.notificationGateway.sendNotification(userId, {
      type: "customization_update",
      title: "定制服务更新",
      message,
      data: { requestId, status },
    });
  }

  async notifySubscriptionUpdate(
    userId: string,
    type: "expired" | "renewed" | "upgraded" | "downgraded",
    planName: string,
  ) {
    const messages = {
      expired: `您的 ${planName} 会员已到期`,
      renewed: `您的 ${planName} 会员已续费成功`,
      upgraded: `您已升级到 ${planName}`,
      downgraded: `您的会员已变更为 ${planName}`,
    };
    return this.notificationGateway.sendNotification(userId, {
      type: "subscription",
      title: "会员状态更新",
      message: messages[type],
      data: { type, planName },
    });
  }

  async notifyOrderUpdate(
    userId: string,
    orderNo: string,
    status: string,
    message: string,
  ) {
    return this.notificationGateway.sendNotification(userId, {
      type: "order",
      title: "订单状态更新",
      message,
      data: { orderNo, status },
    });
  }

  async notifySocialActivity(
    userId: string,
    type: "follow" | "like" | "comment",
    fromUserName: string,
    content?: string,
  ) {
    const messages = {
      follow: `${fromUserName} 关注了你`,
      like: `${fromUserName} 赞了你的搭配`,
      comment: `${fromUserName} 评论了你的搭配`,
    };
    return this.notificationGateway.sendNotification(userId, {
      type: "social",
      title: "社交动态",
      message: messages[type],
      data: { type, fromUserName, content },
    });
  }

  async sendSystemNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    return this.notificationGateway.sendNotification(userId, {
      type: "system",
      title,
      message,
      data,
    });
  }

  async sendCustomNotification(
    userId: string,
    notification: NotificationPayload,
  ) {
    return this.notificationGateway.sendNotification(userId, notification);
  }

  isUserOnline(userId: string): boolean {
    return this.notificationGateway.isUserOnline(userId);
  }

  getOnlineUserCount(): number {
    return this.notificationGateway.getOnlineUserCount();
  }
}
