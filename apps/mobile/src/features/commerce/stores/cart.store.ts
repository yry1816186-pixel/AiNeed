import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ClothingItem } from "../../wardrobe/stores/clothingStore";

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
    }
  )
);
