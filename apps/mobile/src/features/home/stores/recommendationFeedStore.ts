import { create } from "zustand";
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

/** 按 item.id 去重，保留已有项（先出现的优先） */
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

      // dislike/ignore 时从列表中移除该项，实现反馈闭环
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
