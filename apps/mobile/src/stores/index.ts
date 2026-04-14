import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureStorage, SECURE_STORAGE_KEYS } from "../utils/secureStorage";
import apiClient from "../services/api/client";
import { smsApi } from "../services/api/sms.api";
import type { User } from "../types/user";
import type { ClothingItem } from "./clothingStore";

export * from "./uiStore";
export * from "./clothingStore";
export * from "./wardrobeStore";
export * from "./profileStore";
export * from "./quizStore";
export * from "./styleQuizStore";
export * from "./onboardingStore";
export * from "./photoStore";
export * from "./homeStore";
export * from "./user.store";
export * from "./app.store";
export * from "./aiStylistStore";
export * from "./notificationStore";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingCompleted: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  loginWithPhone: (phone: string, code: string) => Promise<void>;
  loginWithWechat: (code: string) => Promise<void>;
  phoneRegister: (phone: string, code: string, nickname?: string) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => void;
}

const secureStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (name === "auth-storage") {
      const token = await secureStorage.getItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      const userStr = await secureStorage.getItem(
        SECURE_STORAGE_KEYS.USER_DATA,
      );
      const onboardingStr = await AsyncStorage.getItem("auth_onboarding_completed");
      return JSON.stringify({
        state: {
          token,
          user: userStr ? JSON.parse(userStr) : null,
          isAuthenticated: !!token,
          onboardingCompleted: onboardingStr === "true",
        },
        version: 0,
      });
    }
    return AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (name === "auth-storage") {
      const { state } = JSON.parse(value);
      if (state.token) {
        await secureStorage.setItem(
          SECURE_STORAGE_KEYS.AUTH_TOKEN,
          state.token,
        );
      } else {
        await secureStorage.deleteItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      }
      if (state.user) {
        await secureStorage.setItem(
          SECURE_STORAGE_KEYS.USER_DATA,
          JSON.stringify(state.user),
        );
      } else {
        await secureStorage.deleteItem(SECURE_STORAGE_KEYS.USER_DATA);
      }
      if (state.onboardingCompleted !== undefined) {
        await AsyncStorage.setItem("auth_onboarding_completed", String(state.onboardingCompleted));
      }
      return;
    }
    return AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (name === "auth-storage") {
      await secureStorage.deleteItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.deleteItem(SECURE_STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem("auth_onboarding_completed");
      return;
    }
    return AsyncStorage.removeItem(name);
  },
};

interface PersistedAuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      onboardingCompleted: false,
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: !!(state.token && user),
        })),
      setToken: (token) => {
        void apiClient.setToken(token);
        set((state) => ({
          token,
          isAuthenticated: !!(token && state.user),
        }));
      },
      logout: () => {
        void apiClient.setToken(null);
        void apiClient.setRefreshToken(null);
        set({ user: null, token: null, isAuthenticated: false, onboardingCompleted: false });
      },
      setLoading: (isLoading) => set({ isLoading }),
      loginWithPhone: async (phone, code) => {
        const response = await apiClient.post<{ accessToken: string; refreshToken: string; user: User }>("/auth/phone-login", { phone, code });
        if (response.success && response.data) {
          void apiClient.setToken(response.data.accessToken);
          void apiClient.setRefreshToken(response.data.refreshToken);
          set({
            token: response.data.accessToken,
            user: response.data.user,
            isAuthenticated: true,
          });
        } else {
          throw new Error(response.error?.message || "Phone login failed");
        }
      },
      loginWithWechat: async (code) => {
        const response = await apiClient.post<{ accessToken: string; refreshToken: string; user: User }>("/auth/wechat-login", { code });
        if (response.success && response.data) {
          void apiClient.setToken(response.data.accessToken);
          void apiClient.setRefreshToken(response.data.refreshToken);
          set({
            token: response.data.accessToken,
            user: response.data.user,
            isAuthenticated: true,
          });
        } else {
          throw new Error(response.error?.message || "WeChat login failed");
        }
      },
      phoneRegister: async (phone, code, nickname) => {
        const response = await smsApi.registerWithPhone(phone, code, nickname);
        if (response.success && response.data) {
          void apiClient.setToken(response.data.accessToken);
          void apiClient.setRefreshToken(response.data.refreshToken);
          set({
            token: response.data.accessToken,
            user: response.data.user as unknown as User,
            isAuthenticated: true,
          });
        } else {
          throw new Error(response.error?.message || "Phone registration failed");
        }
      },
      setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => secureStorageAdapter),
      partialize: (state: AuthState): PersistedAuthState => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        onboardingCompleted: state.onboardingCompleted,
      }),
    } as const,
  ),
);

interface ClothingAnalysis {
  category: string;
  style: string[];
  colors: string[];
  occasions: string[];
  seasons: string[];
  confidence: number;
}

interface BodyAnalysis {
  body_type: string;
  skin_tone: string;
  color_season: string;
  recommendations: {
    suitable: string[];
    avoid: string[];
    tips: string[];
  };
}

interface AnalysisState {
  clothingAnalysis: ClothingAnalysis | null;
  bodyAnalysis: BodyAnalysis | null;
  currentImageUri: string | null;
  isAnalyzing: boolean;
  setClothingAnalysis: (analysis: ClothingAnalysis | null) => void;
  setBodyAnalysis: (analysis: BodyAnalysis | null) => void;
  setCurrentImage: (uri: string | null) => void;
  setAnalyzing: (analyzing: boolean) => void;
  clearAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  clothingAnalysis: null,
  bodyAnalysis: null,
  currentImageUri: null,
  isAnalyzing: false,
  setClothingAnalysis: (clothingAnalysis) => set({ clothingAnalysis }),
  setBodyAnalysis: (bodyAnalysis) => set({ bodyAnalysis }),
  setCurrentImage: (currentImageUri) => set({ currentImageUri }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  clearAnalysis: () =>
    set({ clothingAnalysis: null, bodyAnalysis: null, currentImageUri: null }),
}));

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
  setOutfitRecommendations: (
    recs: Record<string, RecommendationItem[]>,
  ) => void;
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
  setOutfitRecommendations: (outfitRecommendations) =>
    set({ outfitRecommendations }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () =>
    set({ recommendations: [], similarItems: [], outfitRecommendations: {} }),
}));

interface CartItem {
  id: string;
  item: ClothingItem;
  color: string;
  size: string;
  quantity: number;
  selected: boolean;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, data: Partial<CartItem>) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,
      setItems: (items) => {
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce(
          (sum, item) => sum + (item.item?.price || 0) * item.quantity,
          0,
        );
        set({ items, totalItems, totalPrice });
      },
      addItem: (item) =>
        set((state) => {
          const items = [...state.items, item];
          const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
          const totalPrice = items.reduce(
            (sum, i) => sum + (i.item?.price || 0) * i.quantity,
            0,
          );
          return { items, totalItems, totalPrice };
        }),
      removeItem: (id) =>
        set((state) => {
          const items = state.items.filter((i) => i.id !== id);
          const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
          const totalPrice = items.reduce(
            (sum, i) => sum + (i.item?.price || 0) * i.quantity,
            0,
          );
          return { items, totalItems, totalPrice };
        }),
      updateItem: (id, data) =>
        set((state) => {
          const items = state.items.map((i) =>
            i.id === id ? { ...i, ...data } : i,
          );
          const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
          const totalPrice = items.reduce(
            (sum, i) => sum + (i.item?.price || 0) * i.quantity,
            0,
          );
          return { items, totalItems, totalPrice };
        }),
      clear: () => set({ items: [], totalItems: 0, totalPrice: 0 }),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        totalPrice: state.totalPrice,
      }),
    },
  ),
);

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
          preferredCategories[category] =
            (preferredCategories[category] || 0) + 1;

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
    },
  ),
);
