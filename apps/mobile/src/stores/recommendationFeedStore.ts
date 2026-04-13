import { create } from "zustand";
import { recommendationFeedApi, type FeedItem, type FeedCategory } from "../services/api/recommendation-feed.api";

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
}

const PAGE_SIZE = 10;

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
    get().fetchFeed(true);
  },

  setSubCategory: (subCategory) => {
    set({
      activeSubCategory: subCategory,
      items: [],
      page: 1,
      hasMore: true,
      error: null,
    });
    get().fetchFeed(true);
  },

  fetchFeed: async (reset = false) => {
    const state = get();
    if (state.isLoading) return;

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
        items: reset ? result.items : [...state.items, ...result.items],
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
    if (state.isLoading || !state.hasMore) return;
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
}));
