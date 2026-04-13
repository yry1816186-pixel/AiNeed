import { Injectable, Inject } from "@nestjs/common";

import { RedisService } from "../../../common/redis/redis.service";

export interface QuizProgress {
  questionIndex: number;
  answers: Record<string, string>;
  updatedAt: number;
}

/**
 * QuizProgressService manages quiz session progress in Redis.
 * Saves/restores progress per question with 24h TTL,
 * enabling users to resume incomplete quizzes.
 */
@Injectable()
export class QuizProgressService {
  private static readonly PROGRESS_TTL_SECONDS = 86400; // 24 hours
  private static readonly KEY_PREFIX = "quiz:progress:";

  constructor(private readonly redisService: RedisService) {}

  async saveProgress(
    userId: string,
    quizId: string,
    questionIndex: number,
    answers: Record<string, string>,
  ): Promise<void> {
    const key = `${QuizProgressService.KEY_PREFIX}${userId}:${quizId}`;
    const progress: QuizProgress = {
      questionIndex,
      answers,
      updatedAt: Date.now(),
    };

    await this.redisService.setex(
      key,
      QuizProgressService.PROGRESS_TTL_SECONDS,
      JSON.stringify(progress),
    );
  }

  async getProgress(userId: string, quizId: string): Promise<QuizProgress | null> {
    const key = `${QuizProgressService.KEY_PREFIX}${userId}:${quizId}`;
    const raw = await this.redisService.get(key);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as QuizProgress;
    } catch {
      return null;
    }
  }

  async clearProgress(userId: string, quizId: string): Promise<void> {
    const key = `${QuizProgressService.KEY_PREFIX}${userId}:${quizId}`;
    await this.redisService.del(key);
  }
}
