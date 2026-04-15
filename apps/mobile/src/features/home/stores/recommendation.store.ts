import { create } from "zustand";

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
  setRecommendations: (items: RecommendationItem[]) => void;
  setSimilarItems: (items: RecommendationItem[]) => void;
  setOutfitRecommendations: (recs: Record<string, RecommendationItem[]>) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useRecommendationStore = create<RecommendationState>((set) => ({
  recommendations: [],
  similarItems: [],
  outfitRecommendations: {},
  isLoading: false,
  setRecommendations: (recommendations) => set({ recommendations }),
  setSimilarItems: (similarItems) => set({ similarItems }),
  setOutfitRecommendations: (outfitRecommendations) => set({ outfitRecommendations }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ recommendations: [], similarItems: [], outfitRecommendations: {} }),
}));
