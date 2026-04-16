import { create } from "zustand";

import { couponApi, type UserCoupon } from "../../../services/api/commerce.api";

interface CouponStore {
  availableCoupons: UserCoupon[];
  isLoading: boolean;
  selectedCoupon: UserCoupon | null;
  validationResult: { valid: boolean; discount: number } | null;
  error: string | null;

  fetchUserCoupons: () => Promise<void>;
  validateCoupon: (code: string, orderAmount: number) => Promise<void>;
  selectCoupon: (coupon: UserCoupon | null) => void;
  applyCoupon: (code: string) => Promise<void>;
  clearValidation: () => void;
  setError: (message: string) => void;
  clearError: () => void;
}

export const useCouponStore = create<CouponStore>((set) => ({
  availableCoupons: [],
  isLoading: false,
  selectedCoupon: null,
  validationResult: null,
  error: null,

  fetchUserCoupons: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await couponApi.getUserCoupons("AVAILABLE");
      if (response.success && response.data) {
        set({ availableCoupons: response.data });
      }
    } catch (error) {
      set({ error: '获取优惠券失败', isLoading: false });
    } finally {
      set({ isLoading: false });
    }
  },

  validateCoupon: async (code: string, orderAmount: number) => {
    set({ isLoading: true, error: null });
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
      set({ error: '优惠券验证失败，请检查券码', validationResult: { valid: false, discount: 0 }, isLoading: false });
    } finally {
      set({ isLoading: false });
    }
  },

  selectCoupon: (coupon: UserCoupon | null) => {
    set({ selectedCoupon: coupon });
  },

  applyCoupon: async (code: string) => {
    set({ isLoading: true, error: null });
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
      set({ error: '应用优惠券失败，请稍后重试', isLoading: false });
    } finally {
      set({ isLoading: false });
    }
  },

  clearValidation: () => {
    set({ validationResult: null });
  },

  setError: (message: string) => set({ error: message }),
  clearError: () => set({ error: null }),
}));
