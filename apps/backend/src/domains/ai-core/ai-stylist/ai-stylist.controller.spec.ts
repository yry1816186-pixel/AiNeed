/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PhotoType } from "@prisma/client";

import { AiQuotaService } from "../../../common/security/rate-limit/ai-quota.service";

import { AiStylistController } from "./ai-stylist.controller";
import { AiStylistService } from "./ai-stylist.service";
import { ItemReplacementService } from "./services/item-replacement.service";
import { OutfitPlanService } from "./services/outfit-plan.service";
import { PresetQuestionsService } from "./services/preset-questions.service";
import { SessionArchiveService } from "./services/session-archive.service";
import { WeatherIntegrationService } from "./services/weather-integration.service";
import { SystemContextService } from "./system-context.service";


describe("AiStylistController", () => {
  let controller: AiStylistController;

  const mockStylistService = {
    createSession: jest.fn().mockResolvedValue({
      success: true,
      message: "欢迎来到AI造型师",
      assistantMessage: "欢迎来到AI造型师",
      timestamp: new Date().toISOString(),
      sessionId: "session-1",
      nextAction: { type: "ask_question", field: "occasion" },
      sessionState: {
        sceneReady: false,
        bodyReady: false,
        styleReady: true,
        currentStage: "collecting_scene",
        slots: { preferredStyles: ["极简"], styleAvoidances: [], fitGoals: [], preferredColors: [] },
        bodyProfile: { shapeFeatures: [] },
      },
      missingFields: ["occasion"],
      isFallback: true,
      isAIGenerated: true,
      aiDisclaimer: "本内容由AI生成，仅供参考，不构成专业建议。",
    }),
    listSessions: jest.fn().mockResolvedValue({ sessions: [], total: 0 }),
    getSessionStatus: jest.fn().mockResolvedValue({
      success: true,
      message: "template message",
      assistantMessage: "template message",
      timestamp: new Date().toISOString(),
      sessionId: "session-1",
      nextAction: { type: "ask_question", field: "occasion" },
      sessionState: {},
      missingFields: [],
    }),
    sendMessage: jest.fn().mockResolvedValue({
      success: true,
      message: "好的，我来帮你搭配",
      assistantMessage: "好的，我来帮你搭配",
      timestamp: new Date().toISOString(),
      sessionId: "session-1",
      nextAction: { type: "generate_outfit" },
      slotUpdates: { occasion: "interview" },
      missingFields: [],
    }),
    uploadSessionPhoto: jest.fn().mockResolvedValue({
      success: true,
      message: "照片已上传",
      assistantMessage: "照片已上传",
      timestamp: new Date().toISOString(),
      sessionId: "session-1",
      nextAction: { type: "poll_analysis" },
      photoId: "photo-1",
      analysisStatus: "pending",
      missingFields: [],
    }),
    resolveSession: jest.fn().mockResolvedValue({
      success: true,
      message: "穿搭方案已生成",
      assistantMessage: "穿搭方案已生成",
      timestamp: new Date().toISOString(),
      sessionId: "session-1",
      result: {
        lookSummary: "面试精英穿搭",
        whyItFits: ["适合正式场合"],
        outfits: [{ title: "方案一", items: [], styleExplanation: [] }],
      },
    }),
    deleteSession: jest.fn().mockResolvedValue({ success: true }),
    submitFeedback: jest.fn().mockResolvedValue({ success: true, message: "感谢您的喜欢" }),
    getSessionFeedback: jest.fn().mockResolvedValue({ likes: [], dislikes: [] }),
    generateDynamicStyleOptions: jest.fn().mockResolvedValue([
      { id: "minimalist", label: "极简" },
      { id: "casual", label: "休闲" },
    ]),
    generateDynamicOccasionOptions: jest.fn().mockResolvedValue([
      { id: "interview", label: "面试" },
      { id: "daily", label: "日常" },
    ]),
    chat: jest.fn().mockResolvedValue({
      success: true,
      message: "AI回复",
      assistantMessage: "AI回复",
      timestamp: new Date().toISOString(),
      sessionId: "chat-session-1",
    }),
  };

  const mockSystemContextService = {
    getFullContext: jest.fn().mockResolvedValue({
      timestamp: new Date().toISOString(),
      environment: "test",
      git: { branch: "main" },
      database: { totalUsers: 100 },
      services: { backend: { status: "ok" } },
      resources: { nodeVersion: "v20" },
      projectFiles: { totalTypeScriptFiles: 50 },
    }),
  };

  const mockAiQuotaService = {
    getQuotaStatus: jest.fn().mockResolvedValue({
      used: 5,
      limit: 20,
      remaining: 15,
      resetAt: new Date().toISOString(),
    }),
  };

  const mockOutfitPlanService = {
    getOutfitPlan: jest.fn().mockResolvedValue({
      sessionId: "session-1",
      lookSummary: "面试精英穿搭",
      whyItFits: ["适合正式场合"],
      outfits: [],
      createdAt: new Date().toISOString(),
    }),
  };

  const mockItemReplacementService = {
    // getAlternatives returns AlternativeItem[]
    getAlternatives: jest.fn().mockResolvedValue([
      { id: "alt-1", name: "替代商品", category: "tops", imageUrl: "https://example.com/alt.jpg", price: 299, score: 85 },
    ]),
    replaceItem: jest.fn().mockResolvedValue({
      success: true,
      message: "替换成功",
    }),
  };

  const mockSessionArchiveService = {
    // getCalendarDays returns CalendarDay[]
    getCalendarDays: jest.fn().mockResolvedValue([
      { date: "2026-04-01", sessionCount: 2, hasOutfitPlan: true },
      { date: "2026-04-05", sessionCount: 1, hasOutfitPlan: false },
    ]),
    // getSessionsByDate returns ArchivedSession[]
    getSessionsByDate: jest.fn().mockResolvedValue([
      { id: "session-1", status: "completed", hasOutfitPlan: true, createdAt: "2026-04-14T10:00:00Z" },
    ]),
  };

  const mockPresetQuestionsService = {
    getPresetQuestions: jest.fn().mockResolvedValue([
      { id: "q1", text: "面试穿搭", icon: "briefcase" },
    ]),
    isNewUser: jest.fn().mockResolvedValue(false),
  };

  const mockWeatherIntegrationService = {
    getWeatherContext: jest.fn().mockResolvedValue({
      slotString: "晴朗 25度",
      temperature: 25,
      description: "晴朗",
    }),
  };

  const mockRequest = {
    user: { id: "user-123" },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiStylistController],
      providers: [
        { provide: AiStylistService, useValue: mockStylistService },
        { provide: SystemContextService, useValue: mockSystemContextService },
        { provide: AiQuotaService, useValue: mockAiQuotaService },
        { provide: OutfitPlanService, useValue: mockOutfitPlanService },
        { provide: ItemReplacementService, useValue: mockItemReplacementService },
        { provide: SessionArchiveService, useValue: mockSessionArchiveService },
        { provide: PresetQuestionsService, useValue: mockPresetQuestionsService },
        { provide: WeatherIntegrationService, useValue: mockWeatherIntegrationService },
      ],
    }).compile();

    controller = module.get<AiStylistController>(AiStylistController);
  });

  it("应该正确实例化控制器", () => {
    expect(controller).toBeDefined();
  });

  describe("createSession", () => {
    it("应该创建会话", async () => {
      const body = { entry: "interview", goal: "面试穿搭" };

      const result = await controller.createSession(
        mockRequest as never,
        body,
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("session-1");
      expect(mockStylistService.createSession).toHaveBeenCalledWith(
        "user-123",
        body,
      );
    });

    it("应该支持空 body 创建会话", async () => {
      const result = await controller.createSession(
        mockRequest as never,
        {},
      );

      expect(result.success).toBe(true);
      expect(mockStylistService.createSession).toHaveBeenCalledWith(
        "user-123",
        {},
      );
    });
  });

  describe("listSessions", () => {
    it("应该返回用户会话列表", async () => {
      const result = await controller.listSessions(
        mockRequest as never,
        undefined,
        undefined,
      );

      expect(result.total).toBe(0);
      expect(mockStylistService.listSessions).toHaveBeenCalledWith(
        "user-123",
        { limit: undefined, offset: undefined },
      );
    });

    it("应该支持分页参数", async () => {
      const result = await controller.listSessions(
        mockRequest as never,
        "10",
        "20",
      );

      expect(mockStylistService.listSessions).toHaveBeenCalledWith(
        "user-123",
        { limit: 10, offset: 20 },
      );
    });
  });

  describe("getSessionStatus", () => {
    it("应该返回会话状态", async () => {
      const result = await controller.getSessionStatus(
        mockRequest as never,
        "session-1",
      );

      expect(result.success).toBe(true);
      expect(mockStylistService.getSessionStatus).toHaveBeenCalledWith(
        "user-123",
        "session-1",
      );
    });
  });

  describe("sendMessage", () => {
    it("应该发送消息到会话", async () => {
      const body = { message: "我要面试穿搭" };

      const result = await controller.sendMessage(
        mockRequest as never,
        "session-1",
        body,
      );

      expect(result.success).toBe(true);
      expect(mockStylistService.sendMessage).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        "我要面试穿搭",
        undefined,
      );
    });

    it("应该传递天气上下文当提供经纬度时", async () => {
      const body = {
        message: "我要通勤穿搭",
        latitude: 39.9042,
        longitude: 116.4074,
      };

      const result = await controller.sendMessage(
        mockRequest as never,
        "session-1",
        body,
      );

      expect(result.success).toBe(true);
      expect(mockWeatherIntegrationService.getWeatherContext).toHaveBeenCalledWith(
        39.9042,
        116.4074,
      );
      expect(mockStylistService.sendMessage).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        "我要通勤穿搭",
        "晴朗 25度",
      );
    });

    it("应该不传递天气上下文当未提供经纬度时", async () => {
      const body = { message: "我要通勤穿搭" };

      await controller.sendMessage(
        mockRequest as never,
        "session-1",
        body,
      );

      expect(mockWeatherIntegrationService.getWeatherContext).not.toHaveBeenCalled();
      expect(mockStylistService.sendMessage).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        "我要通勤穿搭",
        undefined,
      );
    });

    it("应该不传递天气上下文当天气服务返回 null 时", async () => {
      mockWeatherIntegrationService.getWeatherContext.mockResolvedValueOnce(null);

      const body = {
        message: "我要通勤穿搭",
        latitude: 39.9042,
        longitude: 116.4074,
      };

      await controller.sendMessage(
        mockRequest as never,
        "session-1",
        body,
      );

      expect(mockStylistService.sendMessage).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        "我要通勤穿搭",
        undefined,
      );
    });
  });

  describe("uploadPhoto", () => {
    it("应该上传照片到会话", async () => {
      const file = {
        originalname: "photo.jpg",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
        size: 1024,
      } as Express.Multer.File;

      const result = await controller.uploadPhoto(
        mockRequest as never,
        "session-1",
        file,
        { type: PhotoType.full_body },
      );

      expect(result.success).toBe(true);
      expect(mockStylistService.uploadSessionPhoto).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        file,
        PhotoType.full_body,
      );
    });

    it("应该使用默认照片类型当未指定时", async () => {
      const file = {
        originalname: "photo.jpg",
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
        size: 1024,
      } as Express.Multer.File;

      const result = await controller.uploadPhoto(
        mockRequest as never,
        "session-1",
        file,
        {},
      );

      expect(mockStylistService.uploadSessionPhoto).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        file,
        PhotoType.full_body,
      );
    });

    it("应该抛出 BadRequestException 当未上传文件时", async () => {
      await expect(
        controller.uploadPhoto(
          mockRequest as never,
          "session-1",
          null as never,
          {},
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.uploadPhoto(
          mockRequest as never,
          "session-1",
          null as never,
          {},
        ),
      ).rejects.toThrow("请上传图片文件");
    });
  });

  describe("resolveSession", () => {
    it("应该生成穿搭方案", async () => {
      const result = await controller.resolveSession(
        mockRequest as never,
        "session-1",
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(mockStylistService.resolveSession).toHaveBeenCalledWith(
        "user-123",
        "session-1",
      );
    });
  });

  describe("deleteSession", () => {
    it("应该删除会话", async () => {
      const result = await controller.deleteSession(
        mockRequest as never,
        "session-1",
      );

      expect(result.success).toBe(true);
      expect(mockStylistService.deleteSession).toHaveBeenCalledWith(
        "user-123",
        "session-1",
      );
    });
  });

  describe("getOutfitPlan", () => {
    it("应该获取穿搭方案页数据", async () => {
      const result = await controller.getOutfitPlan(
        mockRequest as never,
        "session-1",
      );

      expect(result.sessionId).toBe("session-1");
      expect(mockOutfitPlanService.getOutfitPlan).toHaveBeenCalledWith(
        "user-123",
        "session-1",
      );
    });
  });

  describe("getAlternatives", () => {
    it("应该获取同类商品替代列表", async () => {
      const query = { outfitIndex: 0, itemIndex: 1, limit: 10 };

      const result = await controller.getAlternatives(
        mockRequest as never,
        "session-1",
        query,
      );

      // getAlternatives returns AlternativeItem[]
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(mockItemReplacementService.getAlternatives).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        0,
        1,
        10,
      );
    });
  });

  describe("replaceItem", () => {
    it("应该替换单品", async () => {
      const body = { outfitIndex: 0, itemIndex: 1, newItemId: "new-item-id" };

      const result = await controller.replaceItem(
        mockRequest as never,
        "session-1",
        body,
      );

      expect(result.success).toBe(true);
      expect(mockItemReplacementService.replaceItem).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        0,
        1,
        "new-item-id",
      );
    });
  });

  describe("getCalendarDays", () => {
    it("应该获取日历视图数据", async () => {
      const result = await controller.getCalendarDays(
        mockRequest as never,
        "2026",
        "4",
      );

      // getCalendarDays returns CalendarDay[]
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(mockSessionArchiveService.getCalendarDays).toHaveBeenCalledWith(
        "user-123",
        2026,
        4,
      );
    });
  });

  describe("getSessionsByDate", () => {
    it("应该获取指定日期的方案列表", async () => {
      const result = await controller.getSessionsByDate(
        mockRequest as never,
        "2026-04-14",
      );

      // getSessionsByDate returns ArchivedSession[]
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(mockSessionArchiveService.getSessionsByDate).toHaveBeenCalledWith(
        "user-123",
        "2026-04-14",
      );
    });

    it("应该拒绝无效日期格式", async () => {
      await expect(
        controller.getSessionsByDate(mockRequest as never, "2026/04/14"),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.getSessionsByDate(mockRequest as never, "invalid-date"),
      ).rejects.toThrow("日期格式必须为 YYYY-MM-DD");
    });

    it("应该拒绝不完整的日期格式", async () => {
      await expect(
        controller.getSessionsByDate(mockRequest as never, "2026-04"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getPresetQuestions", () => {
    it("应该返回预设问题和新用户标识", async () => {
      const result = await controller.getPresetQuestions(
        mockRequest as never,
      );

      expect(result.questions).toHaveLength(1);
      expect(result.isNewUser).toBe(false);
      expect(mockPresetQuestionsService.getPresetQuestions).toHaveBeenCalled();
      expect(mockPresetQuestionsService.isNewUser).toHaveBeenCalledWith("user-123");
    });
  });

  describe("chat (旧版)", () => {
    it("应该处理旧版聊天请求", async () => {
      const body = {
        message: "我要面试穿搭",
        conversationHistory: [
          { role: "user" as const, content: "你好" },
          { role: "assistant" as const, content: "你好！" },
        ],
      };

      const result = await controller.chat(
        mockRequest as never,
        body,
      );

      expect(result.success).toBe(true);
      expect(mockStylistService.chat).toHaveBeenCalled();
    });

    it("应该处理没有对话历史的请求", async () => {
      const body = { message: "面试穿搭" };

      const result = await controller.chat(
        mockRequest as never,
        body,
      );

      expect(result.success).toBe(true);
    });
  });

  describe("getQuota", () => {
    it("应该返回配额状态", async () => {
      const result = await controller.getQuota(
        mockRequest as never,
      );

      expect(result.used).toBe(5);
      expect(result.limit).toBe(20);
      expect(result.remaining).toBe(15);
      expect(mockAiQuotaService.getQuotaStatus).toHaveBeenCalledWith("user-123");
    });
  });

  describe("getSuggestions", () => {
    it("应该返回快捷建议列表", async () => {
      const result = await controller.getSuggestions();

      expect(result.suggestions).toHaveLength(4);
      expect(result.suggestions[0]).toHaveProperty("text");
      expect(result.suggestions[0]).toHaveProperty("icon");
    });
  });

  describe("getStyleOptions", () => {
    it("应该返回动态风格选项", async () => {
      const result = await controller.getStyleOptions();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", "minimalist");
      expect(result[0]).toHaveProperty("label", "极简");
    });
  });

  describe("getOccasionOptions", () => {
    it("应该返回动态场合选项", async () => {
      const result = await controller.getOccasionOptions();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", "interview");
      expect(result[0]).toHaveProperty("label", "面试");
    });
  });

  describe("submitFeedback", () => {
    it("应该提交穿搭方案反馈", async () => {
      const body = {
        outfitIndex: 0,
        action: "like" as const,
        itemId: "item-1",
      };

      const result = await controller.submitFeedback(
        mockRequest as never,
        "session-1",
        body,
      );

      expect(result.success).toBe(true);
      expect(mockStylistService.submitFeedback).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        0,
        "like",
        "item-1",
        undefined,
        undefined,
        undefined,
      );
    });

    it("应该提交不喜欢反馈带原因", async () => {
      const body = {
        outfitIndex: 0,
        action: "dislike" as const,
        dislikeReason: "too_expensive",
        dislikeDetail: "超出预算",
      };

      const result = await controller.submitFeedback(
        mockRequest as never,
        "session-1",
        body,
      );

      expect(result.success).toBe(true);
      expect(mockStylistService.submitFeedback).toHaveBeenCalledWith(
        "user-123",
        "session-1",
        0,
        "dislike",
        undefined,
        undefined,
        "too_expensive",
        "超出预算",
      );
    });
  });

  describe("getFeedback", () => {
    it("应该返回会话反馈记录", async () => {
      const result = await controller.getFeedback(
        mockRequest as never,
        "session-1",
      );

      expect(result.likes).toEqual([]);
      expect(result.dislikes).toEqual([]);
      expect(mockStylistService.getSessionFeedback).toHaveBeenCalledWith(
        "user-123",
        "session-1",
      );
    });
  });

  describe("getSystemContext", () => {
    it("应该返回完整系统上下文", async () => {
      const result = await controller.getSystemContext();

      expect(result.timestamp).toBeDefined();
      expect(result.environment).toBe("test");
      expect(mockSystemContextService.getFullContext).toHaveBeenCalledWith(false);
    });

    it("应该支持强制刷新", async () => {
      const result = await controller.getSystemContext("true");

      expect(mockSystemContextService.getFullContext).toHaveBeenCalledWith(true);
    });

    it("应该支持按分区返回数据", async () => {
      const result = await controller.getSystemContext(undefined, "git");

      expect(result.timestamp).toBeDefined();
      expect(result.git).toBeDefined();
    });

    it("应该返回完整数据当 section 为 all 时", async () => {
      const result = await controller.getSystemContext(undefined, "all");

      expect(result.timestamp).toBeDefined();
      expect(result.environment).toBe("test");
    });

    it("应该返回完整数据当 section 无效时", async () => {
      const result = await controller.getSystemContext(undefined, "invalid");

      expect(result.timestamp).toBeDefined();
      expect(result.environment).toBe("test");
    });
  });
});
