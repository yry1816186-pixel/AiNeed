import { useCouponStore } from "../couponStore";
import { couponApi, type UserCoupon, type Coupon } from "../../services/api/commerce.api";

jest.mock("../../services/api/commerce.api", () => ({
  couponApi: {
    getUserCoupons: jest.fn(),
    validateCoupon: jest.fn(),
    applyCoupon: jest.fn(),
  },
}));

const mockedCouponApi = couponApi as jest.Mocked<typeof couponApi>;

const mockCoupon: Coupon = {
  id: "coupon-1",
  code: "SAVE20",
  type: "PERCENTAGE",
  value: 20,
  minOrderAmount: 100,
  maxDiscount: null,
  startDate: "2025-01-01T00:00:00Z",
  endDate: "2025-12-31T23:59:59Z",
  usageLimit: 100,
  usedCount: 10,
  isActive: true,
  applicableCategories: ["tops", "bottoms"],
  applicableBrandId: null,
  description: "20% off on tops and bottoms",
};

const mockUserCoupon: UserCoupon = {
  id: "uc-1",
  couponId: "coupon-1",
  coupon: mockCoupon,
  status: "AVAILABLE",
  usedAt: null,
  createdAt: "2025-01-01T00:00:00Z",
};

const mockUserCoupon2: UserCoupon = {
  id: "uc-2",
  couponId: "coupon-2",
  coupon: {
    id: "coupon-2",
    code: "FLAT50",
    type: "FIXED",
    value: 50,
    minOrderAmount: 200,
    maxDiscount: null,
    startDate: "2025-01-01T00:00:00Z",
    endDate: "2025-12-31T23:59:59Z",
    usageLimit: 50,
    usedCount: 5,
    isActive: true,
    applicableCategories: [],
    applicableBrandId: null,
    description: "50 off on orders over 200",
  },
  status: "AVAILABLE",
  usedAt: null,
  createdAt: "2025-01-02T00:00:00Z",
};

describe("useCouponStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCouponStore.setState({
      availableCoupons: [],
      isLoading: false,
      selectedCoupon: null,
      validationResult: null,
    });
  });

  // ==================== 初始状态 ====================

  describe("initial state", () => {
    it("should have correct default values", () => {
      const state = useCouponStore.getState();
      expect(state.availableCoupons).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.selectedCoupon).toBeNull();
      expect(state.validationResult).toBeNull();
    });
  });

  // ==================== fetchUserCoupons ====================

  describe("fetchUserCoupons", () => {
    it("should fetch and set available coupons on success", async () => {
      mockedCouponApi.getUserCoupons.mockResolvedValueOnce({
        success: true,
        data: [mockUserCoupon, mockUserCoupon2],
      });

      await useCouponStore.getState().fetchUserCoupons();

      const state = useCouponStore.getState();
      expect(mockedCouponApi.getUserCoupons).toHaveBeenCalledWith("AVAILABLE");
      expect(state.availableCoupons).toHaveLength(2);
      expect(state.availableCoupons[0].id).toBe("uc-1");
      expect(state.isLoading).toBe(false);
    });

    it("should not set coupons when response is not successful", async () => {
      mockedCouponApi.getUserCoupons.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Failed" },
      });

      await useCouponStore.getState().fetchUserCoupons();

      const state = useCouponStore.getState();
      expect(state.availableCoupons).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it("should handle fetch failure gracefully", async () => {
      mockedCouponApi.getUserCoupons.mockRejectedValueOnce(new Error("Network error"));

      await useCouponStore.getState().fetchUserCoupons();

      const state = useCouponStore.getState();
      expect(state.availableCoupons).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it("should set isLoading during fetch", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedCouponApi.getUserCoupons.mockReturnValueOnce(pendingPromise as never);

      const fetchPromise = useCouponStore.getState().fetchUserCoupons();
      expect(useCouponStore.getState().isLoading).toBe(true);

      resolvePromise!({ success: true, data: [] });
      await fetchPromise;
    });
  });

  // ==================== validateCoupon ====================

  describe("validateCoupon", () => {
    it("should set validationResult on successful validation", async () => {
      mockedCouponApi.validateCoupon.mockResolvedValueOnce({
        success: true,
        data: { valid: true, discount: 50, coupon: mockCoupon },
      });

      await useCouponStore.getState().validateCoupon("SAVE20", 300);

      const state = useCouponStore.getState();
      expect(mockedCouponApi.validateCoupon).toHaveBeenCalledWith("SAVE20", 300);
      expect(state.validationResult).toEqual({ valid: true, discount: 50 });
      expect(state.isLoading).toBe(false);
    });

    it("should set validationResult with valid=false when response is not successful", async () => {
      mockedCouponApi.validateCoupon.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Invalid coupon" },
      });

      await useCouponStore.getState().validateCoupon("INVALID", 100);

      const state = useCouponStore.getState();
      expect(state.validationResult).toEqual({ valid: false, discount: 0 });
      expect(state.isLoading).toBe(false);
    });

    it("should set validationResult with valid=false on exception", async () => {
      mockedCouponApi.validateCoupon.mockRejectedValueOnce(new Error("Network error"));

      await useCouponStore.getState().validateCoupon("SAVE20", 300);

      const state = useCouponStore.getState();
      expect(state.validationResult).toEqual({ valid: false, discount: 0 });
      expect(state.isLoading).toBe(false);
    });
  });

  // ==================== selectCoupon ====================

  describe("selectCoupon", () => {
    it("should set selected coupon", () => {
      useCouponStore.getState().selectCoupon(mockUserCoupon);
      expect(useCouponStore.getState().selectedCoupon).toEqual(mockUserCoupon);
    });

    it("should clear selected coupon with null", () => {
      useCouponStore.setState({ selectedCoupon: mockUserCoupon });
      useCouponStore.getState().selectCoupon(null);
      expect(useCouponStore.getState().selectedCoupon).toBeNull();
    });
  });

  // ==================== applyCoupon ====================

  describe("applyCoupon", () => {
    it("should update available coupon on successful apply", async () => {
      const appliedCoupon: UserCoupon = {
        ...mockUserCoupon,
        status: "USED",
        usedAt: "2025-01-15T10:00:00Z",
      };

      useCouponStore.setState({
        availableCoupons: [mockUserCoupon, mockUserCoupon2],
      });

      mockedCouponApi.applyCoupon.mockResolvedValueOnce({
        success: true,
        data: appliedCoupon,
      });

      await useCouponStore.getState().applyCoupon("SAVE20");

      const state = useCouponStore.getState();
      expect(mockedCouponApi.applyCoupon).toHaveBeenCalledWith("SAVE20");
      expect(state.availableCoupons[0].status).toBe("USED");
      expect(state.availableCoupons[0].usedAt).toBe("2025-01-15T10:00:00Z");
      expect(state.isLoading).toBe(false);
    });

    it("should not update coupons when apply response is not successful", async () => {
      useCouponStore.setState({
        availableCoupons: [mockUserCoupon],
      });

      mockedCouponApi.applyCoupon.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Failed to apply" },
      });

      await useCouponStore.getState().applyCoupon("INVALID");

      const state = useCouponStore.getState();
      expect(state.availableCoupons[0].status).toBe("AVAILABLE");
      expect(state.isLoading).toBe(false);
    });

    it("should handle apply failure gracefully", async () => {
      useCouponStore.setState({
        availableCoupons: [mockUserCoupon],
      });

      mockedCouponApi.applyCoupon.mockRejectedValueOnce(new Error("Network error"));

      await useCouponStore.getState().applyCoupon("SAVE20");

      const state = useCouponStore.getState();
      expect(state.availableCoupons[0].status).toBe("AVAILABLE");
      expect(state.isLoading).toBe(false);
    });
  });

  // ==================== clearValidation ====================

  describe("clearValidation", () => {
    it("should clear validationResult", () => {
      useCouponStore.setState({
        validationResult: { valid: true, discount: 50 },
      });

      useCouponStore.getState().clearValidation();

      expect(useCouponStore.getState().validationResult).toBeNull();
    });
  });
});
