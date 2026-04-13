import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export type NetworkType = "wifi" | "cellular" | "unknown" | "none" | "other";

interface AppState {
  isOnline: boolean;
  networkType: NetworkType;
  isFirstLaunch: boolean;
  hasCompletedOnboarding: boolean;
  pushPermissionGranted: boolean;
  hasRequestedPushPermission: boolean;
  appVersion: string | null;
  lastActiveAt: number | null;

  setOnline: (online: boolean) => void;
  setNetworkType: (type: NetworkType) => void;
  markFirstLaunchComplete: () => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setPushPermission: (granted: boolean) => void;
  setHasRequestedPushPermission: (requested: boolean) => void;
  setAppVersion: (version: string) => void;
  updateLastActiveAt: () => void;
  resetApp: () => void;
}

interface PersistedAppState {
  isFirstLaunch: boolean;
  hasCompletedOnboarding: boolean;
  pushPermissionGranted: boolean;
  hasRequestedPushPermission: boolean;
  appVersion: string | null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isOnline: true,
      networkType: "unknown" as NetworkType,
      isFirstLaunch: true,
      hasCompletedOnboarding: false,
      pushPermissionGranted: false,
      hasRequestedPushPermission: false,
      appVersion: null,
      lastActiveAt: null,

      setOnline: (isOnline) => set({ isOnline }),
      setNetworkType: (networkType) => set({ networkType }),

      markFirstLaunchComplete: () => set({ isFirstLaunch: false }),

      setOnboardingCompleted: (hasCompletedOnboarding) =>
        set({ hasCompletedOnboarding }),

      setPushPermission: (pushPermissionGranted) =>
        set({ pushPermissionGranted, hasRequestedPushPermission: true }),

      setHasRequestedPushPermission: (hasRequestedPushPermission) =>
        set({ hasRequestedPushPermission }),

      setAppVersion: (appVersion) => set({ appVersion }),

      updateLastActiveAt: () => set({ lastActiveAt: Date.now() }),

      resetApp: () =>
        set({
          isFirstLaunch: true,
          hasCompletedOnboarding: false,
          pushPermissionGranted: false,
          hasRequestedPushPermission: false,
          appVersion: null,
          lastActiveAt: null,
        }),
    }),
    {
      name: "app-v2-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedAppState => ({
        isFirstLaunch: state.isFirstLaunch,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        pushPermissionGranted: state.pushPermissionGranted,
        hasRequestedPushPermission: state.hasRequestedPushPermission,
        appVersion: state.appVersion,
      }),
    },
  ),
);

let unsubscribeNetInfo: (() => void) | null = null;

export function initNetworkListener(): void {
  if (unsubscribeNetInfo) return;

  unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = state.isConnected === true && state.isInternetReachable !== false;
    let networkType: NetworkType = "unknown";
    if (!state.isConnected) {
      networkType = "none";
    } else if (state.type === "wifi") {
      networkType = "wifi";
    } else if (state.type === "cellular") {
      networkType = "cellular";
    } else if (
      state.type === "unknown" ||
      state.type === "none" ||
      state.type === "other"
    ) {
      networkType = state.type as NetworkType;
    }

    useAppStore.getState().setOnline(isOnline);
    useAppStore.getState().setNetworkType(networkType);
  });
}

export function cleanupNetworkListener(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}
