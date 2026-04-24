import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

import { PhotoType } from "../../../types/prisma-enums";

import { BodyPositiveFilter } from "./body-positive.filter";
import { DialogStateService } from "./dialog-state.service";
import {
  DialogChatRequestDto,
  DialogChatResponseDto,
  DialogContextDto,
  DialogState,
} from "./dto/dialog.dto";
import { AiStylistChatService } from "./services/chat.service";
import { AiStylistContextService } from "./services/context.service";
import { AiStylistRecommendationService } from "./services/recommendation.service";
import { AiStylistSessionService } from "./services/session.service";
import type { StylistContextInternal } from "./services/session.service";
import type {
  ChatMessage,
  StylistActionType,
  StylistAction,
  StylistSlots,
  StylistBodyProfile,
  StylistSessionState,
  StylistOutfitItem,
  StylistOutfitPlan,
  StylistResolution,
  StylistProgress,
  ChatResult,
  StylistContext,
} from "./types";

export type { ChatMessage };
export type { StylistActionType };
export type { StylistAction };
export type { StylistSlots };
export type { StylistBodyProfile };
export type { StylistSessionState };
export type { StylistOutfitItem };
export type { StylistOutfitPlan };
export type { StylistResolution };
export type { StylistProgress };
export type { ChatResult };

export interface CreateSessionInput {
  entry?: string;
  goal?: string;
  context?: Record<string, unknown>;
}

export type { StylistSession } from "./services/session.service";

@Injectable()
export class AiStylistService {
  private readonly logger = new Logger(AiStylistService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private configService: ConfigService,
    private sessionService: AiStylistSessionService,
    private chatService: AiStylistChatService,
    private contextService: AiStylistContextService,
    private recommendationService: AiStylistRecommendationService,
    private dialogStateService: DialogStateService,
    private bodyPositiveFilter: BodyPositiveFilter
  ) {
    this.mlServiceUrl = this.configService.get<string>(
      "ML_SERVICE_URL",
      "http://localhost:8001/api"
    );
  }

  async createSession(userId: string, input: CreateSessionInput = {}): Promise<ChatResult> {
    const context = await this.contextService.buildUserContext(userId);
    const session = this.buildSession(userId, context, input);
    const orchestration = this.contextService.deriveOrchestration(session);
    const { message, isFallback } = await this.chatService.composeAssistantMessage(
      session,
      orchestration.nextAction,
      {},
      orchestration.missingFields,
      "session_init",
      (s, na) =>
        this.chatService.buildTemplateMessage(
          s,
          na,
          this.contextService.getOccasionName.bind(this.contextService)
        )
    );

    session.conversationHistory.push({ role: "assistant", content: message });
    await this.sessionService.persistSession(session);

    return this.chatService.buildChatResult(
      session,
      message,
      {
        nextAction: orchestration.nextAction,
        missingFields: orchestration.missingFields,
        isFallback,
      },
      this.sessionService.sessionTtl,
      this.chatService.buildProgress.bind(this.chatService)
    );
  }

  async chat(
    userId: string,
    message: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResult> {
    return this.chatService.processChat(
      userId,
      message,
      conversationHistory,
      (uid, ctx) => this.buildSession(uid, ctx),
      (session, msg) => this.processMessageInSession(session, msg)
    );
  }

  async sendMessage(
    userId: string,
    sessionId: string,
    message: string,
    weatherContext?: string
  ): Promise<ChatResult> {
    return this.chatService.sendMessage(userId, sessionId, message, (session, msg) => {
      if (weatherContext) {
        session.state.slots.weather = weatherContext;
      }
      return this.processMessageInSession(session, msg);
    });
  }

  async uploadSessionPhoto(
    userId: string,
    sessionId: string,
    file: Express.Multer.File,
    type: PhotoType = PhotoType.full_body
  ): Promise<ChatResult> {
    return this.chatService.uploadSessionPhoto(
      userId,
      sessionId,
      file,
      type,
      (session, msg, opts) =>
        this.chatService.buildChatResult(
          session,
          msg,
          opts,
          this.sessionService.sessionTtl,
          this.chatService.buildProgress.bind(this.chatService)
        )
    );
  }

  async attachExistingPhoto(
    userId: string,
    sessionId: string,
    photoId: string
  ): Promise<ChatResult> {
    return this.chatService.attachExistingPhoto(
      userId,
      sessionId,
      photoId,
      (s) => this.contextService.deriveOrchestration(s),
      (session, msg, opts) =>
        this.chatService.buildChatResult(
          session,
          msg,
          opts,
          this.sessionService.sessionTtl,
          this.chatService.buildProgress.bind(this.chatService)
        )
    );
  }

  async getSessionStatus(userId: string, sessionId: string): Promise<ChatResult> {
    return this.chatService.getSessionStatus(
      userId,
      sessionId,
      (s) => this.contextService.deriveOrchestration(s),
      (s, na) =>
        this.chatService.buildTemplateMessage(
          s,
          na,
          this.contextService.getOccasionName.bind(this.contextService)
        ),
      (session, msg, opts) =>
        this.chatService.buildChatResult(
          session,
          msg,
          opts,
          this.sessionService.sessionTtl,
          this.chatService.buildProgress.bind(this.chatService)
        )
    );
  }

  async resolveSession(userId: string, sessionId: string): Promise<ChatResult> {
    return this.recommendationService.resolveSession(
      userId,
      sessionId,
      (s) => this.contextService.deriveOrchestration(s),
      (session, nextAction, slotUpdates, missingFields, stage) =>
        this.chatService.composeAssistantMessage(
          session,
          nextAction,
          slotUpdates,
          missingFields,
          stage,
          (s, na) =>
            this.chatService.buildTemplateMessage(
              s,
              na,
              this.contextService.getOccasionName.bind(this.contextService)
            )
        ),
      (session, msg, opts) =>
        this.chatService.buildChatResult(
          session,
          msg,
          opts,
          this.sessionService.sessionTtl,
          this.chatService.buildProgress.bind(this.chatService)
        )
    );
  }

  async listSessions(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    sessions: Array<{
      id: string;
      createdAt: string;
      updatedAt: string;
      state: StylistSessionState;
      result?: StylistResolution;
    }>;
    total: number;
  }> {
    return this.sessionService.listSessions(userId, options);
  }

  async deleteSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    return this.sessionService.deleteSession(userId, sessionId);
  }

  async submitFeedback(
    userId: string,
    sessionId: string,
    outfitIndex: number,
    action: "like" | "dislike",
    itemId?: string,
    rating?: number,
    dislikeReason?: string,
    dislikeDetail?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.recommendationService.submitFeedback(
      userId,
      sessionId,
      outfitIndex,
      action,
      itemId,
      rating,
      dislikeReason,
      dislikeDetail
    );
  }

  async getSessionFeedback(
    userId: string,
    sessionId: string
  ): Promise<{
    likes: Array<{ outfitIndex: number; itemId?: string; timestamp: string }>;
    dislikes: Array<{
      outfitIndex: number;
      itemId?: string;
      timestamp: string;
    }>;
  }> {
    return this.recommendationService.getSessionFeedback(userId, sessionId);
  }

  async generateDynamicStyleOptions(): Promise<Array<{ id: string; label: string }>> {
    return this.recommendationService.generateDynamicStyleOptions();
  }

  async generateDynamicOccasionOptions(): Promise<Array<{ id: string; label: string }>> {
    return this.recommendationService.generateDynamicOccasionOptions();
  }

  async createDialogSession(): Promise<{ sessionId: string }> {
    const sessionId = crypto.randomUUID();
    const context = new DialogContextDto();
    await this.dialogStateService.saveContext(sessionId, context);
    return { sessionId };
  }

  async dialogChat(request: DialogChatRequestDto, userId: string): Promise<DialogChatResponseDto> {
    const context = await this.dialogStateService.getContext(request.sessionId);

    try {
      const mlResponse = await axios.post(
        `${this.mlServiceUrl}/stylist/chat`,
        {
          message: request.message,
          context,
          user_id: userId,
        },
        {
          timeout: 15000,
          headers: { "Content-Type": "application/json" },
        }
      );

      const updatedContext: DialogContextDto = mlResponse.data.context || context;
      updatedContext.turnCount = (updatedContext.turnCount || 0) + 1;
      await this.dialogStateService.saveContext(request.sessionId, updatedContext);

      const filteredReply = this.bodyPositiveFilter.filter(mlResponse.data.reply || "");

      return {
        reply: filteredReply,
        outfits: mlResponse.data.outfits,
        quickReplies: mlResponse.data.quick_replies || this.generateQuickReplies(updatedContext),
        state: mlResponse.data.state || updatedContext.state,
        slots: mlResponse.data.slots || updatedContext.slots,
      };
    } catch (error) {
      this.logger.warn(
        `ML service unavailable, falling back to local dialog: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return this.fallbackDialogChat(request, userId, context);
    }
  }

  async endDialogSession(sessionId: string): Promise<void> {
    await this.dialogStateService.clearContext(sessionId);
  }

  private generateQuickReplies(context: DialogContextDto): string[] {
    switch (context.state) {
      case DialogState.GREET:
        return ["面试穿搭", "约会穿搭", "通勤穿搭", "出游穿搭"];
      case DialogState.CONTEXT:
        return ["极简风", "韩系风", "法式风", "轻正式"];
      case DialogState.GENERATE:
        return ["换一套", "调整预算", "换个风格", "确认这套"];
      case DialogState.REFINE:
        return ["换上衣", "换下装", "换个颜色", "就这样"];
      case DialogState.ACTION:
        return ["保存方案", "分享给朋友", "重新开始"];
      case DialogState.WRAP:
        return ["开始新咨询", "查看历史方案"];
      default:
        return ["面试穿搭", "约会穿搭", "通勤穿搭"];
    }
  }

  private async fallbackDialogChat(
    request: DialogChatRequestDto,
    userId: string,
    context: DialogContextDto
  ): Promise<DialogChatResponseDto> {
    const slotUpdates = this.contextService.extractSlotUpdates(request.message);
    this.contextService.mergeSlots(
      {
        occasion: context.slots.occasion,
        preferredStyles: context.slots.stylePreference || [],
        styleAvoidances: context.slots.avoidItems || [],
        fitGoals: [],
        preferredColors: context.slots.colorPreference || [],
        budgetMin: context.slots.budget?.min,
        budgetMax: context.slots.budget?.max,
      } as import("./types").StylistSlots,
      slotUpdates
    );

    const updatedSlots: Partial<import("./dto/dialog.dto").DialogSlotDto> = {};
    if (slotUpdates.occasion) {
      updatedSlots.occasion = slotUpdates.occasion;
    }
    if (slotUpdates.preferredStyles?.length) {
      updatedSlots.stylePreference = slotUpdates.preferredStyles;
    }
    if (slotUpdates.preferredColors?.length) {
      updatedSlots.colorPreference = slotUpdates.preferredColors;
    }
    if (slotUpdates.budgetMax !== undefined) {
      updatedSlots.budget = {
        min: slotUpdates.budgetMin ?? context.slots.budget?.min ?? 0,
        max: slotUpdates.budgetMax,
      };
    }

    const newState = this.deriveDialogState(context, slotUpdates);
    context.state = newState;
    context.slots = { ...context.slots, ...updatedSlots };
    context.turnCount += 1;
    await this.dialogStateService.saveContext(request.sessionId, context);

    const reply = this.buildFallbackReply(context, slotUpdates);
    const filteredReply = this.bodyPositiveFilter.filter(reply);

    return {
      reply: filteredReply,
      quickReplies: this.generateQuickReplies(context),
      state: context.state,
      slots: context.slots,
    };
  }

  private deriveDialogState(
    context: DialogContextDto,
    slotUpdates: Partial<import("./types").StylistSlots>
  ): DialogState {
    const { state, slots } = context;
    const hasOccasion = slots.occasion || slotUpdates.occasion;
    const hasStyle =
      (slots.stylePreference?.length ?? 0) > 0 || (slotUpdates.preferredStyles?.length ?? 0) > 0;

    switch (state) {
      case DialogState.GREET:
        return hasOccasion ? DialogState.CONTEXT : DialogState.GREET;
      case DialogState.CONTEXT:
        return hasStyle ? DialogState.GENERATE : DialogState.CONTEXT;
      case DialogState.GENERATE:
        return DialogState.REFINE;
      case DialogState.REFINE:
        return DialogState.ACTION;
      case DialogState.ACTION:
        return DialogState.WRAP;
      case DialogState.WRAP:
        return DialogState.GREET;
      default:
        return DialogState.GREET;
    }
  }

  private buildFallbackReply(
    context: DialogContextDto,
    slotUpdates: Partial<import("./types").StylistSlots>
  ): string {
    const occasionName = this.contextService.getOccasionName(context.slots.occasion);

    switch (context.state) {
      case DialogState.GREET:
        if (slotUpdates.occasion) {
          return `好的，${occasionName}场景，我来帮你搭配。你更偏好什么风格？`;
        }
        return "你好！我是你的AI造型师，告诉我你这次想为什么场景搭配？";
      case DialogState.CONTEXT:
        if (slotUpdates.preferredStyles?.length) {
          return `收到，${slotUpdates.preferredStyles.join(
            "、"
          )}风格很适合你。我来为你生成穿搭方案。`;
        }
        return "你更偏好什么风格？比如极简、韩系、法式或者轻正式？";
      case DialogState.GENERATE:
        return "我正在为你搭配方案，稍等一下。";
      case DialogState.REFINE:
        return "方案已经准备好了，你想调整哪部分？";
      case DialogState.ACTION:
        return "这套方案你觉得怎么样？可以保存或者继续调整。";
      case DialogState.WRAP:
        return "希望你喜欢这次的推荐！有需要随时找我。";
      default:
        return "告诉我你的穿搭需求，我来帮你搭配。";
    }
  }

  private buildSession(
    userId: string,
    context: StylistContextInternal,
    input: CreateSessionInput = {}
  ): import("./services/session.service").StylistSession {
    const now = new Date().toISOString();
    const preferredStyles = this.contextService.getInitialPreferredStyles(context);
    const contextRecord = input.context || {};
    const bodyProfile: StylistBodyProfile = {
      bodyType: context.userProfile?.bodyType,
      skinTone: context.userProfile?.skinTone,
      faceShape: context.userProfile?.faceShape,
      colorSeason: context.userProfile?.colorSeason,
      height: context.userProfile?.height,
      weight: context.userProfile?.weight,
      shapeFeatures: [],
    };

    return {
      id: crypto.randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
      conversationHistory: [],
      state: {
        sceneReady: false,
        bodyReady: this.contextService.hasBodyProfile(bodyProfile),
        styleReady: preferredStyles.length > 0,
        candidateReady: false,
        commerceReady: false,
        currentStage: "collecting_scene",
        slots: {
          occasion:
            typeof contextRecord.occasion === "string"
              ? this.contextService.normalizeOccasion(contextRecord.occasion)
              : undefined,
          weather: typeof contextRecord.weather === "string" ? contextRecord.weather : undefined,
          budgetMin:
            typeof contextRecord.budgetMin === "number" ? contextRecord.budgetMin : undefined,
          budgetMax:
            typeof contextRecord.budgetMax === "number" ? contextRecord.budgetMax : undefined,
          preferredStyles,
          styleAvoidances: [],
          fitGoals: [],
          preferredColors: [],
        },
        bodyProfile,
      },
    };
  }

  private async processMessageInSession(
    session: import("./services/session.service").StylistSession,
    message: string
  ): Promise<ChatResult> {
    return this.chatService.processMessageInSession(
      session,
      message,
      (s) => this.contextService.deriveOrchestration(s),
      (session, nextAction, slotUpdates, missingFields, stage) =>
        this.chatService.composeAssistantMessage(
          session,
          nextAction,
          slotUpdates,
          missingFields,
          stage,
          (s, na) =>
            this.chatService.buildTemplateMessage(
              s,
              na,
              this.contextService.getOccasionName.bind(this.contextService)
            )
        ),
      (session, assistantMessage, opts) =>
        this.chatService.buildChatResult(
          session,
          assistantMessage,
          opts,
          this.sessionService.sessionTtl,
          this.chatService.buildProgress.bind(this.chatService)
        )
    );
  }
}
