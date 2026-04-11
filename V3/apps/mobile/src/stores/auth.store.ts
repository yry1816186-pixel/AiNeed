import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';
import { api } from '../services/api';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  login: (phone: string, code: string) => Promise<void>;
  sendCode: (phone: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set: (partial: Partial<AuthState>) => void, get: () => AuthState) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user: User) => {
        set({ user });
      },

      login: async (phone: string, code: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/verify-code', { phone, code });
          if (data.success && data.data) {
            const { accessToken, refreshToken, user } = data.data;
            set({
              accessToken,
              refreshToken,
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
            throw new Error(data.error?.message ?? '登录失败');
          }
        } catch {
          set({ isLoading: false });
          throw new Error('登录失败，请重试');
        }
      },

      sendCode: async (phone: string) => {
        await api.post('/auth/send-code', { phone });
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      refreshUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        try {
          const { data } = await api.get('/users/me');
          if (data.success && data.data) {
            set({ user: data.data });
          }
        } catch {
          // silent fail on refresh
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: AuthState) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
