import { apiClient } from "./client";

export interface FeedItem {
  id: string;
  mainImage: string;
  brand: { id: string; name: string } | null;
  price: number;
  originalPrice?: number;
  styleTags: string[];
  colorHarmony: { score: number; colors: string[] };
  matchReason: string;
  category: string;
}

export interface FeedResult {
  items: FeedItem[];
  total: number;
  hasMore: boolean;
}

export type FeedCategory = "daily" | "occasion" | "trending" | "explore";

export interface FeedParams {
  category?: FeedCategory;
  subCategory?: string;
  page?: number;
  pageSize?: number;
}

export const recommendationFeedApi = {
  getFeed: async (params: FeedParams = {}): Promise<FeedResult> => {
    const { category = "daily", subCategory, page = 1, pageSize = 10 } = params;
    const queryParams: Record<string, string | number> = {
      category,
      page,
      pageSize,
    };
    if (subCategory) queryParams.subCategory = subCategory;

    const response = await apiClient.get<FeedResult>(
      "/recommendations/feed",
      queryParams,
    );
    return response;
  },

  getDaily: async (page = 1, pageSize = 10) =>
    recommendationFeedApi.getFeed({ category: "daily", page, pageSize }),

  getOccasion: async (subCategory?: string, page = 1, pageSize = 10) =>
    recommendationFeedApi.getFeed({
      category: "occasion",
      subCategory,
      page,
      pageSize,
    }),

  getTrending: async (page = 1, pageSize = 10) =>
    recommendationFeedApi.getFeed({ category: "trending", page, pageSize }),

  getExplore: async (page = 1, pageSize = 10) =>
    recommendationFeedApi.getFeed({ category: "explore", page, pageSize }),
};
