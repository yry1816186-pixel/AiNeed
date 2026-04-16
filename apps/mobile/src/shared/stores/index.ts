﻿﻿import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";
type ModalType = "none" | "filter" | "sort" | "imagePicker" | "settings" | "confirm";
type ActiveTab = "home" | "explore" | "heart" | "cart" | "wardrobe" | "profile";

interface UINotification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  theme: ThemeMode;
  activeModal: ModalType;
  modalData: Record<string, unknown>;
  isLoading: Record<string, boolean>;
  notifications: UINotification[];
  isOnline: boolean;
  isScrolling: boolean;
  activeTab: ActiveTab;
  searchQuery: string;
  isSearchFocused: boolean;

  setTheme: (theme: ThemeMode) => void;
  showModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  hideModal: () => void;
  setLoading: (key: string, loading: boolean) => void;
  addNotification: (notification: Omit<UINotification, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setOnline: (online: boolean) => void;
  setScrolling: (scrolling: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSearchQuery: (query: string) => void;
  setSearchFocused: (focused: boolean) => void;
  reset: () => void;
}

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

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...initialState,

      setTheme: (theme) => set({ theme }),

      showModal: (modal, data = {}) => set({ activeModal: modal, modalData: data }),

      hideModal: () => set({ activeModal: "none", modalData: {} }),

      setLoading: (key, loading) =>
        set((state) => ({ isLoading: { ...state.isLoading, [key]: loading } })),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}` },
          ],
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setOnline: (online) => set({ isOnline: online }),

      setScrolling: (scrolling) => set({ isScrolling: scrolling }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSearchFocused: (focused) => set({ isSearchFocused: focused }),

      reset: () => set(initialState),
    }),
    {
      name: "ui-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        activeTab: state.activeTab,
      }),
    }
  )
);

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

      setHasRequestedPushPermission: (requested) =>
        set({ hasRequestedPushPermission: requested }),

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
