import { create } from "zustand";
import {
  bloggerApi,
  type BloggerDashboardData,
  type TrendDataPoint,
  type TrendMetric,
  type BloggerProduct,
} from "../../../services/api/blogger.api";

interface BloggerState {
  dashboardData: BloggerDashboardData | null;
  trendData: TrendDataPoint[];
  products: BloggerProduct[];
  isLoadingDashboard: boolean;
  isLoadingTrend: boolean;
  isLoadingProducts: boolean;
  error: string | null;

  fetchDashboard: (period: "7d" | "30d") => Promise<void>;
  fetchTrendData: (metric: TrendMetric, period: "7d" | "30d") => Promise<void>;
  fetchProducts: (bloggerId?: string) => Promise<void>;
  clear: () => void;
}

export const useBloggerStore = create<BloggerState>((set) => ({
  dashboardData: null,
  trendData: [],
  products: [],
  isLoadingDashboard: false,
  isLoadingTrend: false,
  isLoadingProducts: false,
  error: null,

  fetchDashboard: async (period) => {
    set({ isLoadingDashboard: true, error: null });
    try {
      const response = await bloggerApi.getDashboard(period);
      if (response.success && response.data) {
        set({ dashboardData: response.data, isLoadingDashboard: false });
      } else {
        set({
          error: response.error?.message ?? "Failed to load dashboard",
          isLoadingDashboard: false,
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load dashboard",
        isLoadingDashboard: false,
      });
    }
  },

  fetchTrendData: async (metric, period) => {
    set({ isLoadingTrend: true, error: null });
    try {
      const response = await bloggerApi.getTrendData(metric, period);
      if (response.success && response.data) {
        set({ trendData: response.data, isLoadingTrend: false });
      } else {
        set({
          error: response.error?.message ?? "Failed to load trend data",
          isLoadingTrend: false,
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load trend data",
        isLoadingTrend: false,
      });
    }
  },

  fetchProducts: async (bloggerId) => {
    set({ isLoadingProducts: true, error: null });
    try {
      const response = await bloggerApi.getProducts({ bloggerId });
      if (response.success && response.data) {
        set({ products: response.data.items, isLoadingProducts: false });
      } else {
        set({
          error: response.error?.message ?? "Failed to load products",
          isLoadingProducts: false,
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load products",
        isLoadingProducts: false,
      });
    }
  },

  clear: () =>
    set({
      dashboardData: null,
      trendData: [],
      products: [],
      error: null,
    }),
}));
