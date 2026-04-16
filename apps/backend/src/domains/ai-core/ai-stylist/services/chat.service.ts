/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PhotoType } from "@prisma/client";

import { PhotosService } from "../../../photos/photos.service";
import { LlmProviderService } from "../llm-provider.service";
import {
  STYLIST_SYSTEM_PROMPT,
  buildConversationContextPrompt,
} from "../prompts/system-prompt";
import type {
  ChatMessage,
  StylistAction,
  StylistSlots,
  StylistSessionState,
  ChatResult,
  StylistOutfitItem,
} from "../types";

import { AiStylistContextService } from "./context.service";
import { AiStylistSessionService } from "./session.service";
import type { StylistSession } from "./session.service";

const OCCASION_OPTIONS = ["通勤", "约会", "面试", "出游"];
const STYLE_OPTIONS = ["极简", "韩系", "法式", "轻正式"];

@Injectable()
export class AiStylistChatService {
  private readonly logger = new Logger(AiStylistChatService.name);

  constructor(
    private sessionService: AiStylistSessionService,
    private contextService: AiStylistContextService,
    private photosService: PhotosService,
    private llmProvider: LlmProviderService,
  ) {}

  async processChat(
    userId: string,
    message: string,
    conversationHistory: ChatMessage[] = [],
    buildSessionFn: (userId: string, context: import("../types").StylistContext) => StylistSession,
    processMessageFn: (session: StylistSession, message: string) => Promise<ChatResult>,
  ): Promise<ChatResult> {
    const trimmedMessage = message?.trim().slice(0, 2000);
    if (!trimmedMessage) {
      return {
        success: false,
        message: "消息不能为空",
        assistantMessage: "消息不能为空",
        timestamp: new Date().toISOString(),
        error: "INVALID_INPUT",
      };
    }

    const context = await this.contextService.buildUserContext(userId);
    const session = buildSessionFn(userId, context);
    for (const historyMessage of conversationHistory.slice(-10)) {
      if (historyMessage?.role && historyMessage?.content) {
        session.conversationHistory.push({
          role: historyMessage.role,
          content: historyMessage.content,
        });
        if (historyMessage.role === "user") {
          this.contextService.mergeSlots(
            session.state.slots,
            this.contextService.extractSlotUpdates(historyMessage.content),
          );
        }
      }
    }

    return processMessageFn(session, trimmedMessage);
  }

  async sendMessage(
    userId: string,
    sessionId: string,
    message: string,
    processMessageFn: (session: StylistSession, message: string) => Promise<ChatResult>,
  ): Promise<ChatResult> {
    const trimmedMessage = message?.trim().slice(0, 2000);
    if (!trimmedMessage) {
      return {
        success: false,
        message: "消息不能为空",
        assistantMessage: "消息不能为空",
        timestamp: new Date().toISOString(),
        sessionId,
        error: "INVALID_INPUT",
      };
    }

    const session = await this.sessionService.getSessionOrThrow(userId, sessionId);
    await this.contextService.syncPhotoAnalysis(session);
    const response = await processMessageFn(session, trimmedMessage);
    await this.sessionService.persistSession(session);
    return response;
  }

  async processMessageInSession(
    session: StylistSession,
    message: string,
    deriveOrchestrationFn: (session: StylistSession) => { nextAction: StylistAction; missingFields: string[] },
    composeAssistantMessageFn: (
      session: StylistSession,
      nextAction: StylistAction,
      slotUpdates: Partial<StylistSlots>,
      missingFields: string[],
      stage: string,
    ) => Promise<{ message: string; isFallback: boolean }>,
    buildChatResultFn: (
      session: StylistSession,
      assistantMessage: string,
      options?: Record<string, unknown>,
    ) => ChatResult,
  ): Promise<ChatResult> {
    const slotUpdates = this.contextService.extractSlotUpdates(message);

    if (this.isPhotoSkipMessage(message)) {
      session.state.photoSkipped = true;
      session.state.currentStage = "ready_to_resolve";
    }

    session.conversationHistory.push({ role: "user", content: message });
    this.contextService.mergeSlots(session.state.slots, slotUpdates);
    session.updatedAt = new Date().toISOString();

    const orchestration = deriveOrchestrationFn(session);
    const { message: assistantMessage, isFallback } =
      await composeAssistantMessageFn(
        session,
        orchestration.nextAction,
        slotUpdates,
        orchestration.missingFields,
        "message_turn",
      );

    session.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    return buildChatResultFn(session, assistantMessage, {
      nextAction: orchestration.nextAction,
      slotUpdates,
      missingFields: orchestration.missingFields,
      isFallback,
    });
  }

  async uploadSessionPhoto(
    userId: string,
    sessionId: string,
    file: Express.Multer.File,
    type: PhotoType = PhotoType.full_body,
    buildChatResultFn: (
      session: StylistSession,
      assistantMessage: string,
      options?: Record<string, unknown>,
    ) => ChatResult,
  ): Promise<ChatResult> {
    const session = await this.sessionService.getSessionOrThrow(userId, sessionId);
    const photo = await this.photosService.uploadPhoto(userId, file, type);

    session.state.lastPhotoId = photo.id;
    session.state.lastPhotoStatus = photo.status;
    session.state.photoRequested = true;
    session.state.photoSkipped = false;
    session.state.currentStage = "analysis_pending";
    session.updatedAt = new Date().toISOString();

    const assistantMessage = "照片已上传，我正在提取你的身材和色彩信息。";
    session.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });
    await this.sessionService.persistSession(session);

    return buildChatResultFn(session, assistantMessage, {
      nextAction: { type: "poll_analysis" },
      analysisStatus: photo.status,
      photoId: photo.id,
      missingFields: [],
    });
  }

  async attachExistingPhoto(
    userId: string,
    sessionId: string,
    photoId: string,
    deriveOrchestrationFn: (session: StylistSession) => { nextAction: StylistAction; missingFields: string[] },
    buildChatResultFn: (
      session: StylistSession,
      assistantMessage: string,
      options?: Record<string, unknown>,
    ) => ChatResult,
  ): Promise<ChatResult> {
    const session = await this.sessionService.getSessionOrThrow(userId, sessionId);
    const photo = await this.photosService.getPhotoById(photoId, userId);

    if (!photo) {
      throw new NotFoundException("照片不存在");
    }

    session.state.lastPhotoId = photo.id;
    session.state.lastPhotoStatus = photo.analysisStatus;
    session.state.photoRequested = true;
    session.state.photoSkipped = false;
    session.state.currentStage =
      photo.analysisStatus === "completed"
        ? "collecting_scene"
        : "analysis_pending";
    session.updatedAt = new Date().toISOString();

    await this.contextService.syncPhotoAnalysis(session);

    const orchestration = deriveOrchestrationFn(session);
    const assistantMessage =
      session.state.lastPhotoStatus === "completed"
        ? "我已经接入你最近上传的照片，身材分析结果也同步好了。接下来继续告诉我场景和风格偏好吧。"
        : "我已经接入你最近上传的照片，正在继续分析你的身材和色彩信息。";

    session.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });
    await this.sessionService.persistSession(session);

    return buildChatResultFn(session, assistantMessage, {
      nextAction: orchestration.nextAction,
      missingFields: orchestration.missingFields,
      analysisStatus: session.state.lastPhotoStatus,
      photoId: session.state.lastPhotoId,
      result: session.result,
    });
  }

  async getSessionStatus(
    userId: string,
    sessionId: string,
    deriveOrchestrationFn: (session: StylistSession) => { nextAction: StylistAction; missingFields: string[] },
    buildTemplateMessageFn: (session: StylistSession, nextAction: StylistAction) => string,
    buildChatResultFn: (
      session: StylistSession,
      assistantMessage: string,
      options?: Record<string, unknown>,
    ) => ChatResult,
  ): Promise<ChatResult> {
    const session = await this.sessionService.getSessionOrThrow(userId, sessionId);
    await this.contextService.syncPhotoAnalysis(session);

    const orchestration = deriveOrchestrationFn(session);
    const assistantMessage =
      session.state.lastPhotoStatus === "completed"
        ? "身材分析已完成，现在可以继续确认偏好或直接生成方案。"
        : buildTemplateMessageFn(session, orchestration.nextAction);

    await this.sessionService.persistSession(session);
    return buildChatResultFn(session, assistantMessage, {
      nextAction: orchestration.nextAction,
      missingFields: orchestration.missingFields,
      analysisStatus: session.state.lastPhotoStatus,
      result: session.result,
    });
  }

  async composeAssistantMessage(
    session: StylistSession,
    nextAction: StylistAction,
    slotUpdates: Partial<StylistSlots>,
    missingFields: string[],
    stage: string,
    buildTemplateMessageFn: (session: StylistSession, nextAction: StylistAction) => string,
  ): Promise<{ message: string; isFallback: boolean }> {
    const fallbackMessage = buildTemplateMessageFn(session, nextAction);

    if (!this.llmProvider.isConfigured) {
      return { message: fallbackMessage, isFallback: true };
    }

    try {
      const contextPrompt = buildConversationContextPrompt({
        slots: session.state.slots as unknown as Record<string, unknown>,
        bodyProfile: session.state.bodyProfile as unknown as Record<string, unknown>,
        conversationHistory: session.conversationHistory.slice(-6),
        stage,
      });

      const response = await this.llmProvider.chat({
        messages: [
          {
            role: "system",
            content: STYLIST_SYSTEM_PROMPT,
          },
          {
            role: "system",
            content: contextPrompt,
          },
          {
            role: "system",
            content:
              "请根据上面的上下文和当前状态，输出一句中文回复。不要 JSON，不要解释系统逻辑，控制在 80 字以内。直接给出你作为造型师对用户说的话。",
          },
          ...session.conversationHistory.slice(-4),
          {
            role: "user",
            content: JSON.stringify({
              stage,
              slotUpdates,
              nextAction,
              missingFields,
            }),
          },
        ],
        maxTokens: 200,
        temperature: 0.4,
        requestId: `stylist-compose-${Date.now()}`,
      });

      const content = response.content?.trim();
      if (!content) {
        return { message: fallbackMessage, isFallback: true };
      }
      return { message: content, isFallback: false };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Falling back to template copy: ${errorMessage}`);
      return { message: fallbackMessage, isFallback: true };
    }
  }

  buildTemplateMessage(
    session: StylistSession,
    nextAction: StylistAction,
    getOccasionNameFn: (occasion?: string) => string,
  ): string {
    const occasionName = getOccasionNameFn(session.state.slots.occasion);
    const budgetText = session.state.slots.budgetMax
      ? `，预算先按 ${session.state.slots.budgetMax} 元以内`
      : "";

    switch (nextAction.type) {
      case "ask_question":
        return "你这次更偏向通勤、约会、面试还是出游？";
      case "show_preference_buttons":
        return `收到${occasionName ? `，这次是${occasionName}场景` : ""}${budgetText}。你更想走哪种风格？`;
      case "request_photo_upload":
        return "为了把版型和显高显瘦建议做准，建议上传一张全身正面照。你也可以跳过，我先给你基础方案。";
      case "poll_analysis":
        return "照片已收到，我正在分析你的身材和色彩信息。";
      case "confirm_preferences":
        return "身材分析完成了。你更想强调利落通勤，还是柔和亲和？";
      case "generate_outfit":
        return "信息已经够了，现在可以直接为你生成穿搭方案。";
      case "show_outfit_cards":
        return "我已经整理好适合你的穿搭方案。";
      default:
        return "我已经整理好你的信息，继续下一步吧。";
    }
  }

  buildChatResult(
    session: StylistSession,
    assistantMessage: string,
    options: {
      nextAction?: StylistAction;
      slotUpdates?: Partial<StylistSlots>;
      missingFields?: string[];
      previewRecommendations?: StylistOutfitItem[];
      result?: import("../types").StylistResolution;
      photoId?: string;
      analysisStatus?: string;
      isFallback?: boolean;
    } = {},
    sessionTtlMs: number,
    buildProgressFn: (
      session: StylistSession,
      nextAction?: StylistAction,
      analysisStatus?: string,
      result?: import("../types").StylistResolution,
    ) => import("../types").StylistProgress,
  ): ChatResult {
    const progress = buildProgressFn(
      session,
      options.nextAction,
      options.analysisStatus,
      options.result,
    );

    return {
      success: true,
      message: assistantMessage,
      assistantMessage,
      timestamp: new Date().toISOString(),
      sessionId: session.id,
      nextAction: options.nextAction,
      sessionState: session.state,
      slotUpdates: options.slotUpdates,
      missingFields: options.missingFields || [],
      previewRecommendations: options.previewRecommendations || [],
      result: options.result,
      photoId: options.photoId,
      analysisStatus: options.analysisStatus,
      progress,
      sessionExpiresAt: new Date(
        new Date(session.updatedAt).getTime() + sessionTtlMs,
      ).toISOString(),
      isFallback: options.isFallback,
      isAIGenerated: true,
      aiDisclaimer: "本内容由AI生成，仅供参考，不构成专业建议。",
    };
  }

  buildProgress(
    session: StylistSession,
    nextAction?: StylistAction,
    analysisStatus?: string,
    result?: import("../types").StylistResolution,
  ): import("../types").StylistProgress {
    const effectiveAnalysisStatus =
      analysisStatus || session.state.lastPhotoStatus || "idle";

    if (
      effectiveAnalysisStatus === "pending" ||
      effectiveAnalysisStatus === "processing" ||
      nextAction?.type === "poll_analysis"
    ) {
      return {
        stage: "body_analysis",
        title: "正在分析身材与色彩",
        detail: "预计 10 到 20 秒，可先离开页面，稍后回来继续。",
        etaSeconds: 15,
        canLeaveAndResume: true,
        isWaiting: true,
      };
    }

    if (result || nextAction?.type === "show_outfit_cards") {
      return {
        stage: "resolved",
        title: "穿搭方案已准备好",
        detail: "你可以直接浏览单品卡片，继续调整预算或场景也可以。",
        canLeaveAndResume: true,
        isWaiting: false,
      };
    }

    if (nextAction?.type === "request_photo_upload") {
      return {
        stage: "awaiting_photo",
        title: "补一张照片，推荐会更准",
        detail: "显高、显瘦、比例优化这类诉求会更依赖身材判断。",
        canLeaveAndResume: true,
        isWaiting: false,
      };
    }

    if (nextAction?.type === "generate_outfit") {
      return {
        stage: "ready_to_resolve",
        title: "信息已基本齐全",
        detail: "现在可以直接生成穿搭方案，后续还可以继续微调。",
        etaSeconds: 5,
        canLeaveAndResume: true,
        isWaiting: false,
      };
    }

    if (nextAction?.type === "show_preference_buttons") {
      return {
        stage: "collecting_style",
        title: "正在确认风格偏好",
        detail: "再确认一下风格方向，我就能进入下一步。",
        canLeaveAndResume: true,
        isWaiting: false,
      };
    }

    if (nextAction?.type === "ask_question") {
      if (!session.state.sceneReady) {
        return {
          stage: "collecting_scene",
          title: "先告诉我你的使用场景",
          detail: "比如面试、通勤、约会或出游，我会先确定正式度。",
          canLeaveAndResume: true,
          isWaiting: false,
        };
      }

      return {
        stage: "collecting_style",
        title: "再补一点风格偏好",
        detail: "告诉我预算、颜色或想强调的效果，方案会更贴合。",
        canLeaveAndResume: true,
        isWaiting: false,
      };
    }

    return {
      stage: session.state.currentStage,
      title: "AI 正在整理你的需求",
      detail: "我会先抽取场景、预算和风格偏好，再决定下一步。",
      etaSeconds: 3,
      canLeaveAndResume: true,
      isWaiting: false,
    };
  }

  private isPhotoSkipMessage(message: string): boolean {
    return (
      message.includes("跳过") ||
      message.includes("先不要拍") ||
      message.includes("直接推荐")
    );
  }
}
