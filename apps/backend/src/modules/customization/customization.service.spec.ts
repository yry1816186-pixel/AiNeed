import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CustomizationType, CustomizationStatus } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";

import { CustomizationService } from "./customization.service";
import { PODService } from "./pod/pod-service";



describe("CustomizationService", () => {
  let service: CustomizationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    customizationRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    customizationQuote: {
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
    createdAt: new Date(),
  };

  const mockQuote = {
    id: "quote-id",
    requestId: "request-id",
    price: 500,
    description: "测试报价",
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
});
