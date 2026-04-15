import { create } from "zustand";

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
