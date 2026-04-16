import { useOrderStore } from "../../features/commerce/stores/orderStore";
import { orderEnhancementApi } from "../../services/api/commerce.api";
import type { Order } from "../../types";

jest.mock("../../services/api/commerce.api", () => ({
  orderEnhancementApi: {
    getOrdersByTab: jest.fn(),
    confirmReceipt: jest.fn(),
    softDeleteOrder: jest.fn(),
  },
}));

const mockedOrderEnhancementApi = orderEnhancementApi as jest.Mocked<typeof orderEnhancementApi>;

const mockOrder1: Order = {
  id: "order-1",
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      name: "T-Shirt",
      imageUri: "https://example.com/img1.jpg",
      color: "white",
      size: "M",
      quantity: 1,
      price: 199,
      selected: true,
    },
  ],
  status: "shipped",
  totalAmount: 199,
  shippingAddress: {
    id: "addr-1",
    name: "Zhang San",
    phone: "13800138000",
    province: "Beijing",
    city: "Beijing",
    district: "Chaoyang",
    detail: "Road 123",
    isDefault: true,
  },
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const mockOrder2: Order = {
  id: "order-2",
  items: [
    {
      id: "item-2",
      productId: "prod-2",
      name: "Jacket",
      imageUri: "https://example.com/img2.jpg",
      color: "black",
      size: "L",
      quantity: 1,
      price: 599,
      selected: true,
    },
  ],
  status: "pending",
  totalAmount: 599,
  shippingAddress: {
    id: "addr-1",
    name: "Zhang San",
    phone: "13800138000",
    province: "Beijing",
    city: "Beijing",
    district: "Chaoyang",
    detail: "Road 123",
    isDefault: true,
  },
  createdAt: "2025-01-02T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
};

describe("useOrderStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOrderStore.setState({
      ordersByTab: {},
      currentTab: "all",
      isLoading: false,
      totalByTab: {},
      hasMoreByTab: {},
    });
  });

  // ==================== 初始状态 ====================

  describe("initial state", () => {
    it("should have correct default values", () => {
      const state = useOrderStore.getState();
      expect(state.ordersByTab).toEqual({});
      expect(state.currentTab).toBe("all");
      expect(state.isLoading).toBe(false);
      expect(state.totalByTab).toEqual({});
      expect(state.hasMoreByTab).toEqual({});
    });
  });

  // ==================== fetchOrdersByTab ====================

  describe("fetchOrdersByTab", () => {
    it("should fetch orders and populate ordersByTab on first page", async () => {
      mockedOrderEnhancementApi.getOrdersByTab.mockResolvedValueOnce({
        success: true,
        data: {
          items: [mockOrder1, mockOrder2],
          total: 2,
          hasMore: false,
          page: 1,
          pageSize: 10,
          limit: 10,
          totalPages: 1,
        },
      });

      await useOrderStore.getState().fetchOrdersByTab("all", 1);

      const state = useOrderStore.getState();
      expect(mockedOrderEnhancementApi.getOrdersByTab).toHaveBeenCalledWith("all", 1, 10);
      expect(state.ordersByTab["all"]).toHaveLength(2);
      expect(state.ordersByTab["all"][0].id).toBe("order-1");
      expect(state.totalByTab["all"]).toBe(2);
      expect(state.hasMoreByTab["all"]).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it("should append orders on subsequent pages", async () => {
      useOrderStore.setState({
        ordersByTab: { all: [mockOrder1] },
      });

      mockedOrderEnhancementApi.getOrdersByTab.mockResolvedValueOnce({
        success: true,
        data: {
          items: [mockOrder2],
          total: 2,
          hasMore: false,
          page: 2,
          pageSize: 10,
          limit: 10,
          totalPages: 1,
        },
      });

      await useOrderStore.getState().fetchOrdersByTab("all", 2);

      const state = useOrderStore.getState();
      expect(state.ordersByTab["all"]).toHaveLength(2);
    });

    it("should replace orders when page is 1 or undefined", async () => {
      useOrderStore.setState({
        ordersByTab: { all: [mockOrder1] },
      });

      mockedOrderEnhancementApi.getOrdersByTab.mockResolvedValueOnce({
        success: true,
        data: {
          items: [mockOrder2],
          total: 1,
          hasMore: false,
          page: 1,
          pageSize: 10,
          limit: 10,
          totalPages: 1,
        },
      });

      await useOrderStore.getState().fetchOrdersByTab("all");

      const state = useOrderStore.getState();
      expect(state.ordersByTab["all"]).toHaveLength(1);
      expect(state.ordersByTab["all"][0].id).toBe("order-2");
    });

    it("should handle API failure gracefully", async () => {
      mockedOrderEnhancementApi.getOrdersByTab.mockRejectedValueOnce(new Error("Network error"));

      await useOrderStore.getState().fetchOrdersByTab("all");

      const state = useOrderStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.ordersByTab).toEqual({});
    });

    it("should handle unsuccessful response", async () => {
      mockedOrderEnhancementApi.getOrdersByTab.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Failed" },
      });

      await useOrderStore.getState().fetchOrdersByTab("all");

      const state = useOrderStore.getState();
      expect(state.ordersByTab).toEqual({});
      expect(state.isLoading).toBe(false);
    });
  });

  // ==================== setCurrentTab ====================

  describe("setCurrentTab", () => {
    it("should set current tab", () => {
      useOrderStore.getState().setCurrentTab("shipped");
      expect(useOrderStore.getState().currentTab).toBe("shipped");
    });
  });

  // ==================== confirmReceipt ====================

  describe("confirmReceipt", () => {
    it("should update order status to delivered on success", async () => {
      useOrderStore.setState({
        ordersByTab: {
          all: [mockOrder1, mockOrder2],
          shipped: [mockOrder1],
        },
      });

      mockedOrderEnhancementApi.confirmReceipt.mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await useOrderStore.getState().confirmReceipt("order-1");

      const state = useOrderStore.getState();
      expect(mockedOrderEnhancementApi.confirmReceipt).toHaveBeenCalledWith("order-1");
      // Both tabs should have the order updated
      expect(state.ordersByTab["all"][0].status).toBe("delivered");
      expect(state.ordersByTab["shipped"][0].status).toBe("delivered");
      // Other orders should not be affected
      expect(state.ordersByTab["all"][1].status).toBe("pending");
    });

    it("should not update order status when API fails", async () => {
      useOrderStore.setState({
        ordersByTab: { all: [mockOrder1] },
      });

      mockedOrderEnhancementApi.confirmReceipt.mockRejectedValueOnce(new Error("Network error"));

      await useOrderStore.getState().confirmReceipt("order-1");

      expect(useOrderStore.getState().ordersByTab["all"][0].status).toBe("shipped");
    });

    it("should not update order status when response is not successful", async () => {
      useOrderStore.setState({
        ordersByTab: { all: [mockOrder1] },
      });

      mockedOrderEnhancementApi.confirmReceipt.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Failed" },
      });

      await useOrderStore.getState().confirmReceipt("order-1");

      expect(useOrderStore.getState().ordersByTab["all"][0].status).toBe("shipped");
    });
  });

  // ==================== softDeleteOrder ====================

  describe("softDeleteOrder", () => {
    it("should remove order from all tabs on success", async () => {
      useOrderStore.setState({
        ordersByTab: {
          all: [mockOrder1, mockOrder2],
          shipped: [mockOrder1],
        },
      });

      mockedOrderEnhancementApi.softDeleteOrder.mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await useOrderStore.getState().softDeleteOrder("order-1");

      const state = useOrderStore.getState();
      expect(mockedOrderEnhancementApi.softDeleteOrder).toHaveBeenCalledWith("order-1");
      expect(state.ordersByTab["all"]).toHaveLength(1);
      expect(state.ordersByTab["all"][0].id).toBe("order-2");
      expect(state.ordersByTab["shipped"]).toHaveLength(0);
    });

    it("should not remove order when API fails", async () => {
      useOrderStore.setState({
        ordersByTab: { all: [mockOrder1] },
      });

      mockedOrderEnhancementApi.softDeleteOrder.mockRejectedValueOnce(new Error("Network error"));

      await useOrderStore.getState().softDeleteOrder("order-1");

      expect(useOrderStore.getState().ordersByTab["all"]).toHaveLength(1);
    });

    it("should not remove order when response is not successful", async () => {
      useOrderStore.setState({
        ordersByTab: { all: [mockOrder1] },
      });

      mockedOrderEnhancementApi.softDeleteOrder.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Failed" },
      });

      await useOrderStore.getState().softDeleteOrder("order-1");

      expect(useOrderStore.getState().ordersByTab["all"]).toHaveLength(1);
    });
  });
});
