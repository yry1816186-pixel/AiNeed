import { useCartStore } from "../cart.store";

import { cartApi } from "../../../../services/api/commerce.api";

jest.mock("../../../../services/api/commerce.api", () => ({
  cartApi: {
    get: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    selectAll: jest.fn(),
    getTotal: jest.fn(),
  },
}));

const mockCartApi = cartApi as jest.Mocked<typeof cartApi>;

const makeClothingItem = (overrides: Record<string, unknown> = {}) => ({
  id: "product-1",
  name: "Test Shirt",
  category: "tops" as const,
  price: 100,
  images: ["https://example.com/image.jpg"],
  colors: ["black"],
  sizes: ["M"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeCartItem = (overrides: Record<string, unknown> = {}) => ({
  id: "cart-1",
  item: makeClothingItem(),
  color: "black",
  size: "M",
  quantity: 1,
  selected: true,
  ...overrides,
});

const initialState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isLoading: false,
  error: null,
};

beforeEach(() => {
  useCartStore.setState(initialState);
});

describe("useCartStore", () => {
  describe("addItem", () => {
    it("should add an item and update totals", () => {
      const store = useCartStore.getState();
      const item = makeCartItem();

      store.addItem(item);

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(item);
      expect(state.totalItems).toBe(1);
      expect(state.totalPrice).toBe(100);
    });

    it("should accumulate totals when adding multiple items", () => {
      const store = useCartStore.getState();

      store.addItem(makeCartItem({ id: "cart-1", item: makeClothingItem({ price: 100 }) }));
      store.addItem(
        makeCartItem({
          id: "cart-2",
          item: makeClothingItem({ id: "product-2", price: 200 }),
          quantity: 2,
        })
      );

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalItems).toBe(3);
      expect(state.totalPrice).toBe(500);
    });
  });

  describe("removeItem", () => {
    it("should remove an item and recalculate totals", () => {
      const store = useCartStore.getState();
      store.addItem(makeCartItem({ id: "cart-1", item: makeClothingItem({ price: 100 }) }));
      store.addItem(
        makeCartItem({
          id: "cart-2",
          item: makeClothingItem({ id: "product-2", price: 250 }),
        })
      );

      store.removeItem("cart-1");

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe("cart-2");
      expect(state.totalItems).toBe(1);
      expect(state.totalPrice).toBe(250);
    });
  });

  describe("updateItem", () => {
    it("should update item properties and recalculate totals", () => {
      const store = useCartStore.getState();
      store.addItem(
        makeCartItem({ id: "cart-1", item: makeClothingItem({ price: 100 }), quantity: 1 })
      );

      store.updateItem("cart-1", { quantity: 3, selected: false });

      const state = useCartStore.getState();
      expect(state.items[0].quantity).toBe(3);
      expect(state.items[0].selected).toBe(false);
      expect(state.totalItems).toBe(3);
      expect(state.totalPrice).toBe(300);
    });
  });

  describe("clear", () => {
    it("should clear all items and reset totals and error", () => {
      const store = useCartStore.getState();
      store.addItem(makeCartItem({ item: makeClothingItem({ price: 100 }) }));
      useCartStore.setState({ error: "some error" });

      store.clear();

      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.totalItems).toBe(0);
      expect(state.totalPrice).toBe(0);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchCart", () => {
    it("should fetch cart items from API and populate store", async () => {
      mockCartApi.get.mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: "cart-1",
            productId: "product-1",
            name: "Shirt",
            imageUri: "https://example.com/shirt.jpg",
            color: "blue",
            size: "L",
            quantity: 2,
            price: 150,
            selected: true,
          },
          {
            id: "cart-2",
            productId: "product-2",
            name: "Pants",
            imageUri: "https://example.com/pants.jpg",
            color: "black",
            size: "M",
            quantity: 1,
            price: 300,
            selected: false,
          },
        ],
      });

      await useCartStore.getState().fetchCart();

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalItems).toBe(3);
      expect(state.totalPrice).toBe(600);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set error when API returns failure", async () => {
      mockCartApi.get.mockResolvedValueOnce({
        success: false,
        error: { code: "NETWORK_ERROR", message: "Network error" },
      });

      await useCartStore.getState().fetchCart();

      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("获取购物车失败，请稍后重试");
    });

    it("should set error when API throws exception", async () => {
      mockCartApi.get.mockRejectedValueOnce(new Error("Network failure"));

      await useCartStore.getState().fetchCart();

      const state = useCartStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("获取购物车失败，请稍后重试");
    });
  });
});
