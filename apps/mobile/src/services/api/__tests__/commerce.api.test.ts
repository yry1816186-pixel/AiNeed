import apiClient from "../client";
import {
  cartApi,
  orderApi,
  addressApi,
  favoriteApi,
  searchApi,
  paymentApi,
  couponApi,
  refundApi,
  stockNotificationApi,
  orderEnhancementApi,
  sizeRecommendationApi,
  searchEnhancementApi,
  clothingEnhancementApi,
  merchantApi,
  cartEnhancementApi,
} from "../commerce.api";

// ---- Mocks ----
jest.mock("../client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    upload: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;
const mockUpload = apiClient.upload as jest.Mock;

// ---- Test Data ----
const backendCartItem = {
  id: "cart-1",
  itemId: "item-1",
  color: "white",
  size: "M",
  quantity: 2,
  selected: true,
  item: {
    id: "item-1",
    name: "White T-Shirt",
    category: "tops",
    mainImage: "http://img.jpg",
    images: ["http://img.jpg"],
    colors: ["white"],
    sizes: ["S", "M", "L"],
    price: 99.9,
    originalPrice: 129.9,
    viewCount: 10,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-06-01T00:00:00.000Z",
    brand: { id: "b1", name: "TestBrand" },
  },
};

const backendAddress = {
  id: "addr-1",
  name: "Zhang San",
  phone: "13800138000",
  province: "Beijing",
  city: "Beijing",
  district: "Chaoyang",
  address: "123 Test Road",
  isDefault: true,
  createdAt: "2025-01-01T00:00:00.000Z",
};

const backendOrder = {
  id: "order-1",
  orderNo: "ORD-20250101",
  status: "PAID",
  items: [
    {
      id: "oi-1",
      itemId: "item-1",
      itemName: "White T-Shirt",
      itemImage: "http://img.jpg",
      color: "white",
      size: "M",
      quantity: 2,
      price: 99.9,
    },
  ],
  totalAmount: 199.8,
  finalAmount: 189.8,
  shippingAddress: {
    name: "Zhang San",
    phone: "13800138000",
    province: "Beijing",
    city: "Beijing",
    district: "Chaoyang",
    address: "123 Test Road",
  },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

// ---- Tests ----
describe("cartApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("get", () => {
    it("should GET /cart and normalize items", async () => {
      mockGet.mockResolvedValue({ success: true, data: [backendCartItem] });

      const result = await cartApi.get();

      expect(mockGet).toHaveBeenCalledWith("/cart");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("cart-1");
        expect(result.data[0].productId).toBe("item-1");
        expect(result.data[0].name).toBe("White T-Shirt");
        expect(result.data[0].quantity).toBe(2);
        expect(result.data[0].price).toBe(99.9);
      }
    });

    it("should return error when request fails", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "SERVER_ERROR", message: "Error" },
      });

      const result = await cartApi.get();
      expect(result.success).toBe(false);
    });
  });

  describe("add", () => {
    it("should POST to /cart with item details", async () => {
      mockPost.mockResolvedValue({ success: true, data: backendCartItem });

      const result = await cartApi.add({
        productId: "item-1",
        color: "white",
        size: "M",
        quantity: 2,
      });

      expect(mockPost).toHaveBeenCalledWith("/cart", {
        itemId: "item-1",
        color: "white",
        size: "M",
        quantity: 2,
      });
      expect(result.success).toBe(true);
    });

    it("should use itemId when productId is not provided", async () => {
      mockPost.mockResolvedValue({ success: true, data: backendCartItem });

      await cartApi.add({
        itemId: "item-1",
        color: "white",
        size: "M",
        quantity: 1,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/cart",
        expect.objectContaining({
          itemId: "item-1",
        })
      );
    });

    it("should return error when neither productId nor itemId is provided", async () => {
      const result = await cartApi.add({
        color: "white",
        size: "M",
        quantity: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MISSING_ITEM_ID");
    });
  });

  describe("update", () => {
    it("should PUT to /cart/:itemId with update data", async () => {
      mockPut.mockResolvedValue({ success: true, data: backendCartItem });

      const result = await cartApi.update("cart-1", { quantity: 3, selected: true });

      expect(mockPut).toHaveBeenCalledWith("/cart/cart-1", {
        quantity: 3,
        selected: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("remove", () => {
    it("should DELETE /cart/:itemId", async () => {
      mockDelete.mockResolvedValue({ success: true, data: undefined });

      const result = await cartApi.remove("cart-1");

      expect(mockDelete).toHaveBeenCalledWith("/cart/cart-1");
      expect(result.success).toBe(true);
    });
  });

  describe("clear", () => {
    it("should DELETE /cart", async () => {
      mockDelete.mockResolvedValue({ success: true, data: undefined });

      const result = await cartApi.clear();

      expect(mockDelete).toHaveBeenCalledWith("/cart");
      expect(result.success).toBe(true);
    });
  });

  describe("selectAll", () => {
    it("should PUT to /cart/select-all", async () => {
      mockPut.mockResolvedValue({ success: true, data: undefined });

      const result = await cartApi.selectAll(true);

      expect(mockPut).toHaveBeenCalledWith("/cart/select-all", { selected: true });
      expect(result.success).toBe(true);
    });
  });

  describe("getTotal", () => {
    it("should GET /cart/summary and normalize response", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { totalItems: 3, selectedItems: 2, totalPrice: "299.7", selectedPrice: 199.8 },
      });

      const result = await cartApi.getTotal();

      expect(mockGet).toHaveBeenCalledWith("/cart/summary");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.items).toBe(3);
        expect(result.data.price).toBe(299.7);
      }
    });
  });
});

describe("orderApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getAll", () => {
    it("should GET /orders with params and normalize response", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { items: [backendOrder], total: 1, page: 1, pageSize: 10, hasMore: false },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await orderApi.getAll({ status: "paid" as any, page: 1, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith("/orders", { status: "paid", page: 1, limit: 10 });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0].id).toBe("order-1");
        expect(result.data.items[0].totalAmount).toBe(189.8);
      }
    });
  });

  describe("getById", () => {
    it("should GET /orders/:id and normalize order", async () => {
      mockGet.mockResolvedValue({ success: true, data: backendOrder });

      const result = await orderApi.getById("order-1");

      expect(mockGet).toHaveBeenCalledWith("/orders/order-1");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe("order-1");
        expect(result.data.items).toHaveLength(1);
      }
    });
  });

  describe("create", () => {
    it("should POST to /orders with order data", async () => {
      mockPost.mockResolvedValue({ success: true, data: backendOrder });

      const result = await orderApi.create({
        addressId: "addr-1",
        items: [{ itemId: "item-1", color: "white", size: "M", quantity: 2 }],
        remark: "Please deliver quickly",
      });

      expect(mockPost).toHaveBeenCalledWith("/orders", {
        addressId: "addr-1",
        items: [{ itemId: "item-1", color: "white", size: "M", quantity: 2 }],
        remark: "Please deliver quickly",
      });
      expect(result.success).toBe(true);
    });

    it("should return error when items array is empty", async () => {
      const result = await orderApi.create({
        addressId: "addr-1",
        items: [],
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MISSING_ORDER_ITEMS");
    });

    it("should return error when items is undefined", async () => {
      const result = await orderApi.create({
        addressId: "addr-1",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MISSING_ORDER_ITEMS");
    });
  });

  describe("cancel", () => {
    it("should POST to /orders/:id/cancel", async () => {
      mockPost.mockResolvedValue({ success: true, data: undefined });

      const result = await orderApi.cancel("order-1");

      expect(mockPost).toHaveBeenCalledWith("/orders/order-1/cancel");
      expect(result.success).toBe(true);
    });
  });

  describe("track", () => {
    it("should GET /orders/:id/tracking", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          status: "SHIPPED",
          timeline: [{ status: "shipped", time: "2025-01-01", description: "Shipped" }],
        },
      });

      const result = await orderApi.track("order-1");

      expect(mockGet).toHaveBeenCalledWith("/orders/order-1/tracking");
      expect(result.success).toBe(true);
    });
  });
});

describe("addressApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getAll", () => {
    it("should GET /addresses and normalize response", async () => {
      mockGet.mockResolvedValue({ success: true, data: [backendAddress] });

      const result = await addressApi.getAll();

      expect(mockGet).toHaveBeenCalledWith("/addresses");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("addr-1");
        expect(result.data[0].detail).toBe("123 Test Road");
        expect(result.data[0].isDefault).toBe(true);
      }
    });
  });

  describe("create", () => {
    it("should POST to /addresses with normalized payload", async () => {
      mockPost.mockResolvedValue({ success: true, data: backendAddress });

      const addressData = {
        name: "Zhang San",
        phone: "13800138000",
        province: "Beijing",
        city: "Beijing",
        district: "Chaoyang",
        detail: "123 Test Road",
        isDefault: true,
      };

      const result = await addressApi.create(addressData);

      expect(mockPost).toHaveBeenCalledWith(
        "/addresses",
        expect.objectContaining({
          name: "Zhang San",
          address: "123 Test Road",
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe("update", () => {
    it("should PUT to /addresses/:id", async () => {
      mockPut.mockResolvedValue({ success: true, data: backendAddress });

      const result = await addressApi.update("addr-1", { name: "Li Si" });

      expect(mockPut).toHaveBeenCalledWith(
        "/addresses/addr-1",
        expect.objectContaining({
          name: "Li Si",
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("should DELETE /addresses/:id", async () => {
      mockDelete.mockResolvedValue({ success: true, data: undefined });

      const result = await addressApi.delete("addr-1");

      expect(mockDelete).toHaveBeenCalledWith("/addresses/addr-1");
      expect(result.success).toBe(true);
    });
  });

  describe("setDefault", () => {
    it("should PUT to /addresses/:id/default", async () => {
      mockPut.mockResolvedValue({ success: true, data: undefined });

      const result = await addressApi.setDefault("addr-1");

      expect(mockPut).toHaveBeenCalledWith("/addresses/addr-1/default");
      expect(result.success).toBe(true);
    });
  });
});

describe("favoriteApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getAll", () => {
    it("should GET /favorites and normalize items", async () => {
      const commerceItem = {
        id: "item-1",
        name: "Fav Item",
        category: "tops",
        mainImage: "http://img.jpg",
        images: ["http://img.jpg"],
        colors: ["red"],
        sizes: ["M"],
        tags: ["fav"],
        price: 199,
        viewCount: 5,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-06-01T00:00:00.000Z",
        brand: { id: "b1", name: "Brand" },
      };
      mockGet.mockResolvedValue({
        success: true,
        data: { items: [commerceItem], total: 1 },
      });

      const result = await favoriteApi.getAll({ page: 1, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith("/favorites", { page: 1, limit: 10 });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data[0].isFavorite).toBe(true);
        expect(result.data[0].brand).toBe("Brand");
      }
    });
  });

  describe("add", () => {
    it("should POST to /favorites/:itemId", async () => {
      mockPost.mockResolvedValue({ success: true, data: undefined });

      const result = await favoriteApi.add("item-1");

      expect(mockPost).toHaveBeenCalledWith("/favorites/item-1");
      expect(result.success).toBe(true);
    });
  });

  describe("remove", () => {
    it("should DELETE /favorites/:itemId", async () => {
      mockDelete.mockResolvedValue({ success: true, data: undefined });

      const result = await favoriteApi.remove("item-1");

      expect(mockDelete).toHaveBeenCalledWith("/favorites/item-1");
      expect(result.success).toBe(true);
    });
  });

  describe("check", () => {
    it("should GET /favorites/check/:itemId", async () => {
      mockGet.mockResolvedValue({ success: true, data: { isFavorite: true } });

      const result = await favoriteApi.check("item-1");

      expect(mockGet).toHaveBeenCalledWith("/favorites/check/item-1");
      expect(result.success).toBe(true);
    });
  });
});

describe("searchApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("searchClothing", () => {
    it("should GET /search with filter params", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      await searchApi.searchClothing({
        query: "shirt",
        category: "tops",
        minPrice: 50,
        maxPrice: 200,
      });

      expect(mockGet).toHaveBeenCalledWith(
        "/search",
        expect.objectContaining({
          q: "shirt",
          category: "tops",
          minPrice: 50,
          maxPrice: 200,
        })
      );
    });

    it("should omit undefined filter params", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      await searchApi.searchClothing({ query: "shirt" });

      const callArgs = mockGet.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty("category");
      expect(callArgs).not.toHaveProperty("minPrice");
      expect(callArgs).not.toHaveProperty("maxPrice");
    });
  });

  describe("searchByImage", () => {
    it("should upload image to /search/image", async () => {
      mockUpload.mockResolvedValue({ success: true, data: [] });

      await searchApi.searchByImage("file:///photo/shirt.jpg", {
        category: "tops",
        limit: 5,
      });

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining("/search/image"),
        expect.any(FormData)
      );
    });

    it("should append query params for category and limit", async () => {
      mockUpload.mockResolvedValue({ success: true, data: [] });

      await searchApi.searchByImage("file:///photo.jpg", {
        category: "tops",
        limit: 5,
      });

      const url = mockUpload.mock.calls[0][0] as string;
      expect(url).toContain("category=tops");
      expect(url).toContain("limit=5");
    });

    it("should not append query params when none provided", async () => {
      mockUpload.mockResolvedValue({ success: true, data: [] });

      await searchApi.searchByImage("file:///photo.jpg");

      const url = mockUpload.mock.calls[0][0] as string;
      expect(url).toBe("/search/image");
    });
  });

  describe("getTrending", () => {
    it("should GET /search/trending and normalize string array response", async () => {
      mockGet.mockResolvedValue({ success: true, data: ["shirt", "dress"] });

      const result = await searchApi.getTrending();

      expect(mockGet).toHaveBeenCalledWith("/search/trending");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data).toEqual(["shirt", "dress"]);
      }
    });

    it("should normalize object response with keywords field", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { keywords: ["shirt", "dress"] },
      });

      const result = await searchApi.getTrending();

      if (result.success && result.data) {
        expect(result.data).toEqual(["shirt", "dress"]);
      }
    });
  });

  describe("getHistory", () => {
    it("should return local search history", async () => {
      const result = await searchApi.getHistory();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("clearHistory", () => {
    it("should clear local search history", async () => {
      const result = await searchApi.clearHistory();

      expect(result.success).toBe(true);
    });
  });

  describe("saveHistory", () => {
    it("should save query to local search history", async () => {
      const result = await searchApi.saveHistory("shirt");

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});

describe("paymentApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("createPayment", () => {
    it("should POST to /orders/:orderId/pay with alipay provider", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { paymentUrl: "https://alipay.com/pay" },
      });

      const result = await paymentApi.createPayment("order-1", "alipay");

      expect(mockPost).toHaveBeenCalledWith("/orders/order-1/pay", {
        paymentMethod: "ALIPAY",
      });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.orderId).toBe("order-1");
      }
    });

    it("should POST with WECHAT for wechat provider", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { qrCode: "weixin://wxpay" },
      });

      await paymentApi.createPayment("order-1", "wechat");

      expect(mockPost).toHaveBeenCalledWith("/orders/order-1/pay", {
        paymentMethod: "WECHAT",
      });
    });
  });

  describe("pollPaymentStatus", () => {
    it("should GET /payment/query/:orderId", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { status: "PAID", paid: true },
      });

      const result = await paymentApi.pollPaymentStatus("order-1");

      expect(mockGet).toHaveBeenCalledWith("/payment/query/order-1");
      expect(result.success).toBe(true);
    });
  });
});

describe("couponApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("validateCoupon", () => {
    it("should POST to /coupons/validate", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { valid: true, discount: 20, coupon: { id: "c1" } },
      });

      const result = await couponApi.validateCoupon("SAVE20", 100, ["tops"]);

      expect(mockPost).toHaveBeenCalledWith("/coupons/validate", {
        code: "SAVE20",
        orderAmount: 100,
        categoryIds: ["tops"],
        brandId: undefined,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("applyCoupon", () => {
    it("should POST to /coupons/apply and normalize response", async () => {
      const backendCoupon = {
        id: "uc-1",
        couponId: "c-1",
        coupon: {
          id: "c-1",
          code: "SAVE20",
          type: "PERCENTAGE",
          value: 20,
          minOrderAmount: 100,
          maxDiscount: null,
          startDate: "2025-01-01",
          endDate: "2025-12-31",
          usageLimit: 1,
          usedCount: 0,
          isActive: true,
          applicableCategories: [],
          applicableBrandId: null,
          description: "20% off",
        },
        status: "AVAILABLE",
        usedAt: null,
        createdAt: "2025-01-01T00:00:00.000Z",
      };
      mockPost.mockResolvedValue({ success: true, data: backendCoupon });

      const result = await couponApi.applyCoupon("SAVE20");

      expect(mockPost).toHaveBeenCalledWith("/coupons/apply", { code: "SAVE20" });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.coupon.code).toBe("SAVE20");
        expect(result.data.status).toBe("AVAILABLE");
      }
    });
  });

  describe("getUserCoupons", () => {
    it("should GET /coupons with optional status filter", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      await couponApi.getUserCoupons("AVAILABLE");

      expect(mockGet).toHaveBeenCalledWith("/coupons", { status: "AVAILABLE" });
    });

    it("should GET /coupons without status filter", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      await couponApi.getUserCoupons();

      expect(mockGet).toHaveBeenCalledWith("/coupons", {});
    });
  });

  describe("getApplicableCoupons", () => {
    it("should GET /coupons/applicable", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await couponApi.getApplicableCoupons();

      expect(mockGet).toHaveBeenCalledWith("/coupons/applicable");
      expect(result.success).toBe(true);
    });
  });
});

describe("refundApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("createRefund", () => {
    it("should POST to /refund-requests", async () => {
      const backendRefund = {
        id: "ref-1",
        orderId: "order-1",
        type: "RETURN_REFUND",
        status: "PENDING",
        reason: "Wrong size",
        description: null,
        amount: 99.9,
        images: [],
        trackingNumber: null,
        adminNote: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };
      mockPost.mockResolvedValue({ success: true, data: backendRefund });

      const result = await refundApi.createRefund({
        orderId: "order-1",
        type: "RETURN_REFUND",
        reason: "Wrong size",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/refund-requests",
        expect.objectContaining({
          orderId: "order-1",
          type: "RETURN_REFUND",
        })
      );
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.status).toBe("PENDING");
      }
    });
  });

  describe("getOrderRefunds", () => {
    it("should GET /refund-requests/order/:orderId", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await refundApi.getOrderRefunds("order-1");

      expect(mockGet).toHaveBeenCalledWith("/refund-requests/order/order-1");
      expect(result.success).toBe(true);
    });
  });

  describe("getUserRefunds", () => {
    it("should GET /refund-requests", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await refundApi.getUserRefunds();

      expect(mockGet).toHaveBeenCalledWith("/refund-requests");
      expect(result.success).toBe(true);
    });
  });

  describe("addRefundTracking", () => {
    it("should PATCH /refund-requests/:id/tracking", async () => {
      mockPatch.mockResolvedValue({
        success: true,
        data: { id: "ref-1", trackingNumber: "SF123456" },
      });

      const result = await refundApi.addRefundTracking("ref-1", "SF123456");

      expect(mockPatch).toHaveBeenCalledWith("/refund-requests/ref-1/tracking", {
        trackingNumber: "SF123456",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("stockNotificationApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("subscribe", () => {
    it("should POST to /stock-notifications", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { id: "sn-1", itemId: "item-1", status: "PENDING" },
      });

      const result = await stockNotificationApi.subscribe("item-1", "white", "M");

      expect(mockPost).toHaveBeenCalledWith("/stock-notifications", {
        itemId: "item-1",
        color: "white",
        size: "M",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("unsubscribe", () => {
    it("should DELETE /stock-notifications/:id", async () => {
      mockDelete.mockResolvedValue({ success: true, data: undefined });

      const result = await stockNotificationApi.unsubscribe("sn-1");

      expect(mockDelete).toHaveBeenCalledWith("/stock-notifications/sn-1");
      expect(result.success).toBe(true);
    });
  });

  describe("getAll", () => {
    it("should GET /stock-notifications", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await stockNotificationApi.getAll();

      expect(mockGet).toHaveBeenCalledWith("/stock-notifications");
      expect(result.success).toBe(true);
    });
  });
});

describe("orderEnhancementApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("confirmReceipt", () => {
    it("should PATCH /orders/:orderId/confirm", async () => {
      mockPatch.mockResolvedValue({ success: true, data: { success: true } });

      const result = await orderEnhancementApi.confirmReceipt("order-1");

      expect(mockPatch).toHaveBeenCalledWith("/orders/order-1/confirm");
      expect(result.success).toBe(true);
    });
  });

  describe("softDeleteOrder", () => {
    it("should DELETE /orders/:orderId", async () => {
      mockDelete.mockResolvedValue({ success: true, data: { success: true } });

      const result = await orderEnhancementApi.softDeleteOrder("order-1");

      expect(mockDelete).toHaveBeenCalledWith("/orders/order-1");
      expect(result.success).toBe(true);
    });
  });

  describe("getOrdersByTab", () => {
    it("should GET /orders/tab/:tab with params", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { items: [backendOrder], total: 1, page: 1, pageSize: 10 },
      });

      const result = await orderEnhancementApi.getOrdersByTab("paid", 1, 10);

      expect(mockGet).toHaveBeenCalledWith("/orders/tab/paid", { page: 1, limit: 10 });
      expect(result.success).toBe(true);
    });
  });
});

describe("sizeRecommendationApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getSizeRecommendation", () => {
    it("should GET /size-recommendation/:itemId", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          recommendedSize: "M",
          confidence: 0.85,
          reasons: ["Fits your measurements"],
          sizeChart: [{ size: "M", label: "Medium", matchScore: 0.85 }],
        },
      });

      const result = await sizeRecommendationApi.getSizeRecommendation("item-1");

      expect(mockGet).toHaveBeenCalledWith("/size-recommendation/item-1");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data?.recommendedSize).toBe("M");
      }
    });

    it("should return null when no recommended size", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { recommendedSize: undefined },
      });

      const result = await sizeRecommendationApi.getSizeRecommendation("item-1");

      if (result.success && result.data) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe("getSizeChart", () => {
    it("should GET /size-recommendation/:itemId/chart", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await sizeRecommendationApi.getSizeChart("item-1");

      expect(mockGet).toHaveBeenCalledWith("/size-recommendation/item-1/chart");
      expect(result.success).toBe(true);
    });
  });
});

describe("searchEnhancementApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getFilterOptions", () => {
    it("should GET /search/filter-options with category", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          brands: [{ id: "b1", name: "Brand" }],
          colors: ["white", "black"],
          sizes: ["S", "M"],
          priceRange: { min: 0, max: 1000 },
        },
      });

      const result = await searchEnhancementApi.getFilterOptions("tops");

      expect(mockGet).toHaveBeenCalledWith("/search/filter-options", { category: "tops" });
      expect(result.success).toBe(true);
    });

    it("should GET /search/filter-options without category", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { brands: [], colors: [], sizes: [], priceRange: { min: 0, max: 0 } },
      });

      await searchEnhancementApi.getFilterOptions();

      expect(mockGet).toHaveBeenCalledWith("/search/filter-options", {});
    });
  });
});

describe("clothingEnhancementApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getRelatedItems", () => {
    it("should GET /clothing/:itemId/related", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await clothingEnhancementApi.getRelatedItems("item-1");

      expect(mockGet).toHaveBeenCalledWith("/clothing/item-1/related");
      expect(result.success).toBe(true);
    });
  });

  describe("getSubcategories", () => {
    it("should GET /clothing/subcategories with category", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      await clothingEnhancementApi.getSubcategories("tops");

      expect(mockGet).toHaveBeenCalledWith("/clothing/subcategories", { category: "tops" });
    });
  });
});

describe("merchantApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("applyForMerchant", () => {
    it("should POST to /merchants/apply", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { id: "app-1", status: "PENDING" },
      });

      const result = await merchantApi.applyForMerchant({
        brandName: "TestBrand",
        businessLicense: "LICENSE123",
        contactName: "Zhang San",
        phone: "13800138000",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/merchants/apply",
        expect.objectContaining({
          brandName: "TestBrand",
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe("getMerchantApplicationStatus", () => {
    it("should GET /merchants/application", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { id: "app-1", status: "APPROVED" },
      });

      const result = await merchantApi.getMerchantApplicationStatus();

      expect(mockGet).toHaveBeenCalledWith("/merchants/application");
      expect(result.success).toBe(true);
    });
  });

  describe("getMerchantPendingApplications", () => {
    it("should GET /merchants/applications", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await merchantApi.getMerchantPendingApplications();

      expect(mockGet).toHaveBeenCalledWith("/merchants/applications");
      expect(result.success).toBe(true);
    });
  });
});

describe("cartEnhancementApi", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getCartSummary", () => {
    it("should GET /cart/summary with couponCode", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          totalItems: 3,
          selectedItems: 2,
          totalAmount: "299.7",
          selectedAmount: "199.8",
          discountAmount: "10",
          shippingFee: "5",
          finalAmount: "194.8",
        },
      });

      const result = await cartEnhancementApi.getCartSummary("SAVE10");

      expect(mockGet).toHaveBeenCalledWith("/cart/summary", { couponCode: "SAVE10" });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.totalItems).toBe(3);
        expect(result.data.totalAmount).toBe(299.7);
        expect(result.data.discountAmount).toBe(10);
      }
    });

    it("should GET /cart/summary without couponCode", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          totalItems: 0,
          selectedItems: 0,
          totalAmount: 0,
          selectedAmount: 0,
          discountAmount: 0,
          shippingFee: 0,
          finalAmount: 0,
        },
      });

      await cartEnhancementApi.getCartSummary();

      expect(mockGet).toHaveBeenCalledWith("/cart/summary", {});
    });
  });

  describe("getInvalidCartItems", () => {
    it("should GET /cart/invalid", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await cartEnhancementApi.getInvalidCartItems();

      expect(mockGet).toHaveBeenCalledWith("/cart/invalid");
      expect(result.success).toBe(true);
    });
  });

  describe("batchDeleteCartItems", () => {
    it("should DELETE /cart/batch", async () => {
      mockDelete.mockResolvedValue({ success: true, data: { count: 2 } });

      const result = await cartEnhancementApi.batchDeleteCartItems(["c1", "c2"]);

      expect(mockDelete).toHaveBeenCalledWith("/cart/batch");
      expect(result.success).toBe(true);
    });
  });

  describe("moveCartToFavorites", () => {
    it("should POST to /cart/move-to-favorites", async () => {
      mockPost.mockResolvedValue({ success: true, data: { moved: 2 } });

      const result = await cartEnhancementApi.moveCartToFavorites(["c1", "c2"]);

      expect(mockPost).toHaveBeenCalledWith("/cart/move-to-favorites", {
        cartItemIds: ["c1", "c2"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateCartItemSku", () => {
    it("should PATCH /cart/:id/sku", async () => {
      mockPatch.mockResolvedValue({ success: true, data: backendCartItem });

      const result = await cartEnhancementApi.updateCartItemSku("cart-1", "black", "L");

      expect(mockPatch).toHaveBeenCalledWith("/cart/cart-1/sku", {
        color: "black",
        size: "L",
      });
      expect(result.success).toBe(true);
    });
  });
});
