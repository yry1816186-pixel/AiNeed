import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { profileApi, type UserProfile } from "../services/api/profile.api";
import { weatherService } from "../services/weatherService";

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
