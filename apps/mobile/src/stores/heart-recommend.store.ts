import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SwipeAction {
  itemId: string;
  action: "like" | "dislike" | "cart" | "skip";
  timestamp: number;
  category?: string;
  style?: string[];
  price?: number;
}

export interface LikedItemData {
  id: string;
  name: string;
  brand?: string;
  price: number;
  mainImage: string;
  category: string;
  score?: number;
  matchReasons?: string[];
}

interface HeartRecommendState {
  swipeHistory: SwipeAction[];
  likedItems: string[];
  likedItemDataMap: Record<string, LikedItemData>;
  dislikedItems: string[];
  cartAddedItems: string[];
  sessionStats: {
    totalSwipes: number;
    likes: number;
    dislikes: number;
    cartAdds: number;
    skips: number;
  };
  preferences: {
    preferredCategories: Record<string, number>;
    preferredPriceRange: { min: number; max: number };
    preferredStyles: Record<string, number>;
  };
  addSwipeAction: (action: SwipeAction) => void;
  markAsLiked: (itemId: string, itemData?: LikedItemData) => void;
  removeLikedItem: (itemId: string) => void;
  markAsDisliked: (itemId: string) => void;
  markAsCartAdded: (itemId: string) => void;
  updatePreferences: (category: string, style: string[], price: number) => void;
  getSessionStats: () => {
    totalSwipes: number;
    likes: number;
    dislikes: number;
    cartAdds: number;
    skips: number;
  };
  clearSession: () => void;
}

export const useHeartRecommendStore = create<HeartRecommendState>()(
  persist(
    (set, get) => ({
      swipeHistory: [],
      likedItems: [],
      likedItemDataMap: {},
      dislikedItems: [],
      cartAddedItems: [],
      sessionStats: {
        totalSwipes: 0,
        likes: 0,
        dislikes: 0,
        cartAdds: 0,
        skips: 0,
      },
      preferences: {
        preferredCategories: {},
        preferredPriceRange: { min: 0, max: 10000 },
        preferredStyles: {},
      },
      addSwipeAction: (action) =>
        set((state) => ({
          swipeHistory: [...state.swipeHistory, action].slice(-100),
        })),
      markAsLiked: (itemId, itemData) =>
        set((state) => ({
          likedItems: [...new Set([...state.likedItems, itemId])],
          likedItemDataMap: itemData
            ? { ...state.likedItemDataMap, [itemId]: itemData }
            : state.likedItemDataMap,
          sessionStats: {
            ...state.sessionStats,
            totalSwipes: state.sessionStats.totalSwipes + 1,
            likes: state.sessionStats.likes + 1,
          },
        })),
      removeLikedItem: (itemId) =>
        set((state) => {
          const { [itemId]: _, ...rest } = state.likedItemDataMap;
          return {
            likedItems: state.likedItems.filter((id) => id !== itemId),
            likedItemDataMap: rest,
          };
        }),
      markAsDisliked: (itemId) =>
        set((state) => ({
          dislikedItems: [...new Set([...state.dislikedItems, itemId])],
          sessionStats: {
            ...state.sessionStats,
            totalSwipes: state.sessionStats.totalSwipes + 1,
            dislikes: state.sessionStats.dislikes + 1,
          },
        })),
      markAsCartAdded: (itemId) =>
        set((state) => ({
          cartAddedItems: [...new Set([...state.cartAddedItems, itemId])],
          sessionStats: {
            ...state.sessionStats,
            totalSwipes: state.sessionStats.totalSwipes + 1,
            cartAdds: state.sessionStats.cartAdds + 1,
          },
        })),
      updatePreferences: (category, style, price) =>
        set((state) => {
          const preferredCategories = {
            ...state.preferences.preferredCategories,
          };
          preferredCategories[category] = (preferredCategories[category] || 0) + 1;

          const preferredStyles = { ...state.preferences.preferredStyles };
          style.forEach((s) => {
            preferredStyles[s] = (preferredStyles[s] || 0) + 1;
          });

          const prices = [
            state.preferences.preferredPriceRange.min,
            state.preferences.preferredPriceRange.max,
            price,
          ].filter((p) => p > 0);

          return {
            preferences: {
              preferredCategories,
              preferredPriceRange: {
                min: Math.min(...prices),
                max: Math.max(...prices),
              },
              preferredStyles,
            },
          };
        }),
      getSessionStats: () => get().sessionStats,
      clearSession: () =>
        set({
          sessionStats: {
            totalSwipes: 0,
            likes: 0,
            dislikes: 0,
            cartAdds: 0,
            skips: 0,
          },
        }),
    }),
    {
      name: "heart-recommend-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        likedItems: state.likedItems,
        likedItemDataMap: state.likedItemDataMap,
        dislikedItems: state.dislikedItems,
        preferences: state.preferences,
      }),
    }
  )
);
