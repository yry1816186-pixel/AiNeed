import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppStore {
  isReady: boolean;
  isFirstLaunch: boolean;
  onboardingCompleted: boolean;

  isOnline: boolean;
  lastOnlineAt: number | null;

  userId: string | null;
  nickname: string | null;
  avatarUrl: string | null;

  unreadMessages: number;
  unreadNotifications: number;

  setReady: (ready: boolean) => void;
  setFirstLaunch: (first: boolean) => void;
  completeOnboarding: () => void;
  setOnline: (online: boolean) => void;
  setUserBasic: (data: { id: string; nickname: string; avatarUrl: string }) => void;
  setUnreadCounts: (messages: number, notifications: number) => void;
  clearAll: () => void;
}

const initialState = {
  isReady: false,
  isFirstLaunch: true,
  onboardingCompleted: false,
  isOnline: true,
  lastOnlineAt: null as number | null,
  userId: null as string | null,
  nickname: null as string | null,
  avatarUrl: null as string | null,
  unreadMessages: 0,
  unreadNotifications: 0,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      setReady: (ready) => set({ isReady: ready }),

      setFirstLaunch: (first) => set({ isFirstLaunch: first }),

      completeOnboarding: () => set({ onboardingCompleted: true, isFirstLaunch: false }),

      setOnline: (online) =>
        set({
          isOnline: online,
          ...(online ? { lastOnlineAt: Date.now() } : {}),
        }),

      setUserBasic: (data) =>
        set({
          userId: data.id,
          nickname: data.nickname,
          avatarUrl: data.avatarUrl,
        }),

      setUnreadCounts: (messages, notifications) =>
        set({ unreadMessages: messages, unreadNotifications: notifications }),

      clearAll: () => set(initialState),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
        isFirstLaunch: state.isFirstLaunch,
        userId: state.userId,
        nickname: state.nickname,
        avatarUrl: state.avatarUrl,
        lastOnlineAt: state.lastOnlineAt,
      }),
    },
  ),
);
