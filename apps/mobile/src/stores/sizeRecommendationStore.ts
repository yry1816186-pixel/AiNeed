import { create } from "zustand";

import {
  sizeRecommendationApi,
  type SizeRecommendation,
} from "../services/api/commerce.api";

interface SizeRecommendationStore {
  recommendations: Record<string, SizeRecommendation | null>;
  isLoading: Record<string, boolean>;

  fetchRecommendation: (itemId: string) => Promise<void>;
  getRecommendation: (itemId: string) => SizeRecommendation | null | undefined;
  clearAll: () => void;
}

export const useSizeRecommendationStore = create<SizeRecommendationStore>(
  (set, get) => ({
    recommendations: {},
    isLoading: {},

    fetchRecommendation: async (itemId: string) => {
      set((state) => ({
        isLoading: { ...state.isLoading, [itemId]: true },
      }));
      try {
        const response = await sizeRecommendationApi.getSizeRecommendation(itemId);
        if (response.success) {
          set((state) => ({
            recommendations: {
              ...state.recommendations,
              [itemId]: response.data ?? null,
            },
          }));
        }
      } catch (error) {
        console.error("Failed to fetch size recommendation:", error);
      } finally {
        set((state) => ({
          isLoading: { ...state.isLoading, [itemId]: false },
        }));
      }
    },

    getRecommendation: (itemId: string) => {
      return get().recommendations[itemId];
    },

    clearAll: () => {
      set({ recommendations: {}, isLoading: {} });
    },
  }),
);
