import { create } from "zustand";

import {
  orderEnhancementApi,
  type Order,
} from "../services/api/commerce.api";
import type { PaginatedResponse } from "../types";

interface OrderStore {
  ordersByTab: Record<string, Order[]>;
  currentTab: string;
  isLoading: boolean;
  totalByTab: Record<string, number>;
  hasMoreByTab: Record<string, boolean>;

  fetchOrdersByTab: (tab: string, page?: number) => Promise<void>;
  setCurrentTab: (tab: string) => void;
  confirmReceipt: (orderId: string) => Promise<void>;
  softDeleteOrder: (orderId: string) => Promise<void>;
}

const PAGE_SIZE = 10;

export const useOrderStore = create<OrderStore>((set, get) => ({
  ordersByTab: {},
  currentTab: "all",
  isLoading: false,
  totalByTab: {},
  hasMoreByTab: {},

  fetchOrdersByTab: async (tab: string, page?: number) => {
    set({ isLoading: true });
    try {
      const response = await orderEnhancementApi.getOrdersByTab(
        tab,
        page ?? 1,
        PAGE_SIZE,
      );
      if (response.success && response.data) {
        const { items, total, hasMore } = response.data;
        set((state) => ({
          ordersByTab: {
            ...state.ordersByTab,
            [tab]: page && page > 1
              ? [...(state.ordersByTab[tab] ?? []), ...items]
              : items,
          },
          totalByTab: { ...state.totalByTab, [tab]: total },
          hasMoreByTab: { ...state.hasMoreByTab, [tab]: hasMore ?? false },
        }));
      }
    } catch (error) {
      console.error("Failed to fetch orders by tab:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentTab: (tab: string) => {
    set({ currentTab: tab });
  },

  confirmReceipt: async (orderId: string) => {
    try {
      const response = await orderEnhancementApi.confirmReceipt(orderId);
      if (response.success) {
        set((state) => {
          const updated = { ...state.ordersByTab };
          for (const tabKey of Object.keys(updated)) {
            updated[tabKey] = updated[tabKey].map((order) =>
              order.id === orderId
                ? { ...order, status: "delivered" as const }
                : order,
            );
          }
          return { ordersByTab: updated };
        });
      }
    } catch (error) {
      console.error("Failed to confirm receipt:", error);
    }
  },

  softDeleteOrder: async (orderId: string) => {
    try {
      const response = await orderEnhancementApi.softDeleteOrder(orderId);
      if (response.success) {
        set((state) => {
          const updated = { ...state.ordersByTab };
          for (const tabKey of Object.keys(updated)) {
            updated[tabKey] = updated[tabKey].filter(
              (order) => order.id !== orderId,
            );
          }
          return { ordersByTab: updated };
        });
      }
    } catch (error) {
      console.error("Failed to soft delete order:", error);
    }
  },
}));
