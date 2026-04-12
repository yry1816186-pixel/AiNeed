import { api } from './api';
import type { ApiResponse, NotificationItem } from '../types';

export interface NotificationListResult {
  items: NotificationItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const notificationService = {
  async getNotifications(page = 1, limit = 20): Promise<NotificationListResult> {
    const { data } = await api.get<ApiResponse<NotificationItem[]>>('/notifications', {
      params: { page, limit },
    });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取通知失败');
    }
    return {
      items: data.data,
      meta: {
        total: data.meta?.total ?? 0,
        page: data.meta?.page ?? page,
        limit: data.meta?.limit ?? limit,
        totalPages: Math.ceil((data.meta?.total ?? 0) / (data.meta?.limit ?? limit)),
      },
    };
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取未读数失败');
    }
    return data.data.count;
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { data } = await api.patch<ApiResponse<{ success: boolean }>>(
      `/notifications/${notificationId}/read`,
    );
    if (!data.success) {
      throw new Error(data.error?.message ?? '标记已读失败');
    }
  },

  async markAllAsRead(): Promise<void> {
    const { data } = await api.patch<ApiResponse<{ success: boolean }>>(
      '/notifications/read-all',
    );
    if (!data.success) {
      throw new Error(data.error?.message ?? '全部已读失败');
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    const { data } = await api.delete<ApiResponse<{ success: boolean }>>(
      `/notifications/${notificationId}`,
    );
    if (!data.success) {
      throw new Error(data.error?.message ?? '删除通知失败');
    }
  },
};
