import { create } from "zustand";

import { sizeRecommendationApi, type SizeRecommendation } from "../../../services/api/commerce.api";

interface SizeRecommendationStore {
  recommendations: Record<string, SizeRecommendation | null>;
  isLoading: Record<string, boolean>;
  error: string | null;

  fetchRecommendation: (itemId: string) => Promise<void>;
  getRecommendation: (itemId: string) => SizeRecommendation | null | undefined;
  setError: (message: string) => void;
  clearError: () => void;
  clearAll: () => void;
}

export const useSizeRecommendationStore = create<SizeRecommendationStore>((set, get) => ({
  recommendations: {},
  isLoading: {},
  error: null,

  fetchRecommendation: async (itemId: string) => {
    set((state) => ({
      isLoading: { ...state.isLoading, [itemId]: true },
      error: null,
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
      set((state) => ({
        error: '获取尺码推荐失败',
        isLoading: { ...state.isLoading, [itemId]: false },
      }));
    } finally {
      set((state) => ({
        isLoading: { ...state.isLoading, [itemId]: false },
      }));
    }
  },

  getRecommendation: (itemId: string) => {
    return get().recommendations[itemId];
  },

  setError: (message: string) => set({ error: message }),
  clearError: () => set({ error: null }),

  clearAll: () => {
    set({ recommendations: {}, isLoading: {}, error: null });
  },
}));
