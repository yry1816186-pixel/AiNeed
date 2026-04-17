import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CustomizationType, CustomizationStatus, ProductTemplateType } from "../../../types/prisma-enums";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { CustomizationService } from "./customization.service";
import { PODService } from "./pod/pod-service";

describe("CustomizationService", () => {
  let service: CustomizationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    customizationRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    customizationQuote: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    customizationDesign: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    customizationDesignLayer: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    customizationTemplate: {
      findUnique: jest.fn(),
    },
  };

  const mockPODService = {
    submitToProduction: jest.fn(),
    checkProductionStatus: jest.fn(),
  };

  const mockRequest = {
    id: "request-id",
    userId: "test-user-id",
    type: CustomizationType.tailored,
    title: "测试定制需求",
    description: "这是一个测试定制需求",
    referenceImages: ["https://example.com/img1.jpg"],
    preferences: { color: "blue", style: "casual" },
    status: CustomizationStatus.draft,
    quotes: [],
    designId: null,
    templateId: null,
    podOrderId: null,
    trackingNumber: null,
    carrier: null,
    estimatedDeliveryDate: null,
    paymentId: null,
    selectedQuoteId: null,
    createdAt: new Date(),
  };

  const mockQuote = {
    id: "quote-id",
    requestId: "request-id",
    price: 500,
    description: "测试报价",
    createdAt: new Date(),
  };

  const mockTemplate = {
    id: "template-1",
    name: "T恤模板",
    type: ProductTemplateType.tshirt,
    createdAt: new Date(),
  };

  const mockDesign = {
    id: "design-1",
    userId: "test-user-id",
    templateId: "template-1",
    canvasData: { layers: [] },
    previewUrl: null,
    template: mockTemplate,
    layers: [],
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomizationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PODService,
          useValue: mockPODService,
        },
      ],
    }).compile();

    service = module.get<CustomizationService>(CustomizationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createRequest", () => {
    it("应该成功创建定制请求", async () => {
      mockPrismaService.customizationRequest.create.mockResolvedValue(
        mockRequest,
      );

      const result = await service.createRequest("test-user-id", {
        type: CustomizationType.tailored,
        description: "这是一个测试定制需求",
      });

      expect(result.id).toBe("request-id");
      expect(result.status).toBe(CustomizationStatus.draft);
      expect(
        mockPrismaService.customizationRequest.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "test-user-id",
          type: CustomizationType.tailored,
          status: CustomizationStatus.draft,
        }),
      });
    });

    it("应该处理可选参数", async () => {
      mockPrismaService.customizationRequest.create.mockResolvedValue(
        mockRequest,
      );

      await service.createRequest("test-user-id", {
        type: CustomizationType.tailored,
        description: "描述",
        title: "标题",
        referenceImages: ["img1.jpg"],
        preferences: { key: "value" },
      });

      expect(
        mockPrismaService.customizationRequest.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "标题",
          referenceImages: ["img1.jpg"],
          preferences: { key: "value" },
        }),
      });
    });
  });

  describe("submitRequest", () => {
    it("应该成功提交请求", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.customizationRequest.update.mockResolvedValue({
        ...mockRequest,
        status: CustomizationStatus.submitted,
      });

      const result = await service.submitRequest("request-id", "test-user-id");

      expect(result.status).toBe(CustomizationStatus.submitted);
    });

    it("应该抛出 NotFoundException 当请求不存在", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.submitRequest("non-existent-id", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getUserRequests", () => {
    it("应该返回用户请求列表", async () => {
      mockPrismaService.customizationRequest.findMany.mockResolvedValue([
        mockRequest,
      ]);
      mockPrismaService.customizationRequest.count.mockResolvedValue(1);

      const result = await service.getUserRequests("test-user-id");

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("应该按状态过滤", async () => {
      mockPrismaService.customizationRequest.findMany.mockResolvedValue([]);
      mockPrismaService.customizationRequest.count.mockResolvedValue(0);

      await service.getUserRequests(
        "test-user-id",
        CustomizationStatus.submitted,
      );

      expect(
        mockPrismaService.customizationRequest.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CustomizationStatus.submitted,
          }),
        }),
      );
    });

    it("应该支持分页", async () => {
      mockPrismaService.customizationRequest.findMany.mockResolvedValue([]);
      mockPrismaService.customizationRequest.count.mockResolvedValue(50);

      const result = await service.getUserRequests(
        "test-user-id",
        undefined,
        2,
        10,
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
    });
  });

  describe("getRequestById", () => {
    it("应该返回请求详情", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(
        mockRequest,
      );

      const result = await service.getRequestById("request-id", "test-user-id");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("request-id");
    });

    it("应该返回 null 当请求不存在", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(null);

      const result = await service.getRequestById(
        "non-existent-id",
        "test-user-id",
      );

      expect(result).toBeNull();
    });
  });

  describe("updateRequest", () => {
    it("应该成功更新请求", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.customizationRequest.update.mockResolvedValue({
        ...mockRequest,
        title: "新标题",
      });

      const result = await service.updateRequest("request-id", "test-user-id", {
        title: "新标题",
      });

      expect(result.title).toBe("新标题");
    });

    it("应该抛出 NotFoundException 当请求不存在或状态不允许修改", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRequest("request-id", "test-user-id", {
          title: "新标题",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("selectQuote", () => {
    it("应该成功选择报价", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.customizationQuote.findUnique.mockResolvedValue(
        mockQuote,
      );
      mockPrismaService.customizationRequest.update.mockResolvedValue({
        ...mockRequest,
        selectedQuoteId: "quote-id",
        status: CustomizationStatus.confirmed,
      });

      const result = await service.selectQuote(
        "request-id",
        "test-user-id",
        "quote-id",
      );

      expect(result.selectedQuoteId).toBe("quote-id");
      expect(result.status).toBe(CustomizationStatus.confirmed);
    });

    it("应该抛出 NotFoundException 当请求不存在", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.selectQuote("request-id", "test-user-id", "quote-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该抛出 NotFoundException 当报价不存在", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.customizationQuote.findUnique.mockResolvedValue(null);

      await expect(
        service.selectQuote("request-id", "test-user-id", "quote-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("cancelRequest", () => {
    it("应该成功取消请求", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(
        mockRequest,
      );
      mockPrismaService.customizationRequest.update.mockResolvedValue({
        ...mockRequest,
        status: CustomizationStatus.cancelled,
      });

      const result = await service.cancelRequest("request-id", "test-user-id");

      expect(result.status).toBe(CustomizationStatus.cancelled);
    });

    it("应该抛出 NotFoundException 当请求不存在或状态不允许取消", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelRequest("request-id", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("createDesign", () => {
    it("应该成功创建设计", async () => {
      mockPrismaService.customizationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );
      mockPrismaService.customizationDesign.create.mockResolvedValue(mockDesign);

      const result = await service.createDesign("test-user-id", "template-1", {
        layers: [],
      });

      expect(result.id).toBe("design-1");
      expect(
        mockPrismaService.customizationDesign.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "test-user-id",
          templateId: "template-1",
        }),
      });
    });

    it("模板不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.createDesign("test-user-id", "nonexistent", { layers: [] }),
      ).rejects.toThrow("模板不存在");
    });
  });

  describe("updateDesign", () => {
    it("应该成功更新设计画布数据", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(
        mockDesign,
      );
      mockPrismaService.customizationDesign.update.mockResolvedValue({
        ...mockDesign,
        canvasData: { layers: ["updated"] },
      });

      const result = await service.updateDesign(
        "design-1",
        "test-user-id",
        { layers: ["updated"] },
      );

      expect(
        mockPrismaService.customizationDesign.update,
      ).toHaveBeenCalled();
    });

    it("应该成功更新设计图层", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(
        mockDesign,
      );
      mockPrismaService.customizationDesignLayer.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.customizationDesignLayer.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.customizationDesign.update.mockResolvedValue({
        ...mockDesign,
        layers: [],
      });

      const layers = [
        {
          type: "text",
          content: "Hello",
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          scale: 1,
          rotation: 0,
          opacity: 1,
          zIndex: 0,
          fontSize: 16,
          color: "#000000",
          fontFamily: "Arial",
        },
        {
          type: "image",
          content: "img.png",
          x: 50,
          y: 50,
          width: 200,
          height: 200,
          scale: 1,
          rotation: 0,
          opacity: 0.8,
          zIndex: 1,
          imageUrl: "https://example.com/img.png",
        },
      ];

      await service.updateDesign(
        "design-1",
        "test-user-id",
        { layers: [] },
        layers,
      );

      expect(
        mockPrismaService.customizationDesignLayer.deleteMany,
      ).toHaveBeenCalledWith({
        where: { designId: "design-1" },
      });
      expect(
        mockPrismaService.customizationDesignLayer.createMany,
      ).toHaveBeenCalled();
    });

    it("设计不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDesign("nonexistent", "test-user-id", { layers: [] }),
      ).rejects.toThrow("设计不存在");
    });
  });

  describe("getDesign", () => {
    it("应该返回设计详情", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(
        mockDesign,
      );

      const result = await service.getDesign("design-1", "test-user-id");

      expect(result.id).toBe("design-1");
    });

    it("设计不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(null);

      await expect(
        service.getDesign("nonexistent", "test-user-id"),
      ).rejects.toThrow("设计不存在");
    });
  });

  describe("calculateQuote", () => {
    it("应该成功计算报价", async () => {
      const designWithLayers = {
        ...mockDesign,
        layers: [
          { type: "text" },
          { type: "image" },
        ],
        template: mockTemplate,
      };
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(
        designWithLayers,
      );
      mockPrismaService.customizationQuote.create.mockResolvedValue({
        id: "quote-1",
        price: 150,
        currency: "CNY",
        estimatedDays: 3,
      });

      const result = await service.calculateQuote(
        "design-1",
        "test-user-id",
        "front",
      );

      expect(result).toHaveProperty("pricing");
      expect(result).toHaveProperty("quoteId");
      expect(mockPrismaService.customizationQuote.create).toHaveBeenCalled();
    });

    it("设计不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateQuote("nonexistent", "test-user-id"),
      ).rejects.toThrow("设计不存在");
    });
  });

  describe("createCustomizationFromDesign", () => {
    it("应该成功从设计创建定制请求", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(
        mockDesign,
      );
      mockPrismaService.customizationQuote.findUnique.mockResolvedValue(
        mockQuote,
      );
      mockPrismaService.customizationRequest.create.mockResolvedValue({
        id: "new-request-id",
        userId: "test-user-id",
        type: CustomizationType.pod,
        designId: "design-1",
        templateId: "template-1",
      });
      mockPrismaService.customizationQuote.update.mockResolvedValue({});
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue({
        id: "new-request-id",
        quotes: [mockQuote],
        design: mockDesign,
      });

      const result = await service.createCustomizationFromDesign(
        "test-user-id",
        "design-1",
        "quote-id",
      );

      expect(
        mockPrismaService.customizationRequest.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: CustomizationType.pod,
            designId: "design-1",
          }),
        }),
      );
    });

    it("设计不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(null);

      await expect(
        service.createCustomizationFromDesign(
          "test-user-id",
          "nonexistent",
          "quote-id",
        ),
      ).rejects.toThrow("设计不存在");
    });

    it("报价不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(
        mockDesign,
      );
      mockPrismaService.customizationQuote.findUnique.mockResolvedValue(null);

      await expect(
        service.createCustomizationFromDesign(
          "test-user-id",
          "design-1",
          "nonexistent",
        ),
      ).rejects.toThrow("报价不存在");
    });
  });

  describe("generatePreview", () => {
    it("应该成功生成预览", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(
        mockDesign,
      );
      mockPrismaService.customizationDesign.update.mockResolvedValue({
        ...mockDesign,
        previewUrl: "/previews/design-1.png",
      });

      const result = await service.generatePreview("design-1", "test-user-id");

      expect(result.previewUrl).toBe("/previews/design-1.png");
      expect(result.designId).toBe("design-1");
    });

    it("设计不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationDesign.findFirst.mockResolvedValue(null);

      await expect(
        service.generatePreview("nonexistent", "test-user-id"),
      ).rejects.toThrow("设计不存在");
    });
  });

  describe("getTemplateById", () => {
    it("应该返回模板详情", async () => {
      mockPrismaService.customizationTemplate.findUnique.mockResolvedValue(
        mockTemplate,
      );

      const result = await service.getTemplateById("template-1");

      expect(result.id).toBe("template-1");
    });

    it("模板不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.getTemplateById("nonexistent"),
      ).rejects.toThrow("模板不存在");
    });
  });

  describe("confirmAndPay", () => {
    it("应该成功发起付款", async () => {
      const confirmedRequest = {
        ...mockRequest,
        status: CustomizationStatus.confirmed,
        selectedQuoteId: "quote-id",
        quotes: [mockQuote],
      };
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(
        confirmedRequest,
      );
      mockPrismaService.customizationRequest.update.mockResolvedValue(
        confirmedRequest,
      );

      const result = await service.confirmAndPay(
        "request-id",
        "test-user-id",
        "alipay",
      );

      expect(result).toHaveProperty("paymentId");
      expect(result).toHaveProperty("paymentMethod", "alipay");
    });

    it("非 confirmed 状态不允许付款", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(
        mockRequest,
      );

      await expect(
        service.confirmAndPay("request-id", "test-user-id", "alipay"),
      ).rejects.toThrow("需求状态不允许付款");
    });

    it("未选择报价时不允许付款", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: CustomizationStatus.confirmed,
        selectedQuoteId: null,
        quotes: [],
      });

      await expect(
        service.confirmAndPay("request-id", "test-user-id", "alipay"),
      ).rejects.toThrow("请先选择报价");
    });

    it("需求不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmAndPay("nonexistent", "test-user-id", "alipay"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("handlePaymentCallback", () => {
    it("支付成功时应该提交到 POD 生产", async () => {
      mockPODService.submitToProduction.mockResolvedValue({
        providerOrderId: "pod-123",
        estimatedDelivery: "2026-05-01",
        status: "in_production",
      });

      const result = await service.handlePaymentCallback("request-id", {
        success: true,
        paymentId: "pay-123",
      });

      expect(result.status).toBe("production_started");
      expect(mockPODService.submitToProduction).toHaveBeenCalledWith(
        "request-id",
      );
    });

    it("支付失败时应该返回失败状态", async () => {
      const result = await service.handlePaymentCallback("request-id", {
        success: false,
        paymentId: "pay-123",
      });

      expect(result.status).toBe("payment_failed");
      expect(mockPODService.submitToProduction).not.toHaveBeenCalled();
    });

    it("POD 提交失败时应该返回待处理状态", async () => {
      mockPODService.submitToProduction.mockRejectedValue(
        new Error("POD 服务不可用"),
      );

      const result = await service.handlePaymentCallback("request-id", {
        success: true,
        paymentId: "pay-123",
      });

      expect(result.status).toBe("payment_confirmed_production_pending");
    });
  });

  describe("getProductionStatus", () => {
    it("有 POD 订单时应该查询生产状态", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        podOrderId: "pod-123",
        trackingNumber: null,
        carrier: null,
        estimatedDeliveryDate: null,
      });
      mockPODService.checkProductionStatus.mockResolvedValue({
        status: "in_production",
      });

      const result = await service.getProductionStatus(
        "request-id",
        "test-user-id",
      );

      expect(result.podStatus).toBeDefined();
      expect(mockPODService.checkProductionStatus).toHaveBeenCalledWith(
        "request-id",
      );
    });

    it("没有 POD 订单时应该返回当前状态", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        podOrderId: null,
      });

      const result = await service.getProductionStatus(
        "request-id",
        "test-user-id",
      );

      expect(result).not.toHaveProperty("podStatus");
    });

    it("需求不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.getProductionStatus("nonexistent", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("POD 查询失败时应该返回当前状态", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        podOrderId: "pod-123",
        trackingNumber: null,
        carrier: null,
        estimatedDeliveryDate: null,
      });
      mockPODService.checkProductionStatus.mockRejectedValue(
        new Error("POD 服务不可用"),
      );

      const result = await service.getProductionStatus(
        "request-id",
        "test-user-id",
      );

      expect(result).not.toHaveProperty("podStatus");
    });
  });

  describe("confirmDelivery", () => {
    it("应该成功确认收货", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: CustomizationStatus.shipped,
      });
      mockPrismaService.customizationRequest.update.mockResolvedValue({
        ...mockRequest,
        status: CustomizationStatus.completed,
      });

      const result = await service.confirmDelivery(
        "request-id",
        "test-user-id",
      );

      expect(result.status).toBe(CustomizationStatus.completed);
    });

    it("非 shipped 状态不允许确认收货", async () => {
      mockPrismaService.customizationRequest.findFirst.mockImplementation(
        ({ where }) => {
          if (where.status === CustomizationStatus.shipped) {return null;}
          return mockRequest;
        },
      );

      await expect(
        service.confirmDelivery("request-id", "test-user-id"),
      ).rejects.toThrow("定制需求不存在或状态不允许确认收货");
    });

    it("需求不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.customizationRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmDelivery("nonexistent", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
