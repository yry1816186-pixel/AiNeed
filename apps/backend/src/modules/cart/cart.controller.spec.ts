import { Test, TestingModule } from "@nestjs/testing";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

describe("CartController", () => {
  let controller: CartController;
  let service: CartService;

  const mockCartService = {
    getCart: jest.fn(),
    getCartSummary: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
    selectAll: jest.fn(),
  };

  const mockUser = { id: "user-1", email: "test@example.com" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CartController>(CartController);
    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCart", () => {
    it("should return cart items", async () => {
      const mockCartItems = [{ id: "cart-1", itemId: "item-1", quantity: 1 }];
      mockCartService.getCart.mockResolvedValue(mockCartItems);

      const result = await controller.getCart({ user: mockUser });

      expect(result).toEqual(mockCartItems);
      expect(service.getCart).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("getCartSummary", () => {
    it("should return cart summary", async () => {
      const mockSummary = {
        totalItems: 3,
        selectedItems: 2,
        totalPrice: 300,
        selectedPrice: 200,
      };
      mockCartService.getCartSummary.mockResolvedValue(mockSummary);

      const result = await controller.getCartSummary({ user: mockUser });

      expect(result).toEqual(mockSummary);
    });
  });

  describe("addItem", () => {
    it("should add item to cart", async () => {
      const mockCartItem = {
        id: "cart-1",
        itemId: "item-1",
        color: "black",
        size: "M",
        quantity: 1,
      };
      mockCartService.addItem.mockResolvedValue(mockCartItem);

      const result = await controller.addItem(
        { user: mockUser },
        { itemId: "item-1", color: "black", size: "M", quantity: 1 },
      );

      expect(result).toEqual(mockCartItem);
      expect(service.addItem).toHaveBeenCalledWith(
        mockUser.id,
        "item-1",
        "black",
        "M",
        1,
      );
    });

    it("should use default quantity of 1", async () => {
      mockCartService.addItem.mockResolvedValue({});

      await controller.addItem(
        { user: mockUser },
        { itemId: "item-1", color: "black", size: "M" },
      );

      expect(service.addItem).toHaveBeenCalledWith(
        mockUser.id,
        "item-1",
        "black",
        "M",
        1,
      );
    });
  });

  describe("updateItem", () => {
    it("should update cart item", async () => {
      const mockCartItem = { id: "cart-1", quantity: 2 };
      mockCartService.updateItem.mockResolvedValue(mockCartItem);

      const result = await controller.updateItem({ user: mockUser }, "cart-1", {
        quantity: 2,
      });

      expect(result).toEqual(mockCartItem);
    });
  });

  describe("removeItem", () => {
    it("should remove item from cart", async () => {
      mockCartService.removeItem.mockResolvedValue(undefined);

      const result = await controller.removeItem({ user: mockUser }, "cart-1");

      expect(result).toEqual({ success: true });
    });
  });

  describe("clearCart", () => {
    it("should clear cart", async () => {
      mockCartService.clearCart.mockResolvedValue(undefined);

      const result = await controller.clearCart({ user: mockUser });

      expect(result).toEqual({ success: true });
    });
  });

  describe("selectAll", () => {
    it("should select all items", async () => {
      mockCartService.selectAll.mockResolvedValue(undefined);

      const result = await controller.selectAll(
        { user: mockUser },
        { selected: true },
      );

      expect(result).toEqual({ success: true });
      expect(service.selectAll).toHaveBeenCalledWith(mockUser.id, true);
    });
  });
});
