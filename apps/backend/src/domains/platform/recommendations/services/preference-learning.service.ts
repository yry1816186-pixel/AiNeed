import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";
import { BehaviorEventType } from "../../../../types/prisma-enums";

/** Python preference model service base URL (configurable via env) */
const PREFERENCE_MODEL_URL = process.env.PREFERENCE_MODEL_URL || "http://localhost:8100";

export interface UserPreference {
  category: string;
  key: string;
  value: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface LearningInput {
  userId: string;
  eventType: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

@Injectable()
export class PreferenceLearningService {
  private readonly logger = new Logger(PreferenceLearningService.name);

  private readonly EVENT_WEIGHTS: Record<string, number> = {
    view: 0.1,
    click: 0.2,
    like: 0.5,
    dislike: -0.3,
    favorite: 0.6,
    unfavorite: -0.4,
    purchase: 1.0,
    return: -0.8,
    share: 0.7,
    outfit_like: 0.8,
    outfit_dislike: -0.5,
    style_feedback_positive: 0.4,
    style_feedback_negative: -0.3,
  };

  private readonly DECAY_FACTOR = 0.95;
  private readonly MIN_WEIGHT = 0.1;
  private readonly MAX_WEIGHT = 10.0;

  constructor(private prisma: PrismaService, private redisService: RedisService) {}

  async recordEvent(input: LearningInput): Promise<void> {
    await this.prisma.userBehaviorEvent.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId || `session-${Date.now()}`,
        eventType: input.eventType as BehaviorEventType,
        category: "stylist",
        action: input.eventType,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });

    await this.updatePreferences(input);
  }

  async recordFeedback(
    userId: string,
    itemId: string,
    feedback: "like" | "dislike" | "purchase" | "view"
  ): Promise<void> {
    const eventTypeMap: Record<string, string> = {
      like: "like",
      dislike: "dislike",
      purchase: "purchase",
      view: "view",
    };

    await this.recordEvent({
      userId,
      eventType: eventTypeMap[feedback] || feedback,
      targetType: "clothing",
      targetId: itemId,
    });

    this.logger.debug(`Recorded ${feedback} feedback for item ${itemId} from user ${userId}`);
  }

  private async updatePreferences(input: LearningInput): Promise<void> {
    const baseWeight = this.EVENT_WEIGHTS[input.eventType] ?? 0.1;

    const preferenceUpdates = await this.extractPreferenceKeys(input);

    for (const { category, key, additionalWeight } of preferenceUpdates) {
      const finalWeight = baseWeight * additionalWeight;

      await this.upsertPreferenceWeight(input.userId, category, key, finalWeight);
    }

    await this.invalidateUserPreferenceCache(input.userId);
  }

  private async extractPreferenceKeys(
    input: LearningInput
  ): Promise<Array<{ category: string; key: string; additionalWeight: number }>> {
    const keys: Array<{
      category: string;
      key: string;
      additionalWeight: number;
    }> = [];

    if (input.targetType === "clothing" && input.targetId) {
      const item = await this.prisma.clothingItem.findUnique({
        where: { id: input.targetId },
        include: { brand: true },
      });

      if (item) {
        if (item.category) {
          keys.push({
            category: "category",
            key: item.category.toLowerCase(),
            additionalWeight: 1.0,
          });
        }

        if (item.colors && item.colors.length > 0) {
          for (const color of item.colors) {
            keys.push({
              category: "color",
              key: color.toLowerCase(),
              additionalWeight: 0.5,
            });
          }
        }

        if (item.brand) {
          keys.push({
            category: "brand",
            key: item.brand.name.toLowerCase(),
            additionalWeight: 0.8,
          });
        }

        const attributes = item.attributes as Record<string, unknown> | null;
        if (attributes) {
          if (attributes.style) {
            keys.push({
              category: "style",
              key: String(attributes.style).toLowerCase(),
              additionalWeight: 0.7,
            });
          }
          if (attributes.season) {
            keys.push({
              category: "season",
              key: String(attributes.season).toLowerCase(),
              additionalWeight: 0.3,
            });
          }
        }
      }
    }

    if (input.metadata) {
      const meta = input.metadata;

      if (meta.style) {
        keys.push({
          category: "style",
          key: String(meta.style).toLowerCase(),
          additionalWeight: 1.0,
        });
      }
      if (meta.occasion) {
        keys.push({
          category: "occasion",
          key: String(meta.occasion).toLowerCase(),
          additionalWeight: 0.8,
        });
      }
      if (meta.color) {
        keys.push({
          category: "color",
          key: String(meta.color).toLowerCase(),
          additionalWeight: 0.6,
        });
      }
    }

    return keys;
  }

  private async upsertPreferenceWeight(
    userId: string,
    category: string,
    key: string,
    delta: number,
    source: string = "behavior_learning"
  ): Promise<void> {
    const existing = await this.prisma.userPreferenceWeight.findUnique({
      where: {
        userId_category_key: { userId, category, key },
      },
    });

    if (existing) {
      const newWeight = Math.max(
        this.MIN_WEIGHT,
        Math.min(this.MAX_WEIGHT, Number(existing.weight) + delta)
      );

      await this.prisma.userPreferenceWeight.update({
        where: { id: existing.id },
        data: {
          weight: newWeight,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.userPreferenceWeight.create({
        data: {
          userId,
          category,
          key,
          weight: Math.max(this.MIN_WEIGHT, Math.min(this.MAX_WEIGHT, 1.0 + delta)),
          source,
        },
      });
    }
  }

  /**
   * Sync StyleQuiz results into UserPreferenceWeight entries.
   * Called on quiz completion and during cold-start scoring.
   * Quiz-sourced preferences use confidence score to set weight values.
   */
  async syncQuizResults(userId: string): Promise<void> {
    const quizResult = await this.prisma.styleQuizResult.findFirst({
      where: { userId, isLatest: true },
      orderBy: { createdAt: "desc" },
    });

    if (!quizResult) {
      return;
    }

    const confidenceMultiplier = Math.max(0.5, Number(quizResult.confidenceScore));

    // Sync style keywords as style_keyword preferences
    if (quizResult.styleKeywords && quizResult.styleKeywords.length > 0) {
      for (const keyword of quizResult.styleKeywords) {
        await this.upsertPreferenceWeight(
          userId,
          "style_keyword",
          keyword.toLowerCase(),
          2.0 * confidenceMultiplier,
          "quiz"
        );
      }
    }

    // Sync color preferences
    const colorPrefs = quizResult.colorPreferences as Record<string, number> | null;
    if (colorPrefs) {
      for (const [color, weight] of Object.entries(colorPrefs)) {
        await this.upsertPreferenceWeight(
          userId,
          "color_preference",
          color.toLowerCase(),
          (weight ?? 0.5) * 3.0 * confidenceMultiplier,
          "quiz"
        );
      }
    }

    // Sync occasion preferences
    const occasionPrefs = quizResult.occasionPreferences as Record<string, number> | null;
    if (occasionPrefs) {
      for (const [occasion, weight] of Object.entries(occasionPrefs)) {
        await this.upsertPreferenceWeight(
          userId,
          "occasion_preference",
          occasion.toLowerCase(),
          (weight ?? 0.5) * 2.0 * confidenceMultiplier,
          "quiz"
        );
      }
    }

    await this.invalidateUserPreferenceCache(userId);
    this.logger.debug(
      `Synced quiz results for user ${userId}, confidence: ${quizResult.confidenceScore}`
    );
  }

  async getUserPreferences(
    userId: string,
    category?: string,
    limit: number = 20
  ): Promise<Array<UserPreference & { source?: string }>> {
    const where = category ? { userId, category } : { userId };

    const weights = await this.prisma.userPreferenceWeight.findMany({
      where,
      orderBy: { weight: "desc" },
      take: limit,
    });

    return weights.map((w) => ({
      category: w.category,
      key: w.key,
      value: Number(w.weight),
      trend: "stable" as const,
      source: w.source || undefined,
    }));
  }

  async getTopPreferences(userId: string, category: string, limit: number = 5): Promise<string[]> {
    const prefs = await this.getUserPreferences(userId, category, limit);
    return prefs.map((p) => p.key);
  }

  async applyTimeDecay(userId: string): Promise<void> {
    const weights = await this.prisma.userPreferenceWeight.findMany({
      where: { userId },
    });

    for (const w of weights) {
      const newWeight = Number(w.weight) * this.DECAY_FACTOR;
      if (newWeight < this.MIN_WEIGHT) {
        await this.prisma.userPreferenceWeight.delete({ where: { id: w.id } });
      } else {
        await this.prisma.userPreferenceWeight.update({
          where: { id: w.id },
          data: { weight: newWeight },
        });
      }
    }
  }

  private async invalidateUserPreferenceCache(userId: string): Promise<void> {
    try {
      await this.redisService.del(`user:preferences:${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache: ${error}`);
    }
  }

  async getPersonalizedScores(
    userId: string,
    items: Array<{
      id: string;
      category?: string;
      colors?: string[];
      attributes?: Record<string, unknown>;
    }>
  ): Promise<Map<string, number>> {
    const preferences = await this.getUserPreferences(userId);
    const prefMap = new Map<string, number>();

    for (const pref of preferences) {
      prefMap.set(`${pref.category}:${pref.key}`, pref.value);
    }

    const scores = new Map<string, number>();

    for (const item of items) {
      let score = 50;

      if (item.category) {
        const catScore = prefMap.get(`category:${item.category.toLowerCase()}`);
        if (catScore) {
          score += catScore * 5;
        }
      }

      if (item.colors) {
        for (const color of item.colors) {
          const colorScore = prefMap.get(`color:${color.toLowerCase()}`);
          if (colorScore) {
            score += colorScore * 2;
          }
        }
      }

      if (item.attributes) {
        const style = item.attributes.style;
        if (style) {
          const styleScore = prefMap.get(`style:${String(style).toLowerCase()}`);
          if (styleScore) {
            score += styleScore * 3;
          }
        }
      }

      scores.set(item.id, Math.min(100, Math.max(0, score)));
    }

    return scores;
  }

  /**
   * Get preference score from the Python dual-tower preference model.
   * Falls back to weight-based scoring if the Python service is unavailable.
   *
   * @param userId - User ID
   * @param itemId - Item ID to score
   * @returns Preference score between 0 and 1
   */
  async getPreferenceScore(userId: string, itemId: string): Promise<number> {
    try {
      // Fetch user profile for model input features
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });

      // Fetch item for model input features
      const item = await this.prisma.clothingItem.findUnique({
        where: { id: itemId },
        include: { brand: true },
      });

      if (!profile || !item) {
        return this.fallbackPreferenceScore(userId, itemId);
      }

      // Build request payload for Python preference model
      const payload = {
        userId,
        itemId,
        bodyType: (profile.bodyType as string) || "hourglass",
        styleExpression:
          Array.isArray(profile.stylePreferences) && profile.stylePreferences.length > 0
            ? String(
                (profile.stylePreferences as Array<Record<string, unknown>>)[0]?.name ||
                  "minimalist"
              )
            : "minimalist",
        budget: this.inferBudgetLevel(
          typeof profile.priceRangeMin === "number" ? profile.priceRangeMin : undefined,
          typeof profile.priceRangeMax === "number" ? profile.priceRangeMax : undefined
        ),
        scenario: "daily",
        category: String(item.category || "tops").toLowerCase(),
        price: Number(item.price) || 200,
      };

      // Call Python /preference/predict endpoint
      const response = await fetch(`${PREFERENCE_MODEL_URL}/preference/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000), // 3s timeout
      });

      if (!response.ok) {
        this.logger.debug(
          `Preference model returned ${response.status}, falling back to weight-based scoring`
        );
        return this.fallbackPreferenceScore(userId, itemId);
      }

      const result = (await response.json()) as { score: number };
      return Math.min(1, Math.max(0, result.score));
    } catch (error) {
      this.logger.debug(
        `Python preference model unavailable, using fallback: ${
          error instanceof Error ? error.message : "unknown"
        }`
      );
      return this.fallbackPreferenceScore(userId, itemId);
    }
  }

  /**
   * Fallback preference score using existing weight-based scoring.
   */
  private async fallbackPreferenceScore(userId: string, itemId: string): Promise<number> {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return 0.5;
    }

    const scores = await this.getPersonalizedScores(userId, [
      {
        id: item.id,
        category: String(item.category),
        colors: (item.colors as string[]) || [],
        attributes: (item.attributes as Record<string, unknown> | null) ?? undefined,
      },
    ]);

    const score = scores.get(itemId) ?? 50;
    // Normalize from 0-100 range to 0-1
    return score / 100;
  }

  /**
   * Infer budget level from user price range preferences.
   */
  private inferBudgetLevel(min?: number, max?: number): string {
    const avg = min !== undefined && max !== undefined ? (min + max) / 2 : max ?? min ?? 500;

    if (avg < 100) {
      return "budget";
    }
    if (avg < 300) {
      return "affordable";
    }
    if (avg < 800) {
      return "mid-range";
    }
    if (avg < 2000) {
      return "premium";
    }
    return "luxury";
  }
}
