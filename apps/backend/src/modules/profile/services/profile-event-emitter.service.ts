import { Injectable, Logger, Inject } from "@nestjs/common";

import { RedisService } from "../../../common/redis/redis.service";

/**
 * ProfileEventEmitter publishes profile change events to Redis Pub/Sub channels.
 * Enables real-time notifications and cache invalidation across service instances.
 */
@Injectable()
export class ProfileEventEmitter {
  private readonly logger = new Logger(ProfileEventEmitter.name);

  private static readonly CHANNEL_PROFILE_UPDATED = "profile:updated";
  private static readonly CHANNEL_QUIZ_COMPLETED = "quiz:completed";

  constructor(private readonly redisService: RedisService) {}

  /**
   * Emit a profile:updated event with changed fields.
   */
  async emitProfileUpdated(userId: string, changedFields: string[]): Promise<void> {
    const message = JSON.stringify({
      userId,
      changedFields,
      timestamp: Date.now(),
    });

    await this.redisService.publish(
      ProfileEventEmitter.CHANNEL_PROFILE_UPDATED,
      message,
    );

    this.logger.debug(`Emitted profile:updated for user ${userId}, fields: ${changedFields.join(",")}`);
  }

  /**
   * Emit a quiz:completed event with quiz identification.
   */
  async emitQuizResultSaved(userId: string, quizId: string): Promise<void> {
    const message = JSON.stringify({
      userId,
      quizId,
      timestamp: Date.now(),
    });

    await this.redisService.publish(
      ProfileEventEmitter.CHANNEL_QUIZ_COMPLETED,
      message,
    );

    this.logger.debug(`Emitted quiz:completed for user ${userId}, quiz: ${quizId}`);
  }
}
