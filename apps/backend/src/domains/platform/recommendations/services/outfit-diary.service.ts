import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { BehaviorEventType } from "../../../../types/prisma-enums";
import { DiaryQueryDto } from "../dto/diary-query.dto";

/**
 * Satisfaction score inference from behavior events.
 * Positive signals: save/favorite/purchase = 1.0, try_on_complete = 0.6, recommendation_click = 0.3
 * Negative signals: skip = -0.3, unfavorite = -0.5
 */
const SATISFACTION_MAP: Record<string, number> = {
  purchase: 1.0,
  favorite: 1.0,
  add_to_cart: 1.0,
  try_on_complete: 0.6,
  recommendation_click: 0.3,
  item_view: 0.1,
  page_view: 0.0,
  click: 0.1,
  scroll: 0.0,
  unfavorite: -0.5,
  remove_from_cart: -0.3,
};

export interface AutoRecordParams {
  userId: string;
  eventType: BehaviorEventType;
  outfitId?: string;
  scene?: string;
  weather?: string;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class OutfitDiaryService {
  private readonly logger = new Logger(OutfitDiaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-record a diary entry from a behavior event.
   * If an entry already exists for the same user + date, update its satisfaction score
   * using a running weighted average.
   */
  async autoRecordFromEvent(params: AutoRecordParams): Promise<void> {
    const { userId, eventType, outfitId, scene, weather, temperature, metadata } = params;
    const satisfaction = this.inferSatisfaction(eventType);

    // Skip events with zero satisfaction and no outfit context
    if (satisfaction === 0 && !outfitId) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Check for existing entry on the same date
      const existing = await this.prisma.outfitDiary.findFirst({
        where: {
          userId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        // Merge satisfaction using exponential moving average
        const alpha = 0.4;
        const mergedSatisfaction =
          existing.satisfactionScore !== null
            ? existing.satisfactionScore * (1 - alpha) + satisfaction * alpha
            : satisfaction;

        await this.prisma.outfitDiary.update({
          where: { id: existing.id },
          data: {
            satisfactionScore: Math.round(mergedSatisfaction * 100) / 100,
            outfitId: outfitId ?? existing.outfitId,
            scene: scene ?? existing.scene,
            weather: weather ?? existing.weather,
            temperature: temperature ?? existing.temperature,
            outfitSnapshot: metadata
              ? ({ ...(existing.outfitSnapshot as Record<string, unknown>), ...metadata } as any)
              : (existing.outfitSnapshot as any),
          },
        });
      } else {
        await this.prisma.outfitDiary.create({
          data: {
            userId,
            outfitId: outfitId ?? null,
            date: today,
            scene: scene ?? null,
            weather: weather ?? null,
            temperature: temperature ?? null,
            source: "auto",
            satisfactionScore: satisfaction,
            outfitSnapshot: (metadata ?? undefined) as any,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to auto-record diary for user ${userId}: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Query diary entries by date range.
   */
  async getDiaryEntries(userId: string, query: DiaryQueryDto) {
    const { startDate, endDate, limit = 20 } = query;

    const where: Record<string, unknown> = { userId };

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lt = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000);
      }
      where.date = dateFilter;
    }

    const [entries, total] = await Promise.all([
      this.prisma.outfitDiary.findMany({
        where,
        orderBy: { date: "desc" },
        take: limit,
        include: {
          outfit: {
            select: {
              id: true,
              name: true,
              coverImage: true,
              style: true,
              occasions: true,
            },
          },
        },
      }),
      this.prisma.outfitDiary.count({ where }),
    ]);

    return {
      items: entries,
      total,
      hasMore: total > limit,
    };
  }

  /**
   * Infer satisfaction score from behavior event type.
   */
  inferSatisfaction(eventType: BehaviorEventType | string): number {
    return SATISFACTION_MAP[eventType] ?? 0.0;
  }

  /**
   * Get diary entries for a specific week range (used by WeeklyReportService).
   */
  async getDiaryEntriesForWeek(userId: string, weekStart: Date, weekEnd: Date) {
    return this.prisma.outfitDiary.findMany({
      where: {
        userId,
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Get the count of diary entries for a user in a given period.
   */
  async getDiaryCount(userId: string, since: Date): Promise<number> {
    return this.prisma.outfitDiary.count({
      where: {
        userId,
        date: { gte: since },
      },
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }
}
