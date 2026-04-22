// @ts-nocheck
import { useNotificationStore } from "../notificationStore";

jest.mock("../../../../services/api/notification.api", () => ({
  notificationApi: {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    getNotificationSettings: jest.fn(),
    updateNotificationSettings: jest.fn(),
  },
}));

import { notificationApi } from "../../../../services/api/notification.api";

const mockedGetNotifications = notificationApi.getNotifications as jest.Mock;
const mockedMarkAsRead = notificationApi.markAsRead as jest.Mock;
const mockedMarkAllAsRead = notificationApi.markAllAsRead as jest.Mock;
const mockedDeleteNotification = notificationApi.deleteNotification as jest.Mock;
const mockedGetNotificationSettings = notificationApi.getNotificationSettings as jest.Mock;
const mockedUpdateNotificationSettings = notificationApi.updateNotificationSettings as jest.Mock;

const mockNotifications = [
  {
    id: "n1",
    type: "daily_recommendation",
    title: "今日推荐",
    content: "为你推荐了新的穿搭",
    isRead: false,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "n2",
    type: "comment",
    title: "新评论",
    content: "有人评论了你的穿搭",
    isRead: false,
    createdAt: "2025-01-02T00:00:00Z",
  },
  {
    id: "n3",
    type: "system_update",
    title: "系统更新",
    content: "系统已升级",
    isRead: true,
    readAt: "2025-01-03T00:00:00Z",
    createdAt: "2025-01-03T00:00:00Z",
  },
  {
    id: "n4",
    type: "price_drop",
    title: "降价提醒",
    content: "你收藏的商品降价了",
    isRead: false,
    createdAt: "2025-01-04T00:00:00Z",
  },
];

describe("useNotificationStore", () => {
  beforeEach(() => {
    useNotificationStore.getState().reset();
    jest.clearAllMocks();
  });

  describe("fetchNotifications", () => {
    it("should fetch notifications successfully and update state", async () => {
      mockedGetNotifications.mockResolvedValue({
        notifications: mockNotifications,
        unreadCount: 3,
        hasMore: false,
      });

      await useNotificationStore.getState().fetchNotifications(true);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(4);
      expect(state.unreadCount).toBe(3);
      expect(state.hasMore).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockedGetNotifications).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
      });
    });

    it("should filter notifications by currentCategory when not 'all'", async () => {
      useNotificationStore.setState({ currentCategory: "recommendation" });

      mockedGetNotifications.mockResolvedValue({
        notifications: mockNotifications,
        unreadCount: 3,
        hasMore: false,
      });

      await useNotificationStore.getState().fetchNotifications(true);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(2);
      expect(
        state.notifications.every(
          (n) => n.type === "daily_recommendation" || n.type === "price_drop"
        )
      ).toBe(true);
    });

    it("should set error when fetch fails", async () => {
      mockedGetNotifications.mockRejectedValue(new Error("Network error"));

      await useNotificationStore.getState().fetchNotifications(true);

      const state = useNotificationStore.getState();
      expect(state.error).toBe("获取通知失败");
      expect(state.loading).toBe(false);
    });
  });

  describe("markAsRead", () => {
    it("should optimistically mark notification as read and decrement unreadCount", async () => {
      useNotificationStore.setState({
        notifications: [...mockNotifications],
        unreadCount: 3,
      });

      mockedMarkAsRead.mockResolvedValue(undefined);

      await useNotificationStore.getState().markAsRead("n1");

      const state = useNotificationStore.getState();
      const marked = state.notifications.find((n) => n.id === "n1");
      expect(marked?.isRead).toBe(true);
      expect(marked?.readAt).toBeDefined();
      expect(state.unreadCount).toBe(2);
      expect(mockedMarkAsRead).toHaveBeenCalledWith("n1");
    });

    it("should set error when markAsRead API fails", async () => {
      useNotificationStore.setState({
        notifications: [...mockNotifications],
        unreadCount: 3,
      });

      mockedMarkAsRead.mockRejectedValue(new Error("API error"));

      await useNotificationStore.getState().markAsRead("n1");

      const state = useNotificationStore.getState();
      expect(state.error).toBe("标记已读失败");
    });
  });

  describe("deleteNotification", () => {
    it("should optimistically delete unread notification and decrement unreadCount", async () => {
      useNotificationStore.setState({
        notifications: [...mockNotifications],
        unreadCount: 3,
      });

      mockedDeleteNotification.mockResolvedValue(undefined);

      await useNotificationStore.getState().deleteNotification("n1");

      const state = useNotificationStore.getState();
      expect(state.notifications.find((n) => n.id === "n1")).toBeUndefined();
      expect(state.notifications).toHaveLength(3);
      expect(state.unreadCount).toBe(2);
      expect(mockedDeleteNotification).toHaveBeenCalledWith("n1");
    });

    it("should not decrement unreadCount when deleting a read notification", async () => {
      useNotificationStore.setState({
        notifications: [...mockNotifications],
        unreadCount: 3,
      });

      mockedDeleteNotification.mockResolvedValue(undefined);

      await useNotificationStore.getState().deleteNotification("n3");

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(3);
      expect(state.unreadCount).toBe(3);
    });

    it("should set error when deleteNotification API fails", async () => {
      useNotificationStore.setState({
        notifications: [...mockNotifications],
        unreadCount: 3,
      });

      mockedDeleteNotification.mockRejectedValue(new Error("API error"));

      await useNotificationStore.getState().deleteNotification("n1");

      const state = useNotificationStore.getState();
      expect(state.error).toBe("删除通知失败");
    });
  });

  describe("fetchSettings", () => {
    it("should fetch settings and set push settings to state", async () => {
      const mockSettingsResponse = {
        id: "s1",
        userId: "u1",
        email: { marketing: true, transactional: true },
        push: {
          order: true,
          recommendation: false,
          community: true,
          system: true,
          quietHoursEnabled: true,
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
        },
        inApp: { all: true },
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      mockedGetNotificationSettings.mockResolvedValue(mockSettingsResponse);

      await useNotificationStore.getState().fetchSettings();

      const state = useNotificationStore.getState();
      expect(state.settings).toEqual(mockSettingsResponse.push);
      expect(state.settingsLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should use default settings when API returns null", async () => {
      mockedGetNotificationSettings.mockResolvedValue(null);

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

    it("should set error and default settings when fetch fails", async () => {
      mockedGetNotificationSettings.mockRejectedValue(new Error("Network error"));

      await useNotificationStore.getState().fetchSettings();

      const state = useNotificationStore.getState();
      expect(state.error).toBe("获取通知设置失败");
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
  });

  describe("reset", () => {
    it("should reset all state to initial values", async () => {
      useNotificationStore.setState({
        notifications: [...mockNotifications],
        unreadCount: 5,
        loading: true,
        hasMore: false,
        currentCategory: "community",
        settings: {
          order: false,
          recommendation: false,
          community: false,
          system: false,
          quietHoursEnabled: true,
          quietHoursStart: "23:00",
          quietHoursEnd: "07:00",
        },
        settingsLoading: true,
        error: "some error",
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
      expect(state.error).toBeNull();
    });
  });
});
