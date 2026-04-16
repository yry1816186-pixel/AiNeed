/**
 * @fileoverview NL Slot Extractor Service - LLM-powered slot extraction.
 *
 * Uses the LLM provider to extract structured styling preferences from
 * natural language Chinese messages. Falls back to keyword-based extraction
 * when the LLM is unavailable.
 *
 * @module NlSlotExtractorService
 */

import { Injectable, Logger } from "@nestjs/common";

import { LlmProviderService } from "./llm-provider.service";
import { SLOT_EXTRACTION_PROMPT } from "./prompts/system-prompt";

// Import shared types
import {
  type ExtractedSlots,
  type ExtractionResult,
} from "./types";

/**
 * Valid values for slot fields.
 */
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

const VALID_COLORS = [
  "白色",
  "黑色",
  "灰色",
  "蓝色",
  "米色",
  "卡其",
  "粉色",
  "绿色",
  "酒红",
  "驼色",
  "焦糖",
  "藏青",
  "米白",
  "奶白",
];

/**
 * NL Slot Extractor Service
 *
 * Provides two extraction strategies:
 * 1. LLM-powered extraction (primary) - Uses the configured LLM to understand
 *    Chinese natural language and extract structured data
 * 2. Keyword-based extraction (fallback) - Uses regex patterns and keyword
 *    matching when LLM is unavailable
 *
 * @example
 * ```typescript
 * const result = await nlExtractor.extractFromMessage(
 *   "我要一套面试穿搭，极简风格，预算1000以内，想显高一点"
 * );
 * // result.slots = {
 * //   occasion: "interview",
 * //   preferredStyles: ["极简"],
 * //   fitGoals: ["显高"],
 * //   budgetMax: 1000,
 * // }
 * ```
 */
@Injectable()
export class NlSlotExtractorService {
  private readonly logger = new Logger(NlSlotExtractorService.name);

  constructor(private readonly llmProvider: LlmProviderService) {}

  /**
   * Extract structured slots from a user message using LLM.
   *
   * Falls back to keyword-based extraction if LLM is unavailable.
   */
  async extractFromMessage(
    message: string,
    existingSlots?: Partial<ExtractedSlots>,
  ): Promise<ExtractionResult> {
    if (!message?.trim()) {
      return {
        slots: {},
        rawResponse: null,
        usedLlm: false,
        confidence: 0,
      };
    }

    // Try LLM extraction first
    if (this.llmProvider.isConfigured) {
      try {
        const result = await this.extractWithLlm(message, existingSlots);
        if (result.confidence > 0.3) {
          return result;
        }

        this.logger.debug(
          `LLM extraction confidence too low (${result.confidence}), trying keyword fallback`,
        );
      } catch (error) {
        this.logger.warn(
          `LLM slot extraction failed, falling back to keywords: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Keyword fallback
    return this.extractWithKeywords(message);
  }

  /**
   * Extract slots using LLM.
   */
  private async extractWithLlm(
    message: string,
    existingSlots?: Partial<ExtractedSlots>,
  ): Promise<ExtractionResult> {
    const contextParts: string[] = [];
    if (existingSlots) {
      const nonEmpty = Object.entries(existingSlots)
        .filter(([, value]) => {
          if (Array.isArray(value)) {
            return value.length > 0;
          }
          return value !== null && value !== undefined;
        })
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);

      if (nonEmpty.length > 0) {
        contextParts.push(`之前已收集的信息：\n${nonEmpty.join("\n")}`);
      }
    }

    const userMessage = contextParts.length > 0
      ? `${contextParts.join("\n\n")}\n\n用户最新消息：${message}`
      : `用户消息：${message}`;

    const response = await this.llmProvider.chatStructured<ExtractedSlots>({
      messages: [
        { role: "system", content: SLOT_EXTRACTION_PROMPT },
        { role: "user", content: userMessage },
      ],
      maxTokens: 500,
      temperature: 0.1,
      requestId: `slot-extract-${Date.now()}`,
    });

    if (!response.parsed) {
      return {
        slots: {},
        rawResponse: response.raw.content,
        usedLlm: true,
        confidence: 0,
      };
    }

    const slots = this.validateAndNormalizeSlots(response.parsed as unknown as Record<string, unknown>);

    return {
      slots,
      rawResponse: response.raw.content,
      usedLlm: true,
      confidence: this.calculateConfidence(slots, message),
    };
  }

  /**
   * Extract slots using keyword matching (fallback).
   */
  private extractWithKeywords(message: string): ExtractionResult {
    const slots: Partial<ExtractedSlots> = {};

    const occasion = this.extractOccasion(message);
    if (occasion) {
      slots.occasion = occasion;
    }

    const styles = this.extractStyles(message);
    if (styles.length > 0) {
      slots.preferredStyles = styles;
    }

    const goals = this.extractFitGoals(message);
    if (goals.length > 0) {
      slots.fitGoals = goals;
    }

    const colors = this.extractColors(message);
    if (colors.length > 0) {
      slots.preferredColors = colors;
    }

    const budget = this.extractBudget(message);
    if (budget.max !== undefined) {
      slots.budgetMax = budget.max;
    }
    if (budget.min !== undefined) {
      slots.budgetMin = budget.min;
    }

    const avoidances = this.extractStyleAvoidances(message);
    if (avoidances.length > 0) {
      slots.styleAvoidances = avoidances;
    }

    slots.photoSkip = this.isPhotoSkipMessage(message);

    return {
      slots,
      rawResponse: null,
      usedLlm: false,
      confidence: this.calculateConfidence(slots, message),
    };
  }

  /**
   * Validate and normalize extracted slots against allowed values.
   */
  private validateAndNormalizeSlots(raw: Record<string, unknown>): Partial<ExtractedSlots> {
    const slots: Partial<ExtractedSlots> = {};

    // Validate occasion
    if (typeof raw.occasion === "string") {
      const normalizedOccasion = raw.occasion.toLowerCase().trim();
      if ((VALID_OCCASIONS as readonly string[]).includes(normalizedOccasion)) {
        slots.occasion = normalizedOccasion;
      }
    }

    // Validate preferred styles
    if (Array.isArray(raw.preferredStyles)) {
      slots.preferredStyles = raw.preferredStyles
        .filter((s: unknown) => typeof s === "string")
        .filter((s: string) => (VALID_STYLES as readonly string[]).includes(s));
    }

    // Validate fit goals
    if (Array.isArray(raw.fitGoals)) {
      slots.fitGoals = raw.fitGoals
        .filter((g: unknown) => typeof g === "string")
        .filter((g: string) => (VALID_FIT_GOALS as readonly string[]).includes(g));
    }

    // Validate colors (more lenient - accept any string)
    if (Array.isArray(raw.preferredColors)) {
      slots.preferredColors = raw.preferredColors
        .filter((c: unknown) => typeof c === "string" && c.trim().length > 0);
    }

    // Validate style avoidances
    if (Array.isArray(raw.styleAvoidances)) {
      slots.styleAvoidances = raw.styleAvoidances
        .filter((s: unknown) => typeof s === "string" && s.trim().length > 0);
    }

    // Validate budget
    if (typeof raw.budgetMax === "number" && raw.budgetMax > 0) {
      slots.budgetMax = raw.budgetMax;
    }
    if (typeof raw.budgetMin === "number" && raw.budgetMin > 0) {
      slots.budgetMin = raw.budgetMin;
    }

    // Validate weather
    if (typeof raw.weather === "string" && raw.weather.trim().length > 0) {
      slots.weather = raw.weather.trim();
    }

    // Validate photo skip
    if (typeof raw.photoSkip === "boolean") {
      slots.photoSkip = raw.photoSkip;
    }

    return slots;
  }

  /**
   * Calculate confidence score for extracted slots.
   */
  private calculateConfidence(
    slots: Partial<ExtractedSlots>,
    originalMessage: string,
  ): number {
    if (!originalMessage?.trim()) {
      return 0;
    }

    let score = 0;
    let maxScore = 0;

    // Message length factor (longer messages are more likely to contain useful info)
    const lengthFactor = Math.min(originalMessage.length / 20, 1);
    maxScore += 0.1;
    score += 0.1 * lengthFactor;

    // Occasion extraction
    maxScore += 0.25;
    if (slots.occasion) {
      score += 0.25;
    }

    // Style extraction
    maxScore += 0.2;
    if (slots.preferredStyles && slots.preferredStyles.length > 0) {
      score += 0.2;
    }

    // Fit goals extraction
    maxScore += 0.15;
    if (slots.fitGoals && slots.fitGoals.length > 0) {
      score += 0.15;
    }

    // Budget extraction
    maxScore += 0.15;
    if (slots.budgetMax !== undefined && slots.budgetMax !== null) {
      score += 0.15;
    }

    // Color extraction
    maxScore += 0.15;
    if (slots.preferredColors && slots.preferredColors.length > 0) {
      score += 0.15;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  // ==================== Keyword-based extraction methods ====================

  private extractOccasion(message: string): string | null {
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
    return null;
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
    return [...new Set(
      styleMap
        .filter(([keyword]) => normalized.includes(keyword.toLowerCase()))
        .map(([, value]) => value),
    )];
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
    return [...new Set(
      goalMap
        .filter(([keyword]) => normalized.includes(keyword.toLowerCase()))
        .map(([, value]) => value),
    )];
  }

  private extractColors(message: string): string[] {
    return VALID_COLORS.filter((color) => message.includes(color));
  }

  private extractBudget(message: string): { min?: number; max?: number } {
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

  private isPhotoSkipMessage(message: string): boolean {
    return (
      message.includes("跳过") ||
      message.includes("先不要拍") ||
      message.includes("直接推荐") ||
      message.includes("不用了") ||
      message.includes("不需要照片")
    );
  }
}
