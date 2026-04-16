import { useUIStore } from "../../shared/stores/uiStore";

// Mocks
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

describe("useUIStore", () => {
  // 初始状态快照，用于 beforeEach 重置
  const initialState = {
    theme: "light" as const,
    activeModal: "none" as const,
    modalData: {},
    isLoading: {},
    notifications: [],
    isOnline: true,
    isScrolling: false,
    activeTab: "home" as const,
    searchQuery: "",
    isSearchFocused: false,
  };

  beforeEach(() => {
    useUIStore.setState(initialState);
  });

  // ==================== 初始状态 ====================

  describe("初始状态", () => {
    test("theme 应为 'light'", () => {
      expect(useUIStore.getState().theme).toBe("light");
    });

    test("activeModal 应为 'none'", () => {
      expect(useUIStore.getState().activeModal).toBe("none");
    });

    test("notifications 应为空数组", () => {
      expect(useUIStore.getState().notifications).toEqual([]);
    });

    test("searchQuery 应为空字符串", () => {
      expect(useUIStore.getState().searchQuery).toBe("");
    });

    test("activeTab 应为 'home'", () => {
      expect(useUIStore.getState().activeTab).toBe("home");
    });

    test("modalData 应为空对象", () => {
      expect(useUIStore.getState().modalData).toEqual({});
    });

    test("isLoading 应为空对象", () => {
      expect(useUIStore.getState().isLoading).toEqual({});
    });

    test("isOnline 应为 true", () => {
      expect(useUIStore.getState().isOnline).toBe(true);
    });

    test("isScrolling 应为 false", () => {
      expect(useUIStore.getState().isScrolling).toBe(false);
    });

    test("isSearchFocused 应为 false", () => {
      expect(useUIStore.getState().isSearchFocused).toBe(false);
    });
  });

  // ==================== setTheme ====================

  describe("setTheme", () => {
    test("应设置主题为 'dark'", () => {
      useUIStore.getState().setTheme("dark");
      expect(useUIStore.getState().theme).toBe("dark");
    });

    test("应设置主题为 'system'", () => {
      useUIStore.getState().setTheme("system");
      expect(useUIStore.getState().theme).toBe("system");
    });

    test("应设置主题为 'light'", () => {
      useUIStore.getState().setTheme("dark");
      useUIStore.getState().setTheme("light");
      expect(useUIStore.getState().theme).toBe("light");
    });
  });

  // ==================== showModal / hideModal ====================

  describe("showModal", () => {
    test("应打开 filter 模态框", () => {
      useUIStore.getState().showModal("filter");
      expect(useUIStore.getState().activeModal).toBe("filter");
    });

    test("应打开 sort 模态框并携带数据", () => {
      const data = { field: "price", order: "asc" };
      useUIStore.getState().showModal("sort", data);
      expect(useUIStore.getState().activeModal).toBe("sort");
      expect(useUIStore.getState().modalData).toEqual(data);
    });

    test("应打开 imagePicker 模态框", () => {
      useUIStore.getState().showModal("imagePicker");
      expect(useUIStore.getState().activeModal).toBe("imagePicker");
    });

    test("不传 data 时 modalData 应为空对象", () => {
      useUIStore.getState().showModal("settings");
      expect(useUIStore.getState().modalData).toEqual({});
    });
  });

  describe("hideModal", () => {
    test("应关闭模态框并清空 modalData", () => {
      useUIStore.getState().showModal("confirm", { action: "delete" });
      expect(useUIStore.getState().activeModal).toBe("confirm");
      expect(useUIStore.getState().modalData).toEqual({ action: "delete" });

      useUIStore.getState().hideModal();
      expect(useUIStore.getState().activeModal).toBe("none");
      expect(useUIStore.getState().modalData).toEqual({});
    });
  });

  // ==================== setLoading ====================

  describe("setLoading", () => {
    test("应设置指定 key 的加载状态为 true", () => {
      useUIStore.getState().setLoading("fetchClothing", true);
      expect(useUIStore.getState().isLoading.fetchClothing).toBe(true);
    });

    test("应设置指定 key 的加载状态为 false", () => {
      useUIStore.getState().setLoading("fetchClothing", true);
      useUIStore.getState().setLoading("fetchClothing", false);
      expect(useUIStore.getState().isLoading.fetchClothing).toBe(false);
    });

    test("应支持多个 key 同时存在", () => {
      useUIStore.getState().setLoading("fetchClothing", true);
      useUIStore.getState().setLoading("uploadImage", true);
      expect(useUIStore.getState().isLoading).toEqual({
        fetchClothing: true,
        uploadImage: true,
      });
    });

    test("设置新 key 不应影响已有 key", () => {
      useUIStore.getState().setLoading("keyA", true);
      useUIStore.getState().setLoading("keyB", false);
      expect(useUIStore.getState().isLoading.keyA).toBe(true);
      expect(useUIStore.getState().isLoading.keyB).toBe(false);
    });
  });

  // ==================== 通知管理 ====================

  describe("addNotification", () => {
    test("应添加通知到列表", () => {
      useUIStore.getState().addNotification({
        type: "success",
        title: "操作成功",
      });
      const notifications = useUIStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("success");
      expect(notifications[0].title).toBe("操作成功");
    });

    test("应自动生成 id 和 timestamp", () => {
      useUIStore.getState().addNotification({
        type: "info",
        title: "提示",
      });
      const notification = useUIStore.getState().notifications[0];
      expect(notification.id).toBeDefined();
      expect(notification.timestamp).toBeDefined();
      expect(typeof notification.id).toBe("string");
      expect(typeof notification.timestamp).toBe("number");
    });

    test("默认 duration 应为 3000", () => {
      useUIStore.getState().addNotification({
        type: "error",
        title: "错误",
      });
      expect(useUIStore.getState().notifications[0].duration).toBe(3000);
    });

    test("应支持自定义 duration", () => {
      useUIStore.getState().addNotification({
        type: "warning",
        title: "警告",
        duration: 5000,
      });
      expect(useUIStore.getState().notifications[0].duration).toBe(5000);
    });

    test("应支持 message 字段", () => {
      useUIStore.getState().addNotification({
        type: "error",
        title: "失败",
        message: "网络连接超时",
      });
      expect(useUIStore.getState().notifications[0].message).toBe("网络连接超时");
    });

    test("通知列表最多保留 10 条", () => {
      for (let i = 0; i < 12; i++) {
        useUIStore.getState().addNotification({
          type: "info",
          title: `通知 ${i}`,
        });
      }
      expect(useUIStore.getState().notifications).toHaveLength(10);
    });
  });

  describe("removeNotification", () => {
    test("应按 id 移除通知", () => {
      useUIStore.getState().addNotification({ type: "success", title: "A" });
      useUIStore.getState().addNotification({ type: "error", title: "B" });

      const notifications = useUIStore.getState().notifications;
      expect(notifications).toHaveLength(2);

      useUIStore.getState().removeNotification(notifications[0].id);
      expect(useUIStore.getState().notifications).toHaveLength(1);
      expect(useUIStore.getState().notifications[0].title).toBe("B");
    });

    test("移除不存在的 id 不应报错", () => {
      useUIStore.getState().addNotification({ type: "info", title: "A" });
      useUIStore.getState().removeNotification("non-existent-id");
      expect(useUIStore.getState().notifications).toHaveLength(1);
    });
  });

  describe("clearNotifications", () => {
    test("应清空所有通知", () => {
      useUIStore.getState().addNotification({ type: "success", title: "A" });
      useUIStore.getState().addNotification({ type: "error", title: "B" });
      expect(useUIStore.getState().notifications).toHaveLength(2);

      useUIStore.getState().clearNotifications();
      expect(useUIStore.getState().notifications).toEqual([]);
    });
  });

  // ==================== setOnline ====================

  describe("setOnline", () => {
    test("应设置在线状态为 false", () => {
      useUIStore.getState().setOnline(false);
      expect(useUIStore.getState().isOnline).toBe(false);
    });

    test("应设置在线状态为 true", () => {
      useUIStore.getState().setOnline(false);
      useUIStore.getState().setOnline(true);
      expect(useUIStore.getState().isOnline).toBe(true);
    });
  });

  // ==================== setScrolling ====================

  describe("setScrolling", () => {
    test("应设置滚动状态为 true", () => {
      useUIStore.getState().setScrolling(true);
      expect(useUIStore.getState().isScrolling).toBe(true);
    });

    test("应设置滚动状态为 false", () => {
      useUIStore.getState().setScrolling(true);
      useUIStore.getState().setScrolling(false);
      expect(useUIStore.getState().isScrolling).toBe(false);
    });
  });

  // ==================== setActiveTab ====================

  describe("setActiveTab", () => {
    test("应设置活跃标签页", () => {
      useUIStore.getState().setActiveTab("explore");
      expect(useUIStore.getState().activeTab).toBe("explore");
    });

    test("应切换到不同标签页", () => {
      useUIStore.getState().setActiveTab("wardrobe");
      expect(useUIStore.getState().activeTab).toBe("wardrobe");
    });
  });

  // ==================== setSearchQuery ====================

  describe("setSearchQuery", () => {
    test("应设置搜索关键词", () => {
      useUIStore.getState().setSearchQuery("连衣裙");
      expect(useUIStore.getState().searchQuery).toBe("连衣裙");
    });

    test("应能清空搜索关键词", () => {
      useUIStore.getState().setSearchQuery("连衣裙");
      useUIStore.getState().setSearchQuery("");
      expect(useUIStore.getState().searchQuery).toBe("");
    });
  });

  // ==================== setSearchFocused ====================

  describe("setSearchFocused", () => {
    test("应设置搜索聚焦状态为 true", () => {
      useUIStore.getState().setSearchFocused(true);
      expect(useUIStore.getState().isSearchFocused).toBe(true);
    });

    test("应设置搜索聚焦状态为 false", () => {
      useUIStore.getState().setSearchFocused(true);
      useUIStore.getState().setSearchFocused(false);
      expect(useUIStore.getState().isSearchFocused).toBe(false);
    });
  });
});
