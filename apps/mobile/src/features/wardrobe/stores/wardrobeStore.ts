import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserClothing {
  id: string;
  userId: string;
  name: string;
  category: string;
  subcategory?: string;
  imageUri: string;
  color?: string;
  brand?: string;
  size?: string;
  purchaseDate?: string;
  price?: number;
  tags: string[];
  occasions: string[];
  seasons: string[];
  style: string[];
  notes?: string;
  isFavorite: boolean;
  wearCount: number;
  lastWorn?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Outfit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  items: string[];
  occasions: string[];
  seasons: string[];
  style: string;
  imageUri?: string;
  isFavorite: boolean;
  wearCount: number;
  lastWorn?: string;
  createdAt: string;
  updatedAt: string;
}

interface WardrobeStats {
  totalItems: number;
  totalOutfits: number;
  categories: Record<string, number>;
  styles: Record<string, number>;
  colors: Record<string, number>;
  mostWorn: string | null;
  leastWorn: string | null;
  totalValue: number;
}

interface WardrobeState {
  items: UserClothing[];
  outfits: Outfit[];
  stats: WardrobeStats;
  selectedItems: string[];
  filterCategory: string | null;
  filterSeason: string | null;
  filterOccasion: string | null;
  sortBy: "newest" | "oldest" | "mostWorn" | "leastWorn" | "name";
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  setItems: (items: UserClothing[]) => void;
  addItem: (item: UserClothing) => void;
  updateItem: (id: string, data: Partial<UserClothing>) => void;
  removeItem: (id: string) => void;
  setOutfits: (outfits: Outfit[]) => void;
  addOutfit: (outfit: Outfit) => void;
  updateOutfit: (id: string, data: Partial<Outfit>) => void;
  removeOutfit: (id: string) => void;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  clearSelection: () => void;
  setFilterCategory: (category: string | null) => void;
  setFilterSeason: (season: string | null) => void;
  setFilterOccasion: (occasion: string | null) => void;
  setSortBy: (sortBy: WardrobeState["sortBy"]) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  incrementWearCount: (id: string, type: "item" | "outfit") => void;
  recalculateStats: () => void;
  fetchUserClothing: () => Promise<void>;
  fetchOutfits: () => Promise<void>;
}

const defaultStats: WardrobeStats = {
  totalItems: 0,
  totalOutfits: 0,
  categories: {},
  styles: {},
  colors: {},
  mostWorn: null,
  leastWorn: null,
  totalValue: 0,
};

export const useWardrobeStore = create<WardrobeState>()(
  persist(
    (set, get) => ({
      items: [],
      outfits: [],
      stats: defaultStats,
      selectedItems: [],
      filterCategory: null,
      filterSeason: null,
      filterOccasion: null,
      sortBy: "newest",
      searchQuery: "",
      isLoading: false,
      error: null,

      setItems: (items) => {
        set({ items });
        get().recalculateStats();
      },

      addItem: (item) => {
        set((state) => ({ items: [item, ...state.items] }));
        get().recalculateStats();
      },

      updateItem: (id, data) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item
          ),
        }));
        get().recalculateStats();
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedItems: state.selectedItems.filter((sid) => sid !== id),
        }));
        get().recalculateStats();
      },

      setOutfits: (outfits) => {
        set({ outfits });
        get().recalculateStats();
      },

      addOutfit: (outfit) => {
        set((state) => ({ outfits: [outfit, ...state.outfits] }));
        get().recalculateStats();
      },

      updateOutfit: (id, data) => {
        set((state) => ({
          outfits: state.outfits.map((outfit) =>
            outfit.id === id ? { ...outfit, ...data, updatedAt: new Date().toISOString() } : outfit
          ),
        }));
      },

      removeOutfit: (id) => {
        set((state) => ({
          outfits: state.outfits.filter((outfit) => outfit.id !== id),
        }));
        get().recalculateStats();
      },

      selectItem: (id) =>
        set((state) => ({
          selectedItems: [...state.selectedItems, id],
        })),

      deselectItem: (id) =>
        set((state) => ({
          selectedItems: state.selectedItems.filter((sid) => sid !== id),
        })),

      clearSelection: () => set({ selectedItems: [] }),

      setFilterCategory: (filterCategory) => set({ filterCategory }),

      setFilterSeason: (filterSeason) => set({ filterSeason }),

      setFilterOccasion: (filterOccasion) => set({ filterOccasion }),

      setSortBy: (sortBy) => set({ sortBy }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      incrementWearCount: (id, type) => {
        const now = new Date().toISOString();
        if (type === "item") {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, wearCount: item.wearCount + 1, lastWorn: now } : item
            ),
          }));
        } else {
          set((state) => ({
            outfits: state.outfits.map((outfit) =>
              outfit.id === id
                ? { ...outfit, wearCount: outfit.wearCount + 1, lastWorn: now }
                : outfit
            ),
          }));
        }
        get().recalculateStats();
      },

      recalculateStats: () => {
        const { items, outfits } = get();

        const categories: Record<string, number> = {};
        const styles: Record<string, number> = {};
        const colors: Record<string, number> = {};
        let totalValue = 0;
        let mostWorn: string | null = null;
        let leastWorn: string | null = null;
        let maxWear = 0;
        let minWear = Infinity;

        items.forEach((item) => {
          categories[item.category] = (categories[item.category] || 0) + 1;
          item.style?.forEach((s) => {
            styles[s] = (styles[s] || 0) + 1;
          });
          if (item.color) {
            colors[item.color] = (colors[item.color] || 0) + 1;
          }
          if (item.price) {
            totalValue += item.price;
          }
          if (item.wearCount > maxWear) {
            maxWear = item.wearCount;
            mostWorn = item.id;
          }
          if (item.wearCount < minWear) {
            minWear = item.wearCount;
            leastWorn = item.id;
          }
        });

        set({
          stats: {
            totalItems: items.length,
            totalOutfits: outfits.length,
            categories,
            styles,
            colors,
            mostWorn,
            leastWorn,
            totalValue,
          },
        });
      },

      fetchUserClothing: async () => {
        set({ isLoading: true, error: null });
        try {
          // TODO: 连接后端 GET /wardrobe/items API 后替换
          set({ error: '功能开发中，敬请期待', isLoading: false });
        } catch {
          set({ error: '获取衣橱列表失败，请稍后重试', isLoading: false });
        }
      },

      fetchOutfits: async () => {
        set({ isLoading: true, error: null });
        try {
          // TODO: 连接后端 GET /wardrobe/outfits API 后替换
          set({ error: '功能开发中，敬请期待', isLoading: false });
        } catch {
          set({ error: '获取穿搭方案失败，请稍后重试', isLoading: false });
        }
      },
    }),
    {
      name: "wardrobe-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        outfits: state.outfits,
        sortBy: state.sortBy,
      }),
    }
  )
);

export const useWardrobeItems = () => useWardrobeStore((state) => state.items);
export const useWardrobeOutfits = () => useWardrobeStore((state) => state.outfits);
export const useWardrobeStats = () => useWardrobeStore((state) => state.stats);
export const useWardrobeSelection = () => useWardrobeStore((state) => state.selectedItems);
