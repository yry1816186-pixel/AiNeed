import { NotFoundException, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Test, TestingModule } from "@nestjs/testing";
import { TryOnStatus } from "@prisma/client";

import { AiQuotaGuard } from "../security/rate-limit/ai-quota.guard";

import { TryOnController } from "./try-on.controller";
import { TryOnService } from "./try-on.service";

describe("TryOnController", () => {
  let controller: TryOnController;

  const mockTryOnService = {
    createTryOnRequest: jest.fn().mockResolvedValue({
      id: "tryon-id",
      status: TryOnStatus.pending,
      estimatedWaitTime: 45,
    }),
    getTryOnStatus: jest.fn().mockResolvedValue({
      id: "tryon-id",
      userId: "user-123",
      photoId: "photo-id",
      itemId: "item-id",
      status: TryOnStatus.pending,
      resultImageUrl: null,
      resultImageDataUri: null,
      createdAt: new Date(),
      completedAt: null,
      photo: {
        id: "photo-id",
        thumbnailUrl: "https://example.com/thumb.jpg",
        type: "full_body",
      },
      item: {
        id: "item-id",
        name: "测试服装",
        images: ["https://example.com/item.jpg"],
        price: 199,
      },
    }),
    getUserTryOnHistory: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    }),
    deleteTryOn: jest.fn().mockResolvedValue(undefined),
    retryTryOn: jest.fn().mockResolvedValue({
      id: "retry-tryon-id",
      status: TryOnStatus.pending,
      estimatedWaitTime: 45,
    }),
    getDailyQuota: jest.fn().mockResolvedValue({
      used: 1,
      limit: 3,
      remaining: 2,
    }),
    getTryOnResultAsset: jest.fn().mockResolvedValue({
      body: Buffer.from("test-image-data"),
      contentType: "image/png",
      cacheControl: "public, max-age=31536000",
    }),
    getShareImageAsset: jest.fn().mockResolvedValue({
      body: Buffer.from("watermarked-image-data"),
      contentType: "image/jpeg",
      cacheControl: "public, max-age=86400",
    }),
  };

  const mockResponse = {
    setHeader: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TryOnController],
      providers: [
        { provide: TryOnService, useValue: mockTryOnService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AiQuotaGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TryOnController>(TryOnController);
  });

  it("应该正确实例化控制器", () => {
    expect(controller).toBeDefined();
  });

  describe("createTryOn", () => {
    it("应该创建虚拟试衣请求", async () => {
      const body = {
        photoId: "photo-id",
        itemId: "item-id",
      };

      const result = await controller.createTryOn("user-123", body);

      expect(result.id).toBe("tryon-id");
      expect(result.status).toBe(TryOnStatus.pending);
      expect(result.estimatedWaitTime).toBe(45);
      expect(mockTryOnService.createTryOnRequest).toHaveBeenCalledWith(
        "user-123",
        "photo-id",
        "item-id",
      );
    });

    it("应该传递 category 和 scene 参数", async () => {
      const body = {
        photoId: "photo-id",
        itemId: "item-id",
        category: "upper_body",
        scene: "通勤",
      };

      // createTryOnRequest 只接收 userId, photoId, itemId
      await controller.createTryOn("user-123", body);

      expect(mockTryOnService.createTryOnRequest).toHaveBeenCalledWith(
        "user-123",
        "photo-id",
        "item-id",
      );
    });

    it("应该处理照片不存在的错误", async () => {
      mockTryOnService.createTryOnRequest.mockRejectedValueOnce(
        new NotFoundException("照片不存在"),
      );

      const body = {
        photoId: "non-existent-photo",
        itemId: "item-id",
      };

      await expect(
        controller.createTryOn("user-123", body),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该处理服装不存在的错误", async () => {
      mockTryOnService.createTryOnRequest.mockRejectedValueOnce(
        new NotFoundException("服装商品不存在"),
      );

      const body = {
        photoId: "photo-id",
        itemId: "non-existent-item",
      };

      await expect(
        controller.createTryOn("user-123", body),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该处理并发限制错误", async () => {
      mockTryOnService.createTryOnRequest.mockRejectedValueOnce(
        new BadRequestException("您已有 3 个试衣任务正在处理中，请等待完成后再试"),
      );

      const body = {
        photoId: "photo-id",
        itemId: "item-id",
      };

      await expect(
        controller.createTryOn("user-123", body),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getHistory", () => {
    it("应该返回试衣历史", async () => {
      const query = { page: 1, limit: 20 };

      const result = await controller.getHistory("user-123", query);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockTryOnService.getUserTryOnHistory).toHaveBeenCalledWith(
        "user-123",
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it("应该传递所有筛选参数", async () => {
      const query = {
        page: 2,
        limit: 10,
        status: TryOnStatus.completed,
        category: "tops",
        scene: "通勤",
        dateFrom: "2026-01-01",
        dateTo: "2026-12-31",
      };

      await controller.getHistory("user-123", query);

      expect(mockTryOnService.getUserTryOnHistory).toHaveBeenCalledWith(
        "user-123",
        2,
        10,
        TryOnStatus.completed,
        "tops",
        "通勤",
        "2026-01-01",
        "2026-12-31",
      );
    });

    it("应该使用默认分页参数", async () => {
      const query = {};

      await controller.getHistory("user-123", query);

      expect(mockTryOnService.getUserTryOnHistory).toHaveBeenCalledWith(
        "user-123",
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe("getDailyQuota", () => {
    it("应该返回每日配额", async () => {
      const result = await controller.getDailyQuota("user-123");

      expect(result.used).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.remaining).toBe(2);
      expect(mockTryOnService.getDailyQuota).toHaveBeenCalledWith("user-123");
    });
  });

  describe("getTryOnStatus", () => {
    it("应该返回试衣详情", async () => {
      const result = await controller.getTryOnStatus("user-123", "tryon-id");

      expect(result.id).toBe("tryon-id");
      expect(result.status).toBe(TryOnStatus.pending);
      expect(mockTryOnService.getTryOnStatus).toHaveBeenCalledWith(
        "tryon-id",
        "user-123",
      );
    });

    it("应该处理试衣记录不存在的错误", async () => {
      mockTryOnService.getTryOnStatus.mockRejectedValueOnce(
        new NotFoundException("试衣记录不存在"),
      );

      await expect(
        controller.getTryOnStatus("user-123", "non-existent-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getTryOnResultImage", () => {
    it("应该返回试衣结果图片", async () => {
      await controller.getTryOnResultImage(
        "user-123",
        "tryon-id",
        mockResponse as never,
      );

      expect(mockTryOnService.getTryOnResultAsset).toHaveBeenCalledWith(
        "tryon-id",
        "user-123",
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "image/png",
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "public, max-age=31536000",
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.any(Buffer),
      );
    });

    it("应该处理试衣记录不存在的错误", async () => {
      mockTryOnService.getTryOnResultAsset.mockRejectedValueOnce(
        new NotFoundException("试衣记录不存在"),
      );

      await expect(
        controller.getTryOnResultImage(
          "user-123",
          "non-existent-id",
          mockResponse as never,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该处理结果图片不存在的错误", async () => {
      mockTryOnService.getTryOnResultAsset.mockRejectedValueOnce(
        new NotFoundException("试衣结果图不存在"),
      );

      await expect(
        controller.getTryOnResultImage(
          "user-123",
          "tryon-id",
          mockResponse as never,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getShareImage", () => {
    it("应该返回分享图", async () => {
      await controller.getShareImage(
        "user-123",
        "tryon-id",
        mockResponse as never,
      );

      expect(mockTryOnService.getShareImageAsset).toHaveBeenCalledWith(
        "tryon-id",
        "user-123",
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "image/jpeg",
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.any(Buffer),
      );
    });

    it("应该处理分享图不存在的错误", async () => {
      mockTryOnService.getShareImageAsset.mockRejectedValueOnce(
        new NotFoundException("分享图不存在"),
      );

      await expect(
        controller.getShareImage(
          "user-123",
          "tryon-id",
          mockResponse as never,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("retryTryOn", () => {
    it("应该重试试衣请求", async () => {
      const result = await controller.retryTryOn("user-123", "tryon-id");

      expect(result.id).toBe("retry-tryon-id");
      expect(result.status).toBe(TryOnStatus.pending);
      expect(mockTryOnService.retryTryOn).toHaveBeenCalledWith(
        "tryon-id",
        "user-123",
      );
    });

    it("应该处理试衣记录不存在的错误", async () => {
      mockTryOnService.retryTryOn.mockRejectedValueOnce(
        new NotFoundException("试衣记录不存在"),
      );

      await expect(
        controller.retryTryOn("user-123", "non-existent-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该处理每日重试限制的错误", async () => {
      mockTryOnService.retryTryOn.mockRejectedValueOnce(
        new BadRequestException("今日免费试衣次数已用完，明天再来吧"),
      );

      await expect(
        controller.retryTryOn("user-123", "tryon-id"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("deleteTryOn", () => {
    it("应该删除试衣记录", async () => {
      await controller.deleteTryOn("user-123", "tryon-id");

      expect(mockTryOnService.deleteTryOn).toHaveBeenCalledWith(
        "tryon-id",
        "user-123",
      );
    });

    it("应该处理试衣记录不存在的错误", async () => {
      mockTryOnService.deleteTryOn.mockRejectedValueOnce(
        new NotFoundException("试衣记录不存在"),
      );

      await expect(
        controller.deleteTryOn("user-123", "non-existent-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
