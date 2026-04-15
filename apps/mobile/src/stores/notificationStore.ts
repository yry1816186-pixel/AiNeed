import { create } from "zustand";

import {
  notificationApi,
  type NotificationItem,
  type PushNotificationSettings,
} from "../services/api/notification.api";

type NotificationCategory = "all" | "order" | "recommendation" | "community" | "system";

/**
 * Category mapping from notification type to category
 */
const TYPE_CATEGORY_MAP: Record<string, NotificationCategory> = {
  subscription_activated: "system",
  subscription_expiring: "system",
  renewal_failed: "system",
  try_on_completed: "system",
  try_on_failed: "system",
  daily_recommendation: "recommendation",
  price_drop: "recommendation",
  new_follower: "community",
  comment: "community",
  like: "community",
  bookmark: "community",
  reply_mention: "community",
  blogger_product_sold: "community",
  content_approved: "community",
  content_rejected: "community",
  report_resolved: "community",
  system_update: "order",
  privacy_reminder: "system",
};

function getNotificationCategory(type: string): NotificationCategory {
  return TYPE_CATEGORY_MAP[type] || "system";
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  currentCategory: NotificationCategory;
  settings: PushNotificationSettings | null;
  settingsLoading: boolean;

  // Actions
  fetchNotifications: (reset?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<PushNotificationSettings>) => Promise<void>;
  setCurrentCategory: (category: NotificationCategory) => void;
  decrementUnread: () => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: PushNotificationSettings = {
  order: true,
  recommendation: true,
  community: true,
  system: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

const PAGE_SIZE = 20;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  hasMore: true,
  currentCategory: "all",
  settings: null,
  settingsLoading: false,

  fetchNotifications: async (reset = false) => {
    const state = get();
    if (state.loading) {
      return;
    }

    set({ loading: true });
    try {
      const offset = reset ? 0 : state.notifications.length;
      const response = await notificationApi.getNotifications({
        limit: PAGE_SIZE,
        offset,
      });

      const filtered =
        state.currentCategory === "all"
          ? response.notifications
          : response.notifications.filter(
              (n) => getNotificationCategory(n.type) === state.currentCategory
            );

      set({
        notifications: reset ? filtered : [...state.notifications, ...filtered],
        unreadCount: response.unreadCount,
        hasMore: response.hasMore,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await notificationApi.markAsRead(id);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: new Date().toISOString(),
      })),
      unreadCount: 0,
    }));

    try {
      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  },

  deleteNotification: async (id: string) => {
    // Optimistic update
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount:
          notification && !notification.isRead
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
      };
    });

    try {
      await notificationApi.deleteNotification(id);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },

  fetchSettings: async () => {
    set({ settingsLoading: true });
    try {
      const response = await notificationApi.getNotificationSettings();
      if (response) {
        set({ settings: response.push || DEFAULT_SETTINGS, settingsLoading: false });
      } else {
        set({ settings: { ...DEFAULT_SETTINGS }, settingsLoading: false });
      }
    } catch (error) {
      console.error("Failed to fetch notification settings:", error);
      set({ settings: { ...DEFAULT_SETTINGS }, settingsLoading: false });
    }
  },

  updateSettings: async (settings: Partial<PushNotificationSettings>) => {
    const currentSettings = get().settings || DEFAULT_SETTINGS;
    const newSettings = { ...currentSettings, ...settings };

    // Optimistic update
    set({ settings: newSettings });

    try {
      await notificationApi.updateNotificationSettings(settings);
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      // Revert on failure
      set({ settings: currentSettings });
    }
  },

  setCurrentCategory: (category: NotificationCategory) => {
    set({ currentCategory: category });
    // Re-fetch with new category filter
    void get().fetchNotifications(true);
  },

  decrementUnread: () => {
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      hasMore: true,
      currentCategory: "all",
      settings: null,
      settingsLoading: false,
    });
  },
}));
