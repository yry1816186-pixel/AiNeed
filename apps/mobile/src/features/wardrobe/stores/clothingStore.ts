import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clothingApi } from "../../../services/api/clothing.api";

export interface ClothingItem {
  id: string;
  name: string;
  brand?: string;
  category: string;
  subcategory?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  colors: string[];
  sizes: string[];
  style?: string[];
  occasions?: string[];
  seasons?: string[];
  description?: string;
  rating?: number;
  reviewCount?: number;
  stock?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClothingFilter {
  categories: string[];
  priceRange: [number, number];
  colors: string[];
  sizes: string[];
  styles: string[];
  occasions: string[];
  seasons: string[];
  brands: string[];
  sortBy: "newest" | "price_asc" | "price_desc" | "rating" | "popularity";
  searchQuery: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  hasMore: boolean;
  total: number;
}

export interface ClothingSortOptions {
  sortBy: ClothingFilter["sortBy"];
  sortOrder: "asc" | "desc";
}

interface ClothingState {
  items: ClothingItem[];
  featuredItems: ClothingItem[];
  trendingItems: ClothingItem[];
  newArrivals: ClothingItem[];
  filters: ClothingFilter;
  pagination: PaginationState;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  viewMode: "grid" | "list";
  isLoading: boolean;
  error: string | null;

  setItems: (items: ClothingItem[]) => void;
  addItems: (items: ClothingItem[]) => void;
  setFeaturedItems: (items: ClothingItem[]) => void;
  setTrendingItems: (items: ClothingItem[]) => void;
  setNewArrivals: (items: ClothingItem[]) => void;
  setFilters: (filters: Partial<ClothingFilter>) => void;
  resetFilters: () => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedSubcategory: (subcategory: string | null) => void;
  setViewMode: (mode: "grid" | "list") => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
  fetchClothing: (page?: number, limit?: number) => Promise<void>;
  fetchFeatured: (limit?: number) => Promise<void>;
  fetchTrending: () => Promise<void>;
  fetchNewArrivals: () => Promise<void>;
}

const defaultFilters: ClothingFilter = {
  categories: [],
  priceRange: [0, 100000],
  colors: [],
  sizes: [],
  styles: [],
  occasions: [],
  seasons: [],
  brands: [],
  sortBy: "newest",
  searchQuery: "",
};

const defaultPagination: PaginationState = {
  page: 1,
  pageSize: 20,
  hasMore: true,
  total: 0,
};

export const useClothingStore = create<ClothingState>()(
  persist(
    (set) => ({
      items: [],
      featuredItems: [],
      trendingItems: [],
      newArrivals: [],
      filters: defaultFilters,
      pagination: defaultPagination,
      selectedCategory: null,
      selectedSubcategory: null,
      viewMode: "grid",
      isLoading: false,
      error: null,

      setItems: (items) => set({ items }),

      addItems: (newItems) =>
        set((state) => ({
          items: [...state.items, ...newItems],
        })),

      setFeaturedItems: (featuredItems) => set({ featuredItems }),

      setTrendingItems: (trendingItems) => set({ trendingItems }),

      setNewArrivals: (newArrivals) => set({ newArrivals }),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
          pagination: { ...state.pagination, page: 1 },
        })),

      resetFilters: () =>
        set({
          filters: defaultFilters,
          pagination: defaultPagination,
        }),

      setPagination: (pagination) =>
        set((state) => ({
          pagination: { ...state.pagination, ...pagination },
        })),

      setSelectedCategory: (selectedCategory) =>
        set({
          selectedCategory,
          selectedSubcategory: null,
          pagination: { ...defaultPagination },
        }),

      setSelectedSubcategory: (selectedSubcategory) =>
        set({
          selectedSubcategory,
          pagination: { ...defaultPagination },
        }),

      setViewMode: (viewMode) => set({ viewMode }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clear: () =>
        set({
          items: [],
          filters: defaultFilters,
          pagination: defaultPagination,
          error: null,
        }),

      fetchClothing: async (page = 1, limit = 20) => {
        set({ isLoading: true, error: null });
        try {
          const response = await clothingApi.getAll({ page, limit });
          if (response.success && response.data) {
            set({
              items: response.data.items as unknown as ClothingItem[],
              pagination: {
                page: response.data.page,
                pageSize: response.data.pageSize,
                hasMore: response.data.hasMore ?? false,
                total: response.data.total,
              },
              isLoading: false,
            });
          } else {
            set({ error: '获取服装列表失败，请稍后重试', isLoading: false });
          }
        } catch {
          set({ error: '获取服装列表失败，请稍后重试', isLoading: false });
        }
      },

      fetchFeatured: async (limit = 10) => {
        set({ isLoading: true, error: null });
        try {
          const response = await clothingApi.getAll({ page: 1, limit });
          if (response.success && response.data) {
            set({ featuredItems: response.data.items as unknown as ClothingItem[], isLoading: false });
          } else {
            set({ error: '获取精选商品失败，请稍后重试', isLoading: false });
          }
        } catch {
          set({ error: '获取精选商品失败，请稍后重试', isLoading: false });
        }
      },

      fetchTrending: async () => {
        set({ isLoading: true, error: null });
        try {
          // TODO: 连接后端 GET /clothing?filter=trending API 后替换
          set({ error: '功能开发中，敬请期待', isLoading: false });
        } catch {
          set({ error: '获取趋势商品失败，请稍后重试', isLoading: false });
        }
      },

      fetchNewArrivals: async () => {
        set({ isLoading: true, error: null });
        try {
          // TODO: 连接后端 GET /clothing?filter=new API 后替换
          set({ error: '功能开发中，敬请期待', isLoading: false });
        } catch {
          set({ error: '获取新品失败，请稍后重试', isLoading: false });
        }
      },
    }),
    {
      name: "clothing-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        filters: state.filters,
        viewMode: state.viewMode,
      }),
    }
  )
);

export const useClothingFilters = () => useClothingStore((state) => state.filters);
export const useClothingPagination = () => useClothingStore((state) => state.pagination);
export const useClothingLoading = () => useClothingStore((state) => state.isLoading);
