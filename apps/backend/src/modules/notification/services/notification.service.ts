import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";

import { NotificationService as WebSocketNotificationService } from "../../../common/gateway/notification.service";
import { PrismaService } from "../../../common/prisma/prisma.service";

export interface CreateNotificationDto {
  type: NotificationType;
  title: string;
  content: string;
  targetType?: string;
  targetId?: string;
}

/**
 * 邮件通知设置
 */
interface EmailNotificationSettings {
  marketing: boolean;
  transactional: boolean;
}

/**
 * 推送通知设置
 */
interface PushNotificationSettings {
  recommendation: boolean;
  social: boolean;
}

/**
 * 应用内通知设置
 */
interface InAppNotificationSettings {
  all: boolean;
}

/**
 * 用户通知设置
 */
export interface UserNotificationSettings {
  id: string;
  userId: string;
  email: EmailNotificationSettings;
  push: PushNotificationSettings;
  inApp: InAppNotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 更新通知设置的参数
 */
export interface UpdateNotificationSettingsDto {
  email?: EmailNotificationSettings;
  push?: PushNotificationSettings;
  inApp?: InAppNotificationSettings;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WebSocketNotificationService))
    private readonly wsNotificationService: WebSocketNotificationService,
  ) {}

  /**
   * 发送通知给用户
   */
  async send(userId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        ...dto,
      },
    });

    this.logger.debug(`Created notification for user ${userId}: ${dto.title}`);

    // 通过 WebSocket 实时推送
    try {
      const wsNotificationType = this.mapNotificationType(dto.type);
      await this.wsNotificationService.sendCustomNotification(userId, {
        type: wsNotificationType,
        title: dto.title,
        message: dto.content,
        data: {
          notificationId: notification.id,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      });
      this.logger.debug(`WebSocket notification sent to user ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to send WebSocket notification: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      // 不影响主流程，仅记录警告
    }

    return notification;
  }

  /**
   * 映射数据库通知类型到 WebSocket 通知类型
   */
  private mapNotificationType(
    type: NotificationType,
  ):
    | "try_on_complete"
    | "recommendation"
    | "price_drop"
    | "customization_update"
    | "system"
    | "subscription"
    | "social"
    | "order" {
    const typeMap: Record<
      NotificationType,
      | "try_on_complete"
      | "recommendation"
      | "price_drop"
      | "customization_update"
      | "system"
      | "subscription"
      | "social"
      | "order"
    > = {
      subscription_activated: "subscription",
      subscription_expiring: "subscription",
      renewal_failed: "subscription",
      try_on_completed: "try_on_complete",
      try_on_failed: "try_on_complete",
      daily_recommendation: "recommendation",
      price_drop: "price_drop",
      new_follower: "social",
      comment: "social",
      like: "social",
      system_update: "system",
      privacy_reminder: "system",
    };
    return typeMap[type] || "system";
  }

  /**
   * 发送通知给用户的别名方法（兼容性）
   */
  async sendToUser(userId: string, dto: CreateNotificationDto) {
    return this.send(userId, dto);
  }

  /**
   * 批量发送通知
   */
  async sendBatch(userIds: string[], dto: CreateNotificationDto) {
    const notifications = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        ...dto,
      })),
    });

    this.logger.log(`Sent notification to ${userIds.length} users`);

    return notifications;
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(
    userId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
  ) {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    const where: Prisma.NotificationWhereInput = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      hasMore: notifications.length === limit,
    };
  }

  /**
   * 标记为已读
   */
  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * 标记全部已读
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * 删除通知
   */
  async delete(userId: string, notificationId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  /**
   * 获取用户通知设置
   */
  async getUserSettings(userId: string): Promise<UserNotificationSettings> {
    let settings = await this.prisma.userNotificationSetting.findUnique({
      where: { userId },
    });

    // 默认设置
    if (!settings) {
      const defaultSettings: UserNotificationSettings = {
        id: "",
        userId,
        email: { marketing: true, transactional: true },
        push: { recommendation: true, social: true },
        inApp: { all: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return defaultSettings;
    }

    return settings as unknown as UserNotificationSettings;
  }

  /**
   * 更新用户通知设置
   */
  async updateUserSettings(
    userId: string,
    settings: UpdateNotificationSettingsDto,
  ) {
    return this.prisma.userNotificationSetting.upsert({
      where: { userId },
      update: {
        email: settings.email as unknown as Prisma.InputJsonValue,
        push: settings.push as unknown as Prisma.InputJsonValue,
        inApp: settings.inApp as unknown as Prisma.InputJsonValue,
      },
      create: {
        userId,
        email: (settings.email || { marketing: true, transactional: true }) as unknown as Prisma.InputJsonValue,
        push: (settings.push || { recommendation: true, social: true }) as unknown as Prisma.InputJsonValue,
        inApp: (settings.inApp || { all: true }) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * 清理过期通知（定时任务）
   */
  async cleanupOldNotifications(daysToKeep: number = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        isRead: true,
      },
    });

    this.logger.log(`Cleaned up ${result.count} old notifications`);

    return result;
  }
}
