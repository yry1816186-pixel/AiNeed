import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureStorage, SECURE_STORAGE_KEYS } from "../utils/secureStorage";
import apiClient from "../services/api/client";
import { tokenManager } from "../services/auth/token";
import { AppError, AppErrorCode, toAppError } from "../services/api/error";
import type { User, AuthTokens, LoginCredentials, RegisterData } from "../types/user";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithPhone: (phone: string, code: string) => Promise<void>;
  loginWithWechat: (code: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

const secureStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (name === "auth-v2-storage") {
      const token = await secureStorage.getItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      const refresh = await secureStorage.getItem(
        SECURE_STORAGE_KEYS.REFRESH_TOKEN,
      );
      const userStr = await secureStorage.getItem(
        SECURE_STORAGE_KEYS.USER_DATA,
      );
      return JSON.stringify({
        state: {
          accessToken: token,
          refreshToken: refresh,
          user: userStr ? JSON.parse(userStr) : null,
          isAuthenticated: !!token,
        },
        version: 0,
      });
    }
    return AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (name === "auth-v2-storage") {
      const { state } = JSON.parse(value);
      if (state.accessToken) {
        await secureStorage.setItem(
          SECURE_STORAGE_KEYS.AUTH_TOKEN,
          state.accessToken,
        );
      } else {
        await secureStorage.deleteItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      }
      if (state.refreshToken) {
        await secureStorage.setItem(
          SECURE_STORAGE_KEYS.REFRESH_TOKEN,
          state.refreshToken,
        );
      } else {
        await secureStorage.deleteItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      }
      if (state.user) {
        await secureStorage.setItem(
          SECURE_STORAGE_KEYS.USER_DATA,
          JSON.stringify(state.user),
        );
      } else {
        await secureStorage.deleteItem(SECURE_STORAGE_KEYS.USER_DATA);
      }
      return;
    }
    return AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (name === "auth-v2-storage") {
      await secureStorage.deleteItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.deleteItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      await secureStorage.deleteItem(SECURE_STORAGE_KEYS.USER_DATA);
      return;
    }
    return AsyncStorage.removeItem(name);
  },
};

interface PersistedAuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

async function persistTokens(
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  await apiClient.setToken(accessToken);
  if (refreshToken) {
    await apiClient.setRefreshToken(refreshToken);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isRefreshing: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{
            user: User;
            token: string;
            accessToken?: string;
            refreshToken?: string;
          }>("/auth/login", credentials);

          if (!response.success || !response.data) {
            throw new AppError(
              AppErrorCode.BUSINESS_ERROR,
              response.error?.message,
            );
          }

          const { user, token, accessToken, refreshToken } = response.data;
          const finalAccessToken = accessToken || token;

          await persistTokens(finalAccessToken, refreshToken);
          set({
            user,
            accessToken: finalAccessToken,
            refreshToken: refreshToken ?? null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const appError = toAppError(err);
          set({ error: appError, isLoading: false });
          throw appError;
        }
      },

      loginWithPhone: async (phone: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            user: User;
          }>("/auth/phone-login", { phone, code });

          if (!response.success || !response.data) {
            throw new AppError(
              AppErrorCode.BUSINESS_ERROR,
              response.error?.message,
            );
          }

          const { accessToken, refreshToken, user } = response.data;
          await persistTokens(accessToken, refreshToken);
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const appError = toAppError(err);
          set({ error: appError, isLoading: false });
          throw appError;
        }
      },

      loginWithWechat: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            user: User;
          }>("/auth/wechat-login", { code });

          if (!response.success || !response.data) {
            throw new AppError(
              AppErrorCode.BUSINESS_ERROR,
              response.error?.message,
            );
          }

          const { accessToken, refreshToken, user } = response.data;
          await persistTokens(accessToken, refreshToken);
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const appError = toAppError(err);
          set({ error: appError, isLoading: false });
          throw appError;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{
            user: User;
            token: string;
            accessToken?: string;
            refreshToken?: string;
          }>("/auth/register", data);

          if (!response.success || !response.data) {
            throw new AppError(
              AppErrorCode.BUSINESS_ERROR,
              response.error?.message,
            );
          }

          const { user, token, accessToken, refreshToken } = response.data;
          const finalAccessToken = accessToken || token;

          await persistTokens(finalAccessToken, refreshToken);
          set({
            user,
            accessToken: finalAccessToken,
            refreshToken: refreshToken ?? null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          const appError = toAppError(err);
          set({ error: appError, isLoading: false });
          throw appError;
        }
      },

      logout: async () => {
        try {
          await apiClient.clearAuth();
        } catch {
          // ignore clear errors during logout
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshAuth: async () => {
        const { isRefreshing, refreshToken } = get();
        if (isRefreshing) return;
        if (!refreshToken) {
          await get().logout();
          return;
        }

        set({ isRefreshing: true });
        try {
          const response = await apiClient.post<AuthTokens>("/auth/refresh", {
            refreshToken,
          });

          if (!response.success || !response.data) {
            throw new AppError(AppErrorCode.TOKEN_REFRESH_FAILED);
          }

          const { accessToken: newAccess, refreshToken: newRefresh } =
            response.data;
          await persistTokens(newAccess, newRefresh);

          const meResponse = await apiClient.get<User>("/auth/me");
          set({
            accessToken: newAccess,
            refreshToken: newRefresh,
            user: meResponse.success ? meResponse.data ?? get().user : get().user,
            isRefreshing: false,
          });
        } catch (err) {
          set({ isRefreshing: false });
          await get().logout();
          throw toAppError(err);
        }
      },

      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: !!(state.accessToken && user),
        })),

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-v2-storage",
      storage: createJSONStorage(() => secureStorageAdapter),
      partialize: (state): PersistedAuthState => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

apiClient.onAuthExpired(() => {
  useAuthStore.getState().logout();
});
