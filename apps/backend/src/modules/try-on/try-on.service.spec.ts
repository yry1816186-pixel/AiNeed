import {
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { TryOnStatus } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { REDIS_CLIENT } from "../../common/redis/redis.service";
import { StorageService } from "../../common/storage/storage.service";

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
  };

  const mockOrchestrator = {
    executeTryOn: jest.fn(),
    clearCache: jest.fn(),
    getAvailableProviders: jest.fn().mockReturnValue(["kolors", "mock"]),
  };

  const mockRedis = {
    publish: jest.fn(),
  };

  const mockStorageService = {
    fetchRemoteAsset: jest.fn(),
    fetchRemoteAssetDataUri: jest.fn(),
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

      // Redis publish 应该被调用
      expect(mockRedis.publish).toHaveBeenCalled();
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

    it("应该处理 Redis 发布失败", async () => {
      mockPrismaService.userPhoto.findFirst.mockResolvedValue(mockPhoto);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.virtualTryOn.findFirst.mockResolvedValue(null);
      mockPrismaService.virtualTryOn.create.mockResolvedValue(mockTryOn);
      mockRedis.publish.mockRejectedValue(new Error("Redis error"));

      // 不应该抛出异常，只是记录警告
      await expect(
        service.createTryOnRequest("test-user-id", "photo-id", "item-id"),
      ).resolves.toBeDefined();
    });
  });
});
