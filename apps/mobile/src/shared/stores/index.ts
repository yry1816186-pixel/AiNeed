export { clearAllStores } from "./clearAllStores";

// useUIStore is defined in uiStore.ts (canonical location with useShallow helpers).
// Re-export here for backward compatibility.
export { useUIStore } from "./uiStore";
export type { ThemeMode, ModalType } from "./uiStore";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ==================== App Store ====================

type NetworkType = "unknown" | "wifi" | "cellular" | "none";

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

const appInitialState = {
  isOnline: true,
  networkType: "unknown" as const,
  isFirstLaunch: true,
  hasCompletedOnboarding: false,
  pushPermissionGranted: false,
  hasRequestedPushPermission: false,
  appVersion: null as string | null,
  lastActiveAt: null as number | null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...appInitialState,

      setOnline: (online) => set({ isOnline: online }),

      setNetworkType: (type) => set({ networkType: type }),

      markFirstLaunchComplete: () => set({ isFirstLaunch: false }),

      setOnboardingCompleted: (completed) => set({ hasCompletedOnboarding: completed }),

      setPushPermission: (granted) =>
        set({ pushPermissionGranted: granted, hasRequestedPushPermission: true }),

      setHasRequestedPushPermission: (requested) => set({ hasRequestedPushPermission: requested }),

      setAppVersion: (version) => set({ appVersion: version }),

      updateLastActiveAt: () => set({ lastActiveAt: Date.now() }),

      resetApp: () =>
        set({
          ...appInitialState,
          isOnline: true,
          networkType: "unknown" as const,
        }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isFirstLaunch: state.isFirstLaunch,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasRequestedPushPermission: state.hasRequestedPushPermission,
        appVersion: state.appVersion,
      }),
    }
  )
);
