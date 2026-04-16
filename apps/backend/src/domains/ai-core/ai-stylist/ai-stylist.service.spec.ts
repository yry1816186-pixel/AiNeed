import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PhotoType } from "@prisma/client";

import { CircuitBreakerService } from '../../../common/circuit-breaker";
import { PrismaService } from '../../../common/prisma/prisma.service";
import { RedisService } from '../../../common/redis/redis.service";
import { StyleUnderstandingService } from '../ai/services/style-understanding.service";
import { PhotosService } from '../photos/photos.service";
import { RecommendationsService } from '../../platform/recommendations/recommendations.service';

import { AiStylistService } from "./ai-stylist.service";
import { AiStylistChatService } from "./services/chat.service";
import { AiStylistContextService } from "./services/context.service";
import { AiStylistRecommendationService } from "./services/recommendation.service";
import { AiStylistSessionService } from "./services/session.service";

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
  const sessionMap = new Map<string, unknown>();

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
    getPhotoById: jest.fn(),
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

  const mockContextService = {
    buildUserContext: jest.fn().mockImplementation(async (userId: string) => {
      const profile = await mockPrisma.userProfile.findUnique({ where: { userId } });
      return {
        userProfile: profile ? {
          bodyType: profile.bodyType ?? undefined,
          skinTone: profile.skinTone ?? undefined,
          faceShape: profile.faceShape ?? undefined,
          colorSeason: profile.colorSeason ?? undefined,
          height: profile.height ?? undefined,
          weight: profile.weight ?? undefined,
          stylePreferences: Array.isArray(profile.stylePreferences) ? profile.stylePreferences : undefined,
        } : null,
        preferences: {},
        recentBehaviors: [],
      };
    }),
    deriveOrchestration: jest.fn().mockImplementation((session: { state: { slots: { occasion?: string; preferredStyles?: string[]; fitGoals?: string[] }; bodyProfile?: { bodyType?: string; skinTone?: string; colorSeason?: string }; photoSkipped?: boolean; lastPhotoStatus?: string; currentStage?: string; sceneReady?: boolean; styleReady?: boolean; bodyReady?: boolean; result?: unknown } }) => {
      const { slots, bodyProfile, photoSkipped, lastPhotoStatus } = session.state;
      const missingFields: string[] = [];

      session.state.sceneReady = Boolean(slots.occasion);
      session.state.styleReady = (slots.preferredStyles?.length ?? 0) > 0;
      session.state.bodyReady = Boolean(bodyProfile?.bodyType || bodyProfile?.colorSeason || bodyProfile?.skinTone);

      if (session.state.result) {
        session.state.currentStage = "resolved";
        return { nextAction: { type: "show_outfit_cards" }, missingFields };
      }
      if (lastPhotoStatus === "processing" || lastPhotoStatus === "pending") {
        session.state.currentStage = "analysis_pending";
        return { nextAction: { type: "poll_analysis" }, missingFields };
      }
      if (!slots.occasion) {
        missingFields.push("occasion");
        session.state.currentStage = "collecting_scene";
        return { nextAction: { type: "ask_question", field: "occasion" }, missingFields };
      }
      if ((slots.preferredStyles?.length ?? 0) === 0) {
        missingFields.push("style_preferences");
        session.state.currentStage = "collecting_style";
        return { nextAction: { type: "show_preference_buttons" }, missingFields };
      }
      const shouldRequestPhoto = !photoSkipped && !session.state.bodyReady && ((slots.fitGoals?.length ?? 0) > 0 || slots.occasion === "interview");
      if (shouldRequestPhoto) {
        missingFields.push("body_profile");
        session.state.currentStage = "awaiting_photo";
        return { nextAction: { type: "request_photo_upload", canSkip: true }, missingFields };
      }
      session.state.currentStage = "ready_to_resolve";
      return { nextAction: { type: "generate_outfit" }, missingFields };
    }),
    getInitialPreferredStyles: jest.fn().mockImplementation((context: { userProfile?: { stylePreferences?: string[] } }) => {
      const prefs = context?.userProfile?.stylePreferences;
      return Array.isArray(prefs) && prefs.length > 0 ? prefs : [];
    }),
    hasBodyProfile: jest.fn().mockImplementation((profile?: { bodyType?: string; skinTone?: string; colorSeason?: string } | null) =>
      Boolean(profile?.bodyType || profile?.colorSeason || profile?.skinTone),
    ),
    getOccasionName: jest.fn().mockImplementation((occasion?: string) => {
      const names: Record<string, string> = { interview: "面试", work: "通勤", date: "约会", travel: "出游", party: "聚会", daily: "日常" };
      return occasion ? names[occasion] || occasion : "";
    }),
    normalizeOccasion: jest.fn().mockImplementation((value: string) => value),
    extractSlotUpdates: jest.fn().mockImplementation((message: string) => {
      const updates: Record<string, unknown> = {};
      const occasionMap: Array<[string, string]> = [
        ["面试", "interview"], ["求职", "interview"], ["通勤", "work"], ["上班", "work"],
        ["约会", "date"], ["出游", "travel"], ["聚会", "party"], ["日常", "daily"],
      ];
      for (const [keyword, code] of occasionMap) {
        if (message.includes(keyword)) { updates.occasion = code; break; }
      }
      const styleKeywords = ["极简", "韩系", "法式", "轻正式", "休闲", "街头", "运动"];
      const foundStyles = styleKeywords.filter((s) => message.includes(s));
      if (foundStyles.length > 0) {updates.preferredStyles = foundStyles;}
      if (message.includes("显高") || message.includes("显瘦")) {updates.fitGoals = [message.includes("显高") ? "显高" : "显瘦"];}
      const budgetMatch = message.match(/(\d+)\s*元?\s*[以到\-~至]\s*(\d+)/);
      if (budgetMatch) { updates.budgetMin = Number(budgetMatch[1]); updates.budgetMax = Number(budgetMatch[2]); }
      const singleBudget = message.match(/预算\s*(\d+)/);
      if (singleBudget && !updates.budgetMax) {updates.budgetMax = Number(singleBudget[1]);}
      if (message.includes("黑色") || message.includes("白色")) {
        const colors: string[] = [];
        if (message.includes("黑色")) {colors.push("黑色");}
        if (message.includes("白色")) {colors.push("白色");}
        if (colors.length > 0) {updates.preferredColors = colors;}
      }
      return updates;
    }),
    mergeSlots: jest.fn().mockImplementation((current: Record<string, unknown>, updates: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(current[key]) && Array.isArray(value)) {
            current[key] = [...new Set([...(current[key] as unknown[]), ...value])];
          } else {
            current[key] = value;
          }
        }
      }
    }),
    syncPhotoAnalysis: jest.fn().mockResolvedValue(undefined),
  };

  const mockChatService = {
    composeAssistantMessage: jest.fn().mockResolvedValue({
      message: "Hello! How can I help?",
      isFallback: true,
    }),
    buildTemplateMessage: jest.fn().mockReturnValue("template message"),
    buildChatResult: jest.fn().mockImplementation((session: { id?: string; state?: Record<string, unknown> }, message: string, opts: Record<string, unknown> = {}) => ({
      success: true,
      message,
      assistantMessage: message,
      timestamp: new Date().toISOString(),
      sessionId: session?.id ?? "session-1",
      nextAction: opts?.nextAction,
      sessionState: session?.state,
      slotUpdates: opts?.slotUpdates,
      missingFields: opts?.missingFields || [],
      photoId: opts?.photoId,
      analysisStatus: opts?.analysisStatus,
      isFallback: opts?.isFallback,
      isAIGenerated: true,
      aiDisclaimer: "本内容由AI生成，仅供参考，不构成专业建议。",
    })),
    buildProgress: jest.fn().mockReturnValue({}),
    processChat: jest.fn().mockImplementation(async (userId: string, message: string, conversationHistory: Array<{ role: string; content: string }>, buildSessionFn: (uid: string, ctx: unknown) => unknown, processMessageFn: (session: unknown, msg: string) => Promise<unknown>) => {
      const trimmedMessage = message?.trim().slice(0, 2000);
      if (!trimmedMessage) {
        return { success: false, message: "消息不能为空", assistantMessage: "消息不能为空", timestamp: new Date().toISOString(), error: "INVALID_INPUT" };
      }
      const context = {};
      const session = buildSessionFn(userId, context);
      for (const historyMessage of (conversationHistory || []).slice(-10)) {
        if (historyMessage?.role && historyMessage?.content) {
          ((session as { conversationHistory: unknown[] }).conversationHistory).push({ role: historyMessage.role, content: historyMessage.content });
        }
      }
      return processMessageFn(session, trimmedMessage);
    }),
    sendMessage: jest.fn().mockImplementation(async (userId: string, sessionId: string, message: string, processMessageFn: (session: unknown, msg: string) => Promise<unknown>) => {
      const trimmedMessage = message?.trim().slice(0, 2000);
      if (!trimmedMessage) {
        return { success: false, message: "消息不能为空", assistantMessage: "消息不能为空", timestamp: new Date().toISOString(), sessionId, error: "INVALID_INPUT" };
      }
      let session = sessionMap.get(`${userId}:${sessionId}`);
      if (!session) {
        const record = await mockPrisma.aiStylistSession.findUnique({ where: { id: sessionId } });
        if (record) {
          session = typeof record.payload === "string" ? JSON.parse(record.payload) : record.payload;
          sessionMap.set(`${userId}:${sessionId}`, session);
        }
      }
      if (!session) {throw new Error("AI 造型师会话不存在或已过期");}
      return processMessageFn(session, trimmedMessage);
    }),
    uploadSessionPhoto: jest.fn().mockImplementation(async (userId: string, sessionId: string, file: unknown, type: unknown, buildChatResultFn: (session: unknown, msg: string, opts: Record<string, unknown>) => unknown) => {
      const session = sessionMap.get(`${userId}:${sessionId}`);
      if (!session) {throw new Error("AI 造型师会话不存在或已过期");}
      const photo = await mockPhotosService.uploadPhoto(userId, file, type);
      (session as { state: Record<string, unknown> }).state.lastPhotoId = photo.id;
      (session as { state: Record<string, unknown> }).state.lastPhotoStatus = photo.status;
      (session as { state: Record<string, unknown> }).state.photoRequested = true;
      (session as { state: Record<string, unknown> }).state.photoSkipped = false;
      (session as { state: Record<string, unknown> }).state.currentStage = "analysis_pending";
      const assistantMessage = "照片已上传，我正在提取你的身材和色彩信息。";
      return buildChatResultFn(session, assistantMessage, {
        nextAction: { type: "poll_analysis" },
        analysisStatus: photo.status,
        photoId: photo.id,
        missingFields: [],
      });
    }),
    getSessionStatus: jest.fn().mockImplementation(async (userId: string, sessionId: string, deriveOrchFn: (s: unknown) => { nextAction: { type: string }; missingFields: string[] }, buildTemplateFn: (s: unknown, na: unknown) => string, buildChatResultFn: (s: unknown, msg: string, opts: Record<string, unknown>) => unknown) => {
      const session = sessionMap.get(`${userId}:${sessionId}`);
      if (!session) {throw new Error("AI 造型师会话不存在或已过期");}
      const orchestration = deriveOrchFn(session);
      const assistantMessage = buildTemplateFn(session, orchestration.nextAction);
      return buildChatResultFn(session, assistantMessage, {
        nextAction: orchestration.nextAction,
        missingFields: orchestration.missingFields,
      });
    }),
    attachExistingPhoto: jest.fn().mockImplementation(async (userId: string, sessionId: string, photoId: string, deriveOrchFn: (s: unknown) => { nextAction: { type: string }; missingFields: string[] }, buildChatResultFn: (s: unknown, msg: string, opts: Record<string, unknown>) => unknown) => {
      const session = sessionMap.get(`${userId}:${sessionId}`);
      if (!session) {throw new Error("AI 造型师会话不存在或已过期");}
      const orchestration = deriveOrchFn(session);
      const assistantMessage = "我已经接入你最近上传的照片。";
      (session as { state: Record<string, unknown> }).state.lastPhotoId = photoId;
      (session as { state: Record<string, unknown> }).state.lastPhotoStatus = "completed";
      (session as { state: Record<string, unknown> }).state.photoRequested = true;
      (session as { state: Record<string, unknown> }).state.photoSkipped = false;
      return buildChatResultFn(session, assistantMessage, {
        nextAction: orchestration.nextAction,
        missingFields: orchestration.missingFields,
        photoId,
      });
    }),
    processMessageInSession: jest.fn().mockImplementation(async (session: unknown, message: string, deriveOrchFn: (s: unknown) => { nextAction: { type: string }; missingFields: string[] }, composeFn: (s: unknown, na: unknown, su: unknown, mf: string[], stage: string) => Promise<{ message: string; isFallback: boolean }>, buildResultFn: (s: unknown, msg: string, opts: Record<string, unknown>) => unknown) => {
      const slotUpdates = mockContextService.extractSlotUpdates(message);
      mockContextService.mergeSlots((session as { state: { slots: Record<string, unknown> } }).state.slots, slotUpdates);
      ((session as { conversationHistory: unknown[] }).conversationHistory).push({ role: "user", content: message });
      const orchestration = deriveOrchFn(session);
      const { message: assistantMessage, isFallback } = await composeFn(session, orchestration.nextAction, slotUpdates, orchestration.missingFields, "message_turn");
      ((session as { conversationHistory: unknown[] }).conversationHistory).push({ role: "assistant", content: assistantMessage });
      return buildResultFn(session, assistantMessage, {
        nextAction: orchestration.nextAction,
        slotUpdates,
        missingFields: orchestration.missingFields,
        isFallback,
      });
    }),
  };

  const mockSessionService = {
    createSession: jest.fn().mockResolvedValue({ id: "session-1", userId: "user-123" }),
    getSession: jest.fn().mockImplementation(async (userId: string, sessionId: string) => sessionMap.get(`${userId}:${sessionId}`) ?? null),
    getSessionOrThrow: jest.fn().mockImplementation(async (userId: string, sessionId: string) => {
      const session = sessionMap.get(`${userId}:${sessionId}`);
      if (session) {return session;}
      const record = await mockPrisma.aiStylistSession.findUnique({ where: { id: sessionId } });
      if (!record) {throw new Error("AI 造型师会话不存在或已过期");}
      const restored = typeof record.payload === "string" ? JSON.parse(record.payload) : record.payload;
      sessionMap.set(`${userId}:${sessionId}`, restored);
      return restored;
    }),
    updateSession: jest.fn().mockResolvedValue({}),
    persistSession: jest.fn().mockImplementation(async (session: { userId: string; id: string }) => {
      sessionMap.set(`${session.userId}:${session.id}`, session);
      await mockPrisma.aiStylistSession.upsert({
        where: { id: session.id },
        update: { userId: session.userId, payload: session, expiresAt: new Date(Date.now() + 3600000) },
        create: { id: session.id, userId: session.userId, payload: session, expiresAt: new Date(Date.now() + 3600000) },
      });
    }),
    sessionTtl: 3600000,
    listSessions: jest.fn().mockImplementation(async (userId: string, options?: { limit?: number; offset?: number }) => {
      const sessions = await mockPrisma.aiStylistSession.findMany({
        where: { userId },
        skip: options?.offset ?? 0,
        take: options?.limit ?? 10,
        orderBy: { updatedAt: "desc" },
      });
      const total = await mockPrisma.aiStylistSession.count({ where: { userId } });
      return { sessions, total };
    }),
    deleteSession: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockRecommendationService = {
    getRecommendations: jest.fn().mockResolvedValue([]),
    resolveSession: jest.fn().mockResolvedValue({
      success: true,
      result: {
        outfits: [{
          items: [{ id: "item-top", name: "米色衬衫" }, { id: "item-bottom", name: "高腰直筒裤" }],
          compatibilityScore: 0.9,
        }],
      },
    }),
    submitFeedback: jest.fn().mockImplementation((_userId: string, _sessionId: string, _outfitIndex: number, action: string) =>
      ({ success: true, message: action === "like" ? "感谢您的喜欢" : "我们会继续改进" }),
    ),
    getSessionFeedback: jest.fn().mockResolvedValue([]),
    generateDynamicStyleOptions: jest.fn().mockResolvedValue([
      { id: "minimalist", label: "极简" },
      { id: "casual", label: "休闲" },
    ]),
    generateDynamicOccasionOptions: jest.fn().mockResolvedValue([
      { id: "interview", label: "面试" },
      { id: "daily", label: "日常" },
    ]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    persistedSessions.clear();
    persistedConfigs.clear();
    sessionMap.clear();

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
    mockPrisma.aiStylistSession.findMany.mockResolvedValue([]);
    mockPrisma.aiStylistSession.count.mockResolvedValue(0);
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
        { provide: AiStylistSessionService, useValue: mockSessionService },
        { provide: AiStylistChatService, useValue: mockChatService },
        { provide: AiStylistContextService, useValue: mockContextService },
        { provide: AiStylistRecommendationService, useValue: mockRecommendationService },
      ],
    }).compile();

    service = module.get<AiStylistService>(AiStylistService);
    (service as unknown as { sessionStore: { clear: () => void } }).sessionStore = { clear: () => sessionMap.clear() };
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

    (service as unknown as { sessionStore: { clear: () => void } }).sessionStore.clear();

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
    expect(firstItem?.name).toBeTruthy();
    expect(
      mockRecommendationService.resolveSession,
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
      (service as unknown as { sessionStore: { clear: () => void } }).sessionStore.clear();

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
