import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { NotificationService } from "../notification/services/notification.service";
import { SubscriptionService } from "../subscription/subscription.service";

import { PaymentStatus, PaymentProvider, PaymentMethod } from "./dto";
import { PaymentService } from "./payment.service";
import { AlipayProvider } from "./providers/alipay.provider";
import { WechatProvider } from "./providers/wechat.provider";



describe("PaymentService", () => {
  let service: PaymentService;
  let prismaService: jest.Mocked<PrismaService>;
  let alipayProvider: jest.Mocked<AlipayProvider>;
  let wechatProvider: jest.Mocked<WechatProvider>;

  const mockPrismaService = {
    paymentRecord: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    refundRecord: {
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentOrder: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      callback({
        paymentRecord: {
          update: jest.fn(),
        },
        order: {
          updateMany: jest.fn(),
        },
        clothingItem: {
          update: jest.fn(),
        },
      }),
    ),
  };

  const mockAlipayProvider = {
    name: "alipay",
    createPayment: jest.fn(),
    queryPayment: jest.fn(),
    handleCallback: jest.fn(),
    verifyCallbackSign: jest.fn(),
    refund: jest.fn(),
    closeOrder: jest.fn(),
  };

  const mockWechatProvider = {
    name: "wechat",
    createPayment: jest.fn(),
    queryPayment: jest.fn(),
    handleCallback: jest.fn(),
    verifyCallbackSign: jest.fn(),
    refund: jest.fn(),
    closeOrder: jest.fn(),
  };

  const mockSubscriptionService = {
    activateSubscription: jest.fn(),
  };

  const mockNotificationService = {
    sendToUser: jest.fn(),
  };

  const mockRedisClient = {
    set: jest.fn().mockResolvedValue("OK"),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    eval: jest.fn().mockResolvedValue(1),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    getClient: jest.fn(() => mockRedisClient),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        BACKEND_URL: "http://localhost:3001",
        ALIPAY_APP_ID: "test_app_id",
        ALIPAY_PRIVATE_KEY: "test_private_key",
        ALIPAY_PUBLIC_KEY: "test_public_key",
        WECHAT_APP_ID: "test_wechat_app_id",
        WECHAT_MCH_ID: "test_mch_id",
        WECHAT_API_KEY: "test_api_key",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AlipayProvider, useValue: mockAlipayProvider },
        { provide: WechatProvider, useValue: mockWechatProvider },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get(PrismaService);
    alipayProvider = module.get(AlipayProvider);
    wechatProvider = module.get(WechatProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createPayment", () => {
    const userId = "user_123";
    const createPaymentDto = {
      orderId: "order_123",
      amount: 99.0,
      provider: PaymentProvider.ALIPAY,
      method: PaymentMethod.QRCODE,
      subject: "测试订单",
    };

    it("应该成功创建支付订单", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.paymentRecord.create.mockResolvedValue({
        id: "record_123",
        orderId: createPaymentDto.orderId,
        userId,
        provider: createPaymentDto.provider,
        amount: { toNumber: () => createPaymentDto.amount },
        currency: "CNY",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockAlipayProvider.createPayment.mockResolvedValue({
        success: true,
        orderId: createPaymentDto.orderId,
        qrCode: "https://qr.alipay.com/test",
        expireAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      mockPrismaService.paymentRecord.update.mockResolvedValue({});

      const result = await service.createPayment(userId, createPaymentDto);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(createPaymentDto.orderId);
      expect(result.qrCode).toBe("https://qr.alipay.com/test");
      expect(mockPrismaService.paymentRecord.create).toHaveBeenCalled();
    });

    it("当存在未支付订单时应该返回已存在的订单", async () => {
      const existingRecord = {
        id: "existing_record",
        orderId: "existing_order",
        userId,
        status: "pending",
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
        amount: { toNumber: () => 99.0 },
        qrCode: "https://qr.alipay.com/existing",
      };
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue(
        existingRecord,
      );
      mockAlipayProvider.queryPayment.mockResolvedValue({
        orderId: "existing_order",
        status: "pending",
        amount: 99.0,
      });

      const result = await service.createPayment(userId, createPaymentDto);

      expect(result.orderId).toBe("existing_order");
      expect(result.qrCode).toBe("https://qr.alipay.com/existing");
    });
  });

  describe("queryPayment", () => {
    const userId = "user_123";
    const orderId = "order_123";

    it("应该返回支付状态", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId,
        userId,
        provider: "alipay",
        amount: { toNumber: () => 99.0 },
        currency: "CNY",
        status: "paid",
        tradeNo: "trade_123",
        paidAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.queryPayment(userId, orderId);

      expect(result.orderId).toBe(orderId);
      expect(result.status).toBe("paid");
      expect(result.amount).toBe(99.0);
    });

    it("当订单不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue(null);

      await expect(service.queryPayment(userId, orderId)).rejects.toThrow(
        "Payment record not found",
      );
    });
  });

  describe("handleCallback", () => {
    it("应该成功处理支付宝回调", async () => {
      const callbackData = {
        out_trade_no: "order_123",
        trade_no: "trade_123",
        total_amount: "99.00",
        trade_status: "TRADE_SUCCESS",
        gmt_payment: new Date().toISOString(),
      };

      mockAlipayProvider.verifyCallbackSign.mockReturnValue(true);
      mockAlipayProvider.handleCallback.mockResolvedValue({
        orderId: "order_123",
        tradeNo: "trade_123",
        amount: 99.0,
        status: "paid",
        paidAt: new Date(),
        rawData: callbackData,
      });
      mockPrismaService.paymentRecord.findUnique.mockResolvedValue({
        id: "record_123",
        orderId: "order_123",
        userId: "user_123",
        status: "pending",
        amount: { toNumber: () => 99.0 },
      });
      mockPrismaService.paymentRecord.update.mockResolvedValue({});
      mockPrismaService.paymentOrder.findUnique.mockResolvedValue(null);
      mockNotificationService.sendToUser.mockResolvedValue({});

      const result = await service.handleCallback("alipay", callbackData);

      expect(result.success).toBe(true);
      // PaymentService uses event-driven architecture - emits events instead of direct notification calls
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it("当签名验证失败时应该返回失败", async () => {
      mockAlipayProvider.verifyCallbackSign.mockReturnValue(false);

      const result = await service.handleCallback("alipay", {});

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid signature");
    });
  });

  describe("refund", () => {
    const userId = "user_123";
    const refundDto = {
      orderId: "order_123",
      amount: 99.0,
      reason: "用户申请退款",
    };

    it("应该成功申请退款", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId: refundDto.orderId,
        userId,
        status: "paid",
        amount: { toNumber: () => 99.0 },
        provider: "alipay",
      });
      mockPrismaService.refundRecord.create.mockResolvedValue({
        id: "refund_123",
        paymentRecordId: "record_123",
        amount: { toNumber: () => refundDto.amount },
        status: "processing",
      });
      mockAlipayProvider.refund.mockResolvedValue({
        success: true,
        refundId: "refund_123",
        refundNo: "refund_no_123",
        status: "success",
      });
      mockPrismaService.refundRecord.update.mockResolvedValue({});
      mockPrismaService.paymentRecord.update.mockResolvedValue({});

      const result = await service.refund(userId, refundDto);

      expect(result.success).toBe(true);
      expect(result.status).toBe("success");
    });

    it("当订单未支付时应该抛出 BadRequestException", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId: refundDto.orderId,
        userId,
        status: "pending",
        amount: { toNumber: () => 99.0 },
      });

      await expect(service.refund(userId, refundDto)).rejects.toThrow(
        "Only paid orders can be refunded",
      );
    });
  });

  describe("closeOrder", () => {
    const userId = "user_123";
    const orderId = "order_123";

    it("应该成功关闭订单", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId,
        userId,
        status: "pending",
        provider: "alipay",
      });
      mockAlipayProvider.closeOrder.mockResolvedValue(true);
      mockPrismaService.paymentRecord.update.mockResolvedValue({});

      const result = await service.closeOrder(userId, orderId);

      expect(result).toBe(true);
    });

    it("当订单不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue(null);

      await expect(service.closeOrder(userId, orderId)).rejects.toThrow(
        "Payment record not found",
      );
    });
  });

  describe("getPaymentRecords", () => {
    const userId = "user_123";

    it("应该返回支付记录列表", async () => {
      const mockRecords = [
        {
          id: "record_1",
          orderId: "order_1",
          userId,
          provider: "alipay",
          amount: { toNumber: () => 99.0 },
          currency: "CNY",
          status: "paid",
          createdAt: new Date(),
        },
        {
          id: "record_2",
          orderId: "order_2",
          userId,
          provider: "wechat",
          amount: { toNumber: () => 199.0 },
          currency: "CNY",
          status: "paid",
          createdAt: new Date(),
        },
      ];

      mockPrismaService.paymentRecord.findMany.mockResolvedValue(mockRecords);
      mockPrismaService.paymentRecord.count.mockResolvedValue(2);

      const result = await service.getPaymentRecords(userId, 1, 10);

      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });

  describe("createPayment 异常处理", () => {
    const userId = "user_123";
    const createPaymentDto = {
      orderId: "order_123",
      amount: 99.0,
      provider: PaymentProvider.ALIPAY,
      method: PaymentMethod.QRCODE,
      subject: "测试订单",
    };

    it("应该处理支付提供商创建失败", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.paymentRecord.create.mockResolvedValue({
        id: "record_123",
        orderId: createPaymentDto.orderId,
        userId,
        provider: createPaymentDto.provider,
        amount: { toNumber: () => createPaymentDto.amount },
        currency: "CNY",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockAlipayProvider.createPayment.mockResolvedValue({
        success: false,
        orderId: createPaymentDto.orderId,
        error: { message: "支付渠道异常" },
      });
      mockPrismaService.paymentRecord.update.mockResolvedValue({});

      const result = await service.createPayment(userId, createPaymentDto);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("支付渠道异常");
    });

    it("应该处理微信支付创建", async () => {
      const wechatDto = { ...createPaymentDto, provider: PaymentProvider.WECHAT };
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.paymentRecord.create.mockResolvedValue({
        id: "record_123",
        orderId: wechatDto.orderId,
        userId,
        provider: "wechat",
        amount: { toNumber: () => wechatDto.amount },
        currency: "CNY",
        status: "pending",
        createdAt: new Date(),
      });
      mockWechatProvider.createPayment.mockResolvedValue({
        success: true,
        orderId: wechatDto.orderId,
        qrCode: "weixin://wxpay/bizpayurl?pr=test",
        expireAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      mockPrismaService.paymentRecord.update.mockResolvedValue({});

      const result = await service.createPayment(userId, wechatDto);

      expect(result.success).toBe(true);
      expect(mockWechatProvider.createPayment).toHaveBeenCalled();
    });

    it("应该处理不支持的支付提供商", async () => {
      const invalidDto = { ...createPaymentDto, provider: "invalid" as any };

      await expect(service.createPayment(userId, invalidDto)).rejects.toThrow(
        "Unsupported payment provider",
      );
    });
  });

  describe("handleCallback 高级场景", () => {
    it("应该处理金额不匹配", async () => {
      const callbackData = {
        out_trade_no: "order_123",
        trade_no: "trade_123",
        total_amount: "50.00", // 不匹配
        trade_status: "TRADE_SUCCESS",
        gmt_payment: new Date().toISOString(),
      };

      mockAlipayProvider.verifyCallbackSign.mockReturnValue(true);
      mockAlipayProvider.handleCallback.mockResolvedValue({
        orderId: "order_123",
        tradeNo: "trade_123",
        amount: 50.0,
        status: "paid",
        paidAt: new Date(),
        rawData: callbackData,
      });
      mockPrismaService.paymentRecord.findUnique.mockResolvedValue({
        id: "record_123",
        orderId: "order_123",
        userId: "user_123",
        status: "pending",
        amount: { toNumber: () => 99.0 }, // 期望 99.0
      });

      const result = await service.handleCallback("alipay", callbackData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Amount mismatch");
    });

    it("应该处理重复回调（订单已处理）", async () => {
      const callbackData = {
        out_trade_no: "order_123",
        trade_no: "trade_123",
        total_amount: "99.00",
        trade_status: "TRADE_SUCCESS",
        gmt_payment: new Date().toISOString(),
      };

      mockAlipayProvider.verifyCallbackSign.mockReturnValue(true);
      mockAlipayProvider.handleCallback.mockResolvedValue({
        orderId: "order_123",
        tradeNo: "trade_123",
        amount: 99.0,
        status: "paid",
        paidAt: new Date(),
        rawData: callbackData,
      });
      mockPrismaService.paymentRecord.findUnique.mockResolvedValue({
        id: "record_123",
        orderId: "order_123",
        userId: "user_123",
        status: "paid", // 已支付
        amount: { toNumber: () => 99.0 },
      });

      const result = await service.handleCallback("alipay", callbackData);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Order already processed");
    });

    it("应该处理并发回调（幂等性保护）", async () => {
      const callbackData = {
        out_trade_no: "order_123",
        trade_no: "trade_123",
        total_amount: "99.00",
        trade_status: "TRADE_SUCCESS",
        gmt_payment: new Date().toISOString(),
      };

      mockAlipayProvider.verifyCallbackSign.mockReturnValue(true);
      mockAlipayProvider.handleCallback.mockResolvedValue({
        orderId: "order_123",
        tradeNo: "trade_123",
        amount: 99.0,
        status: "paid",
        paidAt: new Date(),
        rawData: callbackData,
      });
      
      // 模拟 Redis 锁获取失败（已有其他进程在处理）
      mockRedisClient.set.mockResolvedValueOnce(null);

      const result = await service.handleCallback("alipay", callbackData);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Order is being processed");
    });

    it("应该处理微信支付回调", async () => {
      const callbackData = {
        out_trade_no: "order_123",
        transaction_id: "wx_trade_123",
        total_fee: 9900, // 分
        result_code: "SUCCESS",
        time_end: "20260401120000",
      };

      mockWechatProvider.verifyCallbackSign.mockReturnValue(true);
      mockWechatProvider.handleCallback.mockResolvedValue({
        orderId: "order_123",
        tradeNo: "wx_trade_123",
        amount: 99.0,
        status: "paid",
        paidAt: new Date(),
        rawData: callbackData,
      });
      mockPrismaService.paymentRecord.findUnique.mockResolvedValue({
        id: "record_123",
        orderId: "order_123",
        userId: "user_123",
        status: "pending",
        amount: { toNumber: () => 99.0 },
      });
      mockPrismaService.paymentOrder.findUnique.mockResolvedValue(null);

      const result = await service.handleCallback("wechat", callbackData);

      expect(result.success).toBe(true);
    });
  });

  describe("refund 高级场景", () => {
    const userId = "user_123";
    const refundDto = {
      orderId: "order_123",
      amount: 99.0,
      reason: "用户申请退款",
    };

    it("应该拒绝退款金额超过支付金额", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId: refundDto.orderId,
        userId,
        status: "paid",
        amount: { toNumber: () => 50.0 }, // 支付金额小于退款金额
        provider: "alipay",
      });

      await expect(service.refund(userId, { ...refundDto, amount: 100 })).rejects.toThrow(
        "Refund amount cannot exceed payment amount",
      );
    });

    it("应该处理部分退款", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId: refundDto.orderId,
        userId,
        status: "paid",
        amount: { toNumber: () => 199.0 },
        provider: "alipay",
      });
      mockPrismaService.refundRecord.create.mockResolvedValue({
        id: "refund_123",
        paymentRecordId: "record_123",
        amount: { toNumber: () => 50.0 },
        status: "processing",
      });
      mockAlipayProvider.refund.mockResolvedValue({
        success: true,
        refundId: "refund_123",
        refundNo: "refund_no_123",
        status: "success",
      });
      mockPrismaService.refundRecord.update.mockResolvedValue({});

      const result = await service.refund(userId, { ...refundDto, amount: 50 });

      expect(result.success).toBe(true);
      // 部分退款不应更新支付记录状态
      expect(mockPrismaService.paymentRecord.update).not.toHaveBeenCalled();
    });

    it("应该处理退款失败", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId: refundDto.orderId,
        userId,
        status: "paid",
        amount: { toNumber: () => 99.0 },
        provider: "alipay",
      });
      mockPrismaService.refundRecord.create.mockResolvedValue({
        id: "refund_123",
        paymentRecordId: "record_123",
        amount: { toNumber: () => refundDto.amount },
        status: "processing",
      });
      mockAlipayProvider.refund.mockResolvedValue({
        success: false,
        refundId: "refund_123",
        error: { message: "退款渠道异常" },
      });
      mockPrismaService.refundRecord.update.mockResolvedValue({});

      const result = await service.refund(userId, refundDto);

      expect(result.success).toBe(false);
    });
  });

  describe("pollPaymentStatus", () => {
    const userId = "user_123";
    const orderId = "order_123";

    it("应该返回已支付状态", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId,
        userId,
        provider: "alipay",
        amount: { toNumber: () => 99.0 },
        currency: "CNY",
        status: "paid",
        tradeNo: "trade_123",
        paidAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.pollPaymentStatus(userId, orderId);

      expect(result.paid).toBe(true);
      expect(result.status).toBe("paid");
    });

    it("应该返回未支付状态", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId,
        userId,
        provider: "alipay",
        amount: { toNumber: () => 99.0 },
        currency: "CNY",
        status: "pending",
        createdAt: new Date(),
      });
      mockAlipayProvider.queryPayment.mockResolvedValue({
        orderId,
        status: "pending",
        amount: 99.0,
      });

      const result = await service.pollPaymentStatus(userId, orderId);

      expect(result.paid).toBe(false);
      expect(result.status).toBe("pending");
    });
  });

  describe("verifyAlipaySignature", () => {
    it("应该验证支付宝签名成功", async () => {
      const body = { sign: "valid_sign" };
      mockAlipayProvider.verifyCallbackSign.mockReturnValue(true);

      const result = await service.verifyAlipaySignature(body);

      expect(result).toBe(true);
    });

    it("应该处理签名验证失败", async () => {
      const body = { sign: "invalid_sign" };
      mockAlipayProvider.verifyCallbackSign.mockReturnValue(false);

      const result = await service.verifyAlipaySignature(body);

      expect(result).toBe(false);
    });

    it("应该处理签名验证异常", async () => {
      const body = { sign: "error_sign" };
      mockAlipayProvider.verifyCallbackSign.mockImplementation(() => {
        throw new Error("验证异常");
      });

      const result = await service.verifyAlipaySignature(body);

      expect(result).toBe(false);
    });
  });

  describe("closeOrder 高级场景", () => {
    const userId = "user_123";
    const orderId = "order_123";

    it("应该拒绝关闭非待支付订单", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId,
        userId,
        status: "paid", // 已支付
        provider: "alipay",
      });

      await expect(service.closeOrder(userId, orderId)).rejects.toThrow(
        "Only pending orders can be closed",
      );
    });

    it("应该处理关闭订单失败", async () => {
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue({
        id: "record_123",
        orderId,
        userId,
        status: "pending",
        provider: "alipay",
      });
      mockAlipayProvider.closeOrder.mockResolvedValue(false);

      const result = await service.closeOrder(userId, orderId);

      expect(result).toBe(false);
    });
  });

  describe("边界条件", () => {
    it("应该处理空支付记录列表", async () => {
      mockPrismaService.paymentRecord.findMany.mockResolvedValue([]);
      mockPrismaService.paymentRecord.count.mockResolvedValue(0);

      const result = await service.getPaymentRecords("user_123", 1, 10);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("应该处理大额支付金额", async () => {
      const largeAmount = 999999.99;
      mockPrismaService.paymentRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.paymentRecord.create.mockResolvedValue({
        id: "record_123",
        orderId: "order_123",
        userId: "user_123",
        provider: "alipay",
        amount: { toNumber: () => largeAmount },
        currency: "CNY",
        status: "pending",
        createdAt: new Date(),
      });
      mockAlipayProvider.createPayment.mockResolvedValue({
        success: true,
        orderId: "order_123",
        qrCode: "https://qr.alipay.com/test",
        expireAt: new Date(),
      });
      mockPrismaService.paymentRecord.update.mockResolvedValue({});

      const result = await service.createPayment("user_123", {
        orderId: "order_123",
        amount: largeAmount,
        provider: PaymentProvider.ALIPAY,
        method: PaymentMethod.QRCODE,
        subject: "大额订单",
      });

      expect(result.success).toBe(true);
    });

    it("应该处理分页边界", async () => {
      mockPrismaService.paymentRecord.findMany.mockResolvedValue([]);
      mockPrismaService.paymentRecord.count.mockResolvedValue(100);

      const result = await service.getPaymentRecords("user_123", 10, 10);

      expect(mockPrismaService.paymentRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 90,
          take: 10,
        }),
      );
    });
  });
});
