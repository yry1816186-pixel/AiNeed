﻿﻿import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { profileApi, type UserProfile } from "../../../services/api/profile.api";
import { weatherService } from "../../../services/weatherService";

export interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  suggestion: string;
  city: string;
  cachedAt: number;
}

const WEATHER_CACHE_TTL = 30 * 60 * 1000;

interface HomeState {
  profileCompletionPercent: number;
  isProfileComplete: boolean;
  isBannerDismissed: boolean;
  weatherData: WeatherData | null;
  isLoadingWeather: boolean;
  isLoadingProfile: boolean;
  dismissBanner: () => void;
  setWeatherData: (data: WeatherData) => void;
  setLoadingWeather: (loading: boolean) => void;
  fetchWeather: (latitude: number, longitude: number) => Promise<void>;
  fetchProfileCompletion: () => Promise<void>;
  resetBannerOnAppStart: () => void;
}

function calculateProfileCompletion(profile: UserProfile): number {
  let completion = 0;

  if (profile.gender) {
    completion += 10;
  }

  if (profile.height && profile.weight) {
    completion += 15;
  }

  if (profile.bodyType) {
    completion += 15;
  }

  if (profile.skinTone) {
    completion += 10;
  }

  if (profile.colorSeason) {
    completion += 10;
  }

  if (
    profile.stylePreferences &&
    profile.stylePreferences.preferredStyles &&
    profile.stylePreferences.preferredStyles.length > 0
  ) {
    completion += 20;
  }

  if (profile.sizeTop && profile.sizeBottom && profile.sizeShoes) {
    completion += 10;
  }

  if (profile.budget) {
    completion += 10;
  }

  return completion;
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      profileCompletionPercent: 0,
      isProfileComplete: false,
      isBannerDismissed: false,
      weatherData: null,
      isLoadingWeather: false,
      isLoadingProfile: false,

      dismissBanner: () => set({ isBannerDismissed: true }),

      setWeatherData: (data) => set({ weatherData: data }),

      setLoadingWeather: (loading) => set({ isLoadingWeather: loading }),

      fetchWeather: async (latitude, longitude) => {
        const { weatherData } = get();

        if (weatherData && Date.now() - weatherData.cachedAt < WEATHER_CACHE_TTL) {
          return;
        }

        set({ isLoadingWeather: true });
        try {
          const info = await weatherService.getWeather(latitude, longitude);
          set({
            weatherData: {
              ...info,
              cachedAt: Date.now(),
            },
            isLoadingWeather: false,
          });
        } catch {
          set({ isLoadingWeather: false });
        }
      },

      fetchProfileCompletion: async () => {
        set({ isLoadingProfile: true });
        try {
          const response = await profileApi.getProfile();
          if (response.success && response.data) {
            const percent = calculateProfileCompletion(response.data);
            set({
              profileCompletionPercent: percent,
              isProfileComplete: percent >= 80,
              isLoadingProfile: false,
            });
          } else {
            set({ isLoadingProfile: false });
          }
        } catch {
          set({ isLoadingProfile: false });
        }
      },

      resetBannerOnAppStart: () => set({ isBannerDismissed: false }),
    }),
    {
      name: "home-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profileCompletionPercent: state.profileCompletionPercent,
        isProfileComplete: state.isProfileComplete,
        weatherData: state.weatherData,
      }),
    }
  )
);

export const useProfileCompletion = () =>
  useHomeStore((state) => ({
    profileCompletionPercent: state.profileCompletionPercent,
    isProfileComplete: state.isProfileComplete,
    isLoadingProfile: state.isLoadingProfile,
  }));

export const useWeatherData = () =>
  useHomeStore((state) => ({
    weatherData: state.weatherData,
    isLoadingWeather: state.isLoadingWeather,
  }));

export const useBannerState = () =>
  useHomeStore((state) => ({
    isBannerDismissed: state.isBannerDismissed,
    dismissBanner: state.dismissBanner,
    resetBannerOnAppStart: state.resetBannerOnAppStart,
  }));

// ==================== Recommendation Feed Store ====================

import {
  recommendationFeedApi,
  type FeedItem,
  type FeedCategory,
} from "../../../services/api/recommendation-feed.api";
import { recommendationsApi } from "../../../services/api/tryon.api";

interface FeedState {
  items: FeedItem[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  activeCategory: FeedCategory;
  activeSubCategory: string | null;
  page: number;
  error: string | null;

  setCategory: (category: FeedCategory) => void;
  setSubCategory: (subCategory: string | null) => void;
  fetchFeed: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  submitFeedback: (
    clothingId: string,
    action: "like" | "dislike" | "ignore",
    recommendationId?: string,
    reason?: string
  ) => Promise<void>;
}

const PAGE_SIZE = 10;

function deduplicateItems(existing: FeedItem[], incoming: FeedItem[]): FeedItem[] {
  const seenIds = new Set(existing.map((item) => item.id));
  const unique = incoming.filter((item) => !seenIds.has(item.id));
  return [...existing, ...unique];
}

export const useRecommendationFeedStore = create<FeedState>((set, get) => ({
  items: [],
  total: 0,
  hasMore: true,
  isLoading: false,
  isRefreshing: false,
  activeCategory: "daily",
  activeSubCategory: null,
  page: 1,
  error: null,

  setCategory: (category) => {
    set({
      activeCategory: category,
      items: [],
      page: 1,
      hasMore: true,
      error: null,
    });
    void get().fetchFeed(true);
  },

  setSubCategory: (subCategory) => {
    set({
      activeSubCategory: subCategory,
      items: [],
      page: 1,
      hasMore: true,
      error: null,
    });
    void get().fetchFeed(true);
  },

  fetchFeed: async (reset = false) => {
    const state = get();
    if (state.isLoading) {
      return;
    }

    const page = reset ? 1 : state.page;
    set({ isLoading: true, error: null });

    try {
      const result = await recommendationFeedApi.getFeed({
        category: state.activeCategory,
        subCategory: state.activeSubCategory || undefined,
        page,
        pageSize: PAGE_SIZE,
      });

      set({
        items: reset ? result.items : deduplicateItems(state.items, result.items),
        total: result.total,
        hasMore: result.hasMore,
        page: page + 1,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "加载失败",
      });
    }
  },

  loadMore: async () => {
    const state = get();
    if (state.isLoading || !state.hasMore) {
      return;
    }
    await get().fetchFeed(false);
  },

  refresh: async () => {
    set({ isRefreshing: true });
    await get().fetchFeed(true);
    set({ isRefreshing: false });
  },

  reset: () => {
    set({
      items: [],
      total: 0,
      hasMore: true,
      page: 1,
      error: null,
      activeCategory: "daily",
      activeSubCategory: null,
    });
  },

  submitFeedback: async (clothingId, action, recommendationId, reason) => {
    try {
      await recommendationsApi.submitFeedback({
        clothingId,
        action,
        recommendationId,
        reason,
      });

      if (action === "dislike" || action === "ignore") {
        set((state) => ({
          items: state.items.filter((item) => item.id !== clothingId),
          total: Math.max(0, state.total - 1),
        }));
      }
    } catch {
      // 反馈失败不影响主流程，静默处理
    }
  },
}));
