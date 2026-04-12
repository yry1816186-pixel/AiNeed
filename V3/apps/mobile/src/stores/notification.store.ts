import { create } from 'zustand';
import { notificationService } from '../services/notification.service';
import type { NotificationItem } from '../types';
import { useAuthStore } from './auth.store';

const POLL_INTERVAL = 10_000;

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isPanelOpen: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;

  openPanel: () => void;
  closePanel: () => void;
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: (page?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useNotificationStore = create<NotificationState>()(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isPanelOpen: false,
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,

    openPanel: () => {
      set({ isPanelOpen: true });
      get().fetchNotifications(1);
    },

    closePanel: () => {
      set({ isPanelOpen: false });
    },

    fetchUnreadCount: async () => {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      if (!isAuthenticated) return;

      try {
        const count = await notificationService.getUnreadCount();
        set({ unreadCount: count });
      } catch {
        // silent fail for polling
      }
    },

    fetchNotifications: async (page = 1) => {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      if (!isAuthenticated) return;

      set({ isLoading: true });
      try {
        const result = await notificationService.getNotifications(page, 20);
        set({
          notifications: page === 1 ? result.items : [...get().notifications, ...result.items],
          currentPage: result.meta.page,
          totalPages: result.meta.totalPages,
          totalCount: result.meta.total,
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
      }
    },

    markAsRead: async (notificationId: string) => {
      try {
        await notificationService.markAsRead(notificationId);
        const notifications = get().notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n,
        );
        const unreadCount = Math.max(0, get().unreadCount - 1);
        set({ notifications, unreadCount });
      } catch {
        // silent fail
      }
    },

    markAllAsRead: async () => {
      try {
        await notificationService.markAllAsRead();
        const notifications = get().notifications.map((n) => ({
          ...n,
          isRead: true,
        }));
        set({ notifications, unreadCount: 0 });
      } catch {
        // silent fail
      }
    },

    deleteNotification: async (notificationId: string) => {
      try {
        await notificationService.deleteNotification(notificationId);
        const notifications = get().notifications.filter(
          (n) => n.id !== notificationId,
        );
        const wasUnread = get().notifications.find(
          (n) => n.id === notificationId && !n.isRead,
        );
        const unreadCount = wasUnread
          ? Math.max(0, get().unreadCount - 1)
          : get().unreadCount;
        set({ notifications, unreadCount, totalCount: get().totalCount - 1 });
      } catch {
        // silent fail
      }
    },

    startPolling: () => {
      if (pollTimer) return;

      get().fetchUnreadCount();

      pollTimer = setInterval(() => {
        get().fetchUnreadCount();
      }, POLL_INTERVAL);
    },

    stopPolling: () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    },
  }),
);
