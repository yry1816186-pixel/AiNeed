﻿﻿import { create } from "zustand";

import { couponApi, type UserCoupon } from "../../../services/api/commerce.api";

interface CouponStore {
  availableCoupons: UserCoupon[];
  isLoading: boolean;
  selectedCoupon: UserCoupon | null;
  validationResult: { valid: boolean; discount: number } | null;

  fetchUserCoupons: () => Promise<void>;
  validateCoupon: (code: string, orderAmount: number) => Promise<void>;
  selectCoupon: (coupon: UserCoupon | null) => void;
  applyCoupon: (code: string) => Promise<void>;
  clearValidation: () => void;
}

export const useCouponStore = create<CouponStore>((set) => ({
  availableCoupons: [],
  isLoading: false,
  selectedCoupon: null,
  validationResult: null,

  fetchUserCoupons: async () => {
    set({ isLoading: true });
    try {
      const response = await couponApi.getUserCoupons("AVAILABLE");
      if (response.success && response.data) {
        set({ availableCoupons: response.data });
      }
    } catch (error) {
      console.error("Failed to fetch user coupons:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  validateCoupon: async (code: string, orderAmount: number) => {
    set({ isLoading: true });
    try {
      const response = await couponApi.validateCoupon(code, orderAmount);
      if (response.success && response.data) {
        set({
          validationResult: {
            valid: response.data.valid,
            discount: response.data.discount,
          },
        });
      } else {
        set({ validationResult: { valid: false, discount: 0 } });
      }
    } catch (error) {
      console.error("Failed to validate coupon:", error);
      set({ validationResult: { valid: false, discount: 0 } });
    } finally {
      set({ isLoading: false });
    }
  },

  selectCoupon: (coupon: UserCoupon | null) => {
    set({ selectedCoupon: coupon });
  },

  applyCoupon: async (code: string) => {
    set({ isLoading: true });
    try {
      const response = await couponApi.applyCoupon(code);
      if (response.success && response.data) {
        set((state) => ({
          availableCoupons: state.availableCoupons.map((uc) =>
            uc.id === response.data!.id ? response.data! : uc
          ),
        }));
      }
    } catch (error) {
      console.error("Failed to apply coupon:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearValidation: () => {
    set({ validationResult: null });
  },
}));

// ==================== Size Recommendation Store ====================

interface SizeRecommendationState {
  recommendations: Array<{
    clothingId: string;
    recommendedSize: string;
    confidence: number;
    brand?: string;
  }>;
  isLoading: boolean;
  error: string | null;

  fetchRecommendation: (clothingId: string) => Promise<void>;
  clearRecommendations: () => void;
}

export const useSizeRecommendationStore = create<SizeRecommendationState>((set) => ({
  recommendations: [],
  isLoading: false,
  error: null,

  fetchRecommendation: async (clothingId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Stub - will be connected to API
      set({ isLoading: false });
    } catch {
      set({ error: "Failed to fetch size recommendation", isLoading: false });
    }
  },

  clearRecommendations: () => set({ recommendations: [], error: null }),
}));

// ==================== Order Store ====================

interface OrderItem {
  id: string;
  clothingId: string;
  name: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  orderNo: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;

  fetchOrders: () => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  reset: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      // Stub - will be connected to API
      set({ isLoading: false });
    } catch {
      set({ error: "Failed to fetch orders", isLoading: false });
    }
  },

  fetchOrderById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // Stub - will be connected to API
      set({ isLoading: false });
    } catch {
      set({ error: "Failed to fetch order", isLoading: false });
    }
  },

  cancelOrder: async (id: string) => {
    try {
      // Stub - will be connected to API
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: "cancelled" as const } : o
        ),
      }));
    } catch {
      set({ error: "Failed to cancel order" });
    }
  },

  reset: () => set({ orders: [], currentOrder: null, error: null }),
}));
