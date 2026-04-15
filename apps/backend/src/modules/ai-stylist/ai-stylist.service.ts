import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PhotoType } from "@prisma/client";

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

  constructor(
    private configService: ConfigService,
    private sessionService: AiStylistSessionService,
    private chatService: AiStylistChatService,
    private contextService: AiStylistContextService,
    private recommendationService: AiStylistRecommendationService,
  ) {}

  async createSession(
    userId: string,
    input: CreateSessionInput = {},
  ): Promise<ChatResult> {
    const context = await this.contextService.buildUserContext(userId);
    const session = this.buildSession(userId, context, input);
    const orchestration = this.contextService.deriveOrchestration(session);
    const { message, isFallback } = await this.chatService.composeAssistantMessage(
      session,
      orchestration.nextAction,
      {},
      orchestration.missingFields,
      "session_init",
      (s, na) => this.chatService.buildTemplateMessage(s, na, this.contextService.getOccasionName.bind(this.contextService)),
    );

    session.conversationHistory.push({ role: "assistant", content: message });
    await this.sessionService.persistSession(session);

    return this.chatService.buildChatResult(session, message, {
      nextAction: orchestration.nextAction,
      missingFields: orchestration.missingFields,
      isFallback,
    }, this.sessionService.sessionTtl, this.chatService.buildProgress.bind(this.chatService));
  }

  async chat(
    userId: string,
    message: string,
    conversationHistory: ChatMessage[] = [],
  ): Promise<ChatResult> {
    return this.chatService.processChat(
      userId,
      message,
      conversationHistory,
      (uid, ctx) => this.buildSession(uid, ctx),
      (session, msg) => this.processMessageInSession(session, msg),
    );
  }

  async sendMessage(
    userId: string,
    sessionId: string,
    message: string,
    weatherContext?: string,
  ): Promise<ChatResult> {
    return this.chatService.sendMessage(
      userId,
      sessionId,
      message,
      (session, msg) => {
        if (weatherContext) {
          session.state.slots.weather = weatherContext;
        }
        return this.processMessageInSession(session, msg);
      },
    );
  }

  async uploadSessionPhoto(
    userId: string,
    sessionId: string,
    file: Express.Multer.File,
    type: PhotoType = PhotoType.full_body,
  ): Promise<ChatResult> {
    return this.chatService.uploadSessionPhoto(
      userId,
      sessionId,
      file,
      type,
      (session, msg, opts) => this.chatService.buildChatResult(session, msg, opts, this.sessionService.sessionTtl, this.chatService.buildProgress.bind(this.chatService)),
    );
  }

  async attachExistingPhoto(
    userId: string,
    sessionId: string,
    photoId: string,
  ): Promise<ChatResult> {
    return this.chatService.attachExistingPhoto(
      userId,
      sessionId,
      photoId,
      (s) => this.contextService.deriveOrchestration(s),
      (session, msg, opts) => this.chatService.buildChatResult(session, msg, opts, this.sessionService.sessionTtl, this.chatService.buildProgress.bind(this.chatService)),
    );
  }

  async getSessionStatus(
    userId: string,
    sessionId: string,
  ): Promise<ChatResult> {
    return this.chatService.getSessionStatus(
      userId,
      sessionId,
      (s) => this.contextService.deriveOrchestration(s),
      (s, na) => this.chatService.buildTemplateMessage(s, na, this.contextService.getOccasionName.bind(this.contextService)),
      (session, msg, opts) => this.chatService.buildChatResult(session, msg, opts, this.sessionService.sessionTtl, this.chatService.buildProgress.bind(this.chatService)),
    );
  }

  async resolveSession(userId: string, sessionId: string): Promise<ChatResult> {
    return this.recommendationService.resolveSession(
      userId,
      sessionId,
      (s) => this.contextService.deriveOrchestration(s),
      (session, nextAction, slotUpdates, missingFields, stage) =>
        this.chatService.composeAssistantMessage(
          session, nextAction, slotUpdates, missingFields, stage,
          (s, na) => this.chatService.buildTemplateMessage(s, na, this.contextService.getOccasionName.bind(this.contextService)),
        ),
      (session, msg, opts) => this.chatService.buildChatResult(session, msg, opts, this.sessionService.sessionTtl, this.chatService.buildProgress.bind(this.chatService)),
    );
  }

  async listSessions(
    userId: string,
    options?: { limit?: number; offset?: number },
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

  async deleteSession(
    userId: string,
    sessionId: string,
  ): Promise<{ success: boolean }> {
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
    dislikeDetail?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.recommendationService.submitFeedback(
      userId,
      sessionId,
      outfitIndex,
      action,
      itemId,
      rating,
      dislikeReason,
      dislikeDetail,
    );
  }

  async getSessionFeedback(
    userId: string,
    sessionId: string,
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

  async generateDynamicStyleOptions(): Promise<
    Array<{ id: string; label: string }>
  > {
    return this.recommendationService.generateDynamicStyleOptions();
  }

  async generateDynamicOccasionOptions(): Promise<
    Array<{ id: string; label: string }>
  > {
    return this.recommendationService.generateDynamicOccasionOptions();
  }

  private buildSession(
    userId: string,
    context: StylistContextInternal,
    input: CreateSessionInput = {},
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
          weather:
            typeof contextRecord.weather === "string"
              ? contextRecord.weather
              : undefined,
          budgetMin:
            typeof contextRecord.budgetMin === "number"
              ? contextRecord.budgetMin
              : undefined,
          budgetMax:
            typeof contextRecord.budgetMax === "number"
              ? contextRecord.budgetMax
              : undefined,
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
    message: string,
  ): Promise<ChatResult> {
    return this.chatService.processMessageInSession(
      session,
      message,
      (s) => this.contextService.deriveOrchestration(s),
      (session, nextAction, slotUpdates, missingFields, stage) =>
        this.chatService.composeAssistantMessage(
          session, nextAction, slotUpdates, missingFields, stage,
          (s, na) => this.chatService.buildTemplateMessage(s, na, this.contextService.getOccasionName.bind(this.contextService)),
        ),
      (session, assistantMessage, opts) =>
        this.chatService.buildChatResult(
          session, assistantMessage, opts, this.sessionService.sessionTtl,
          this.chatService.buildProgress.bind(this.chatService),
        ),
    );
  }
}
