import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { BehaviorEventType } from "../../../../types/prisma-enums";

/**
 * A single event in a user's behavior sequence, after ETL transformation.
 */
export interface SequenceEvent {
  itemId: string;
  eventType: string;
  implicitScore: number;
  timestamp: Date;
}

/**
 * A user's full behavior sequence, grouped and sorted chronologically.
 */
export interface UserSequence {
  userId: string;
  events: SequenceEvent[];
}

/**
 * Implicit score mapping for behavior event types.
 * Positive values indicate engagement/interest, negative values indicate disinterest.
 *
 * Weights based on signal strength in fashion recommendation context:
 * - purchase, favorite, outfit_save: strongest positive signals (1.0)
 * - add_to_cart, try_on_complete: strong positive signals (0.6-0.8)
 * - recommendation_click, click: moderate positive signals (0.3-0.4)
 * - item_view: weak positive signal (0.1)
 * - skip, unfavorite, remove_from_cart: negative signals (-0.3 to -0.5)
 */
const IMPLICIT_SCORE_MAP: Record<string, number> = {
  purchase: 1.0,
  favorite: 1.0,
  outfit_save: 1.0,
  add_to_cart: 0.8,
  try_on_complete: 0.6,
  recommendation_click: 0.4,
  click: 0.3,
  item_view: 0.1,
  skip: -0.3,
  unfavorite: -0.5,
  remove_from_cart: -0.5,
};

/**
 * Maximum sequence length per user. Truncate older events beyond this limit.
 */
const MAX_SEQ_LENGTH = 50;

/**
 * Event types that carry meaningful implicit feedback for model training.
 * Events not in this list will be assigned a default score of 0.
 */
const ACTIONABLE_EVENT_TYPES = new Set(Object.keys(IMPLICIT_SCORE_MAP));

@Injectable()
export class BehaviorEtlService {
  private readonly logger = new Logger(BehaviorEtlService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Extract training sequences from UserBehaviorEvent table.
   *
   * Queries all users' behavior events, groups by userId, sorts by createdAt
   * ascending, and truncates each user's sequence to MAX_SEQ_LENGTH (most recent).
   * Only includes events with actionable event types (those with implicit scores).
   *
   * @returns Array of UserSequence objects, one per user who has actionable events.
   */
  async extractTrainingSequences(): Promise<UserSequence[]> {
    this.logger.log("Extracting training sequences from UserBehaviorEvent...");

    const events = await this.prisma.userBehaviorEvent.findMany({
      where: {
        userId: { not: null },
        targetId: { not: null },
        eventType: { in: [...ACTIONABLE_EVENT_TYPES] as unknown as BehaviorEventType[] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        userId: true,
        targetId: true,
        eventType: true,
        createdAt: true,
      },
    });

    const sequenceMap = new Map<string, SequenceEvent[]>();

    for (const event of events) {
      const userId = event.userId;
      const targetId = event.targetId;

      if (!userId || !targetId) {
        continue;
      }

      if (!sequenceMap.has(userId)) {
        sequenceMap.set(userId, []);
      }

      sequenceMap.get(userId)!.push({
        itemId: targetId,
        eventType: event.eventType,
        implicitScore: this.computeImplicitScore(event.eventType),
        timestamp: event.createdAt,
      });
    }

    // Truncate each user sequence to MAX_SEQ_LENGTH (keep most recent)
    const sequences: UserSequence[] = [];
    for (const [userId, userEvents] of sequenceMap.entries()) {
      const truncated = userEvents.slice(-MAX_SEQ_LENGTH);
      sequences.push({
        userId,
        events: truncated,
      });
    }

    this.logger.log(
      `Extracted ${sequences.length} user sequences from ${events.length} total events`
    );

    return sequences;
  }

  /**
   * Compute implicit feedback score for a given event type.
   *
   * @param eventType - The behavior event type string
   * @returns Implicit score between -0.5 and 1.0, or 0 for unknown types
   */
  computeImplicitScore(eventType: string): number {
    return IMPLICIT_SCORE_MAP[eventType] ?? 0;
  }

  /**
   * Get the implicit score map for external consumers (e.g., testing).
   */
  getImplicitScoreMap(): Record<string, number> {
    return { ...IMPLICIT_SCORE_MAP };
  }

  /**
   * Get the max sequence length constant.
   */
  getMaxSeqLength(): number {
    return MAX_SEQ_LENGTH;
  }

  /**
   * Extract events since a given date, useful for incremental fine-tuning.
   *
   * @param since - Only include events created after this timestamp
   * @returns Array of UserSequence objects with recent events
   */
  async extractSequencesSince(since: Date): Promise<UserSequence[]> {
    this.logger.log(`Extracting sequences since ${since.toISOString()}...`);

    const events = await this.prisma.userBehaviorEvent.findMany({
      where: {
        userId: { not: null },
        targetId: { not: null },
        eventType: { in: [...ACTIONABLE_EVENT_TYPES] as unknown as BehaviorEventType[] },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
      select: {
        userId: true,
        targetId: true,
        eventType: true,
        createdAt: true,
      },
    });

    const sequenceMap = new Map<string, SequenceEvent[]>();

    for (const event of events) {
      const userId = event.userId;
      const targetId = event.targetId;

      if (!userId || !targetId) {
        continue;
      }

      if (!sequenceMap.has(userId)) {
        sequenceMap.set(userId, []);
      }

      sequenceMap.get(userId)!.push({
        itemId: targetId,
        eventType: event.eventType,
        implicitScore: this.computeImplicitScore(event.eventType),
        timestamp: event.createdAt,
      });
    }

    const sequences: UserSequence[] = [];
    for (const [userId, userEvents] of sequenceMap.entries()) {
      sequences.push({
        userId,
        events: userEvents.slice(-MAX_SEQ_LENGTH),
      });
    }

    this.logger.log(
      `Extracted ${sequences.length} incremental sequences from ${
        events.length
      } events since ${since.toISOString()}`
    );

    return sequences;
  }

  /**
   * Count actionable events since a given date.
   * Used by SigLIP threshold check to determine if fine-tuning should trigger.
   *
   * @param since - Only count events after this timestamp
   * @returns Total count of actionable events
   */
  async countActionableEventsSince(since: Date): Promise<number> {
    return this.prisma.userBehaviorEvent.count({
      where: {
        userId: { not: null },
        targetId: { not: null },
        eventType: { in: [...ACTIONABLE_EVENT_TYPES] as unknown as BehaviorEventType[] },
        createdAt: { gte: since },
      },
    });
  }

  /**
   * Export fine-tune data for FashionSigLIP as label-pair format.
   *
   * Queries positive (purchase/favorite/outfit_save) and negative (skip/unfavorite)
   * events, then creates training pairs of (image_a, image_b, label).
   *
   * @param since - Only include events after this timestamp
   * @returns Array of fine-tune samples with itemId pairs and labels
   */
  async exportFineTuneData(since: Date): Promise<
    Array<{
      itemIdA: string;
      itemIdB: string;
      label: number;
      eventTypeA: string;
      eventTypeB: string;
    }>
  > {
    const positiveTypes = ["purchase", "favorite", "outfit_save"] as unknown as BehaviorEventType[];
    const negativeTypes = [
      "skip",
      "unfavorite",
      "remove_from_cart",
    ] as unknown as BehaviorEventType[];

    const [positiveEvents, negativeEvents] = await Promise.all([
      this.prisma.userBehaviorEvent.findMany({
        where: {
          userId: { not: null },
          targetId: { not: null },
          eventType: { in: positiveTypes },
          createdAt: { gte: since },
        },
        select: { targetId: true, eventType: true, userId: true },
      }),
      this.prisma.userBehaviorEvent.findMany({
        where: {
          userId: { not: null },
          targetId: { not: null },
          eventType: { in: negativeTypes },
          createdAt: { gte: since },
        },
        select: { targetId: true, eventType: true, userId: true },
      }),
    ]);

    // Group events by userId for user-relative pairs
    const userPositiveMap = new Map<string, Array<{ targetId: string; eventType: string }>>();
    const userNegativeMap = new Map<string, Array<{ targetId: string; eventType: string }>>();

    for (const e of positiveEvents) {
      const uid = e.userId!;
      if (!userPositiveMap.has(uid)) {userPositiveMap.set(uid, []);}
      userPositiveMap.get(uid)!.push({ targetId: e.targetId!, eventType: e.eventType });
    }

    for (const e of negativeEvents) {
      const uid = e.userId!;
      if (!userNegativeMap.has(uid)) {userNegativeMap.set(uid, []);}
      userNegativeMap.get(uid)!.push({ targetId: e.targetId!, eventType: e.eventType });
    }

    const samples: Array<{
      itemIdA: string;
      itemIdB: string;
      label: number;
      eventTypeA: string;
      eventTypeB: string;
    }> = [];

    // Positive pairs: same user liked both items => similar (label=1)
    for (const [, positives] of userPositiveMap.entries()) {
      for (let i = 0; i < positives.length; i++) {
        const posA = positives[i];
        if (!posA) {continue;}
        for (let j = i + 1; j < positives.length; j++) {
          const posB = positives[j];
          if (!posB) {continue;}
          samples.push({
            itemIdA: posA.targetId,
            itemIdB: posB.targetId,
            label: 1,
            eventTypeA: posA.eventType,
            eventTypeB: posB.eventType,
          });
        }
      }
    }

    // Negative pairs: user liked one but skipped another => dissimilar (label=0)
    for (const [userId, positives] of userPositiveMap.entries()) {
      const negatives = userNegativeMap.get(userId) || [];
      for (const pos of positives) {
        for (const neg of negatives) {
          samples.push({
            itemIdA: pos.targetId,
            itemIdB: neg.targetId,
            label: 0,
            eventTypeA: pos.eventType,
            eventTypeB: neg.eventType,
          });
        }
      }
    }

    this.logger.log(
      `Exported ${samples.length} fine-tune samples (${positiveEvents.length} positive events, ${negativeEvents.length} negative events)`
    );

    return samples;
  }
}
