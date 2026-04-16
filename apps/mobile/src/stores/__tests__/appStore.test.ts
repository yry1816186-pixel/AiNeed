import { useAppStore } from "../../shared/stores/app.store";

// Mocks
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, type: "wifi" }),
}));

describe("useAppStore", () => {
  const initialState = {
    isOnline: true,
    networkType: "unknown" as const,
    isFirstLaunch: true,
    hasCompletedOnboarding: false,
    pushPermissionGranted: false,
    hasRequestedPushPermission: false,
    appVersion: null as string | null,
    lastActiveAt: null as number | null,
  };

  beforeEach(() => {
    useAppStore.setState(initialState);
  });

  // ==================== 初始状态 ====================

  describe("初始状态", () => {
    test("isOnline 应为 true", () => {
      expect(useAppStore.getState().isOnline).toBe(true);
    });

    test("isFirstLaunch 应为 true", () => {
      expect(useAppStore.getState().isFirstLaunch).toBe(true);
    });

    test("hasCompletedOnboarding 应为 false", () => {
      expect(useAppStore.getState().hasCompletedOnboarding).toBe(false);
    });

    test("networkType 应为 'unknown'", () => {
      expect(useAppStore.getState().networkType).toBe("unknown");
    });

    test("pushPermissionGranted 应为 false", () => {
      expect(useAppStore.getState().pushPermissionGranted).toBe(false);
    });

    test("hasRequestedPushPermission 应为 false", () => {
      expect(useAppStore.getState().hasRequestedPushPermission).toBe(false);
    });

    test("appVersion 应为 null", () => {
      expect(useAppStore.getState().appVersion).toBeNull();
    });

    test("lastActiveAt 应为 null", () => {
      expect(useAppStore.getState().lastActiveAt).toBeNull();
    });
  });

  // ==================== setOnline ====================

  describe("setOnline", () => {
    test("应设置在线状态为 false", () => {
      useAppStore.getState().setOnline(false);
      expect(useAppStore.getState().isOnline).toBe(false);
    });

    test("应设置在线状态为 true", () => {
      useAppStore.getState().setOnline(false);
      useAppStore.getState().setOnline(true);
      expect(useAppStore.getState().isOnline).toBe(true);
    });
  });

  // ==================== setNetworkType ====================

  describe("setNetworkType", () => {
    test("应设置网络类型为 'wifi'", () => {
      useAppStore.getState().setNetworkType("wifi");
      expect(useAppStore.getState().networkType).toBe("wifi");
    });

    test("应设置网络类型为 'cellular'", () => {
      useAppStore.getState().setNetworkType("cellular");
      expect(useAppStore.getState().networkType).toBe("cellular");
    });

    test("应设置网络类型为 'none'", () => {
      useAppStore.getState().setNetworkType("none");
      expect(useAppStore.getState().networkType).toBe("none");
    });
  });

  // ==================== markFirstLaunchComplete ====================

  describe("markFirstLaunchComplete", () => {
    test("应将 isFirstLaunch 设为 false", () => {
      expect(useAppStore.getState().isFirstLaunch).toBe(true);
      useAppStore.getState().markFirstLaunchComplete();
      expect(useAppStore.getState().isFirstLaunch).toBe(false);
    });

    test("重复调用不应改变状态", () => {
      useAppStore.getState().markFirstLaunchComplete();
      useAppStore.getState().markFirstLaunchComplete();
      expect(useAppStore.getState().isFirstLaunch).toBe(false);
    });
  });

  // ==================== setOnboardingCompleted ====================

  describe("setOnboardingCompleted", () => {
    test("应设置 hasCompletedOnboarding 为 true", () => {
      useAppStore.getState().setOnboardingCompleted(true);
      expect(useAppStore.getState().hasCompletedOnboarding).toBe(true);
    });

    test("应设置 hasCompletedOnboarding 为 false", () => {
      useAppStore.getState().setOnboardingCompleted(true);
      useAppStore.getState().setOnboardingCompleted(false);
      expect(useAppStore.getState().hasCompletedOnboarding).toBe(false);
    });
  });

  // ==================== setPushPermission ====================

  describe("setPushPermission", () => {
    test("应设置 pushPermissionGranted 为 true 并同时设置 hasRequestedPushPermission 为 true", () => {
      useAppStore.getState().setPushPermission(true);
      expect(useAppStore.getState().pushPermissionGranted).toBe(true);
      expect(useAppStore.getState().hasRequestedPushPermission).toBe(true);
    });

    test("拒绝推送权限时 pushPermissionGranted 为 false 但 hasRequestedPushPermission 仍为 true", () => {
      useAppStore.getState().setPushPermission(false);
      expect(useAppStore.getState().pushPermissionGranted).toBe(false);
      expect(useAppStore.getState().hasRequestedPushPermission).toBe(true);
    });
  });

  // ==================== setHasRequestedPushPermission ====================

  describe("setHasRequestedPushPermission", () => {
    test("应设置 hasRequestedPushPermission 为 true", () => {
      useAppStore.getState().setHasRequestedPushPermission(true);
      expect(useAppStore.getState().hasRequestedPushPermission).toBe(true);
    });

    test("应设置 hasRequestedPushPermission 为 false", () => {
      useAppStore.getState().setHasRequestedPushPermission(true);
      useAppStore.getState().setHasRequestedPushPermission(false);
      expect(useAppStore.getState().hasRequestedPushPermission).toBe(false);
    });
  });

  // ==================== setAppVersion ====================

  describe("setAppVersion", () => {
    test("应设置应用版本号", () => {
      useAppStore.getState().setAppVersion("1.0.0");
      expect(useAppStore.getState().appVersion).toBe("1.0.0");
    });

    test("应能更新版本号", () => {
      useAppStore.getState().setAppVersion("1.0.0");
      useAppStore.getState().setAppVersion("2.0.0");
      expect(useAppStore.getState().appVersion).toBe("2.0.0");
    });
  });

  // ==================== updateLastActiveAt ====================

  describe("updateLastActiveAt", () => {
    test("应更新 lastActiveAt 为当前时间戳", () => {
      const before = Date.now();
      useAppStore.getState().updateLastActiveAt();
      const after = Date.now();
      const lastActiveAt = useAppStore.getState().lastActiveAt!;
      expect(lastActiveAt).toBeGreaterThanOrEqual(before);
      expect(lastActiveAt).toBeLessThanOrEqual(after);
    });

    test("多次调用应更新为最新时间戳", () => {
      useAppStore.getState().updateLastActiveAt();
      const first = useAppStore.getState().lastActiveAt;

      // 等待至少 1ms 以确保时间戳不同
      const start = Date.now();
      while (Date.now() === start) {
        /* busy wait */
      }

      useAppStore.getState().updateLastActiveAt();
      const second = useAppStore.getState().lastActiveAt;
      expect(second!).toBeGreaterThanOrEqual(first!);
    });
  });

  // ==================== resetApp ====================

  describe("resetApp", () => {
    test("应重置所有持久化状态到默认值", () => {
      // 先修改所有状态
      useAppStore.getState().markFirstLaunchComplete();
      useAppStore.getState().setOnboardingCompleted(true);
      useAppStore.getState().setPushPermission(true);
      useAppStore.getState().setAppVersion("3.0.0");
      useAppStore.getState().updateLastActiveAt();

      // 验证已修改
      expect(useAppStore.getState().isFirstLaunch).toBe(false);
      expect(useAppStore.getState().hasCompletedOnboarding).toBe(true);
      expect(useAppStore.getState().pushPermissionGranted).toBe(true);
      expect(useAppStore.getState().appVersion).toBe("3.0.0");
      expect(useAppStore.getState().lastActiveAt).not.toBeNull();

      // 重置
      useAppStore.getState().resetApp();

      // 验证已恢复默认
      expect(useAppStore.getState().isFirstLaunch).toBe(true);
      expect(useAppStore.getState().hasCompletedOnboarding).toBe(false);
      expect(useAppStore.getState().pushPermissionGranted).toBe(false);
      expect(useAppStore.getState().hasRequestedPushPermission).toBe(false);
      expect(useAppStore.getState().appVersion).toBeNull();
      expect(useAppStore.getState().lastActiveAt).toBeNull();
    });

    test("resetApp 不应重置 isOnline 和 networkType", () => {
      useAppStore.getState().setOnline(false);
      useAppStore.getState().setNetworkType("wifi");
      useAppStore.getState().resetApp();
      // isOnline 和 networkType 不在 resetApp 的重置范围内
      expect(useAppStore.getState().isOnline).toBe(false);
      expect(useAppStore.getState().networkType).toBe("wifi");
    });
  });
});
