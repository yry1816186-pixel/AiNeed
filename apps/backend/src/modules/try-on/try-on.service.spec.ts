import {
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { TryOnStatus } from "@prisma/client";

import { NotificationService } from "../../common/gateway/notification.service";
import { StructuredLoggerService } from "../../common/logging/structured-logger.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { REDIS_CLIENT } from "../../common/redis/redis.service";
import { StorageService } from "../../common/storage/storage.service";
import { QueueService } from "../queue/queue.service";

import { TryOnOrchestratorService } from "./services/tryon-orchestrator.service";
import { TryOnService } from "./try-on.service";

describe("TryOnService", () => {
  let service: TryOnService;
  let prisma: PrismaService;
  let orchestrator: TryOnOrchestratorService;
  let redis: { publish: jest.Mock };

  const mockPrismaService = {
    userPhoto: {
      findFirst: jest.fn(),
    },
    clothingItem: {
      findUnique: jest.fn(),
    },
    virtualTryOn: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wardrobeCollection: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    wardrobeCollectionItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockOrchestrator = {
    executeTryOn: jest.fn(),
    clearCache: jest.fn(),
    getAvailableProviders: jest.fn().mockReturnValue(["kolors", "mock"]),
  };

  const mockPipeline = {
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([
      [null, 1],
      [null, 1],
    ]),
  };

  const mockRedis = {
    publish: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    pipeline: jest.fn().mockReturnValue(mockPipeline),
  };

  const mockStorageService = {
    fetchRemoteAsset: jest.fn(),
    fetchRemoteAssetDataUri: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueueService = {
    addJob: jest.fn().mockResolvedValue({ id: "mock-job-id" }),
    getJobStatus: jest.fn().mockResolvedValue(null),
    getQueueStats: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
    addVirtualTryOnTask: jest.fn().mockResolvedValue({ taskId: "mock-task-id", status: "pending" }),
    addStyleAnalysisTask: jest.fn().mockResolvedValue({ taskId: "mock-task-id", status: "pending" }),
    addImageAnalysisTask: jest.fn().mockResolvedValue({ taskId: "mock-task-id", status: "pending" }),
  };

  const mockNotificationService = {
    sendNotification: jest.fn().mockResolvedValue(undefined),
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    sendCustomNotification: jest.fn().mockResolvedValue(undefined),
    notifyUser: jest.fn().mockResolvedValue(undefined),
  };

  const mockStructuredLoggerService = {
    createChildLogger: jest.fn().mockReturnValue({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }),
  };

  const mockPhoto = {
    id: "photo-id",
    userId: "test-user-id",
    url: "https://storage.example.com/photos/user/photo.jpg",
    thumbnailUrl: "https://storage.example.com/thumbnails/user/photo.jpg",
  };

  const mockClothingItem = {
    id: "item-id",
    name: "测试服装",
    images: ["https://storage.example.com/clothing/item.jpg"],
    price: 199,
    category: "tops",
  };

  const mockTryOn = {
    id: "tryon-id",
    userId: "test-user-id",
    photoId: "photo-id",
    itemId: "item-id",
    status: TryOnStatus.pending,
    resultImageUrl: null,
    createdAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TryOnService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TryOnOrchestratorService,
          useValue: mockOrchestrator,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: StructuredLoggerService,
          useValue: mockStructuredLoggerService,
        },
      ],
    }).compile();

    service = module.get<TryOnService>(TryOnService);
    prisma = module.get<PrismaService>(PrismaService);
    orchestrator = module.get<TryOnOrchestratorService>(
      TryOnOrchestratorService,
    );
    redis = module.get(REDIS_CLIENT);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createTryOnRequest", () => {
    it("应该成功创建试衣请求", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      const result = await service.createTryOnRequest(
        "test-user-id",
        "photo-id",
        "item-id",
      );

      expect(result.id).toBe("tryon-id");
      expect(result.status).toBe(TryOnStatus.pending);
      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalledWith({
        data: {
          userId: "test-user-id",
          photoId: "photo-id",
          itemId: "item-id",
          status: TryOnStatus.pending,
        },
      });
    });

    it("应该返回已存在的试衣记录", async () => {
      const completedTryOn = { ...mockTryOn, status: TryOnStatus.completed };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(
        completedTryOn,
      );

      const result = await service.createTryOnRequest(
        "test-user-id",
        "photo-id",
        "item-id",
      );

      expect(result.id).toBe("tryon-id");
      expect(result.status).toBe(TryOnStatus.completed);
      expect(result.estimatedWaitTime).toBe(0);
      expect(mockPrismaService.virtualTryOn.create).not.toHaveBeenCalled();
    });

    it("应该返回正在处理的试衣记录", async () => {
      const pendingTryOn = { ...mockTryOn, status: TryOnStatus.processing };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      // 第一次调用检查已完成记录返回 null，第二次调用检查处理中记录返回 pendingTryOn
      mockPrismaService.virtualTryOn.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(pendingTryOn);

      const result = await service.createTryOnRequest(
        "test-user-id",
        "photo-id",
        "item-id",
      );

      expect(result.status).toBe(TryOnStatus.processing);
      expect(result.estimatedWaitTime).toBe(30);
    });

    it("应该抛出 NotFoundException 当照片不存在", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(null);

      await expect(
        service.createTryOnRequest(
          "test-user-id",
          "non-existent-photo",
          "item-id",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该抛出 NotFoundException 当服装不存在", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(null);

      await expect(
        service.createTryOnRequest(
          "test-user-id",
          "photo-id",
          "non-existent-item",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getTryOnStatus", () => {
    it("应该返回试衣状态", async () => {
      const tryOnWithRelations = {
        ...mockTryOn,
        resultImageDataUri: null,
        photo: mockPhoto,
        item: mockClothingItem,
      };
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(
        tryOnWithRelations,
      );

      const result = await service.getTryOnStatus("tryon-id", "test-user-id");

      expect(result).toEqual(tryOnWithRelations);
      expect(mockPrismaService.virtualTryOn.findFirst).toHaveBeenCalledWith({
        where: { id: "tryon-id", userId: "test-user-id" },
        include: {
          photo: true,
          item: true,
        },
      });
    });

    it("应该抛出 NotFoundException 当试衣记录不存在", async () => {
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);

      await expect(
        service.getTryOnStatus("non-existent-id", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getUserTryOnHistory", () => {
    it("应该返回用户试衣历史", async () => {
      const historyItems = [
        {
          ...mockTryOn,
          photo: {
            id: "photo-id",
            thumbnailUrl: "https://example.com/thumb.jpg",
          },
          item: { id: "item-id", name: "测试服装", images: [], price: 199 },
        },
      ];
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue(historyItems);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(1);

      const result = await service.getUserTryOnHistory("test-user-id");

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("应该支持分页", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(50);

      const result = await service.getUserTryOnHistory("test-user-id", 2, 10);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(mockPrismaService.virtualTryOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it("应该支持状态筛选", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);

      await service.getUserTryOnHistory(
        "test-user-id",
        1,
        10,
        TryOnStatus.completed,
      );

      expect(mockPrismaService.virtualTryOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "test-user-id",
            status: TryOnStatus.completed,
          },
        }),
      );
    });

    it("应该返回空列表当没有历史记录", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);

      const result = await service.getUserTryOnHistory("test-user-id");

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe("deleteTryOn", () => {
    it("应该成功删除试衣记录", async () => {
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(mockTryOn);
      mockPrismaService.virtualTryOn.delete.mockResolvedValue(mockTryOn);

      await service.deleteTryOn("tryon-id", "test-user-id");

      expect(mockPrismaService.virtualTryOn.delete).toHaveBeenCalledWith({
        where: { id: "tryon-id" },
      });
    });

    it("应该抛出 NotFoundException 当试衣记录不存在", async () => {
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTryOn("non-existent-id", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("异步处理测试", () => {
    it("应该异步处理试衣请求并更新状态", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      // 创建试衣请求会触发异步处理
      await service.createTryOnRequest(
        "test-user-id",
        "photo-id",
        "item-id",
      );

      // 验证创建了试衣记录
      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalled();
    });

    it("应该在处理完成后发布完成事件", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      await service.createTryOnRequest(
        "test-user-id",
        "photo-id",
        "item-id",
      );

      // 验证队列任务被添加
      expect(mockQueueService.addVirtualTryOnTask).toHaveBeenCalled();
      // 验证通知被发送
      expect(mockNotificationService.sendCustomNotification).toHaveBeenCalled();
    });
  });

  describe("服装缺少图片的边界情况", () => {
    it("应该拒绝没有图片的服装", async () => {
      const itemWithoutImages = {
        ...mockClothingItem,
        images: [],
      };

      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        itemWithoutImages,
      );

      await expect(
        service.createTryOnRequest("test-user-id", "photo-id", "item-id"),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该拒绝图片数组为 null 的服装", async () => {
      const itemWithNullImages = {
        ...mockClothingItem,
        mainImage: null,
        images: null,
      };

      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        itemWithNullImages,
      );

      await expect(
        service.createTryOnRequest("test-user-id", "photo-id", "item-id"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("mapCategory 测试", () => {
    it("应该正确映射上衣类别", async () => {
      const topItem = { ...mockClothingItem, category: "tops" };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(topItem);
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      await service.createTryOnRequest("test-user-id", "photo-id", "item-id");

      // 验证创建成功
      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalled();
    });

    it("应该正确映射下装类别", async () => {
      const pantsItem = { ...mockClothingItem, category: "pants" };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(pantsItem);
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      await service.createTryOnRequest("test-user-id", "photo-id", "item-id");

      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalled();
    });

    it("应该正确映射连衣裙类别", async () => {
      const dressItem = { ...mockClothingItem, category: "dresses" };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(dressItem);
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      await service.createTryOnRequest("test-user-id", "photo-id", "item-id");

      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalled();
    });

    it("应该正确映射连体衣类别", async () => {
      const jumpsuitItem = { ...mockClothingItem, category: "jumpsuits" };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(jumpsuitItem);
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      await service.createTryOnRequest("test-user-id", "photo-id", "item-id");

      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalled();
    });

    it("应该对未知类别使用默认值", async () => {
      const unknownItem = { ...mockClothingItem, category: "unknown" };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(unknownItem);
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      await service.createTryOnRequest("test-user-id", "photo-id", "item-id");

      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalled();
    });
  });

  describe("getTryOnResultAsset 测试", () => {
    it("应该返回试衣结果资源", async () => {
      const mockAsset = {
        body: Buffer.from("test-image"),
        contentType: "image/png",
        cacheControl: "public, max-age=31536000",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue({
        ...mockTryOn,
        resultImageUrl: "https://example.com/result.jpg",
      });
      mockStorageService.fetchRemoteAsset.mockResolvedValue(mockAsset);

      const result = await service.getTryOnResultAsset(
        "tryon-id",
        "test-user-id",
      );

      expect(result.body).toBeInstanceOf(Buffer);
      expect(result.contentType).toBe("image/png");
    });

    it("应该拒绝不存在的试衣记录", async () => {
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);

      await expect(
        service.getTryOnResultAsset("non-existent-id", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该拒绝没有结果图片的试衣记录", async () => {
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue({
        ...mockTryOn,
        resultImageUrl: null,
      });

      await expect(
        service.getTryOnResultAsset("tryon-id", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("边界情况测试", () => {
    it("应该处理不属于当前用户的照片", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(null);

      await expect(
        service.createTryOnRequest(
          "test-user-id",
          "other-user-photo",
          "item-id",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该处理大写类别名称", async () => {
      const upperCaseItem = { ...mockClothingItem, category: "TOPS" };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(upperCaseItem);
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      await service.createTryOnRequest("test-user-id", "photo-id", "item-id");

      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalled();
    });

    it("应该处理空类别", async () => {
      const noCategoryItem = { ...mockClothingItem, category: null };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(noCategoryItem);
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      await service.createTryOnRequest("test-user-id", "photo-id", "item-id");

      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalled();
    });

    it("应该处理 incrementDailyRetryCount 失败", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);
      mockPipeline.exec.mockRejectedValueOnce(new Error("Redis pipeline error"));

      // incrementDailyRetryCount 中 pipeline 失败会导致请求抛出异常
      await expect(
        service.createTryOnRequest("test-user-id", "photo-id", "item-id"),
      ).rejects.toThrow("Redis pipeline error");
    });
  });

  // ==================== 新增测试用例 ====================

  describe("createTryOnRequest 并发限制测试", () => {
    it("应该拒绝超过最大并发数的试衣请求", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(3);

      await expect(
        service.createTryOnRequest("test-user-id", "photo-id", "item-id"),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该允许未达到最大并发数的试衣请求", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(2);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      const result = await service.createTryOnRequest(
        "test-user-id",
        "photo-id",
        "item-id",
      );

      expect(result.id).toBe("tryon-id");
      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalled();
    });
  });

  describe("createTryOnRequest Redis 缓存命中测试", () => {
    it("应该返回 Redis 缓存的试衣结果", async () => {
      const cachedResult = { resultImageUrl: "https://example.com/cached-result.jpg" };
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);
      mockRedis.get.mockResolvedValueOnce(null); // daily retry check
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedResult)); // stable cache key
      mockPrismaService.virtualTryOn.create.mockResolvedValue({
        ...mockTryOn,
        status: TryOnStatus.completed,
        resultImageUrl: cachedResult.resultImageUrl,
      });

      const result = await service.createTryOnRequest(
        "test-user-id",
        "photo-id",
        "item-id",
      );

      expect(result.status).toBe(TryOnStatus.completed);
      expect(result.estimatedWaitTime).toBe(0);
    });
  });

  describe("createTryOnRequest 每日重试限制测试", () => {
    it("应该拒绝超过每日重试限制的请求", async () => {
      mockRedis.get.mockResolvedValueOnce("3"); // daily retry count = 3

      await expect(
        service.createTryOnRequest("test-user-id", "photo-id", "item-id"),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该允许未达到每日限制的请求", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);
      mockRedis.get.mockResolvedValueOnce("1"); // daily retry count = 1 (below limit)
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);

      const result = await service.createTryOnRequest(
        "test-user-id",
        "photo-id",
        "item-id",
      );

      expect(result.id).toBe("tryon-id");
    });
  });

  describe("retryTryOn 测试", () => {
    it("应该成功重试试衣请求", async () => {
      const originalTryOn = {
        ...mockTryOn,
        status: TryOnStatus.failed,
        photoId: "photo-id",
        itemId: "item-id",
        retryCount: 0,
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(originalTryOn);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.create.mockResolvedValue({
        ...mockTryOn,
        id: "retry-tryon-id",
        status: TryOnStatus.pending,
        parentTryOnId: originalTryOn.id,
        retryCount: 1,
      });

      const result = await service.retryTryOn("tryon-id", "test-user-id");

      expect(result.id).toBe("retry-tryon-id");
      expect(result.status).toBe(TryOnStatus.pending);
      expect(result.estimatedWaitTime).toBe(45);
      expect(mockQueueService.addVirtualTryOnTask).toHaveBeenCalled();
    });

    it("应该拒绝不存在的试衣记录重试", async () => {
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);

      await expect(
        service.retryTryOn("non-existent-id", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该拒绝超过每日重试限制的重试请求", async () => {
      const originalTryOn = {
        ...mockTryOn,
        status: TryOnStatus.failed,
        photoId: "photo-id",
        itemId: "item-id",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(originalTryOn);
      mockRedis.get.mockResolvedValueOnce("3"); // daily retry count = 3 (at limit)

      await expect(
        service.retryTryOn("tryon-id", "test-user-id"),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该递增重试计数", async () => {
      const originalTryOn = {
        ...mockTryOn,
        status: TryOnStatus.failed,
        photoId: "photo-id",
        itemId: "item-id",
        retryCount: 2,
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(originalTryOn);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.create.mockResolvedValue({
        ...mockTryOn,
        id: "retry-tryon-id-2",
        retryCount: 3,
      });

      await service.retryTryOn("tryon-id", "test-user-id");

      expect(mockPrismaService.virtualTryOn.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            retryCount: 3,
            parentTryOnId: originalTryOn.id,
          }),
        }),
      );
    });
  });

  describe("getDailyQuota 测试", () => {
    it("应该返回每日配额使用情况", async () => {
      mockRedis.get.mockResolvedValueOnce("1");

      const result = await service.getDailyQuota("test-user-id");

      expect(result.used).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.remaining).toBe(2);
    });

    it("应该返回满额配额当未使用时", async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.getDailyQuota("test-user-id");

      expect(result.used).toBe(0);
      expect(result.limit).toBe(3);
      expect(result.remaining).toBe(3);
    });

    it("应该返回零剩余配额当已用完时", async () => {
      mockRedis.get.mockResolvedValueOnce("3");

      const result = await service.getDailyQuota("test-user-id");

      expect(result.used).toBe(3);
      expect(result.remaining).toBe(0);
    });

    it("应该处理超过限制的使用量（返回0剩余）", async () => {
      mockRedis.get.mockResolvedValueOnce("5");

      const result = await service.getDailyQuota("test-user-id");

      expect(result.used).toBe(5);
      expect(result.remaining).toBe(0);
    });
  });

  describe("getShareImageAsset 测试", () => {
    it("应该返回带水印的分享图", async () => {
      const mockAsset = {
        body: Buffer.from("watermarked-image"),
        contentType: "image/jpeg",
        cacheControl: "public, max-age=86400",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue({
        ...mockTryOn,
        resultImageUrl: "https://example.com/result.jpg",
        watermarkedImageUrl: "https://example.com/watermarked.jpg",
      });
      mockStorageService.fetchRemoteAsset.mockResolvedValue(mockAsset);

      const result = await service.getShareImageAsset(
        "tryon-id",
        "test-user-id",
      );

      expect(result.body).toBeInstanceOf(Buffer);
      expect(result.contentType).toBe("image/jpeg");
      expect(mockStorageService.fetchRemoteAsset).toHaveBeenCalledWith(
        "https://example.com/watermarked.jpg",
      );
    });

    it("应该回退到结果图当没有水印图时", async () => {
      const mockAsset = {
        body: Buffer.from("result-image"),
        contentType: "image/png",
        cacheControl: "public, max-age=31536000",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue({
        ...mockTryOn,
        resultImageUrl: "https://example.com/result.jpg",
        watermarkedImageUrl: null,
      });
      mockStorageService.fetchRemoteAsset.mockResolvedValue(mockAsset);

      await service.getShareImageAsset("tryon-id", "test-user-id");

      expect(mockStorageService.fetchRemoteAsset).toHaveBeenCalledWith(
        "https://example.com/result.jpg",
      );
    });

    it("应该拒绝不存在的试衣记录", async () => {
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);

      await expect(
        service.getShareImageAsset("non-existent-id", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该拒绝没有分享图的试衣记录", async () => {
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue({
        ...mockTryOn,
        resultImageUrl: null,
        watermarkedImageUrl: null,
      });

      await expect(
        service.getShareImageAsset("tryon-id", "test-user-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getUserTryOnHistory 高级筛选测试", () => {
    it("应该支持按分类筛选", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);

      await service.getUserTryOnHistory(
        "test-user-id",
        1,
        10,
        undefined,
        "tops",
      );

      expect(mockPrismaService.virtualTryOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "test-user-id",
            category: "tops",
          }),
        }),
      );
    });

    it("应该支持按场景筛选", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);

      await service.getUserTryOnHistory(
        "test-user-id",
        1,
        10,
        undefined,
        undefined,
        "通勤",
      );

      expect(mockPrismaService.virtualTryOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "test-user-id",
            scene: "通勤",
          }),
        }),
      );
    });

    it("应该支持按日期范围筛选", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);

      await service.getUserTryOnHistory(
        "test-user-id",
        1,
        10,
        undefined,
        undefined,
        undefined,
        "2026-01-01",
        "2026-12-31",
      );

      expect(mockPrismaService.virtualTryOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "test-user-id",
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it("应该支持仅起始日期筛选", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);

      await service.getUserTryOnHistory(
        "test-user-id",
        1,
        10,
        undefined,
        undefined,
        undefined,
        "2026-01-01",
      );

      expect(mockPrismaService.virtualTryOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it("应该支持仅结束日期筛选", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);

      await service.getUserTryOnHistory(
        "test-user-id",
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        "2026-12-31",
      );

      expect(mockPrismaService.virtualTryOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it("应该支持组合筛选条件", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(0);

      await service.getUserTryOnHistory(
        "test-user-id",
        1,
        10,
        TryOnStatus.completed,
        "tops",
        "通勤",
        "2026-01-01",
        "2026-06-30",
      );

      expect(mockPrismaService.virtualTryOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "test-user-id",
            status: TryOnStatus.completed,
            category: "tops",
            scene: "通勤",
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        }),
      );
    });

    it("应该正确计算总页数", async () => {
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(45);

      const result = await service.getUserTryOnHistory("test-user-id", 1, 10);

      expect(result.totalPages).toBe(5);
    });
  });

  describe("deleteTryOn 扩展测试", () => {
    it("应该删除试衣记录的结果图片", async () => {
      const tryOnWithResult = {
        ...mockTryOn,
        resultImageUrl: "https://storage.example.com/results/result.jpg",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(tryOnWithResult);
      mockPrismaService.virtualTryOn.delete.mockResolvedValue(tryOnWithResult);

      await service.deleteTryOn("tryon-id", "test-user-id");

      expect(mockStorageService.delete).toHaveBeenCalledWith(
        "https://storage.example.com/results/result.jpg",
      );
      expect(mockPrismaService.virtualTryOn.delete).toHaveBeenCalledWith({
        where: { id: "tryon-id" },
      });
    });

    it("应该处理结果图片删除失败（仍应删除数据库记录）", async () => {
      const tryOnWithResult = {
        ...mockTryOn,
        resultImageUrl: "https://storage.example.com/results/result.jpg",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(tryOnWithResult);
      mockStorageService.delete.mockRejectedValueOnce(
        new Error("MinIO 不可用"),
      );
      mockPrismaService.virtualTryOn.delete.mockResolvedValue(tryOnWithResult);

      // 不应抛出异常，应继续删除数据库记录
      await service.deleteTryOn("tryon-id", "test-user-id");

      expect(mockPrismaService.virtualTryOn.delete).toHaveBeenCalledWith({
        where: { id: "tryon-id" },
      });
    });

    it("应该处理没有结果图片的试衣记录删除", async () => {
      const tryOnWithoutResult = {
        ...mockTryOn,
        resultImageUrl: null,
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(tryOnWithoutResult);
      mockPrismaService.virtualTryOn.delete.mockResolvedValue(tryOnWithoutResult);

      await service.deleteTryOn("tryon-id", "test-user-id");

      // 不应调用存储删除
      expect(mockStorageService.delete).not.toHaveBeenCalled();
      expect(mockPrismaService.virtualTryOn.delete).toHaveBeenCalledWith({
        where: { id: "tryon-id" },
      });
    });
  });

  describe("archiveToInspirationWardrobe 测试", () => {
    it("应该成功归档已完成的试衣结果", async () => {
      const completedTryOn = {
        ...mockTryOn,
        status: TryOnStatus.completed,
        resultImageUrl: "https://example.com/result.jpg",
        watermarkedImageUrl: null,
        itemId: "item-id",
        photoId: "photo-id",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(completedTryOn);
      mockPrismaService.wardrobeCollection.findFirst.mockResolvedValue({
        id: "existing-collection-id",
        name: "AI试衣效果",
        userId: "test-user-id",
      });
      mockPrismaService.wardrobeCollectionItem.findFirst.mockResolvedValue(null);
      mockPrismaService.wardrobeCollectionItem.create.mockResolvedValue({ id: "collection-item-id" });

      await service.archiveToInspirationWardrobe("tryon-id", "test-user-id");

      expect(mockPrismaService.wardrobeCollectionItem.create).toHaveBeenCalledWith({
        data: {
          userId: "test-user-id",
          collectionId: "existing-collection-id",
          itemType: "try_on",
          itemId: "tryon-id",
        },
      });
    });

    it("应该创建新集合当不存在AI试衣效果集合时", async () => {
      const completedTryOn = {
        ...mockTryOn,
        status: TryOnStatus.completed,
        resultImageUrl: "https://example.com/result.jpg",
        watermarkedImageUrl: null,
        itemId: "item-id",
        photoId: "photo-id",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(completedTryOn);
      mockPrismaService.wardrobeCollection.findFirst.mockResolvedValue(null);
      mockPrismaService.wardrobeCollection.create.mockResolvedValue({
        id: "new-collection-id",
        name: "AI试衣效果",
        userId: "test-user-id",
      });
      mockPrismaService.wardrobeCollectionItem.findFirst.mockResolvedValue(null);
      mockPrismaService.wardrobeCollectionItem.create.mockResolvedValue({ id: "collection-item-id" });

      await service.archiveToInspirationWardrobe("tryon-id", "test-user-id");

      expect(mockPrismaService.wardrobeCollection.create).toHaveBeenCalledWith({
        data: {
          userId: "test-user-id",
          name: "AI试衣效果",
          icon: "sparkles",
          isDefault: false,
        },
      });
    });

    it("应该跳过已归档的试衣结果", async () => {
      const completedTryOn = {
        ...mockTryOn,
        status: TryOnStatus.completed,
        resultImageUrl: "https://example.com/result.jpg",
        watermarkedImageUrl: null,
        itemId: "item-id",
        photoId: "photo-id",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(completedTryOn);
      mockPrismaService.wardrobeCollection.findFirst.mockResolvedValue({
        id: "existing-collection-id",
        name: "AI试衣效果",
        userId: "test-user-id",
      });
      mockPrismaService.wardrobeCollectionItem.findFirst.mockResolvedValue({ id: "existing-item-id" });

      await service.archiveToInspirationWardrobe("tryon-id", "test-user-id");

      expect(mockPrismaService.wardrobeCollectionItem.create).not.toHaveBeenCalled();
    });

    it("应该跳过没有结果图片的试衣记录", async () => {
      const tryOnWithoutResult = {
        ...mockTryOn,
        status: TryOnStatus.completed,
        resultImageUrl: null,
        itemId: "item-id",
        photoId: "photo-id",
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(tryOnWithoutResult);

      await service.archiveToInspirationWardrobe("tryon-id", "test-user-id");

      expect(mockPrismaService.wardrobeCollectionItem.create).not.toHaveBeenCalled();
    });

    it("应该处理归档过程中的异常（不应抛出）", async () => {
      mockPrismaService.virtualTryOn.findFirst.mockRejectedValue(
        new Error("数据库错误"),
      );

      // 不应抛出异常
      await expect(
        service.archiveToInspirationWardrobe("tryon-id", "test-user-id"),
      ).resolves.toBeUndefined();
    });
  });

  describe("attachResultDataUri 测试", () => {
    it("应该附加结果图片的 data URI", async () => {
      const tryOnWithResult = {
        ...mockTryOn,
        resultImageUrl: "https://example.com/result.jpg",
        photo: mockPhoto,
        item: mockClothingItem,
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(tryOnWithResult);
      mockStorageService.fetchRemoteAssetDataUri.mockResolvedValueOnce(
        "data:image/png;base64,abc123",
      );

      const result = await service.getTryOnStatus("tryon-id", "test-user-id");

      expect(result.resultImageDataUri).toBe("data:image/png;base64,abc123");
    });

    it("应该处理 data URI 获取失败", async () => {
      const tryOnWithResult = {
        ...mockTryOn,
        resultImageUrl: "https://example.com/result.jpg",
        photo: mockPhoto,
        item: mockClothingItem,
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(tryOnWithResult);
      mockStorageService.fetchRemoteAssetDataUri.mockRejectedValueOnce(
        new Error("获取图片失败"),
      );

      const result = await service.getTryOnStatus("tryon-id", "test-user-id");

      expect(result.resultImageDataUri).toBeNull();
    });

    it("应该返回 null data URI 当没有结果图片时", async () => {
      const tryOnWithoutResult = {
        ...mockTryOn,
        resultImageUrl: null,
        photo: mockPhoto,
        item: mockClothingItem,
      };

      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(tryOnWithoutResult);

      const result = await service.getTryOnStatus("tryon-id", "test-user-id");

      expect(result.resultImageDataUri).toBeNull();
    });
  });
});
