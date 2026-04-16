/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Test, TestingModule } from "@nestjs/testing";

import { JwtAuthGuard } from "../../../domains/identity/auth/guards/jwt-auth.guard";

import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

describe("OrderController", () => {
  let controller: OrderController;
  let service: OrderService;

  const mockOrderService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    pay: jest.fn(),
    cancel: jest.fn(),
    confirm: jest.fn(),
    getTracking: jest.fn(),
  };

  const mockUser = { id: "user-1", email: "test@example.com" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated orders", async () => {
      const mockResult = {
        items: [{ id: "order-1" }, { id: "order-2" }],
        total: 2,
      };
      mockOrderService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(
        { user: mockUser },
        "pending",
        "1",
        "10",
      );

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, {
        status: "pending",
        page: 1,
        limit: 10,
      });
    });

    it("should use default pagination values", async () => {
      mockOrderService.findAll.mockResolvedValue({ items: [], total: 0 });

      await controller.findAll({ user: mockUser });

      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, {
        status: undefined,
        page: 1,
        limit: 10,
      });
    });
  });

  describe("findOne", () => {
    it("should return order by id", async () => {
      const mockOrder = { id: "order-1", orderNo: "SM240101000001" };
      mockOrderService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne({ user: mockUser }, "order-1");

      expect(result).toEqual(mockOrder);
    });
  });

  describe("create", () => {
    it("should create order", async () => {
      const createDto = {
        items: [{ itemId: "item-1", color: "black", size: "M", quantity: 1 }],
        addressId: "address-1",
      };
      const mockOrder = { id: "order-1", orderNo: "SM240101000001" };
      mockOrderService.create.mockResolvedValue(mockOrder);

      const result = await controller.create({ user: mockUser }, createDto);

      expect(result).toEqual(mockOrder);
    });
  });

  describe("pay", () => {
    it("should initiate payment", async () => {
      const mockPaymentResult = {
        paymentUrl: "https://payment.example.com/pay",
      };
      mockOrderService.pay.mockResolvedValue(mockPaymentResult);

      const result = await controller.pay({ user: mockUser }, "order-1", {
        paymentMethod: "alipay",
      });

      expect(result).toEqual(mockPaymentResult);
    });
  });

  describe("cancel", () => {
    it("should cancel order", async () => {
      mockOrderService.cancel.mockResolvedValue(undefined);

      const result = await controller.cancel({ user: mockUser }, "order-1");

      expect(result).toEqual({ success: true });
    });
  });

  describe("confirm", () => {
    it("should confirm order receipt", async () => {
      mockOrderService.confirm.mockResolvedValue(undefined);

      const result = await controller.confirm({ user: mockUser }, "order-1");

      expect(result).toEqual({ success: true });
    });
  });

  describe("getTracking", () => {
    it("should return tracking info", async () => {
      const mockTracking = {
        expressCompany: "SF Express",
        expressNo: "SF123456",
        timeline: [],
      };
      mockOrderService.getTracking.mockResolvedValue(mockTracking);

      const result = await controller.getTracking(
        { user: mockUser },
        "order-1",
      );

      expect(result).toEqual(mockTracking);
    });
  });
});
