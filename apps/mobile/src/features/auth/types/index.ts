﻿import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../../../services/api/client";
import { toAppError } from "../../../services/api/error";
import type { User, UserPreferences, UserStats } from "../../../types/user";
import type { ApiResponse } from "../../../types";

// Re-export types for auth module consumers
export type { User, UserPreferences, UserStats, AuthTokens, LoginCredentials, RegisterData } from "./user";
export type { ApiResponse } from "../../../types";

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

interface UserState {
  profile: User | null;
  preferences: UserPreferences | null;
  styleProfile: StyleProfile | null;
  stats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  fetchProfile: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  fetchStats: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
  updateStyleProfile: (data: Partial<StyleProfile>) => Promise<void>;
  refreshAll: () => Promise<void>;
  clearUser: () => void;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function isCacheValid(lastFetchedAt: number | null): boolean {
  if (!lastFetchedAt) {
    return false;
  }
  return Date.now() - lastFetchedAt < CACHE_TTL_MS;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      preferences: null,
      styleProfile: null,
      stats: null,
      isLoading: false,
      error: null,
      lastFetchedAt: null,

      fetchProfile: async () => {
        const { lastFetchedAt, profile } = get();
        if (profile && isCacheValid(lastFetchedAt)) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<User> = await apiClient.get<User>("/auth/me");
          if (response.success && response.data) {
            set({ profile: response.data, lastFetchedAt: Date.now() });
          } else {
            set({ error: response.error?.message || "获取用户信息失败" });
          }
        } catch (err) {
          set({ error: toAppError(err).userMessage });
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
        } catch {
          // non-blocking
        }
      },

      fetchStats: async () => {
        try {
          const response: ApiResponse<UserStats> = await apiClient.get<UserStats>("/user/stats");
          if (response.success && response.data) {
            set({ stats: response.data });
          }
        } catch {
          // non-blocking
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });
        try {
          const response: ApiResponse<User> = await apiClient.put<User>("/auth/profile", data);
          if (response.success && response.data) {
            set({ profile: response.data, lastFetchedAt: Date.now() });
          } else {
            set({ error: response.error?.message || "更新用户信息失败" });
          }
        } catch (err) {
          set({ error: toAppError(err).userMessage });
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
            set({ error: response.error?.message || "更新偏好失败" });
          }
        } catch (err) {
          set({ error: toAppError(err).userMessage });
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

          const profile =
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
            profile,
            preferences,
            stats,
            lastFetchedAt: Date.now(),
            isLoading: false,
          });
        } catch (err) {
          set({ error: toAppError(err).userMessage, isLoading: false });
        }
      },

      clearUser: () =>
        set({
          profile: null,
          preferences: null,
          styleProfile: null,
          stats: null,
          error: null,
          lastFetchedAt: null,
        }),
    }),
    {
      name: "user-v2-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        styleProfile: state.styleProfile,
      }),
    }
  )
);
