import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureStorage, SECURE_STORAGE_KEYS } from "../../../utils/secureStorage";
import apiClient from "../../../services/api/client";
import { AppError, AppErrorCode, toAppError } from "../../../services/api/error";
import type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  UserPreferences,
  UserStats,
} from '../../../types';
import type { ApiResponse } from '../../../types';

interface StyleProfile {
  preferredStyles: string[];
  preferredColors: string[];
  avoidedColors: string[];
  styleAvoidances: string[];
  fitGoals: string[];
  bodyType?: string;
  skinTone?: string;
  colorSeason?: string;
  budget?: "low" | "medium" | "high" | "luxury";
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  onboardingCompleted: boolean;
  isVip: boolean;
  userProfile: User | null;
  preferences: UserPreferences | null;
  styleProfile: StyleProfile | null;
  stats: UserStats | null;
  lastFetchedAt: number | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithPhone: (phone: string, code: string) => Promise<void>;
  loginWithWechat: (code: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
  fetchProfile: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  fetchStats: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
  updateStyleProfile: (data: Partial<StyleProfile>) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const secureStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (name === "auth-v2-storage") {
      const token = await secureStorage.getItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      const refresh = await secureStorage.getItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      const userStr = await secureStorage.getItem(SECURE_STORAGE_KEYS.USER_DATA);
      return JSON.stringify({
        state: {
          accessToken: token,
          refreshToken: refresh,
          user: userStr ? JSON.parse(userStr) : null,
          isAuthenticated: !!token,
          onboardingCompleted: userStr ? (JSON.parse(userStr) as User)?.onboardingCompleted ?? false : false,
          isVip: userStr ? deriveIsVip(JSON.parse(userStr) as User) : false,
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
        await secureStorage.setItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, state.accessToken);
      } else {
        await secureStorage.deleteItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      }
      if (state.refreshToken) {
        await secureStorage.setItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, state.refreshToken);
      } else {
        await secureStorage.deleteItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      }
      if (state.user) {
        await secureStorage.setItem(SECURE_STORAGE_KEYS.USER_DATA, JSON.stringify(state.user));
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
  onboardingCompleted: boolean;
  isVip: boolean;
}

async function persistTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await apiClient.setToken(accessToken);
  if (refreshToken) {
    await apiClient.setRefreshToken(refreshToken);
  }
}

function deriveOnboardingCompleted(user: User | null): boolean {
  return user?.onboardingCompleted ?? false;
}

function deriveIsVip(user: User | null): boolean {
  return user?.subscriptionTier === "vip" || user?.subscriptionTier === "premium";
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function isCacheValid(lastFetchedAt: number | null): boolean {
  if (!lastFetchedAt) {
    return false;
  }
  return Date.now() - lastFetchedAt < CACHE_TTL_MS;
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
      onboardingCompleted: false,
      isVip: false,
      userProfile: null,
      preferences: null,
      styleProfile: null,
      stats: null,
      lastFetchedAt: null,

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
            throw new AppError(AppErrorCode.BUSINESS_ERROR, response.error?.message);
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
            onboardingCompleted: deriveOnboardingCompleted(user),
            isVip: deriveIsVip(user),
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
            throw new AppError(AppErrorCode.BUSINESS_ERROR, response.error?.message);
          }

          const { accessToken, refreshToken, user } = response.data;
          await persistTokens(accessToken, refreshToken);
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            onboardingCompleted: deriveOnboardingCompleted(user),
            isVip: deriveIsVip(user),
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
            throw new AppError(AppErrorCode.BUSINESS_ERROR, response.error?.message);
          }

          const { accessToken, refreshToken, user } = response.data;
          await persistTokens(accessToken, refreshToken);
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            onboardingCompleted: deriveOnboardingCompleted(user),
            isVip: deriveIsVip(user),
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
            throw new AppError(AppErrorCode.BUSINESS_ERROR, response.error?.message);
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
            onboardingCompleted: deriveOnboardingCompleted(user),
            isVip: deriveIsVip(user),
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
        } catch (error) {
          // ignore clear errors during logout
          console.error('Auth cleanup failed:', error);
        }
        const { clearAllStores } = await import("../../../stores/index");
        clearAllStores();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          onboardingCompleted: false,
          isVip: false,
          userProfile: null,
          preferences: null,
          styleProfile: null,
          stats: null,
          lastFetchedAt: null,
        });
      },

      refreshAuth: async () => {
        const { isRefreshing, refreshToken } = get();
        if (isRefreshing) {
          return;
        }
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

          const { accessToken: newAccess, refreshToken: newRefresh } = response.data;
          await persistTokens(newAccess, newRefresh);

          const meResponse = await apiClient.get<User>("/auth/me");
          const updatedUser = meResponse.success ? meResponse.data ?? get().user : get().user;
          set({
            accessToken: newAccess,
            refreshToken: newRefresh,
            user: updatedUser,
            isRefreshing: false,
            onboardingCompleted: deriveOnboardingCompleted(updatedUser),
            isVip: deriveIsVip(updatedUser),
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
          onboardingCompleted: deriveOnboardingCompleted(user),
          isVip: deriveIsVip(user),
        })),

      clearError: () => set({ error: null }),

      fetchProfile: async () => {
        const { lastFetchedAt, userProfile } = get();
        if (userProfile && isCacheValid(lastFetchedAt)) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<User> = await apiClient.get<User>("/auth/me");
          if (response.success && response.data) {
            set({ userProfile: response.data, lastFetchedAt: Date.now() });
          } else {
            set({ error: response.error ? toAppError(response.error) : null });
          }
        } catch (err) {
          set({ error: toAppError(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchPreferences: async () => {
        try {
          const response: ApiResponse<UserPreferences> = await apiClient.get<UserPreferences>(
            "/auth/preferences"
          );
          if (response.success && response.data) {
            set({ preferences: response.data });
          }
        } catch (error) {
          // non-blocking
          console.error('Auth operation failed:', error);
        }
      },

      fetchStats: async () => {
        try {
          const response: ApiResponse<UserStats> = await apiClient.get<UserStats>("/user/stats");
          if (response.success && response.data) {
            set({ stats: response.data });
          }
        } catch (error) {
          // non-blocking
          console.error('Auth operation failed:', error);
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<User> = await apiClient.put<User>("/auth/profile", data);
          if (response.success && response.data) {
            set({ userProfile: response.data, lastFetchedAt: Date.now() });
          } else {
            set({ error: response.error ? toAppError(response.error) : null });
          }
        } catch (err) {
          set({ error: toAppError(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      updatePreferences: async (data: Partial<UserPreferences>) => {
        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<UserPreferences> = await apiClient.put<UserPreferences>(
            "/auth/preferences",
            data
          );
          if (response.success && response.data) {
            set({ preferences: response.data });
          } else {
            set({ error: response.error ? toAppError(response.error) : null });
          }
        } catch (err) {
          set({ error: toAppError(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      updateStyleProfile: async (data: Partial<StyleProfile>) => {
        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<StyleProfile> = await apiClient.put<StyleProfile>(
            "/profile/style",
            data
          );
          if (response.success && response.data) {
            set({ styleProfile: response.data });
          } else {
            set({ styleProfile: { ...get().styleProfile, ...data } as StyleProfile });
          }
        } catch {
          set({ styleProfile: { ...get().styleProfile, ...data } as StyleProfile });
        } finally {
          set({ isLoading: false });
        }
      },

      refreshAll: async () => {
        set({ isLoading: true, error: null });
        try {
          const [profileRes, prefsRes, statsRes] = await Promise.allSettled([
            apiClient.get<User>("/auth/me"),
            apiClient.get<UserPreferences>("/auth/preferences"),
            apiClient.get<UserStats>("/user/stats"),
          ]);

          const userProfile =
            profileRes.status === "fulfilled" && profileRes.value.success
              ? profileRes.value.data ?? null
              : null;
          const preferences =
            prefsRes.status === "fulfilled" && prefsRes.value.success
              ? prefsRes.value.data ?? null
              : null;
          const stats =
            statsRes.status === "fulfilled" && statsRes.value.success
              ? statsRes.value.data ?? null
              : null;

          set({
            userProfile,
            preferences,
            stats,
            lastFetchedAt: Date.now(),
            isLoading: false,
          });
        } catch (err) {
          set({ error: toAppError(err), isLoading: false });
        }
      },
    }),
    {
      name: "auth-v2-storage",
      storage: createJSONStorage(() => secureStorageAdapter),
      partialize: (state): PersistedAuthState => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        onboardingCompleted: state.onboardingCompleted,
        isVip: state.isVip,
      }),
    }
  )
);

apiClient.onAuthExpired(() => {
  void useAuthStore.getState().logout();
});

export type { AuthState, StyleProfile };
