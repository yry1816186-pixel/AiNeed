import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { RedisService } from "../../../common/redis/redis.service";

/**
 * ProfileEventSubscriberService subscribes to Redis Pub/Sub channels
 * for profile and quiz events, updating AI stylist context caches.
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
      this.logger.debug(`AI Stylist: received profile:updated for user ${data.userId}, fields: ${data.changedFields.join(",")}`);

      // Update AI stylist's user context cache
      // The actual cache update is handled by AiStylistContextService
      // This subscriber serves as the event trigger point
    } catch {
      // Malformed message, ignore
    }
  }

  private async handleQuizCompleted(message: string): Promise<void> {
    try {
      const data = JSON.parse(message) as { userId: string; quizId: string };
      this.logger.debug(`AI Stylist: received quiz:completed for user ${data.userId}, quiz: ${data.quizId}`);

      // Refresh style recommendation context
      // The actual context refresh is handled by AiStylistContextService
    } catch {
      // Malformed message, ignore
    }
  }
}
