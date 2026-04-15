import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * @deprecated 使用 `import { ThemeMode } from '../../../../contexts/ThemeContext'` 代替。
 * 保留此类型以向后兼容。
 */
export type ThemeMode = "light" | "dark" | "system";
export type ModalType =
  | "none"
  | "filter"
  | "sort"
  | "share"
  | "settings"
  | "confirm"
  | "imagePicker"
  | "sizeGuide";

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

interface LoadingState {
  [key: string]: boolean;
}

interface UIState {
  /** @deprecated 使用 ThemeContext (contexts/ThemeContext) 管理主题状态 */
  theme: ThemeMode;
  activeModal: ModalType;
  modalData: Record<string, unknown>;
  isLoading: LoadingState;
  notifications: Notification[];
  isOnline: boolean;
  isScrolling: boolean;
  activeTab: string;
  searchQuery: string;
  isSearchFocused: boolean;

  /** @deprecated 使用 ThemeContext 的 setMode 代替 */
  setTheme: (theme: ThemeMode) => void;
  showModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  hideModal: () => void;
  setLoading: (key: string, loading: boolean) => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setOnline: (online: boolean) => void;
  setScrolling: (scrolling: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchFocused: (focused: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "light",
      activeModal: "none",
      modalData: {},
      isLoading: {},
      notifications: [],
      isOnline: true,
      isScrolling: false,
      activeTab: "home",
      searchQuery: "",
      isSearchFocused: false,

      setTheme: (theme) => set({ theme }),

      showModal: (modal, data = {}) => set({ activeModal: modal, modalData: data }),

      hideModal: () => set({ activeModal: "none", modalData: {} }),

      setLoading: (key, loading) =>
        set((state) => ({
          isLoading: { ...state.isLoading, [key]: loading },
        })),

      addNotification: (notification) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
          duration: notification.duration ?? 3000,
        };
        set((state) => ({
          notifications: [...state.notifications, newNotification].slice(-10),
        }));

        if (newNotification.duration && newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setOnline: (isOnline) => set({ isOnline }),

      setScrolling: (isScrolling) => set({ isScrolling }),

      setActiveTab: (activeTab) => set({ activeTab }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setSearchFocused: (isSearchFocused) => set({ isSearchFocused }),
    }),
    {
      name: "ui-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

/** @deprecated 使用 `useTheme` from `../../../../contexts/ThemeContext` 代替 */
export const useTheme = () => useUIStore((state) => state.theme);
export const useModal = () =>
  useUIStore((state) => ({
    activeModal: state.activeModal,
    modalData: state.modalData,
  }));
export const useLoading = (key: string) => useUIStore((state) => state.isLoading[key] ?? false);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useOnline = () => useUIStore((state) => state.isOnline);
