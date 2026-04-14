import { useNotificationStore } from "../notificationStore";
import {
  notificationApi,
  type NotificationItem,
  type NotificationSettingsResponse,
} from "../../services/api/notification.api";

jest.mock("../../services/api/notification.api", () => ({
  notificationApi: {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    getNotificationSettings: jest.fn(),
    updateNotificationSettings: jest.fn(),
  },
}));

const mockedNotificationApi = notificationApi as jest.Mocked<typeof notificationApi>;

const mockNotification1: NotificationItem = {
  id: "notif-1",
  type: "daily_recommendation",
  title: "Daily Pick",
  content: "Check out today's recommendation",
  isRead: false,
  isPushed: true,
  pushedAt: "2025-01-01T08:00:00Z",
  createdAt: "2025-01-01T08:00:00Z",
};

const mockNotification2: NotificationItem = {
  id: "notif-2",
  type: "order",
  title: "Order Shipped",
  content: "Your order has been shipped",
  isRead: true,
  readAt: "2025-01-01T09:00:00Z",
  isPushed: true,
  pushedAt: "2025-01-01T07:00:00Z",
  createdAt: "2025-01-01T07:00:00Z",
};

const mockNotification3: NotificationItem = {
  id: "notif-3",
  type: "new_follower",
  title: "New Follower",
  content: "Someone followed you",
  isRead: false,
  isPushed: false,
  createdAt: "2025-01-01T10:00:00Z",
};

const mockSettingsResponse: NotificationSettingsResponse = {
  id: "settings-1",
  userId: "user-1",
  email: { marketing: true, transactional: true },
  push: {
    order: true,
    recommendation: true,
    community: false,
    system: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  },
  inApp: { all: true },
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

describe("useNotificationStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      hasMore: true,
      currentCategory: "all",
      settings: null,
      settingsLoading: false,
    });
  });

  // ==================== 初始状态 ====================

  describe("initial state", () => {
    it("should have correct default values", () => {
      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.hasMore).toBe(true);
      expect(state.currentCategory).toBe("all");
      expect(state.settings).toBeNull();
      expect(state.settingsLoading).toBe(false);
    });
  });

  // ==================== fetchNotifications ====================

  describe("fetchNotifications", () => {
    it("should fetch and set notifications on success", async () => {
      mockedNotificationApi.getNotifications.mockResolvedValueOnce({
        notifications: [mockNotification1, mockNotification2],
        unreadCount: 3,
        hasMore: true,
      });

      await useNotificationStore.getState().fetchNotifications();

      const state = useNotificationStore.getState();
      expect(mockedNotificationApi.getNotifications).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
      });
      expect(state.notifications).toHaveLength(2);
      expect(state.unreadCount).toBe(3);
      expect(state.hasMore).toBe(true);
      expect(state.loading).toBe(false);
    });

    it("should replace notifications when reset is true", async () => {
      useNotificationStore.setState({
        notifications: [mockNotification1],
      });

      mockedNotificationApi.getNotifications.mockResolvedValueOnce({
        notifications: [mockNotification2],
        unreadCount: 1,
        hasMore: false,
      });

      await useNotificationStore.getState().fetchNotifications(true);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].id).toBe("notif-2");
    });

    it("should append notifications when reset is false", async () => {
      useNotificationStore.setState({
        notifications: [mockNotification1],
      });

      mockedNotificationApi.getNotifications.mockResolvedValueOnce({
        notifications: [mockNotification2],
        unreadCount: 2,
        hasMore: false,
      });

      await useNotificationStore.getState().fetchNotifications(false);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(2);
    });

    it("should filter notifications by currentCategory", async () => {
      useNotificationStore.setState({ currentCategory: "recommendation" });

      mockedNotificationApi.getNotifications.mockResolvedValueOnce({
        notifications: [mockNotification1, mockNotification2, mockNotification3],
        unreadCount: 2,
        hasMore: false,
      });

      await useNotificationStore.getState().fetchNotifications();

      const state = useNotificationStore.getState();
      // mockNotification1 is daily_recommendation -> "recommendation"
      // mockNotification2 is "order" -> filtered out
      // mockNotification3 is new_follower -> "community" -> filtered out
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].id).toBe("notif-1");
    });

    it("should not fetch if already loading", async () => {
      useNotificationStore.setState({ loading: true });

      await useNotificationStore.getState().fetchNotifications();

      expect(mockedNotificationApi.getNotifications).not.toHaveBeenCalled();
    });

    it("should handle fetch failure gracefully", async () => {
      mockedNotificationApi.getNotifications.mockRejectedValueOnce(new Error("Network error"));

      await useNotificationStore.getState().fetchNotifications();

      expect(useNotificationStore.getState().loading).toBe(false);
    });
  });

  // ==================== markAsRead ====================

  describe("markAsRead", () => {
    it("should optimistically update notification to read", async () => {
      useNotificationStore.setState({
        notifications: [mockNotification1, mockNotification2],
        unreadCount: 3,
      });

      mockedNotificationApi.markAsRead.mockResolvedValueOnce(undefined);

      await useNotificationStore.getState().markAsRead("notif-1");

      const state = useNotificationStore.getState();
      expect(state.notifications[0].isRead).toBe(true);
      expect(state.notifications[0].readAt).toBeDefined();
      expect(state.unreadCount).toBe(2);
      expect(mockedNotificationApi.markAsRead).toHaveBeenCalledWith("notif-1");
    });

    it("should not decrement unreadCount below 0", async () => {
      useNotificationStore.setState({
        notifications: [mockNotification1],
        unreadCount: 0,
      });

      mockedNotificationApi.markAsRead.mockResolvedValueOnce(undefined);

      await useNotificationStore.getState().markAsRead("notif-1");

      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  // ==================== markAllAsRead ====================

  describe("markAllAsRead", () => {
    it("should mark all notifications as read and set unreadCount to 0", async () => {
      useNotificationStore.setState({
        notifications: [mockNotification1, mockNotification3],
        unreadCount: 5,
      });

      mockedNotificationApi.markAllAsRead.mockResolvedValueOnce(undefined);

      await useNotificationStore.getState().markAllAsRead();

      const state = useNotificationStore.getState();
      expect(state.notifications.every((n) => n.isRead)).toBe(true);
      expect(state.unreadCount).toBe(0);
      expect(mockedNotificationApi.markAllAsRead).toHaveBeenCalled();
    });
  });

  // ==================== deleteNotification ====================

  describe("deleteNotification", () => {
    it("should optimistically delete notification and update unreadCount for unread items", async () => {
      useNotificationStore.setState({
        notifications: [mockNotification1, mockNotification2],
        unreadCount: 3,
      });

      mockedNotificationApi.deleteNotification.mockResolvedValueOnce(undefined);

      await useNotificationStore.getState().deleteNotification("notif-1");

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].id).toBe("notif-2");
      // mockNotification1 was unread, so unreadCount should decrement
      expect(state.unreadCount).toBe(2);
      expect(mockedNotificationApi.deleteNotification).toHaveBeenCalledWith("notif-1");
    });

    it("should not decrement unreadCount when deleting a read notification", async () => {
      useNotificationStore.setState({
        notifications: [mockNotification1, mockNotification2],
        unreadCount: 3,
      });

      mockedNotificationApi.deleteNotification.mockResolvedValueOnce(undefined);

      await useNotificationStore.getState().deleteNotification("notif-2");

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      // mockNotification2 was already read, unreadCount should not change
      expect(state.unreadCount).toBe(3);
    });
  });

  // ==================== fetchSettings ====================

  describe("fetchSettings", () => {
    it("should fetch and set push settings on success", async () => {
      mockedNotificationApi.getNotificationSettings.mockResolvedValueOnce(mockSettingsResponse);

      await useNotificationStore.getState().fetchSettings();

      const state = useNotificationStore.getState();
      expect(state.settings).toEqual(mockSettingsResponse.push);
      expect(state.settingsLoading).toBe(false);
    });

    it("should set default settings when response is null", async () => {
      mockedNotificationApi.getNotificationSettings.mockResolvedValueOnce(null);

      await useNotificationStore.getState().fetchSettings();

      const state = useNotificationStore.getState();
      expect(state.settings).toEqual({
        order: true,
        recommendation: true,
        community: true,
        system: true,
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      });
      expect(state.settingsLoading).toBe(false);
    });

    it("should set default settings on fetch failure", async () => {
      mockedNotificationApi.getNotificationSettings.mockRejectedValueOnce(new Error("Network error"));

      await useNotificationStore.getState().fetchSettings();

      const state = useNotificationStore.getState();
      expect(state.settings).toBeDefined();
      expect(state.settings!.order).toBe(true);
      expect(state.settingsLoading).toBe(false);
    });
  });

  // ==================== updateSettings ====================

  describe("updateSettings", () => {
    it("should optimistically update settings", async () => {
      useNotificationStore.setState({
        settings: {
          order: true,
          recommendation: true,
          community: true,
          system: true,
          quietHoursEnabled: false,
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
        },
      });

      mockedNotificationApi.updateNotificationSettings.mockResolvedValueOnce(undefined);

      await useNotificationStore.getState().updateSettings({ community: false });

      const state = useNotificationStore.getState();
      expect(state.settings!.community).toBe(false);
      expect(state.settings!.order).toBe(true);
      expect(mockedNotificationApi.updateNotificationSettings).toHaveBeenCalledWith({ community: false });
    });

    it("should revert settings on failure", async () => {
      const originalSettings = {
        order: true,
        recommendation: true,
        community: true,
        system: true,
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      };

      useNotificationStore.setState({ settings: { ...originalSettings } });

      mockedNotificationApi.updateNotificationSettings.mockRejectedValueOnce(new Error("Network error"));

      await useNotificationStore.getState().updateSettings({ community: false });

      const state = useNotificationStore.getState();
      // Should revert to original settings
      expect(state.settings!.community).toBe(true);
    });
  });

  // ==================== setCurrentCategory ====================

  describe("setCurrentCategory", () => {
    it("should set category and re-fetch notifications", async () => {
      mockedNotificationApi.getNotifications.mockResolvedValueOnce({
        notifications: [],
        unreadCount: 0,
        hasMore: false,
      });

      useNotificationStore.getState().setCurrentCategory("order");

      expect(useNotificationStore.getState().currentCategory).toBe("order");

      // Wait for async fetchNotifications
      await Promise.resolve();
      expect(mockedNotificationApi.getNotifications).toHaveBeenCalled();
    });
  });

  // ==================== decrementUnread ====================

  describe("decrementUnread", () => {
    it("should decrement unreadCount", () => {
      useNotificationStore.setState({ unreadCount: 5 });

      useNotificationStore.getState().decrementUnread();

      expect(useNotificationStore.getState().unreadCount).toBe(4);
    });

    it("should not decrement below 0", () => {
      useNotificationStore.setState({ unreadCount: 0 });

      useNotificationStore.getState().decrementUnread();

      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  // ==================== reset ====================

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      useNotificationStore.setState({
        notifications: [mockNotification1],
        unreadCount: 5,
        loading: true,
        hasMore: false,
        currentCategory: "order",
        settings: {
          order: true,
          recommendation: true,
          community: false,
          system: true,
          quietHoursEnabled: true,
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
        },
        settingsLoading: true,
      });

      useNotificationStore.getState().reset();

      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.hasMore).toBe(true);
      expect(state.currentCategory).toBe("all");
      expect(state.settings).toBeNull();
      expect(state.settingsLoading).toBe(false);
    });
  });
});
