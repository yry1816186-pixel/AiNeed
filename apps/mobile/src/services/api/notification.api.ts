import { unifiedApiClient } from "../apiClient";

/**
 * Push notification settings - per-category toggles with quiet hours
 */
export interface PushNotificationSettings {
  order: boolean;
  recommendation: boolean;
  community: boolean;
  system: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

/**
 * Notification item from backend
 */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  targetType?: string;
  targetId?: string;
  isRead: boolean;
  readAt?: string;
  isPushed: boolean;
  pushedAt?: string;
  createdAt: string;
}

/**
 * Notification list response
 */
export interface NotificationListResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
}

/**
 * Device token info
 */
export interface DeviceTokenInfo {
  id: string;
  userId: string;
  token: string;
  platform: string;
  appId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification settings response
 */
export interface NotificationSettingsResponse {
  id: string;
  userId: string;
  email: { marketing: boolean; transactional: boolean };
  push: PushNotificationSettings;
  inApp: { all: boolean };
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification API service
 */
export const notificationApi = {
  /**
   * Get notifications with pagination
   */
  async getNotifications(params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationListResponse> {
    const response = await unifiedApiClient.get<NotificationListResponse>(
      "/notifications",
      params as Record<string, unknown>,
    );
    if (response.success && response.data) {
      return response.data as unknown as NotificationListResponse;
    }
    return { notifications: [], unreadCount: 0, hasMore: false };
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await unifiedApiClient.post(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await unifiedApiClient.post("/notifications/read-all");
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await unifiedApiClient.delete(`/notifications/${notificationId}`);
  },

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<NotificationSettingsResponse | null> {
    const response = await unifiedApiClient.get<NotificationSettingsResponse>(
      "/notifications/settings",
    );
    if (response.success && response.data) {
      return response.data as unknown as NotificationSettingsResponse;
    }
    return null;
  },

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    settings: Partial<PushNotificationSettings>,
  ): Promise<void> {
    await unifiedApiClient.post("/notifications/settings", { push: settings });
  },

  /**
   * Register device push token
   */
  async registerDeviceToken(
    token: string,
    platform: "ios" | "android",
    appId?: string,
  ): Promise<void> {
    await unifiedApiClient.post("/notifications/device-token", {
      token,
      platform,
      appId,
    });
  },

  /**
   * Deregister device push token
   */
  async deregisterDeviceToken(token: string): Promise<void> {
    await unifiedApiClient.delete(`/notifications/device-token/${encodeURIComponent(token)}`);
  },
};
