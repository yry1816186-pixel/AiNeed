import { create } from "zustand";
import { recommendationFeedApi } from "../../../services/api/recommendation-feed.api";

interface RecommendationItem {
  item_id: string;
  score: number;
  category: string;
  style: string[];
  colors: string[];
  reasons: string[];
}

interface RecommendationState {
  recommendations: RecommendationItem[];
  similarItems: RecommendationItem[];
  outfitRecommendations: Record<string, RecommendationItem[]>;
  isLoading: boolean;
  error: string | null;
  setRecommendations: (items: RecommendationItem[]) => void;
  setSimilarItems: (items: RecommendationItem[]) => void;
  setOutfitRecommendations: (recs: Record<string, RecommendationItem[]>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clear: () => void;
  fetchRecommendations: (category?: string, page?: number, pageSize?: number) => Promise<void>;
  fetchSimilarItems: (clothingId: string) => Promise<void>;
}

export const useRecommendationStore = create<RecommendationState>((set) => ({
  recommendations: [],
  similarItems: [],
  outfitRecommendations: {},
  isLoading: false,
  error: null,
  setRecommendations: (recommendations) => set({ recommendations }),
  setSimilarItems: (similarItems) => set({ similarItems }),
  setOutfitRecommendations: (outfitRecommendations) => set({ outfitRecommendations }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  clear: () => set({ recommendations: [], similarItems: [], outfitRecommendations: {}, error: null }),

  fetchRecommendations: async (category = "daily", page = 1, pageSize = 10) => {
    set({ isLoading: true, error: null });
    try {
      const result = await recommendationFeedApi.getFeed({ category: category as "daily" | "occasion" | "trending" | "explore", page, pageSize });
      // Map FeedItem to RecommendationItem format
      const mapped: RecommendationItem[] = result.items.map((item) => ({
        item_id: item.id,
        score: item.colorHarmony?.score ?? 0,
        category: item.category,
        style: item.styleTags ?? [],
        colors: item.colorHarmony?.colors ?? [],
        reasons: item.matchReason ? [item.matchReason] : [],
      }));
      set({ recommendations: mapped, isLoading: false });
    } catch {
      set({ error: '获取推荐失败，请稍后重试', isLoading: false });
    }
  },

  fetchSimilarItems: async (_clothingId: string) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: 连接后端 GET /recommendations/complete-the-look/:clothingId API 后替换
      set({ error: '功能开发中，敬请期待', isLoading: false });
    } catch {
      set({ error: '获取相似商品失败，请稍后重试', isLoading: false });
    }
  },
}));
