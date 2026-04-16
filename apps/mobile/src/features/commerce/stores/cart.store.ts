import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ClothingItem } from "../../wardrobe/stores/clothingStore";
import { cartApi } from "../../../services/api/commerce.api";

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
  isLoading: boolean;
  error: string | null;
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, data: Partial<CartItem>) => void;
  clear: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  fetchCart: () => Promise<void>;
  syncCart: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,
      isLoading: false,
      error: null,
      setItems: (items) => {
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce(
          (sum, item) => sum + (item.item?.price || 0) * item.quantity,
          0
        );
        set({ items, totalItems, totalPrice });
      },
      addItem: (item) =>
        set((state) => {
          const items = [...state.items, item];
          const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
          const totalPrice = items.reduce((sum, i) => sum + (i.item?.price || 0) * i.quantity, 0);
          return { items, totalItems, totalPrice };
        }),
      removeItem: (id) =>
        set((state) => {
          const items = state.items.filter((i) => i.id !== id);
          const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
          const totalPrice = items.reduce((sum, i) => sum + (i.item?.price || 0) * i.quantity, 0);
          return { items, totalItems, totalPrice };
        }),
      updateItem: (id, data) =>
        set((state) => {
          const items = state.items.map((i) => (i.id === id ? { ...i, ...data } : i));
          const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
          const totalPrice = items.reduce((sum, i) => sum + (i.item?.price || 0) * i.quantity, 0);
          return { items, totalItems, totalPrice };
        }),
      clear: () => set({ items: [], totalItems: 0, totalPrice: 0, error: null }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      fetchCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await cartApi.get();
          if (response.success && response.data) {
            const cartItems: CartItem[] = response.data.map((item) => ({
              id: item.id,
              item: {
                id: item.productId,
                name: item.name,
                price: item.price,
                imageUri: item.imageUri,
                originalPrice: item.originalPrice,
                category: 'other',
                colors: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as ClothingItem,
              color: item.color,
              size: item.size,
              quantity: item.quantity,
              selected: item.selected,
            }));
            const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalPrice = cartItems.reduce(
              (sum, item) => sum + (item.item?.price || 0) * item.quantity,
              0
            );
            set({ items: cartItems, totalItems, totalPrice, isLoading: false });
          } else {
            set({ error: '获取购物车失败，请稍后重试', isLoading: false });
          }
        } catch {
          set({ error: '获取购物车失败，请稍后重试', isLoading: false });
        }
      },

      syncCart: async () => {
        set({ isLoading: true, error: null });
        try {
          // TODO: 连接后端 POST /cart/sync API 后替换
          set({ error: '功能开发中，敬请期待', isLoading: false });
        } catch {
          set({ error: '同步购物车失败，请稍后重试', isLoading: false });
        }
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        totalPrice: state.totalPrice,
      }),
    }
  )
);
