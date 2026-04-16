import { create } from "zustand";

import { orderEnhancementApi } from "../../../services/api/commerce.api";
import type { Order } from "../../../shared/types/api";

interface OrderStore {
  ordersByTab: Record<string, Order[]>;
  currentTab: string;
  isLoading: boolean;
  totalByTab: Record<string, number>;
  hasMoreByTab: Record<string, boolean>;
  error: string | null;

  fetchOrdersByTab: (tab: string, page?: number) => Promise<void>;
  setCurrentTab: (tab: string) => void;
  confirmReceipt: (orderId: string) => Promise<void>;
  softDeleteOrder: (orderId: string) => Promise<void>;
  setError: (message: string) => void;
  clearError: () => void;
}

const PAGE_SIZE = 10;

export const useOrderStore = create<OrderStore>((set) => ({
  ordersByTab: {},
  currentTab: "all",
  isLoading: false,
  totalByTab: {},
  hasMoreByTab: {},
  error: null,

  fetchOrdersByTab: async (tab: string, page?: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await orderEnhancementApi.getOrdersByTab(tab, page ?? 1, PAGE_SIZE);
      if (response.success && response.data) {
        const { items, total, hasMore } = response.data;
        set((state) => ({
          ordersByTab: {
            ...state.ordersByTab,
            [tab]: page && page > 1 ? [...(state.ordersByTab[tab] ?? []), ...items] : items,
          },
          totalByTab: { ...state.totalByTab, [tab]: total },
          hasMoreByTab: { ...state.hasMoreByTab, [tab]: hasMore ?? false },
        }));
      }
    } catch (error) {
      set({ error: '获取订单失败，请稍后重试', isLoading: false });
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentTab: (tab: string) => {
    set({ currentTab: tab });
  },

  confirmReceipt: async (orderId: string) => {
    set({ error: null });
    try {
      const response = await orderEnhancementApi.confirmReceipt(orderId);
      if (response.success) {
        set((state) => {
          const updated = { ...state.ordersByTab };
          for (const tabKey of Object.keys(updated)) {
            updated[tabKey] = updated[tabKey].map((order) =>
              order.id === orderId ? { ...order, status: "delivered" as const } : order
            );
          }
          return { ordersByTab: updated };
        });
      }
    } catch (error) {
      set({ error: '确认收货失败，请稍后重试' });
    }
  },

  softDeleteOrder: async (orderId: string) => {
    set({ error: null });
    try {
      const response = await orderEnhancementApi.softDeleteOrder(orderId);
      if (response.success) {
        set((state) => {
          const updated = { ...state.ordersByTab };
          for (const tabKey of Object.keys(updated)) {
            updated[tabKey] = updated[tabKey].filter((order) => order.id !== orderId);
          }
          return { ordersByTab: updated };
        });
      }
    } catch (error) {
      set({ error: '删除订单失败，请稍后重试' });
    }
  },

  setError: (message: string) => set({ error: message }),
  clearError: () => set({ error: null }),
}));
