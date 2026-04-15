import { Injectable, NotFoundException, Logger } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { StyleUnderstandingService } from "../../ai/services/style-understanding.service";
import {
  RecommendationsService,
  type RecommendedItem,
} from "../../recommendations/recommendations.service";
import { DecisionEngineService } from "../decision-engine.service";
import { LlmProviderService } from "../llm-provider.service";
import type {
  StylistResolution,
  StylistOutfitPlan,
  StylistOutfitItem,
  ChatResult,
  DecisionContext,
  UserProfile,
} from "../types";

import { AiStylistContextService } from "./context.service";
import { AiStylistSessionService } from "./session.service";
import type { StylistSession } from "./session.service";

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

@Injectable()
export class AiStylistRecommendationService {
  private readonly logger = new Logger(AiStylistRecommendationService.name);

  constructor(
    private sessionService: AiStylistSessionService,
    private contextService: AiStylistContextService,
    private prisma: PrismaService,
    private recommendationsService: RecommendationsService,
    private styleUnderstandingService: StyleUnderstandingService,
    private decisionEngineService: DecisionEngineService,
    private llmProvider: LlmProviderService,
  ) {}

  async resolveSession(
    userId: string,
    sessionId: string,
    deriveOrchestrationFn: (session: StylistSession) => { nextAction: import("../types").StylistAction; missingFields: string[] },
    composeAssistantMessageFn: (
      session: StylistSession,
      nextAction: import("../types").StylistAction,
      slotUpdates: Partial<import("../types").StylistSlots>,
      missingFields: string[],
      stage: string,
    ) => Promise<{ message: string; isFallback: boolean }>,
    buildChatResultFn: (
      session: StylistSession,
      assistantMessage: string,
      options?: Record<string, unknown>,
    ) => ChatResult,
  ): Promise<ChatResult> {
    const session = await this.sessionService.getSessionOrThrow(userId, sessionId);
    await this.contextService.syncPhotoAnalysis(session);

    const orchestration = deriveOrchestrationFn(session);
    if (orchestration.nextAction.type === "poll_analysis") {
      return buildChatResultFn(
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
      const { message, isFallback } = await composeAssistantMessageFn(
        session,
        orchestration.nextAction,
        {},
        orchestration.missingFields,
        "resolve_guard",
      );
      await this.sessionService.persistSession(session);
      return buildChatResultFn(session, message, {
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
    await this.sessionService.persistSession(session);

    return buildChatResultFn(session, assistantMessage, {
      nextAction: { type: "show_outfit_cards" },
      missingFields: [],
      result,
      previewRecommendations: result.outfits.flatMap((outfit) =>
        outfit.items.slice(0, 2),
      ),
    });
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
    const session = await this.sessionService.loadPersistedSession(userId, sessionId);
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

    const feedbackEntry: Record<string, unknown> = {
      outfitIndex,
      itemId,
      timestamp: new Date().toISOString(),
    };
    if (rating !== undefined) {
      feedbackEntry.rating = rating;
    }
    if (dislikeReason) {
      feedbackEntry.dislikeReason = dislikeReason;
    }
    if (dislikeDetail) {
      feedbackEntry.dislikeDetail = dislikeDetail;
    }

    if (action === "like") {
      session.feedback.likes.push(feedbackEntry as typeof session.feedback.likes[number]);
    } else {
      session.feedback.dislikes.push(feedbackEntry as typeof session.feedback.dislikes[number]);
    }

    await this.sessionService.persistSession(session);

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
    const session = await this.sessionService.loadPersistedSession(userId, sessionId);
    if (!session) {
      throw new NotFoundException("会话不存在");
    }

    return session.feedback || { likes: [], dislikes: [] };
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

        const existingAvgScore = outfit.items
          .filter((item) => typeof item.score === "number")
          .reduce((sum, item) => sum + (item.score ?? 0), 0) /
          Math.max(outfit.items.filter((item) => typeof item.score === "number").length, 1) * 100;

        const compositeScore = avgStyleScore * 0.3 + avgPreferenceScore * 0.4 + existingAvgScore * 0.3;

        return { outfit, compositeScore };
      });

      scoredOutfits.sort((a, b) => b.compositeScore - a.compositeScore);

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
        styleExplanation: this.contextService.deduplicateStrings(
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
      styleExplanation: this.contextService.deduplicateStrings(
        items.map((item) => item.reason).slice(0, 3),
      ),
      estimatedTotalPrice: this.sumItemPrices(items),
    };
  }

  private buildRecommendationPrompt(session: StylistSession): string {
    const parts = [
      session.state.slots.occasion
        ? `场景：${this.contextService.getOccasionName(session.state.slots.occasion)}`
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
        ? `体型：${this.contextService.getBodyTypeName(session.state.bodyProfile.bodyType)}`
        : "",
      session.state.bodyProfile.colorSeason
        ? `色彩季型：${this.contextService.getColorSeasonName(
            session.state.bodyProfile.colorSeason,
          )}`
        : "",
    ].filter(Boolean);

    return parts.join("；");
  }

  private buildLookSummary(session: StylistSession): string {
    const style = session.state.slots.preferredStyles[0] || "轻量通勤";
    const occasion =
      this.contextService.getOccasionName(session.state.slots.occasion) || "日常";
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
        `场景优先按${this.contextService.getOccasionName(session.state.slots.occasion)}来控制正式度和单品噪点。`,
      );
    }
    if (session.state.slots.fitGoals.length > 0) {
      reasons.push(
        `这次重点满足 ${session.state.slots.fitGoals.join("、")} 的诉求。`,
      );
    }
    if (session.state.bodyProfile.bodyType) {
      reasons.push(
        `版型选择参考了你的${this.contextService.getBodyTypeName(
          session.state.bodyProfile.bodyType,
        )}特征。`,
      );
    }
    if (session.state.bodyProfile.colorSeason) {
      reasons.push(
        `配色优先贴合${this.contextService.getColorSeasonName(
          session.state.bodyProfile.colorSeason,
        )}的友好色域。`,
      );
    }

    return reasons.slice(0, 4);
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
}
