/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";

import { NotificationService as WebSocketNotificationService } from "../../../../../../../common/gateway/notification.service";
import { PrismaService } from "../../../../../../../common/prisma/prisma.service";

import { NotificationTemplateService } from "./notification-template.service";
import type { PushPayload } from "./push-notification.service";
import { PushNotificationService } from "./push-notification.service";

export interface CreateNotificationDto {
  type: NotificationType;
  title: string;
  content: string;
  targetType?: string;
  targetId?: string;
  /** Optional template key and variables for push notification rendering */
  templateKey?: string;
  templateVariables?: Record<string, string>;
}

/**
 * Email notification settings
 */
interface EmailNotificationSettings {
  marketing: boolean;
  transactional: boolean;
}

/**
 * Push notification settings - per-category toggles with quiet hours
 */
export interface PushNotificationSettings {
  order: boolean;
  recommendation: boolean;
  community: boolean;
  system: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
}

/**
 * Application内 notification settings
 */
interface InAppNotificationSettings {
  all: boolean;
}

/**
 * User notification settings
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
 * Parameters for updating notification settings
 */
export interface UpdateNotificationSettingsDto {
  email?: EmailNotificationSettings;
  push?: PushNotificationSettings;
  inApp?: InAppNotificationSettings;
}

/** Default push settings */
const DEFAULT_PUSH_SETTINGS: PushNotificationSettings = {
  order: true,
  recommendation: true,
  community: true,
  system: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WebSocketNotificationService))
    private readonly wsNotificationService: WebSocketNotificationService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly templateService: NotificationTemplateService,
  ) {}

  /**
   * Send notification to a user: DB + WebSocket + Push (if enabled)
   */
  async send(userId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: dto.type as unknown as NotificationType,
        title: dto.title,
        content: dto.content,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });

    this.logger.debug(`Created notification for user ${userId}: ${dto.title}`);

    // Push via WebSocket (real-time in-app)
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
    }

    // Push via FCM/APNs (if enabled for this category)
    try {
      await this.sendPushIfEnabled(userId, dto, notification.id);
    } catch (error) {
      this.logger.warn(
        `Failed to send push notification: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    return notification;
  }

  /**
   * Send push notification if user has the category enabled and not in quiet hours.
   */
  private async sendPushIfEnabled(userId: string, dto: CreateNotificationDto, notificationId: string) {
    const settings = await this.getUserSettings(userId);
    const category = this.mapNotificationTypeToCategory(dto.type);

    if (!category) {
      return; // Unknown category, skip push
    }

    // Check if push is enabled for this category
    const pushSettings = settings.push;
    if (!(category in pushSettings) || !pushSettings[category as keyof PushNotificationSettings]) {
      this.logger.debug(`Push disabled for category ${category}, user ${userId}`);
      return;
    }

    // Check quiet hours
    if (pushSettings.quietHoursEnabled && this.isInQuietHours(pushSettings)) {
      this.logger.debug(`User ${userId} in quiet hours, skipping push`);
      return;
    }

    // Build push payload
    let pushPayload: PushPayload;

    if (dto.templateKey) {
      // Use template for richer push content
      const rendered = this.templateService.render(
        dto.templateKey,
        dto.templateVariables || {},
      );
      if (rendered) {
        pushPayload = {
          title: rendered.title,
          body: rendered.body,
          data: {
            notificationId,
            category,
            actionUrl: rendered.actionUrl,
          },
          category,
        };
      } else {
        pushPayload = this.buildDefaultPushPayload(dto, notificationId, category);
      }
    } else {
      pushPayload = this.buildDefaultPushPayload(dto, notificationId, category);
    }

    await this.pushNotificationService.sendToUser(userId, pushPayload);

    // Mark as pushed
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isPushed: true, pushedAt: new Date() },
    });
  }

  private buildDefaultPushPayload(
    dto: CreateNotificationDto,
    notificationId: string,
    category: string,
  ): PushPayload {
    return {
      title: dto.title,
      body: dto.content,
      data: {
        notificationId,
        category,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
      category,
    };
  }

  /**
   * Check if current time is within quiet hours.
   */
  private isInQuietHours(settings: PushNotificationSettings): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const startParts = settings.quietHoursStart.split(":").map(Number);
    const endParts = settings.quietHoursEnd.split(":").map(Number);
    const startH = startParts[0] ?? 0;
    const startM = startParts[1] ?? 0;
    const endH = endParts[0] ?? 0;
    const endM = endParts[1] ?? 0;

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Map NotificationType to category for push preference checking.
   */
  private mapNotificationTypeToCategory(
    type: string,
  ): keyof Pick<PushNotificationSettings, "order" | "recommendation" | "community" | "system"> | null {
    const categoryMap: Record<string, "order" | "recommendation" | "community" | "system"> = {
      // Order
      system_update: "order",
      // Recommendation
      daily_recommendation: "recommendation",
      price_drop: "recommendation",
      // Community / Social
      new_follower: "community",
      comment: "community",
      like: "community",
      bookmark: "community",
      reply_mention: "community",
      blogger_product_sold: "community",
      content_approved: "community",
      content_rejected: "community",
      report_resolved: "community",
      // System
      subscription_activated: "system",
      subscription_expiring: "system",
      renewal_failed: "system",
      try_on_completed: "system",
      try_on_failed: "system",
      privacy_reminder: "system",
    };
    return categoryMap[type] || null;
  }

  /**
   * Map database notification type to WebSocket notification type
   */
  private mapNotificationType(
    type: string,
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
      string,
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
      bookmark: "social",
      reply_mention: "social",
      blogger_product_sold: "social",
      content_approved: "social",
      content_rejected: "social",
      report_resolved: "social",
      system_update: "system",
      privacy_reminder: "system",
    };
    return typeMap[type] || "system";
  }

  /**
   * Send notification to user (alias for compatibility)
   */
  async sendToUser(userId: string, dto: CreateNotificationDto) {
    return this.send(userId, dto);
  }

  /**
   * Batch send notifications
   */
  async sendBatch(userIds: string[], dto: CreateNotificationDto) {
    const notifications = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: dto.type as unknown as NotificationType,
        title: dto.title,
        content: dto.content,
        targetType: dto.targetType,
        targetId: dto.targetId,
      })),
    });

    this.logger.log(`Sent notification to ${userIds.length} users`);

    return notifications;
  }

  /**
   * Get user notification list
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
   * Mark as read
   */
  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Delete notification
   */
  async delete(userId: string, notificationId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Get user notification settings
   */
  async getUserSettings(userId: string): Promise<UserNotificationSettings> {
    const settings = await this.prisma.userNotificationSetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      return {
        id: "",
        userId,
        email: { marketing: true, transactional: true },
        push: { ...DEFAULT_PUSH_SETTINGS },
        inApp: { all: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Merge stored push settings with defaults (handles migration from old format)
    const storedPush = (settings.push as Record<string, unknown>) || {};
    const push: PushNotificationSettings = {
      order: typeof storedPush.order === "boolean" ? storedPush.order : true,
      recommendation: typeof storedPush.recommendation === "boolean" ? storedPush.recommendation : true,
      community: typeof storedPush.community === "boolean" ? storedPush.community : true,
      system: typeof storedPush.system === "boolean" ? storedPush.system : true,
      quietHoursEnabled: typeof storedPush.quietHoursEnabled === "boolean" ? storedPush.quietHoursEnabled : false,
      quietHoursStart: typeof storedPush.quietHoursStart === "string" ? storedPush.quietHoursStart : "22:00",
      quietHoursEnd: typeof storedPush.quietHoursEnd === "string" ? storedPush.quietHoursEnd : "08:00",
    };

    return {
      id: settings.id,
      userId: settings.userId,
      email: (settings.email as unknown as EmailNotificationSettings) || { marketing: true, transactional: true },
      push,
      inApp: (settings.inApp as unknown as InAppNotificationSettings) || { all: true },
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Update user notification settings
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
        push: (settings.push || { ...DEFAULT_PUSH_SETTINGS }) as unknown as Prisma.InputJsonValue,
        inApp: (settings.inApp || { all: true }) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Clean up old notifications (scheduled task)
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
