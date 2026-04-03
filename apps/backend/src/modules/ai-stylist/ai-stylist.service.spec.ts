import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PhotoType } from "@prisma/client";

import { CircuitBreakerService } from "../../common/circuit-breaker";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { StyleUnderstandingService } from "../ai/services/style-understanding.service";
import { PhotosService } from "../photos/photos.service";
import { RecommendationsService } from "../recommendations/recommendations.service";

import { AiStylistService } from "./ai-stylist.service";

describe("AiStylistService", () => {
  let service: AiStylistService;
  const persistedSessions = new Map<
    string,
    {
      userId: string;
      payload: unknown;
      expiresAt: Date;
      updatedAt: Date;
    }
  >();
  const persistedConfigs = new Map<
    string,
    { value: string; updatedAt: Date }
  >();

  const mockPrisma = {
    userProfile: {
      findUnique: jest.fn(),
    },
    userPreferenceWeight: {
      findMany: jest.fn(),
    },
    userBehaviorEvent: {
      findMany: jest.fn(),
    },
    clothingItem: {
      findMany: jest.fn(),
    },
    userPhoto: {
      findFirst: jest.fn(),
    },
    aiStylistSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    rankingFeedback: {
      create: jest.fn(),
    },
  };

  const mockRecommendationsService = {
    getPersonalizedRecommendations: jest.fn(),
  };

  const mockPhotosService = {
    uploadPhoto: jest.fn(),
  };

  const mockStyleUnderstandingService = {
    getOutfitRecommendation: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    expire: jest.fn(),
    getClient: jest.fn(),
  };

  const mockCircuitBreakerService = {
    execute: jest.fn(
      async (
        _name: string,
        fn: (...args: unknown[]) => Promise<unknown>,
        _fallback: (...args: unknown[]) => Promise<unknown>,
        ...args: unknown[]
      ) => fn(...args),
    ),
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        AI_STYLIST_API_KEY: "",
        AI_STYLIST_API_ENDPOINT: "https://example.test/v1",
        AI_STYLIST_MODEL: "glm-5",
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    persistedSessions.clear();
    persistedConfigs.clear();

    mockPrisma.userProfile.findUnique.mockResolvedValue({
      bodyType: "hourglass",
      skinTone: "light",
      faceShape: "oval",
      colorSeason: "spring",
      height: 165,
      weight: 52,
      stylePreferences: ["极简"],
    });
    mockPrisma.userPreferenceWeight.findMany.mockResolvedValue([]);
    mockPrisma.userBehaviorEvent.findMany.mockResolvedValue([]);
    mockPrisma.clothingItem.findMany.mockResolvedValue([]);
    mockPrisma.userPhoto.findFirst.mockResolvedValue(null);
    mockPrisma.aiStylistSession.findUnique.mockImplementation(
      async ({ where: { id } }: { where: { id: string } }) => {
        const record = persistedSessions.get(id);
        return record ? { id, ...record } : null;
      },
    );
    mockPrisma.aiStylistSession.upsert.mockImplementation(
      async ({
        where: { id },
        update,
        create,
      }: {
        where: { id: string };
        update: { userId: string; payload: unknown; expiresAt: Date };
        create: {
          id: string;
          userId: string;
          payload: unknown;
          expiresAt: Date;
        };
      }) => {
        const record = {
          userId: update?.userId ?? create.userId,
          payload: update?.payload ?? create.payload,
          expiresAt: update?.expiresAt ?? create.expiresAt,
          updatedAt: new Date(),
        };
        persistedSessions.set(id, record);
        return { id, ...record };
      },
    );
    mockPrisma.aiStylistSession.delete.mockImplementation(
      async ({ where: { id } }: { where: { id: string } }) => {
        const record = persistedSessions.get(id);
        persistedSessions.delete(id);
        return record ? { id, ...record } : { id };
      },
    );
    mockPrisma.aiStylistSession.deleteMany.mockImplementation(
      async ({ where }: { where?: { expiresAt?: { lt?: Date } } }) => {
        let count = 0;
        for (const [id, record] of Array.from(persistedSessions.entries())) {
          if (where?.expiresAt?.lt && record.expiresAt >= where.expiresAt.lt) {
            continue;
          }
          persistedSessions.delete(id);
          count += 1;
        }
        return { count };
      },
    );
    mockPrisma.systemConfig.findUnique.mockImplementation(
      async ({ where: { key } }: { where: { key: string } }) => {
        const record = persistedConfigs.get(key);
        return record
          ? { key, value: record.value, updatedAt: record.updatedAt }
          : null;
      },
    );
    mockPrisma.systemConfig.upsert.mockImplementation(
      async ({
        where: { key },
        update,
        create,
      }: {
        where: { key: string };
        update: { value: string };
        create: { key: string; value: string };
      }) => {
        const value = update?.value ?? create.value;
        const record = { value, updatedAt: new Date() };
        persistedConfigs.set(key, record);
        return { key, ...record };
      },
    );
    mockPrisma.systemConfig.delete.mockImplementation(
      async ({ where: { key } }: { where: { key: string } }) => {
        persistedConfigs.delete(key);
        return { key };
      },
    );
    mockPrisma.systemConfig.deleteMany.mockImplementation(
      async ({
        where,
      }: {
        where?: { key?: { startsWith?: string }; updatedAt?: { lt?: Date } };
      }) => {
        let count = 0;
        for (const [key, record] of Array.from(persistedConfigs.entries())) {
          if (where?.key?.startsWith && !key.startsWith(where.key.startsWith)) {
            continue;
          }
          if (where?.updatedAt?.lt && record.updatedAt >= where.updatedAt.lt) {
            continue;
          }
          persistedConfigs.delete(key);
          count += 1;
        }
        return { count };
      },
    );

    mockRecommendationsService.getPersonalizedRecommendations.mockResolvedValue({
      items: [
        {
          id: "item-top",
          name: "米色衬衫",
          score: 92,
          matchReasons: ["适合面试和轻正式场景"],
        },
        {
          id: "item-bottom",
          name: "高腰直筒裤",
          score: 90,
          matchReasons: ["有助于拉长比例"],
        },
      ],
      total: 2,
      page: 1,
      pageSize: 2,
      hasMore: false,
    });

    mockStyleUnderstandingService.getOutfitRecommendation.mockResolvedValue({
      outfit_id: "outfit-1",
      items: [],
      compatibility_score: 0,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiStylistService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
        { provide: PhotosService, useValue: mockPhotosService },
        {
          provide: StyleUnderstandingService,
          useValue: mockStyleUnderstandingService,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
      ],
    }).compile();

    service = module.get<AiStylistService>(AiStylistService);
  });

  it("creates a session with structured next action", async () => {
    const result = await service.createSession("user-123");

    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(result.nextAction?.type).toBe("ask_question");
    expect(result.sessionState?.styleReady).toBe(true);
    expect(result.isFallback).toBe(true);
  });

  it("turns scene and style messages into a photo request when precision is needed", async () => {
    const session = await service.createSession("user-123");
    const sessionId = session.sessionId as string;

    const sceneTurn = await service.sendMessage(
      "user-123",
      sessionId,
      "我要一套面试穿搭，预算1000以内，想显高一点",
    );
    expect(sceneTurn.nextAction?.type).toBe("generate_outfit");

    mockPrisma.userProfile.findUnique.mockResolvedValueOnce({
      bodyType: null,
      skinTone: null,
      faceShape: null,
      colorSeason: null,
      height: null,
      weight: null,
      stylePreferences: [],
    });

    const emptyProfileSession = await service.createSession("user-empty");
    const emptySessionId = emptyProfileSession.sessionId as string;
    await service.sendMessage(
      "user-empty",
      emptySessionId,
      "我要一套面试穿搭，预算1000以内，想显高一点",
    );
    const styleTurn = await service.sendMessage(
      "user-empty",
      emptySessionId,
      "极简",
    );

    expect(styleTurn.nextAction?.type).toBe("request_photo_upload");
    expect(styleTurn.missingFields).toContain("body_profile");
  });

  it("uploads a stylist photo and returns polling action", async () => {
    const session = await service.createSession("user-123");
    const sessionId = session.sessionId as string;

    mockPhotosService.uploadPhoto.mockResolvedValue({
      id: "photo-1",
      status: "pending",
      type: PhotoType.full_body,
      url: "https://storage.example.com/photo-1.jpg",
    });

    const result = await service.uploadSessionPhoto(
      "user-123",
      sessionId,
      {
        originalname: "look.jpg",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
        size: 128,
      } as Express.Multer.File,
      PhotoType.full_body,
    );

    expect(result.success).toBe(true);
    expect(result.photoId).toBe("photo-1");
    expect(result.nextAction?.type).toBe("poll_analysis");
  });

  it("restores a persisted session when in-memory cache is empty", async () => {
    const session = await service.createSession("user-123");
    const sessionId = session.sessionId as string;

    (service as any).sessionStore.clear();

    const result = await service.sendMessage(
      "user-123",
      sessionId,
      "我要一套面试穿搭",
    );

    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(sessionId);
    expect(mockPrisma.aiStylistSession.findUnique).toHaveBeenCalled();
  });

  it("resolves an outfit using fallback recommendations when ML items are empty", async () => {
    const session = await service.createSession("user-123");
    const sessionId = session.sessionId as string;

    await service.sendMessage("user-123", sessionId, "我要一套面试穿搭");
    const result = await service.resolveSession("user-123", sessionId);
    const firstOutfit = result.result?.outfits[0];
    const firstItem = firstOutfit?.items[0];

    expect(result.success).toBe(true);
    expect(result.result?.outfits.length).toBeGreaterThan(0);
    // Item name may come from recommendations service or fallback
    expect(firstItem?.name).toBeTruthy();
    expect(
      mockRecommendationsService.getPersonalizedRecommendations,
    ).toHaveBeenCalled();
  });

  describe("chat 方法测试", () => {
    it("应该处理无会话的聊天请求", async () => {
      const result = await service.chat(
        "user-123",
        "我要一套面试穿搭",
        [],
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
    });

    it("应该拒绝空消息", async () => {
      const result = await service.chat("user-123", "", []);

      expect(result.success).toBe(false);
      expect(result.error).toBe("INVALID_INPUT");
    });

    it("应该拒绝只包含空格的消息", async () => {
      const result = await service.chat("user-123", "   ", []);

      expect(result.success).toBe(false);
      expect(result.error).toBe("INVALID_INPUT");
    });

    it("应该处理包含对话历史的聊天", async () => {
      const conversationHistory = [
        { role: "user" as const, content: "我要面试穿搭" },
        { role: "assistant" as const, content: "好的，什么场合？" },
      ];

      const result = await service.chat(
        "user-123",
        "面试",
        conversationHistory,
      );

      expect(result.success).toBe(true);
    });

    it("应该截断过长的消息", async () => {
      const longMessage = "a".repeat(3000);
      const result = await service.chat("user-123", longMessage, []);

      expect(result.success).toBe(true);
    });
  });

  describe("listSessions 测试", () => {
    it("应该返回用户的会话列表", async () => {
      // 创建几个会话
      await service.createSession("user-list-test");
      await service.createSession("user-list-test");

      mockPrisma.aiStylistSession.findMany.mockResolvedValue([]);
      mockPrisma.aiStylistSession.count.mockResolvedValue(2);

      const result = await service.listSessions("user-list-test");

      expect(result.total).toBe(2);
    });

    it("应该支持分页", async () => {
      mockPrisma.aiStylistSession.findMany.mockResolvedValue([]);
      mockPrisma.aiStylistSession.count.mockResolvedValue(50);

      const result = await service.listSessions("user-123", {
        limit: 10,
        offset: 20,
      });

      expect(mockPrisma.aiStylistSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe("deleteSession 测试", () => {
    it("应该成功删除会话", async () => {
      const session = await service.createSession("user-delete-test");
      const sessionId = session.sessionId as string;

      mockPrisma.aiStylistSession.delete.mockResolvedValue({});

      const result = await service.deleteSession("user-delete-test", sessionId);

      expect(result.success).toBe(true);
    });
  });

  describe("submitFeedback 测试", () => {
    it("应该成功提交喜欢反馈", async () => {
      const session = await service.createSession("user-feedback-test");
      const sessionId = session.sessionId as string;

      // 先解析会话以生成结果
      await service.sendMessage("user-feedback-test", sessionId, "面试");
      await service.resolveSession("user-feedback-test", sessionId);

      mockPrisma.rankingFeedback = {
        create: jest.fn().mockResolvedValue({}),
      };

      const result = await service.submitFeedback(
        "user-feedback-test",
        sessionId,
        0,
        "like",
        "item-1",
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("喜欢");
    });

    it("应该成功提交不喜欢反馈", async () => {
      const session = await service.createSession("user-feedback-test-2");
      const sessionId = session.sessionId as string;

      await service.sendMessage("user-feedback-test-2", sessionId, "面试");
      await service.resolveSession("user-feedback-test-2", sessionId);

      mockPrisma.rankingFeedback = {
        create: jest.fn().mockResolvedValue({}),
      };

      const result = await service.submitFeedback(
        "user-feedback-test-2",
        sessionId,
        0,
        "dislike",
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("改进");
    });
  });

  describe("getSessionStatus 测试", () => {
    it("应该返回会话状态", async () => {
      const session = await service.createSession("user-status-test");
      const sessionId = session.sessionId as string;

      const result = await service.getSessionStatus("user-status-test", sessionId);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);
    });
  });

  describe("attachExistingPhoto 测试", () => {
    it("应该成功附加已存在的照片", async () => {
      const session = await service.createSession("user-photo-test");
      const sessionId = session.sessionId as string;

      mockPrisma.userPhoto.findFirst.mockResolvedValue({
        id: "existing-photo-id",
        analysisStatus: "completed",
        userId: "user-photo-test",
        url: "https://example.com/photo.jpg",
        type: PhotoType.full_body,
      });

      const result = await service.attachExistingPhoto(
        "user-photo-test",
        sessionId,
        "existing-photo-id",
      );

      expect(result.success).toBe(true);
      expect(result.photoId).toBe("existing-photo-id");
    });
  });

  describe("动态选项生成测试", () => {
    it("应该生成动态风格选项", async () => {
      const result = await service.generateDynamicStyleOptions();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("label");
    });

    it("应该生成动态场合选项", async () => {
      const result = await service.generateDynamicOccasionOptions();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("label");
    });
  });

  describe("槽位提取测试", () => {
    it("应该从消息中提取场合", async () => {
      const session = await service.createSession("user-slot-test");
      const sessionId = session.sessionId as string;

      const result = await service.sendMessage(
        "user-slot-test",
        sessionId,
        "我要面试穿搭",
      );

      expect(result.success).toBe(true);
      expect(result.slotUpdates?.occasion).toBe("interview");
    });

    it("应该从消息中提取风格", async () => {
      const session = await service.createSession("user-slot-test-2");
      const sessionId = session.sessionId as string;

      const result = await service.sendMessage(
        "user-slot-test-2",
        sessionId,
        "我喜欢极简风格",
      );

      expect(result.success).toBe(true);
    });

    it("应该从消息中提取预算", async () => {
      const session = await service.createSession("user-slot-test-3");
      const sessionId = session.sessionId as string;

      const result = await service.sendMessage(
        "user-slot-test-3",
        sessionId,
        "预算500-1000元",
      );

      expect(result.success).toBe(true);
    });

    it("应该从消息中提取颜色偏好", async () => {
      const session = await service.createSession("user-slot-test-4");
      const sessionId = session.sessionId as string;

      const result = await service.sendMessage(
        "user-slot-test-4",
        sessionId,
        "我喜欢黑色和白色",
      );

      expect(result.success).toBe(true);
    });

    it("应该从消息中提取穿搭目标", async () => {
      const session = await service.createSession("user-slot-test-5");
      const sessionId = session.sessionId as string;

      const result = await service.sendMessage(
        "user-slot-test-5",
        sessionId,
        "我想显高显瘦",
      );

      expect(result.success).toBe(true);
    });
  });

  describe("边界情况测试", () => {
    it("应该处理不存在的会话", async () => {
      await expect(
        service.getSessionStatus("user-123", "non-existent-session"),
      ).rejects.toThrow();
    });

    it("应该处理会话过期", async () => {
      const session = await service.createSession("user-expire-test");
      const sessionId = session.sessionId as string;

      // 清除内存缓存
      (service as any).sessionStore.clear();

      // 模拟数据库返回过期的会话
      mockPrisma.aiStylistSession.findUnique.mockResolvedValueOnce({
        id: sessionId,
        userId: "user-expire-test",
        payload: {
          id: sessionId,
          userId: "user-expire-test",
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          conversationHistory: [],
          state: {
            sceneReady: false,
            bodyReady: false,
            styleReady: false,
            candidateReady: false,
            commerceReady: false,
            currentStage: "collecting_scene",
            slots: {
              preferredStyles: [],
              styleAvoidances: [],
              fitGoals: [],
              preferredColors: [],
            },
            bodyProfile: {
              shapeFeatures: [],
            },
          },
        },
        expiresAt: new Date(Date.now() - 30 * 60 * 1000),
      });

      await expect(
        service.getSessionStatus("user-expire-test", sessionId),
      ).rejects.toThrow();
    });

    it("应该处理用户无档案的情况", async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValueOnce(null);

      const result = await service.createSession("user-no-profile");

      expect(result.success).toBe(true);
    });

    it("应该处理照片分析失败的情况", async () => {
      const session = await service.createSession("user-photo-fail-test");
      const sessionId = session.sessionId as string;

      mockPrisma.userPhoto.findFirst.mockResolvedValue({
        id: "photo-fail-id",
        analysisStatus: "failed",
        userId: "user-photo-fail-test",
        url: "https://example.com/photo.jpg",
        type: PhotoType.full_body,
      });

      const result = await service.attachExistingPhoto(
        "user-photo-fail-test",
        sessionId,
        "photo-fail-id",
      );

      expect(result.success).toBe(true);
    });
  });
});
