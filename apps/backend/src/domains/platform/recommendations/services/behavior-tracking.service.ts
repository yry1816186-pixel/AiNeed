/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
} from "@nestjs/common";
import { BehaviorEventType } from "../../../../types/prisma-enums";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";

import { RecommendationCacheService } from "./recommendation-cache.service";

export type BehaviorAction =
  | "page_view"
  | "click"
  | "post_like"
  | "add_to_cart"
  | "purchase"
  | "try_on_complete"
  | "share";

export interface TrackBehaviorInput {
  userId: string;
  action: BehaviorAction;
  clothingId: string;
  context?: {
    source?: string;
    recommendationId?: string;
    searchQuery?: string;
    duration?: number;
  };
}

const ACTION_WEIGHTS: Record<BehaviorAction, number> = {
  page_view: 0.1,
  click: 0.3,
  post_like: 0.6,
  add_to_cart: 0.7,
  purchase: 1.0,
  try_on_complete: 0.8,
  share: 0.5,
};

@Injectable()
export class BehaviorTrackingService {
  private readonly logger = new Logger(BehaviorTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private cacheService: RecommendationCacheService,
  ) {}

  async track(input: TrackBehaviorInput): Promise<void> {
    const { userId, action, clothingId, context } = input;

    try {
      await this.prisma.userBehavior.create({
        data: {
          userId,
          itemId: clothingId,
          type: action,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to track behavior: ${error}`);
    }

    try {
      const weightMap: Record<string, number> = {
        view: 1, click: 2, post_like: 3, favorite: 4,
        add_to_cart: 5, purchase: 8, try_on_complete: 6, share: 4,
      };
      const rawValue = weightMap[action] || 1;
      await this.prisma.userBehaviorEvent.create({
        data: {
          userId,
          sessionId: "default",
          eventType: "view" as BehaviorEventType,
          category: "clothing",
          action: action,
          targetType: "clothing",
          targetId: clothingId,
          metadata: { value: rawValue, context: context || undefined },
        },
      });
    } catch (error) {
      this.logger.debug(`Event tracking skipped: ${error}`);
    }

    await this.updatePreferenceCache(userId, action, clothingId);
    await this.invalidateRecommendationCache(userId);
  }

  async trackBatch(inputs: TrackBehaviorInput[]): Promise<void> {
    // 批量并行追踪行为，避免串行 N+1
    await Promise.all(inputs.map((input) => this.track(input)));
  }

  async getUserBehaviorSummary(
    userId: string,
    days: number = 30,
  ): Promise<{
    totalActions: number;
    categoryPreferences: Record<string, number>;
    stylePreferences: Record<string, number>;
    colorPreferences: Record<string, number>;
    recentItems: string[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const behaviors = await this.prisma.userBehavior.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const itemIds = [...new Set(behaviors.map((b) => b.itemId).filter(Boolean) as string[])];

    const items = await this.prisma.clothingItem.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        category: true,
        tags: true,
        colors: true,
      },
    });

    const itemMap = new Map(items.map((i) => [i.id, i]));

    const categoryPrefs: Record<string, number> = {};
    const stylePrefs: Record<string, number> = {};
    const colorPrefs: Record<string, number> = {};
    const recentItems: string[] = [];

    for (const b of behaviors) {
      const weight = ACTION_WEIGHTS[b.type as BehaviorAction] || 0.1;
      const itemId = b.itemId;
      if (!itemId) {continue;}

      const item = itemMap.get(itemId);
      if (item) {
        const cat = item.category as string;
        categoryPrefs[cat] = (categoryPrefs[cat] || 0) + weight;

        if (item.tags && Array.isArray(item.tags)) {
          for (const tag of item.tags) {
            stylePrefs[tag] = (stylePrefs[tag] || 0) + weight * 0.5;
          }
        }

        if (item.colors && Array.isArray(item.colors)) {
          for (const c of item.colors) {
            colorPrefs[c] = (colorPrefs[c] || 0) + weight;
          }
        }
      }

      if (!recentItems.includes(itemId)) {
        recentItems.push(itemId);
      }
    }

    return {
      totalActions: behaviors.length,
      categoryPreferences: categoryPrefs,
      stylePreferences: stylePrefs,
      colorPreferences: colorPrefs,
      recentItems: recentItems.slice(0, 50),
    };
  }

  async getExcludedItemIds(userId: string): Promise<Set<string>> {
    const excluded = new Set<string>();

    const purchased = await this.prisma.orderItem.findMany({
      where: { order: { userId } },
      select: { itemId: true },
    });
    for (const item of purchased) {
      excluded.add(item.itemId);
    }

    const favorited = await this.prisma.favorite.findMany({
      where: { userId },
      select: { itemId: true },
    });
    for (const item of favorited) {
      excluded.add(item.itemId);
    }

    const recentViews = await this.prisma.userBehavior.findMany({
      where: {
        userId,
        type: "page_view",
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { itemId: true },
      take: 50,
    });
    for (const item of recentViews) {
      if (item.itemId) {excluded.add(item.itemId);}
    }

    return excluded;
  }

  private async updatePreferenceCache(
    userId: string,
    action: BehaviorAction,
    clothingId: string,
  ): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const cacheKey = `user:pref:${userId}`;
      const weight = ACTION_WEIGHTS[action] || 0.1;

      const clothing = await this.prisma.clothingItem.findUnique({
        where: { id: clothingId },
        select: { category: true, tags: true, colors: true },
      });

      if (!clothing) {return;}

      const category = clothing.category as string;
      const color = clothing.colors?.[0] || "";
      const tags = (clothing.tags) || [];

      const multi = redis.multi();
      multi.hincrbyfloat(cacheKey, `cat:${category}`, weight);
      if (color) {
        multi.hincrbyfloat(cacheKey, `color:${color}`, weight);
      }
      for (const tag of tags) {
        multi.hincrbyfloat(cacheKey, `style:${tag}`, weight * 0.5);
      }
      multi.expire(cacheKey, 30 * 24 * 60 * 60);
      await multi.exec();
    } catch (error) {
      this.logger.debug(`Preference cache update skipped: ${error}`);
    }
  }

  private calculateTimeDecay(createdAt: Date, halfLifeHours: number = 168): number {
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return Math.pow(0.5, ageHours / halfLifeHours);
  }

  async getDecayedBehaviors(
    userId: string,
    limit: number = 100,
  ): Promise<Array<{ itemId: string; action: string; value: number }>> {
    const events = await this.prisma.userBehaviorEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return events.map((event) => ({
      itemId: event.targetId || "",
      action: event.action || "view",
      value: ((event.metadata as Record<string, number> | null)?.value ?? 1) * this.calculateTimeDecay(event.createdAt),
    }));
  }

  private async invalidateRecommendationCache(userId: string): Promise<void> {
    try {
      await this.cacheService.invalidate(userId);
    } catch (error) {
      this.logger.debug(`Cache invalidation skipped: ${error}`);
    }
  }
}
