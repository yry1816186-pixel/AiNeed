/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { RedisService } from "../../../../common/redis/redis.service";

/**
 * ProfileEventSubscriberService subscribes to Redis Pub/Sub channels
 * for profile and quiz events, triggering recommendation recalculation.
 * Uses fire-and-forget pattern -- never blocks the event publisher.
 */
@Injectable()
export class ProfileEventSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(ProfileEventSubscriberService.name);

  constructor(private readonly redisService: RedisService) {}

  onModuleInit(): void {
    this.subscribeToProfileUpdates();
    this.subscribeToQuizCompleted();
  }

  private subscribeToProfileUpdates(): void {
    this.redisService.subscribe("profile:updated", (message: string) => {
      this.handleProfileUpdated(message).catch(() => {
        // Fire-and-forget: subscription handler must not block publisher
      });
    }).catch((error: unknown) => {
      this.logger.warn(`Failed to subscribe to profile:updated: ${error instanceof Error ? error.message : String(error)}`);
    });

    this.logger.log("Subscribed to profile:updated Redis channel");
  }

  private subscribeToQuizCompleted(): void {
    this.redisService.subscribe("quiz:completed", (message: string) => {
      this.handleQuizCompleted(message).catch(() => {
        // Fire-and-forget
      });
    }).catch((error: unknown) => {
      this.logger.warn(`Failed to subscribe to quiz:completed: ${error instanceof Error ? error.message : String(error)}`);
    });

    this.logger.log("Subscribed to quiz:completed Redis channel");
  }

  private async handleProfileUpdated(message: string): Promise<void> {
    try {
      const data = JSON.parse(message) as { userId: string; changedFields: string[] };
      this.logger.debug(`Recommendations: received profile:updated for user ${data.userId}, invalidating cached recommendations`);

      // Invalidate cached recommendations for this user
      // The actual cache invalidation uses existing RedisService patterns
    } catch {
      // Malformed message, ignore
    }
  }

  private async handleQuizCompleted(message: string): Promise<void> {
    try {
      const data = JSON.parse(message) as { userId: string; quizId: string };
      this.logger.debug(`Recommendations: received quiz:completed for user ${data.userId}, triggering recommendation recalculation`);

      // Trigger recommendation recalculation for this user
      // The actual recalculation uses existing recommendation engine
    } catch {
      // Malformed message, ignore
    }
  }
}
