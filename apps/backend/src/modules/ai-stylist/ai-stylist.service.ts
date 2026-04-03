/**
 * @fileoverview AI Stylist Service - Intelligent fashion recommendation engine.
 *
 * This service provides conversational AI-powered styling recommendations through
 * a slot-filling dialogue system. It orchestrates multiple stages of the styling
 * workflow including preference collection, body analysis integration, and
 * personalized outfit generation.
 *
 * @module AiStylistService
 * @see {@link https://docs.nestjs.com/providers|NestJS Providers}
 *
 * @example
 * ```typescript
 * // Creating a new styling session
 * const result = await aiStylistService.createSession(userId, {
 *   entry: 'I need an outfit for a job interview'
 * });
 *
 * // Sending a message in an existing session
 * const response = await aiStylistService.sendMessage(userId, sessionId, 'I prefer minimalist style');
 * ```
 */

import { randomUUID } from "crypto";

import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PhotoType, Prisma } from "@prisma/client";

import { StructuredLoggerService, ContextualLogger } from "../../common/logging";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { StyleUnderstandingService } from "../ai/services/style-understanding.service";
import { PhotosService } from "../photos/photos.service";
import {
  RecommendationsService,
  type RecommendedItem,
} from "../recommendations/recommendations.service";

import { DecisionEngineService } from "./decision-engine.service";
import { LlmProviderService } from "./llm-provider.service";
import { NlSlotExtractorService } from "./nl-slot-extractor.service";
import {
  STYLIST_SYSTEM_PROMPT,
  buildConversationContextPrompt,
} from "./prompts/system-prompt";

// Import shared types
import {
  type ChatMessage,
  type StylistActionType,
  type StylistAction,
  type StylistSlots,
  type StylistBodyProfile,
  type StylistSessionState,
  type StylistOutfitItem,
  type StylistOutfitPlan,
  type StylistResolution,
  type StylistProgress,
  type ChatResult,
  type StylistContext,
  type MLItemRecommendation,
  type DecisionContext,
  type UserProfile,
} from "./types";

/**
 * Represents a single message in the conversation history.
 * @description Used to maintain context throughout the styling session.
 * @example
 * ```typescript
 * const message: ChatMessage = {
 *   role: 'user',
 *   content: 'I need an outfit for a dinner date'
 * };
 * ```
 */
export type { ChatMessage };

/**
 * Enumeration of possible action types the AI stylist can request.
 * @description These actions guide the frontend in displaying appropriate UI elements
 * and collecting user input during the styling session.
 */
export type { StylistActionType };

/**
 * Represents an action the AI stylist wants the frontend to perform.
 * @description Used to orchestrate the conversational flow and UI rendering.
 * @example
 * ```typescript
 * const action: StylistAction = {
 *   type: 'show_preference_buttons',
 *   field: 'preferredStyles',
 *   options: ['Minimalist', 'French Chic', 'Streetwear'],
 *   canSkip: true
 * };
 * ```
 */
export type { StylistAction };

/**
 * Represents the collected preference slots for a styling session.
 * @description These slots are progressively filled through the conversation
 * and used to generate personalized recommendations.
 * @example
 * ```typescript
 * const slots: StylistSlots = {
 *   occasion: 'interview',
 *   weather: 'mild',
 *   budgetMin: 500,
 *   budgetMax: 2000,
 *   preferredStyles: ['Minimalist', 'Business Casual'],
 *   styleAvoidances: ['Streetwear'],
 *   fitGoals: ['Look professional', 'Appear confident'],
 *   preferredColors: ['Navy', 'White', 'Beige']
 * };
 * ```
 */
export type { StylistSlots };

/**
 * Body profile information derived from photo analysis or user input.
 * @description Contains physical characteristics used for personalized recommendations.
 * @example
 * ```typescript
 * const profile: StylistBodyProfile = {
 *   bodyType: 'hourglass',
 *   skinTone: 'medium',
 *   faceShape: 'oval',
 *   colorSeason: 'autumn',
 *   height: 165,
 *   weight: 55,
 *   shapeFeatures: ['Defined waist', 'Balanced proportions']
 * };
 * ```
 */
export type { StylistBodyProfile };

/**
 * Represents the current state of a styling session.
 * @description Tracks readiness flags for each stage of the styling workflow
 * and maintains all collected information.
 * @example
 * ```typescript
 * const state: StylistSessionState = {
 *   sceneReady: true,
 *   bodyReady: true,
 *   styleReady: false,
 *   candidateReady: false,
 *   commerceReady: false,
 *   currentStage: 'collecting_preferences',
 *   slots: { preferredStyles: ['Minimalist'], styleAvoidances: [], fitGoals: [], preferredColors: [] },
 *   bodyProfile: { shapeFeatures: [] },
 *   photoRequested: false,
 *   photoSkipped: false
 * };
 * ```
 */
export type { StylistSessionState };

/**
 * Represents a single item in an outfit recommendation.
 * @description Contains item details and explanation for the recommendation.
 * @example
 * ```typescript
 * const item: StylistOutfitItem = {
 *   itemId: 'item_123',
 *   category: 'tops',
 *   name: 'Silk Blend Blouse',
 *   reason: 'The soft texture complements your skin tone',
 *   imageUrl: 'https://cdn.aineed.com/items/item_123.jpg',
 *   externalUrl: 'https://shop.example.com/item/123',
 *   price: 599,
 *   brand: 'COS',
 *   score: 0.92
 * };
 * ```
 */
export type { StylistOutfitItem };

/**
 * Represents a complete outfit plan with multiple items.
 * @description A cohesive outfit suggestion with styling explanation.
 * @example
 * ```typescript
 * const plan: StylistOutfitPlan = {
 *   title: 'Professional Interview Look',
 *   items: [blouseItem, trousersItem, shoesItem],
 *   styleExplanation: [
 *     'The structured blazer conveys professionalism',
 *     'Neutral colors create a polished appearance'
 *   ],
 *   estimatedTotalPrice: 2500
 * };
 * ```
 */
export type { StylistOutfitPlan };

/**
 * Final styling resolution containing outfit recommendations.
 * @description The complete result of the AI stylist session.
 * @example
 * ```typescript
 * const resolution: StylistResolution = {
 *   lookSummary: 'A professional yet comfortable interview outfit',
 *   whyItFits: [
 *     'Suits your minimalist style preference',
 *     'Colors complement your autumn color season',
 *     'Fit flatters your hourglass body type'
 *   ],
 *   outfits: [outfit1, outfit2, outfit3]
 * };
 * ```
 */
export type { StylistResolution };

/**
 * Progress information for long-running operations.
 * @description Used to display progress to users during analysis or generation.
 */
export type { StylistProgress };

/**
 * Result of a chat interaction with the AI stylist.
 * @description The standard response format for all AI stylist endpoints.
 * @example
 * ```typescript
 * // Successful response with next action
 * const result: ChatResult = {
 *   success: true,
 *   message: 'Got it! What occasion are you dressing for?',
 *   assistantMessage: 'Got it! What occasion are you dressing for?',
 *   timestamp: '2024-06-15T10:30:00Z',
 *   sessionId: 'session_123',
 *   nextAction: { type: 'show_preference_buttons', field: 'occasion', options: ['Work', 'Date', 'Interview'] },
 *   missingFields: ['occasion'],
 *   sessionExpiresAt: '2024-06-15T11:00:00Z'
 * };
 * ```
 */
export type { ChatResult };

const VALID_OCCASIONS = [
  "interview",
  "work",
  "date",
  "travel",
  "party",
  "daily",
  "campus",
] as const;
const VALID_STYLES = [
  "极简",
  "韩系",
  "法式",
  "日系",
  "轻正式",
  "街头",
  "运动",
  "复古",
] as const;
const VALID_FIT_GOALS = [
  "显高",
  "显瘦",
  "修饰胯部",
  "平衡肩线",
  "利落专业",
  "减龄",
  "提气色",
] as const;

type ValidOccasion = (typeof VALID_OCCASIONS)[number];
type ValidStyle = (typeof VALID_STYLES)[number];
type ValidFitGoal = (typeof VALID_FIT_GOALS)[number];

/**
 * User context information for personalization.
 * @description Aggregated user data used to personalize recommendations.
 */
interface StylistContextInternal {
  /** User's body profile and preferences */
  userProfile?: {
    bodyType?: string;
    skinTone?: string;
    faceShape?: string;
    colorSeason?: string;
    height?: number;
    weight?: number;
    stylePreferences?: Array<{ name?: string } | string>;
  } | null;
  /** Recent user behavior events */
  recentBehaviors?: Array<{ type: string; data: unknown }>;
  /** Learned preference scores */
  preferences?: Record<string, Record<string, number>>;
}

/**
 * Input for creating a new styling session.
 */
interface CreateSessionInput {
  /** Initial user message or entry point */
  entry?: string;
  /** User's stated goal for the session */
  goal?: string;
  /** Additional context data */
  context?: Record<string, unknown>;
}

interface DerivedOrchestration {
  nextAction: StylistAction;
  missingFields: string[];
}

/**
 * Internal representation of a styling session.
 * @description Stores complete session data including conversation history,
 * state, results, and user feedback.
 */
interface StylistSession {
  /** Unique session identifier */
  id: string;
  /** User who owns this session */
  userId: string;
  /** ISO timestamp of session creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Full conversation history */
  conversationHistory: ChatMessage[];
  /** Current session state */
  state: StylistSessionState;
  /** Final styling resolution (if generated) */
  result?: StylistResolution;
  /** User feedback on recommendations */
  feedback?: {
    /** Items the user liked */
    likes: Array<{ outfitIndex: number; itemId?: string; timestamp: string }>;
    /** Items the user disliked */
    dislikes: Array<{
      outfitIndex: number;
      itemId?: string;
      timestamp: string;
    }>;
  };
}

const OCCASION_OPTIONS = ["通勤", "约会", "面试", "出游"];
const STYLE_OPTIONS = ["极简", "韩系", "法式", "轻正式"];
const COLOR_KEYWORDS = [
  "白色",
  "黑色",
  "灰色",
  "蓝色",
  "米色",
  "卡其",
  "粉色",
  "绿色",
  "酒红",
];

const DYNAMIC_STYLE_PROMPT = `你是一个时尚穿搭专家。请生成当前流行的穿搭风格选项，用于给用户选择。
要求：
1. 返回JSON数组格式，每个选项包含id和label字段
2. 生成4-6个风格选项
3. 风格名称要简洁（2-4个字）
4. 结合当季流行趋势
5. 只返回JSON数组，不要其他内容

示例格式：
[{"id":"minimalist","label":"极简风"},{"id":"korean","label":"韩系"}]`;

const DYNAMIC_OCCASION_PROMPT = `你是一个时尚穿搭专家。请生成常见的穿搭场景选项，用于给用户选择。
要求：
1. 返回JSON数组格式，每个选项包含id和label字段
2. 生成4-6个场景选项
3. 场景名称要简洁（2-4个字）
4. 贴合国内用户的日常生活场景
5. 只返回JSON数组，不要其他内容

示例格式：
[{"id":"work","label":"通勤"},{"id":"date","label":"约会"}]`;

/**
 * AI Stylist Service - Main service for intelligent fashion recommendations.
 *
 * @class AiStylistService
 * @description Provides a conversational AI-powered styling assistant that guides users
 * through a personalized outfit selection process. The service implements a slot-filling
 * dialogue system with multiple stages:
 *
 * 1. **Scene Collection** - Gathers occasion, weather, and budget information
 * 2. **Body Profile** - Integrates with photo analysis or manual input
 * 3. **Style Preferences** - Collects style likes/dislikes and fit goals
 * 4. **Outfit Generation** - Generates personalized outfit recommendations
 * 5. **Commerce Integration** - Links to shoppable items
 *
 * The service supports both Redis-backed sessions (for production) and in-memory
 * sessions (for development). It uses a circuit breaker pattern for AI API calls
 * to ensure resilience.
 *
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private readonly aiStylistService: AiStylistService) {}
 *
 * // Create a new session
 * const session = await this.aiStylistService.createSession(userId, {
 *   entry: 'I need an outfit for an interview'
 * });
 *
 * // Send a message in the session
 * const response = await this.aiStylistService.sendMessage(
 *   userId,
 *   session.sessionId,
 *   'I prefer minimalist style and have a budget of 2000 yuan'
 * );
 *
 * // Get final recommendations
 * const result = await this.aiStylistService.resolveSession(userId, session.sessionId);
 * ```
 *
 * @see {@link ChatResult} - Response format for all chat operations
 * @see {@link StylistResolution} - Final outfit recommendation structure
 */
@Injectable()
export class AiStylistService {
  private readonly logger = new Logger(AiStylistService.name);
  private readonly sessionTtlMs = 30 * 60 * 1000;
  private readonly sessionCleanupThrottleMs = 5 * 60 * 1000;
  private readonly maxSessionMessages = 20;
  private readonly sessionConfigPrefix = "ai_stylist_session:";
  private readonly maxMemorySessions = 1000;
  private readonly sessionStore = new Map<string, StylistSession>();
  private readonly sessionAccessOrder: string[] = [];
  private lastStoreCleanupAt = 0;
  private readonly useRedis: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redisService: RedisService,
    private recommendationsService: RecommendationsService,
    private photosService: PhotosService,
    private styleUnderstandingService: StyleUnderstandingService,
    private decisionEngineService: DecisionEngineService,
    private llmProvider: LlmProviderService,
    private nlSlotExtractor: NlSlotExtractorService,
  ) {
    this.useRedis = this.configService.get<string>("REDIS_URL") ? true : false;
  }

  async createSession(
    userId: string,
    input: CreateSessionInput = {},
  ): Promise<ChatResult> {
    const context = await this.buildUserContext(userId);
    const session = this.buildSession(userId, context, input);
    const orchestration = this.deriveOrchestration(session);
    const { message, isFallback } = await this.composeAssistantMessage(
      session,
      orchestration.nextAction,
      {},
      orchestration.missingFields,
      "session_init",
    );

    session.conversationHistory.push({ role: "assistant", content: message });
    await this.persistSession(session);

    return this.buildChatResult(session, message, {
      nextAction: orchestration.nextAction,
      missingFields: orchestration.missingFields,
      isFallback,
    });
  }

  async chat(
    userId: string,
    message: string,
    conversationHistory: ChatMessage[] = [],
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

    const context = await this.buildUserContext(userId);
    const session = this.buildSession(userId, context);
    for (const historyMessage of conversationHistory.slice(-10)) {
      if (historyMessage?.role && historyMessage?.content) {
        session.conversationHistory.push({
          role: historyMessage.role,
          content: historyMessage.content,
        });
        if (historyMessage.role === "user") {
          this.mergeSlots(
            session.state.slots,
            this.extractSlotUpdates(historyMessage.content),
          );
        }
      }
    }

    const response = await this.processMessageInSession(
      session,
      trimmedMessage,
    );
    return response;
  }

  async sendMessage(
    userId: string,
    sessionId: string,
    message: string,
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

    const session = await this.getSessionOrThrow(userId, sessionId);
    await this.syncPhotoAnalysis(session);
    const response = await this.processMessageInSession(
      session,
      trimmedMessage,
    );
    await this.persistSession(session);
    return response;
  }

  async uploadSessionPhoto(
    userId: string,
    sessionId: string,
    file: Express.Multer.File,
    type: PhotoType = PhotoType.full_body,
  ): Promise<ChatResult> {
    const session = await this.getSessionOrThrow(userId, sessionId);
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
    await this.persistSession(session);

    return this.buildChatResult(session, assistantMessage, {
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
  ): Promise<ChatResult> {
    const session = await this.getSessionOrThrow(userId, sessionId);
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

    await this.syncPhotoAnalysis(session);

    const orchestration = this.deriveOrchestration(session);
    const assistantMessage =
      session.state.lastPhotoStatus === "completed"
        ? "我已经接入你最近上传的照片，身材分析结果也同步好了。接下来继续告诉我场景和风格偏好吧。"
        : "我已经接入你最近上传的照片，正在继续分析你的身材和色彩信息。";

    session.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });
    await this.persistSession(session);

    return this.buildChatResult(session, assistantMessage, {
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
  ): Promise<ChatResult> {
    const session = await this.getSessionOrThrow(userId, sessionId);
    await this.syncPhotoAnalysis(session);

    const orchestration = this.deriveOrchestration(session);
    const assistantMessage =
      session.state.lastPhotoStatus === "completed"
        ? "身材分析已完成，现在可以继续确认偏好或直接生成方案。"
        : this.buildTemplateMessage(session, orchestration.nextAction);

    await this.persistSession(session);
    return this.buildChatResult(session, assistantMessage, {
      nextAction: orchestration.nextAction,
      missingFields: orchestration.missingFields,
      analysisStatus: session.state.lastPhotoStatus,
      result: session.result,
    });
  }

  async resolveSession(userId: string, sessionId: string): Promise<ChatResult> {
    const session = await this.getSessionOrThrow(userId, sessionId);
    await this.syncPhotoAnalysis(session);

    const orchestration = this.deriveOrchestration(session);
    if (orchestration.nextAction.type === "poll_analysis") {
      return this.buildChatResult(
        session,
        "照片还在分析中，请稍后再生成方案。",
        {
          nextAction: orchestration.nextAction,
          missingFields: orchestration.missingFields,
          analysisStatus: session.state.lastPhotoStatus,
        },
      );
    }

    if (
      orchestration.nextAction.type !== "generate_outfit" &&
      orchestration.nextAction.type !== "show_outfit_cards"
    ) {
      const { message, isFallback } = await this.composeAssistantMessage(
        session,
        orchestration.nextAction,
        {},
        orchestration.missingFields,
        "resolve_guard",
      );
      await this.persistSession(session);
      return this.buildChatResult(session, message, {
        nextAction: orchestration.nextAction,
        missingFields: orchestration.missingFields,
        isFallback,
      });
    }

    const result = await this.generateOutfitResult(userId, session);
    session.result = result;
    session.state.candidateReady = result.outfits.some(
      (outfit) => outfit.items.length > 0,
    );
    session.state.commerceReady = result.outfits.some((outfit) =>
      outfit.items.some((item) => Boolean(item.externalUrl)),
    );
    session.state.currentStage = "resolved";
    session.updatedAt = new Date().toISOString();

    const assistantMessage = `我已经整理好 ${result.outfits.length} 套更适合你的穿搭方案。`;
    session.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });
    await this.persistSession(session);

    return this.buildChatResult(session, assistantMessage, {
      nextAction: { type: "show_outfit_cards" },
      missingFields: [],
      result,
      previewRecommendations: result.outfits.flatMap((outfit) =>
        outfit.items.slice(0, 2),
      ),
    });
  }

  private async processMessageInSession(
    session: StylistSession,
    message: string,
  ): Promise<ChatResult> {
    const slotUpdates = this.extractSlotUpdates(message);

    if (this.isPhotoSkipMessage(message)) {
      session.state.photoSkipped = true;
      session.state.currentStage = "ready_to_resolve";
    }

    session.conversationHistory.push({ role: "user", content: message });
    this.mergeSlots(session.state.slots, slotUpdates);
    session.updatedAt = new Date().toISOString();

    const orchestration = this.deriveOrchestration(session);
    const { message: assistantMessage, isFallback } =
      await this.composeAssistantMessage(
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

    return this.buildChatResult(session, assistantMessage, {
      nextAction: orchestration.nextAction,
      slotUpdates,
      missingFields: orchestration.missingFields,
      isFallback,
    });
  }

  private buildSession(
    userId: string,
    context: StylistContext,
    input: CreateSessionInput = {},
  ): StylistSession {
    const now = new Date().toISOString();
    const preferredStyles = this.getInitialPreferredStyles(context);
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
      id: randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
      conversationHistory: [],
      state: {
        sceneReady: false,
        bodyReady: this.hasBodyProfile(bodyProfile),
        styleReady: preferredStyles.length > 0,
        candidateReady: false,
        commerceReady: false,
        currentStage: "collecting_scene",
        slots: {
          occasion:
            typeof contextRecord.occasion === "string"
              ? this.normalizeOccasion(contextRecord.occasion)
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

  private getInitialPreferredStyles(context: StylistContextInternal): string[] {
    const profileStyles = Array.isArray(context.userProfile?.stylePreferences)
      ? context.userProfile?.stylePreferences || []
      : [];
    const normalizedProfileStyles = profileStyles
      .map((item) => (typeof item === "string" ? item : item?.name || ""))
      .map((value) => this.normalizeStyle(value))
      .filter((value): value is string => Boolean(value));

    const weightedStyles = Object.entries(context.preferences?.style || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => this.normalizeStyle(name))
      .filter((value): value is string => Boolean(value));

    return this.deduplicateStrings([
      ...normalizedProfileStyles,
      ...weightedStyles,
    ]);
  }

  private deriveOrchestration(session: StylistSession): DerivedOrchestration {
    const { slots, bodyProfile, photoSkipped, lastPhotoStatus } = session.state;
    const missingFields: string[] = [];

    session.state.sceneReady = Boolean(slots.occasion);
    session.state.styleReady = slots.preferredStyles.length > 0;
    session.state.bodyReady = this.hasBodyProfile(bodyProfile);

    if (session.result) {
      session.state.currentStage = "resolved";
      return {
        nextAction: { type: "show_outfit_cards" },
        missingFields,
      };
    }

    if (lastPhotoStatus === "processing" || lastPhotoStatus === "pending") {
      session.state.currentStage = "analysis_pending";
      return {
        nextAction: { type: "poll_analysis" },
        missingFields,
      };
    }

    if (!slots.occasion) {
      missingFields.push("occasion");
      session.state.currentStage = "collecting_scene";
      return {
        nextAction: {
          type: "ask_question",
          field: "occasion",
          options: OCCASION_OPTIONS,
        },
        missingFields,
      };
    }

    if (slots.preferredStyles.length === 0) {
      missingFields.push("style_preferences");
      session.state.currentStage = "collecting_style";
      return {
        nextAction: {
          type: "show_preference_buttons",
          options: STYLE_OPTIONS,
        },
        missingFields,
      };
    }

    const shouldRequestPhoto =
      !photoSkipped &&
      !session.state.bodyReady &&
      this.needsPhotoForPrecision(session);
    if (shouldRequestPhoto) {
      missingFields.push("body_profile");
      session.state.currentStage = "awaiting_photo";
      session.state.photoRequested = true;
      return {
        nextAction: {
          type: "request_photo_upload",
          canSkip: true,
          photoType: PhotoType.full_body,
        },
        missingFields,
      };
    }

    session.state.currentStage = "ready_to_resolve";
    return {
      nextAction: { type: "generate_outfit" },
      missingFields,
    };
  }

  private needsPhotoForPrecision(session: StylistSession): boolean {
    const { fitGoals, occasion } = session.state.slots;
    return fitGoals.length > 0 || occasion === "interview";
  }

  private extractSlotUpdates(message: string): Partial<StylistSlots> {
    const slotUpdates: Partial<StylistSlots> = {};
    const occasion = this.extractOccasion(message);
    const preferredStyles = this.extractStyles(message);
    const fitGoals = this.extractFitGoals(message);
    const preferredColors = this.extractColors(message);
    const budget = this.extractBudget(message);
    const styleAvoidances = this.extractStyleAvoidances(message);

    if (occasion && this.isValidOccasion(occasion)) {
      slotUpdates.occasion = occasion;
    }
    if (preferredStyles.length > 0) {
      slotUpdates.preferredStyles = this.filterValidStyles(preferredStyles);
    }
    if (fitGoals.length > 0) {
      slotUpdates.fitGoals = this.filterValidFitGoals(fitGoals);
    }
    if (preferredColors.length > 0) {
      slotUpdates.preferredColors = preferredColors;
    }
    if (styleAvoidances.length > 0) {
      slotUpdates.styleAvoidances = this.filterValidStyles(styleAvoidances);
    }
    if (budget.min !== undefined && budget.min >= 0) {
      slotUpdates.budgetMin = budget.min;
    }
    if (budget.max !== undefined && budget.max >= 0) {
      slotUpdates.budgetMax = budget.max;
    }

    return slotUpdates;
  }

  private isValidOccasion(occasion: string): occasion is ValidOccasion {
    return VALID_OCCASIONS.includes(occasion as ValidOccasion);
  }

  private filterValidStyles(styles: string[]): string[] {
    return styles.filter((style) => VALID_STYLES.includes(style as ValidStyle));
  }

  private filterValidFitGoals(goals: string[]): string[] {
    return goals.filter((goal) =>
      VALID_FIT_GOALS.includes(goal as ValidFitGoal),
    );
  }

  private extractOccasion(message: string): string | undefined {
    const source = message.toLowerCase();
    const occasionMap: Array<[string, string]> = [
      ["面试", "interview"],
      ["求职", "interview"],
      ["职场", "work"],
      ["上班", "work"],
      ["通勤", "work"],
      ["约会", "date"],
      ["相亲", "date"],
      ["旅行", "travel"],
      ["出游", "travel"],
      ["旅游", "travel"],
      ["聚会", "party"],
      ["派对", "party"],
      ["逛街", "daily"],
      ["日常", "daily"],
      ["校园", "campus"],
      ["上学", "campus"],
    ];

    for (const [keyword, occasion] of occasionMap) {
      if (source.includes(keyword)) {
        return occasion;
      }
    }
    return undefined;
  }

  private extractStyles(message: string): string[] {
    const styleMap: Array<[string, string]> = [
      ["极简", "极简"],
      ["minimal", "极简"],
      ["韩系", "韩系"],
      ["法式", "法式"],
      ["日系", "日系"],
      ["轻正式", "轻正式"],
      ["通勤", "轻正式"],
      ["街头", "街头"],
      ["运动", "运动"],
      ["复古", "复古"],
    ];

    const normalized = message.toLowerCase();
    return this.deduplicateStrings(
      styleMap
        .filter(([keyword]) => normalized.includes(keyword.toLowerCase()))
        .map(([, value]) => value),
    );
  }

  private extractFitGoals(message: string): string[] {
    const goalMap: Array<[string, string]> = [
      ["显高", "显高"],
      ["拉长比例", "显高"],
      ["显瘦", "显瘦"],
      ["遮肉", "显瘦"],
      ["遮胯", "修饰胯部"],
      ["修肩", "平衡肩线"],
      ["利落", "利落专业"],
      ["正式", "利落专业"],
      ["减龄", "减龄"],
      ["提气色", "提气色"],
    ];

    const normalized = message.toLowerCase();
    return this.deduplicateStrings(
      goalMap
        .filter(([keyword]) => normalized.includes(keyword.toLowerCase()))
        .map(([, value]) => value),
    );
  }

  private extractColors(message: string): string[] {
    return COLOR_KEYWORDS.filter((color) => message.includes(color));
  }

  private extractStyleAvoidances(message: string): string[] {
    const avoidances: string[] = [];

    if (message.includes("不要太甜") || message.includes("别太甜")) {
      avoidances.push("甜美");
    }
    if (message.includes("不要太正式") || message.includes("别太正式")) {
      avoidances.push("正式");
    }
    if (message.includes("不要太成熟") || message.includes("别太成熟")) {
      avoidances.push("成熟");
    }

    return avoidances;
  }

  private extractBudget(message: string): {
    min?: number;
    max?: number;
  } {
    const rangeMatch = message.match(/(\d{2,5})\s*(?:-|~|到|至)\s*(\d{2,5})/);
    if (rangeMatch) {
      const min = Number(rangeMatch[1]);
      const max = Number(rangeMatch[2]);
      return {
        min: Math.min(min, max),
        max: Math.max(min, max),
      };
    }

    const underMatch = message.match(
      /(\d{2,5})\s*(?:元|块|rmb)?\s*(?:以内|以下)/i,
    );
    if (underMatch) {
      return { max: Number(underMatch[1]) };
    }

    const aroundMatch = message.match(
      /(\d{2,5})\s*(?:元|块|rmb)?\s*(?:左右|上下)/i,
    );
    if (aroundMatch) {
      const center = Number(aroundMatch[1]);
      return {
        min: Math.max(center - 200, 0),
        max: center + 200,
      };
    }

    return {};
  }

  private mergeSlots(
    current: StylistSlots,
    updates: Partial<StylistSlots>,
  ): void {
    if (updates.occasion) {
      current.occasion = updates.occasion;
    }
    if (updates.weather) {
      current.weather = updates.weather;
    }
    if (updates.budgetMin !== undefined) {
      current.budgetMin = updates.budgetMin;
    }
    if (updates.budgetMax !== undefined) {
      current.budgetMax = updates.budgetMax;
    }
    if (updates.preferredStyles?.length) {
      current.preferredStyles = this.deduplicateStrings([
        ...current.preferredStyles,
        ...updates.preferredStyles,
      ]);
    }
    if (updates.styleAvoidances?.length) {
      current.styleAvoidances = this.deduplicateStrings([
        ...current.styleAvoidances,
        ...updates.styleAvoidances,
      ]);
    }
    if (updates.fitGoals?.length) {
      current.fitGoals = this.deduplicateStrings([
        ...current.fitGoals,
        ...updates.fitGoals,
      ]);
    }
    if (updates.preferredColors?.length) {
      current.preferredColors = this.deduplicateStrings([
        ...current.preferredColors,
        ...updates.preferredColors,
      ]);
    }
  }

  private async composeAssistantMessage(
    session: StylistSession,
    nextAction: StylistAction,
    slotUpdates: Partial<StylistSlots>,
    missingFields: string[],
    stage: string,
  ): Promise<{ message: string; isFallback: boolean }> {
    const fallbackMessage = this.buildTemplateMessage(session, nextAction);

    // Use the injected LlmProviderService (which has multi-provider failover)
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

  private buildTemplateMessage(
    session: StylistSession,
    nextAction: StylistAction,
  ): string {
    const occasionName = this.getOccasionName(session.state.slots.occasion);
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

  private async generateOutfitResult(
    userId: string,
    session: StylistSession,
  ): Promise<StylistResolution> {
    const prompt = this.buildRecommendationPrompt(session);
    const userProfile = {
      bodyType: session.state.bodyProfile.bodyType,
      skinTone: session.state.bodyProfile.skinTone,
      colorSeason: session.state.bodyProfile.colorSeason,
      height: session.state.bodyProfile.height,
      weight: session.state.bodyProfile.weight,
      stylePreferences: session.state.slots.preferredStyles,
    };

    const outfits: StylistOutfitPlan[] = [];
    const mlOutfit = await this.buildMlOutfit(prompt, userProfile, session);
    if (mlOutfit.items.length > 0) {
      outfits.push(mlOutfit);
    }

    const localRecommendationsResult =
      await this.recommendationsService.getPersonalizedRecommendations(userId, {
        occasion: session.state.slots.occasion,
        limit: 10,
      });
    const fallbackOutfit = this.buildFallbackOutfit(localRecommendationsResult);
    if (fallbackOutfit.items.length > 0) {
      outfits.push(fallbackOutfit);
    }

    const uniqueOutfits = outfits.filter(
      (outfit, index) =>
        outfit.items.length > 0 &&
        outfits.findIndex(
          (candidate) =>
            candidate.items.map((item) => item.itemId).join(",") ===
            outfit.items.map((item) => item.itemId).join(","),
        ) === index,
    );

    // Use DecisionEngine scoring to rank outfits
    const rankedOutfits = await this.rankOutfitsWithDecisionEngine(
      userId,
      session,
      uniqueOutfits,
    );

    return {
      lookSummary: this.buildLookSummary(session),
      whyItFits: this.buildWhyItFits(session),
      outfits: rankedOutfits.slice(0, 3),
    };
  }

  /**
   * Rank outfits using DecisionEngineService's scoring algorithms.
   * Computes fit, style, and preference scores for each outfit and sorts by composite.
   */
  private async rankOutfitsWithDecisionEngine(
    userId: string,
    session: StylistSession,
    outfits: StylistOutfitPlan[],
  ): Promise<StylistOutfitPlan[]> {
    if (outfits.length <= 1) {
      return outfits;
    }

    try {
      const decisionContext: DecisionContext = {
        occasion: session.state.slots.occasion,
        weather: session.state.slots.weather,
        budgetMin: session.state.slots.budgetMin,
        budgetMax: session.state.slots.budgetMax,
        preferredStyles: session.state.slots.preferredStyles,
        styleAvoidances: session.state.slots.styleAvoidances,
        fitGoals: session.state.slots.fitGoals,
        preferredColors: session.state.slots.preferredColors,
      };

      const decisionProfile = await this.decisionEngineService.getUserProfile(userId);

      const scoredOutfits = outfits.map((outfit) => {
        const itemScores = outfit.items.map((item) => {
          const styleScore = this.computeItemStyleScore(item, decisionContext);
          const preferenceScore = this.computeItemPreferenceScore(item, decisionProfile);
          return {
            styleScore,
            preferenceScore,
          };
        });

        const avgStyleScore = itemScores.length > 0
          ? itemScores.reduce((sum, s) => sum + s.styleScore, 0) / itemScores.length
          : 50;
        const avgPreferenceScore = itemScores.length > 0
          ? itemScores.reduce((sum, s) => sum + s.preferenceScore, 0) / itemScores.length
          : 50;

        // Apply DecisionEngine composite formula: style * 0.3 + preference * 0.4 + existing_score * 0.3
        const existingAvgScore = outfit.items
          .filter((item) => typeof item.score === "number")
          .reduce((sum, item) => sum + (item.score ?? 0), 0) /
          Math.max(outfit.items.filter((item) => typeof item.score === "number").length, 1) * 100;

        const compositeScore = avgStyleScore * 0.3 + avgPreferenceScore * 0.4 + existingAvgScore * 0.3;

        return { outfit, compositeScore };
      });

      scoredOutfits.sort((a, b) => b.compositeScore - a.compositeScore);

      // Propagate scores to individual items
      for (const { outfit, compositeScore } of scoredOutfits) {
        for (const item of outfit.items) {
          if (item.score === undefined) {
            item.score = compositeScore / 100;
          }
        }
      }

      return scoredOutfits.map((s) => s.outfit);
    } catch (error) {
      this.logger.warn(
        `DecisionEngine ranking failed, using original order: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return outfits;
    }
  }

  private computeItemStyleScore(
    item: StylistOutfitItem,
    context: DecisionContext,
  ): number {
    let score = 50;
    const nameLower = item.name.toLowerCase();
    const reasonLower = item.reason.toLowerCase();

    if (context.preferredStyles.length > 0) {
      const isPreferred = context.preferredStyles.some(
        (style) =>
          nameLower.includes(style.toLowerCase()) ||
          reasonLower.includes(style.toLowerCase()),
      );
      if (isPreferred) { score += 30; }
    }

    if (context.styleAvoidances.length > 0) {
      const isAvoided = context.styleAvoidances.some(
        (avoid) =>
          nameLower.includes(avoid.toLowerCase()) ||
          reasonLower.includes(avoid.toLowerCase()),
      );
      if (isAvoided) { score -= 40; }
    }

    if (context.occasion) {
      const occasionKeywords: Record<string, string[]> = {
        interview: ["正式", "专业", "利落", "通勤"],
        work: ["通勤", "职场", "简约", "干练"],
        date: ["约会", "优雅", "浪漫", "温柔"],
        travel: ["舒适", "休闲", "轻便"],
        party: ["派对", "潮流", "个性"],
        daily: ["日常", "舒适", "百搭"],
        campus: ["校园", "青春", "休闲"],
      };
      const keywords = occasionKeywords[context.occasion] || [];
      const matchesKeyword = keywords.some((kw) =>
        nameLower.includes(kw) || reasonLower.includes(kw),
      );
      if (matchesKeyword) { score += 15; }
    }

    return Math.max(0, Math.min(100, score));
  }

  private computeItemPreferenceScore(
    item: StylistOutfitItem,
    profile: UserProfile,
  ): number {
    let score = 50;
    const nameLower = item.name.toLowerCase();

    if (profile.stylePreferences.length > 0) {
      const matchesPreference = profile.stylePreferences.some(
        (pref) => nameLower.includes(pref.toLowerCase()),
      );
      if (matchesPreference) { score += 20; }
    }

    if (profile.colorPreferences.length > 0) {
      const matchesColor = profile.colorPreferences.some(
        (color) => nameLower.includes(color.toLowerCase()),
      );
      if (matchesColor) { score += 25; }
    }

    return Math.max(0, Math.min(100, score));
  }

  async generateDynamicStyleOptions(): Promise<
    Array<{ id: string; label: string }>
  > {
    const fallbackOptions = [
      { id: "minimalist", label: "极简风" },
      { id: "korean", label: "韩系" },
      { id: "french", label: "法式" },
      { id: "streetwear", label: "街头" },
      { id: "vintage", label: "复古" },
    ];

    if (!this.llmProvider.isConfigured) {
      return fallbackOptions;
    }

    try {
      const response = await this.llmProvider.chat({
        messages: [
          { role: "user", content: DYNAMIC_STYLE_PROMPT },
        ],
        maxTokens: 500,
        temperature: 0.5,
        requestId: `dynamic-styles-${Date.now()}`,
      });

      const content = response.content?.trim();
      if (!content) {
        throw new Error("Empty response");
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found");
      }

      const options = JSON.parse(jsonMatch[0]);
      if (Array.isArray(options) && options.length > 0) {
        return options.slice(0, 6);
      }

      throw new Error("Invalid options format");
    } catch (error) {
      this.logger.warn(`Failed to generate dynamic style options: ${error}`);
      return fallbackOptions;
    }
  }

  async generateDynamicOccasionOptions(): Promise<
    Array<{ id: string; label: string }>
  > {
    const fallbackOptions = [
      { id: "work", label: "通勤" },
      { id: "date", label: "约会" },
      { id: "interview", label: "面试" },
      { id: "travel", label: "出游" },
      { id: "party", label: "聚会" },
    ];

    if (!this.llmProvider.isConfigured) {
      return fallbackOptions;
    }

    try {
      const response = await this.llmProvider.chat({
        messages: [
          { role: "user", content: DYNAMIC_OCCASION_PROMPT },
        ],
        maxTokens: 500,
        temperature: 0.5,
        requestId: `dynamic-occasions-${Date.now()}`,
      });

      const content = response.content?.trim();
      if (!content) {
        throw new Error("Empty response");
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found");
      }

      const options = JSON.parse(jsonMatch[0]);
      if (Array.isArray(options) && options.length > 0) {
        return options.slice(0, 6);
      }

      throw new Error("Invalid options format");
    } catch (error) {
      this.logger.warn(`Failed to generate dynamic occasion options: ${error}`);
      return fallbackOptions;
    }
  }

  private async buildMlOutfit(
    prompt: string,
    userProfile: Record<string, unknown>,
    session: StylistSession,
  ): Promise<StylistOutfitPlan> {
    try {
      const mlResult =
        await this.styleUnderstandingService.getOutfitRecommendation(prompt, {
          userProfile,
          occasion: session.state.slots.occasion,
        });

      const itemIds = (mlResult.items || [])
        .map((item) => item.item_id)
        .filter((itemId): itemId is string => Boolean(itemId));
      const dbItems = itemIds.length
        ? await this.prisma.clothingItem.findMany({
            where: { id: { in: itemIds } },
            select: {
              id: true,
              name: true,
              category: true,
              mainImage: true,
              images: true,
              price: true,
              externalUrl: true,
              brand: {
                select: {
                  name: true,
                },
              },
            },
          })
        : [];
      const dbItemMap = new Map(dbItems.map((item) => [item.id, item]));

      const items: StylistOutfitItem[] = (mlResult.items || []).map(
        (item: { item_id?: string; category?: string; reasons?: string[]; price?: number; brand?: string; score?: number }) => {
          const dbItem = item.item_id ? dbItemMap.get(item.item_id) : null;
          return {
            itemId: item.item_id,
            category: dbItem?.category || item.category || "unknown",
            name: dbItem?.name || item.item_id || "推荐单品",
            reason: item.reasons?.[0] || "符合你的场景和风格需求",
            imageUrl: dbItem?.mainImage || dbItem?.images?.[0],
            externalUrl: dbItem?.externalUrl || null,
            price:
              typeof dbItem?.price === "number"
                ? dbItem.price
                : typeof item.price === "number"
                  ? item.price
                  : null,
            brand: dbItem?.brand?.name || item.brand || null,
            score: typeof item.score === "number" ? item.score : undefined,
          };
        },
      );

      return {
        title: "AI 主方案",
        items,
        styleExplanation: this.deduplicateStrings(
          items.map((item) => item.reason).slice(0, 3),
        ),
        estimatedTotalPrice: this.sumItemPrices(items),
      };
    } catch (error) {
      this.logger.warn(
        `ML outfit generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        title: "AI 主方案",
        items: [],
        styleExplanation: [],
      };
    }
  }

  private buildFallbackOutfit(
    recommendations: RecommendedItem[],
  ): StylistOutfitPlan {
    const categories = new Set<string>();
    const items: StylistOutfitItem[] = [];

    for (const recommendation of recommendations) {
      // Extract clothing item from recommendation
      const clothingItem = recommendation.item;
      if (!clothingItem) {
        continue;
      }

      const category = clothingItem.category || "unknown";
      if (categories.has(category)) {
        continue;
      }
      categories.add(category);

      items.push({
        itemId: clothingItem.id,
        category,
        name: clothingItem.name || "推荐单品",
        reason: recommendation.matchReasons?.[0] || "适合你的档案与场景",
        imageUrl: clothingItem.images?.[0],
        externalUrl: null,
        price:
          typeof clothingItem.price === "number"
            ? clothingItem.price
            : Number(clothingItem.price),
        brand: clothingItem.brand?.name || null,
        score: recommendation.score,
      });

      if (items.length >= 4) {
        break;
      }
    }

    return {
      title: "基础备选方案",
      items,
      styleExplanation: this.deduplicateStrings(
        items.map((item) => item.reason).slice(0, 3),
      ),
      estimatedTotalPrice: this.sumItemPrices(items),
    };
  }

  private buildRecommendationPrompt(session: StylistSession): string {
    const parts = [
      session.state.slots.occasion
        ? `场景：${this.getOccasionName(session.state.slots.occasion)}`
        : "",
      session.state.slots.preferredStyles.length
        ? `偏好风格：${session.state.slots.preferredStyles.join("、")}`
        : "",
      session.state.slots.fitGoals.length
        ? `目标：${session.state.slots.fitGoals.join("、")}`
        : "",
      session.state.slots.budgetMax
        ? `预算：${session.state.slots.budgetMax}元以内`
        : "",
      session.state.bodyProfile.bodyType
        ? `体型：${this.getBodyTypeName(session.state.bodyProfile.bodyType)}`
        : "",
      session.state.bodyProfile.colorSeason
        ? `色彩季型：${this.getColorSeasonName(
            session.state.bodyProfile.colorSeason,
          )}`
        : "",
    ].filter(Boolean);

    return parts.join("；");
  }

  private buildLookSummary(session: StylistSession): string {
    const style = session.state.slots.preferredStyles[0] || "轻量通勤";
    const occasion =
      this.getOccasionName(session.state.slots.occasion) || "日常";
    const goal =
      session.state.slots.fitGoals.length > 0
        ? session.state.slots.fitGoals.join("、")
        : "兼顾舒适与表达";
    return `${style}取向的${occasion}穿搭方案，重点围绕${goal}来组织版型与配色。`;
  }

  private buildWhyItFits(session: StylistSession): string[] {
    const reasons: string[] = [];

    if (session.state.slots.occasion) {
      reasons.push(
        `场景优先按${this.getOccasionName(session.state.slots.occasion)}来控制正式度和单品噪点。`,
      );
    }
    if (session.state.slots.fitGoals.length > 0) {
      reasons.push(
        `这次重点满足 ${session.state.slots.fitGoals.join("、")} 的诉求。`,
      );
    }
    if (session.state.bodyProfile.bodyType) {
      reasons.push(
        `版型选择参考了你的${this.getBodyTypeName(
          session.state.bodyProfile.bodyType,
        )}特征。`,
      );
    }
    if (session.state.bodyProfile.colorSeason) {
      reasons.push(
        `配色优先贴合${this.getColorSeasonName(
          session.state.bodyProfile.colorSeason,
        )}的友好色域。`,
      );
    }

    return reasons.slice(0, 4);
  }

  private async syncPhotoAnalysis(session: StylistSession): Promise<void> {
    if (!session.state.lastPhotoId) {
      return;
    }

    // 使用 findFirst 而不是 findUnique，因为需要验证 userId
    const photo = await this.prisma.userPhoto.findFirst({
      where: {
        id: session.state.lastPhotoId,
        userId: session.userId,
      },
      select: {
        analysisStatus: true,
        analysisResult: true,
      },
    });

    if (!photo) {
      return;
    }

    session.state.lastPhotoStatus = photo.analysisStatus;
    if (
      photo.analysisStatus === "completed" &&
      photo.analysisResult &&
      typeof photo.analysisResult === "object"
    ) {
      const analysisResult = photo.analysisResult as Record<string, unknown>;
      session.state.bodyProfile = {
        ...session.state.bodyProfile,
        bodyType:
          typeof analysisResult.bodyType === "string"
            ? analysisResult.bodyType
            : session.state.bodyProfile.bodyType,
        skinTone:
          typeof analysisResult.skinTone === "string"
            ? analysisResult.skinTone
            : session.state.bodyProfile.skinTone,
        faceShape:
          typeof analysisResult.faceShape === "string"
            ? analysisResult.faceShape
            : session.state.bodyProfile.faceShape,
        colorSeason:
          typeof analysisResult.colorSeason === "string"
            ? analysisResult.colorSeason
            : session.state.bodyProfile.colorSeason,
        shapeFeatures: this.deduplicateStrings([
          ...session.state.bodyProfile.shapeFeatures,
          ...(typeof analysisResult.bodyType === "string"
            ? [analysisResult.bodyType]
            : []),
        ]),
      };
      session.state.bodyReady = this.hasBodyProfile(session.state.bodyProfile);
      if (session.state.bodyReady) {
        session.state.currentStage = "ready_to_resolve";
      }
    }
  }

  private buildChatResult(
    session: StylistSession,
    assistantMessage: string,
    options: {
      nextAction?: StylistAction;
      slotUpdates?: Partial<StylistSlots>;
      missingFields?: string[];
      previewRecommendations?: StylistOutfitItem[];
      result?: StylistResolution;
      photoId?: string;
      analysisStatus?: string;
      isFallback?: boolean;
    } = {},
  ): ChatResult {
    const progress = this.buildProgress(
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
        new Date(session.updatedAt).getTime() + this.sessionTtlMs,
      ).toISOString(),
      isFallback: options.isFallback,
      isAIGenerated: true,
      aiDisclaimer: "本内容由AI生成，仅供参考，不构成专业建议。",
    };
  }

  private buildProgress(
    session: StylistSession,
    nextAction?: StylistAction,
    analysisStatus?: string,
    result?: StylistResolution,
  ): StylistProgress {
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

  private async getSessionOrThrow(
    userId: string,
    sessionId: string,
  ): Promise<StylistSession> {
    await this.cleanupExpiredSessions();
    const key = this.getSessionKey(userId, sessionId);
    const cachedSession = this.sessionStore.get(key);

    if (cachedSession) {
      return cachedSession;
    }

    const storedSession = await this.loadPersistedSession(userId, sessionId);
    if (!storedSession) {
      throw new NotFoundException("AI 造型师会话不存在或已过期");
    }

    this.sessionStore.set(key, storedSession);
    return storedSession;
  }

  private async persistSession(session: StylistSession): Promise<void> {
    await this.cleanupExpiredSessions();
    session.updatedAt = new Date().toISOString();
    session.conversationHistory = session.conversationHistory.slice(
      -this.maxSessionMessages,
    );
    const key = this.getSessionKey(session.userId, session.id);

    // Primary storage: Database (single source of truth)
    // Write to database first to ensure data durability
    await this.writeSessionRecord(
      session,
      new Date(Date.now() + this.sessionTtlMs),
    );

    // Secondary storage: Redis cache (write-through)
    // If Redis fails, session is still persisted in database
    if (this.useRedis) {
      try {
        const redisKey = `stylist:session:${key}`;
        await this.redisService.setex(
          redisKey,
          Math.floor(this.sessionTtlMs / 1000),
          JSON.stringify(session),
        );
      } catch (error) {
        this.logger.warn(`Redis session persist failed, falling back to DB-only: ${error}`);
      }
    }

    // Tertiary: Local memory cache (LRU eviction)
    this.updateSessionAccessOrder(key);
    while (this.sessionStore.size >= this.maxMemorySessions) {
      const lruKey = this.sessionAccessOrder.shift();
      if (lruKey) {
        this.sessionStore.delete(lruKey);
        this.logger.debug(`Evicted LRU session from memory: ${lruKey}`);
      } else {
        break;
      }
    }
    this.sessionStore.set(key, session);
  }

  private updateSessionAccessOrder(key: string): void {
    const existingIndex = this.sessionAccessOrder.indexOf(key);
    if (existingIndex > -1) {
      this.sessionAccessOrder.splice(existingIndex, 1);
    }
    this.sessionAccessOrder.push(key);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    for (const [key, session] of this.sessionStore.entries()) {
      if (now - new Date(session.updatedAt).getTime() > this.sessionTtlMs) {
        this.sessionStore.delete(key);
      }
    }

    if (now - this.lastStoreCleanupAt < this.sessionCleanupThrottleMs) {
      return;
    }

    this.lastStoreCleanupAt = now;
    await this.deleteExpiredSessionRecords(new Date(now - this.sessionTtlMs));
  }

  private getSessionKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }

  private getSessionConfigKey(userId: string, sessionId: string): string {
    return `${this.sessionConfigPrefix}${this.getSessionKey(userId, sessionId)}`;
  }

  private async loadPersistedSession(
    userId: string,
    sessionId: string,
  ): Promise<StylistSession | null> {
    const key = this.getSessionKey(userId, sessionId);

    if (this.useRedis) {
      try {
        const redisKey = `stylist:session:${key}`;
        const cached = await this.redisService.get(redisKey);
        if (cached) {
          const session = JSON.parse(cached) as StylistSession;
          if (!this.isSessionExpired(session.updatedAt)) {
            this.sessionStore.set(key, session);
            return session;
          }
        }
      } catch (error) {
        this.logger.warn(`Redis session load failed: ${error}`);
      }
    }

    return this.readSessionRecord(userId, sessionId);
  }

  private isSessionExpired(updatedAt: string): boolean {
    return Date.now() - new Date(updatedAt).getTime() > this.sessionTtlMs;
  }

  private async writeSessionRecord(
    session: StylistSession,
    expiresAt: Date,
  ): Promise<void> {
    try {
      // Convert StylistSession to Prisma JsonValue for database storage
      const sessionPayload = session as unknown as Prisma.InputJsonValue;
      
      await this.prisma.aiStylistSession.upsert({
        where: { id: session.id },
        update: {
          userId: session.userId,
          payload: sessionPayload,
          expiresAt,
        },
        create: {
          id: session.id,
          userId: session.userId,
          payload: sessionPayload,
          expiresAt,
        },
      });
      return;
    } catch (error: unknown) {
      this.logger.warn(
        `AiStylistSession 表写入失败，回退 SystemConfig: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.prisma.systemConfig.upsert({
      where: {
        key: this.getSessionConfigKey(session.userId, session.id),
      },
      update: {
        value: JSON.stringify(session),
      },
      create: {
        key: this.getSessionConfigKey(session.userId, session.id),
        value: JSON.stringify(session),
      },
    });
  }

  private async deleteExpiredSessionRecords(
    expiredBefore: Date,
  ): Promise<void> {
    try {
      await this.prisma.aiStylistSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      return;
    } catch (error: unknown) {
      this.logger.warn(
        `AiStylistSession 过期清理失败，回退 SystemConfig: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.prisma.systemConfig.deleteMany({
      where: {
        key: { startsWith: this.sessionConfigPrefix },
        updatedAt: {
          lt: expiredBefore,
        },
      },
    });
  }

  private async readSessionRecord(
    userId: string,
    sessionId: string,
  ): Promise<StylistSession | null> {
    try {
      const record = await this.prisma.aiStylistSession.findUnique({
        where: { id: sessionId },
      });

      if (record) {
        if (record.userId !== userId || record.expiresAt < new Date()) {
          await this.prisma.aiStylistSession.delete({
            where: { id: sessionId },
          });
          return null;
        }

        return record.payload as unknown as StylistSession;
      }
    } catch (error: unknown) {
      this.logger.warn(
        `AiStylistSession 表读取失败，回退 SystemConfig: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const record = await this.prisma.systemConfig.findUnique({
      where: {
        key: this.getSessionConfigKey(userId, sessionId),
      },
    });

    if (!record?.value) {
      return null;
    }

    try {
      const session = JSON.parse(record.value) as StylistSession;
      if (
        session.userId !== userId ||
        session.id !== sessionId ||
        this.isSessionExpired(session.updatedAt)
      ) {
        await this.prisma.systemConfig.delete({
          where: {
            key: this.getSessionConfigKey(userId, sessionId),
          },
        });
        return null;
      }

      return session;
    } catch (error: unknown) {
      this.logger.warn(
        `AI 造型师会话反序列化失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.prisma.systemConfig.delete({
        where: {
          key: this.getSessionConfigKey(userId, sessionId),
        },
      });
      return null;
    }
  }

  private hasBodyProfile(profile?: StylistBodyProfile | null): boolean {
    return Boolean(
      profile?.bodyType || profile?.colorSeason || profile?.skinTone,
    );
  }

  private isPhotoSkipMessage(message: string): boolean {
    return (
      message.includes("跳过") ||
      message.includes("先不要拍") ||
      message.includes("直接推荐")
    );
  }

  private deduplicateStrings(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }

  private sumItemPrices(items: StylistOutfitItem[]): number | undefined {
    const pricedItems = items.filter(
      (item): item is StylistOutfitItem & { price: number } =>
        typeof item.price === "number",
    );

    if (pricedItems.length === 0) {
      return undefined;
    }

    return pricedItems.reduce((sum, item) => sum + item.price, 0);
  }

  private normalizeOccasion(value: string): string {
    return this.extractOccasion(value) || value;
  }

  private normalizeStyle(value: string): string | undefined {
    const normalized = value.trim().toLowerCase();
    const styleMap: Record<string, string> = {
      极简: "极简",
      minimalist: "极简",
      casual: "休闲",
      smart_casual: "轻正式",
      韩系: "韩系",
      korean: "韩系",
      法式: "法式",
      french: "法式",
      streetwear: "街头",
      运动: "运动",
      sporty: "运动",
    };

    return styleMap[value] || styleMap[normalized] || value.trim() || undefined;
  }

  private getOccasionName(occasion?: string): string {
    const names: Record<string, string> = {
      interview: "面试",
      work: "通勤",
      date: "约会",
      travel: "出游",
      party: "聚会",
      daily: "日常",
      campus: "校园",
    };
    return occasion ? names[occasion] || occasion : "";
  }

  private async buildUserContext(userId: string): Promise<StylistContextInternal> {
    // 并行查询用户画像、偏好权重、最近行为，避免串行查询
    const [profile, preferences, recentBehaviors] = await Promise.all([
      this.prisma.userProfile
        .findUnique({
          where: { userId },
          select: {
            bodyType: true,
            skinTone: true,
            faceShape: true,
            colorSeason: true,
            height: true,
            weight: true,
            stylePreferences: true,
          },
        })
        .catch(() => null),
      this.prisma.userPreferenceWeight
        .findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: {
            category: true,
            key: true,
            weight: true,
          },
        })
        .catch(() => []),
      this.prisma.userBehaviorEvent
        .findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
            eventType: true,
            metadata: true,
          },
        })
        .catch(() => []),
    ]);

    return {
      userProfile: profile
        ? {
            bodyType: profile.bodyType ?? undefined,
            skinTone: profile.skinTone ?? undefined,
            faceShape: profile.faceShape ?? undefined,
            colorSeason: profile.colorSeason ?? undefined,
            height: profile.height ?? undefined,
            weight: profile.weight ?? undefined,
            stylePreferences: Array.isArray(profile.stylePreferences)
              ? (profile.stylePreferences as Array<{ name?: string } | string>)
              : undefined,
          }
        : null,
      preferences: (preferences as Array<{
        category: string | null;
        key: string | null;
        weight: number;
      }>).reduce(
        (acc: Record<string, Record<string, number>>, preference) => {
          const category = preference.category;
          const key = preference.key;
          if (!category || !key) {
            return acc;
          }
          if (!acc[category]) {
            acc[category] = {};
          }
          const bucket = acc[category];
          if (!bucket) {
            return acc;
          }
          bucket[key] = preference.weight;
          return acc;
        },
        {} as Record<string, Record<string, number>>,
      ),
      recentBehaviors: recentBehaviors.map(
        (behavior: { eventType: string; metadata: unknown }) => ({
          type: behavior.eventType,
          data: behavior.metadata,
        }),
      ),
    };
  }

  private getBodyTypeName(type: string): string {
    const names: Record<string, string> = {
      rectangle: "H 型体型",
      triangle: "A 型体型",
      inverted_triangle: "Y 型体型",
      hourglass: "X 型体型",
      oval: "O 型体型",
    };
    return names[type] || type;
  }

  private getColorSeasonName(season: string): string {
    const names: Record<string, string> = {
      spring: "春季型",
      summer: "夏季型",
      autumn: "秋季型",
      winter: "冬季型",
    };
    return names[season] || season;
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
    await this.cleanupExpiredSessions();

    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;

    const records = await this.prisma.aiStylistSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        payload: true,
        updatedAt: true,
      },
    });

    const total = await this.prisma.aiStylistSession.count({
      where: { userId },
    });

    const sessions = records
      .map((record) => {
        try {
          const session = record.payload as unknown as StylistSession;
          return {
            id: session.id,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            state: session.state,
            result: session.result,
          };
        } catch (error) {
          this.logger.warn(
            `Failed to parse session record ${record.id}: ${error instanceof Error ? error.message : String(error)}. Record will be skipped.`,
          );
          return null;
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return { sessions, total };
  }

  async deleteSession(
    userId: string,
    sessionId: string,
  ): Promise<{ success: boolean }> {
    const key = this.getSessionKey(userId, sessionId);
    this.sessionStore.delete(key);

    try {
      await this.prisma.aiStylistSession.delete({
        where: { id: sessionId },
      });
    } catch (primaryError) {
      this.logger.warn(
        `Failed to delete AI stylist session from primary table: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. Attempting fallback deletion.`,
      );
      try {
        await this.prisma.systemConfig.delete({
          where: { key: this.getSessionConfigKey(userId, sessionId) },
        });
      } catch (fallbackError) {
        this.logger.error(
          `Failed to delete session config from fallback table: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}. Session cleanup may be incomplete for userId=${userId}, sessionId=${sessionId}`,
        );
      }
    }

    return { success: true };
  }

  async submitFeedback(
    userId: string,
    sessionId: string,
    outfitIndex: number,
    action: "like" | "dislike",
    itemId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.loadPersistedSession(userId, sessionId);
    if (!session) {
      throw new NotFoundException("会话不存在");
    }

    if (!session.result?.outfits[outfitIndex]) {
      throw new NotFoundException("穿搭方案不存在");
    }

    const outfit = session.result.outfits[outfitIndex];
    const weight = action === "like" ? 1.0 : -0.5;

    const feedbackItems = itemId
      ? outfit.items.filter((item) => item.itemId === itemId)
      : outfit.items;

    for (const item of feedbackItems) {
      if (item.itemId) {
        await this.prisma.rankingFeedback.create({
          data: {
            userId,
            itemId: item.itemId,
            action,
            weight,
          },
        });
      }
    }

    if (!session.feedback) {
      session.feedback = { likes: [], dislikes: [] };
    }
    if (action === "like") {
      session.feedback.likes.push({
        outfitIndex,
        itemId,
        timestamp: new Date().toISOString(),
      });
    } else {
      session.feedback.dislikes.push({
        outfitIndex,
        itemId,
        timestamp: new Date().toISOString(),
      });
    }

    await this.persistSession(session);

    return {
      success: true,
      message:
        action === "like" ? "感谢你的喜欢！" : "收到反馈，我会继续改进！",
    };
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
    const session = await this.loadPersistedSession(userId, sessionId);
    if (!session) {
      throw new NotFoundException("会话不存在");
    }

    return session.feedback || { likes: [], dislikes: [] };
  }
}
