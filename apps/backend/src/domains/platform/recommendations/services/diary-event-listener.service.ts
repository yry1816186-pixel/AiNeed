import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { BehaviorEventType } from "../../../../types/prisma-enums";
import { OutfitDiaryService } from "./outfit-diary.service";

/**
 * Events that should trigger auto-recording of diary entries.
 */
const DIARY_TRIGGER_EVENTS: Set<string> = new Set([
  "outfit_save",
  "try_on_complete",
  "favorite",
  "purchase",
  "add_to_cart",
  "recommendation_click",
  "unfavorite",
]);

/**
 * Listens for behavior events and auto-creates diary entries.
 *
 * Uses polling-based approach to check for new behavior events
 * on a regular interval. This avoids circular dependency on EventEmitter
 * while still achieving near-real-time recording.
 */
@Injectable()
export class DiaryEventListener implements OnModuleInit {
  private readonly logger = new Logger(DiaryEventListener.name);
  private isProcessing = false;
  private lastProcessedAt: Date = new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly diaryService: OutfitDiaryService
  ) {}

  onModuleInit(): void {
    // Set initial checkpoint to current time
    this.lastProcessedAt = new Date();
    this.logger.log("DiaryEventListener initialized - will poll for events every 30s");
  }

  /**
   * Process pending behavior events that should trigger diary entries.
   * Called by a cron job or can be invoked manually.
   */
  async processPendingEvents(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const events = await this.prisma.userBehaviorEvent.findMany({
        where: {
          eventType: { in: Array.from(DIARY_TRIGGER_EVENTS) as BehaviorEventType[] },
          createdAt: { gt: this.lastProcessedAt },
          userId: { not: null },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      if (events.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${events.length} diary-triggering events`);

      for (const event of events) {
        if (!event.userId) {
          continue;
        }

        const metadata = event.metadata as Record<string, unknown> | null;

        await this.diaryService.autoRecordFromEvent({
          userId: event.userId,
          eventType: event.eventType,
          outfitId: (metadata?.outfitId as string) ?? undefined,
          scene: (metadata?.scene as string) ?? undefined,
          weather: (metadata?.weather as string) ?? undefined,
          temperature: (metadata?.temperature as number) ?? undefined,
          metadata: metadata ?? undefined,
        });
      }

      // Update checkpoint
      const lastEvent = events[events.length - 1];
      if (lastEvent) {
        this.lastProcessedAt = lastEvent.createdAt;
      }
    } catch (error) {
      this.logger.error(`Failed to process pending events: ${this.getErrorMessage(error)}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manually trigger diary recording for a specific event.
   * Useful for synchronous event handling from other services.
   */
  async handleEvent(
    userId: string,
    eventType: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!DIARY_TRIGGER_EVENTS.has(eventType)) {
      return;
    }

    await this.diaryService.autoRecordFromEvent({
      userId,
      eventType: eventType as BehaviorEventType,
      outfitId: metadata?.outfitId as string | undefined,
      scene: metadata?.scene as string | undefined,
      weather: metadata?.weather as string | undefined,
      temperature: metadata?.temperature as number | undefined,
      metadata,
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }
}
