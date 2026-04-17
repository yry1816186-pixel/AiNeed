import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService, REDIS_KEY_PREFIX, REDIS_KEY_SEPARATOR } from "../../../common/redis/redis.service";

const GRACE_KEY_PREFIX = `${REDIS_KEY_PREFIX}${REDIS_KEY_SEPARATOR}blogger${REDIS_KEY_SEPARATOR}grace`;
const GRACE_TTL_SECONDS = 7 * 24 * 60 * 60;

const ALLOWED_BLOGGER_FIELDS = new Set(["bloggerLevel", "bloggerScore", "bloggerBadge"]);

@Injectable()
export class BloggerScoreService implements OnModuleInit {
  private readonly logger = new Logger(BloggerScoreService.name);
  private isInternalUpdate = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.registerPrismaMiddleware();
  }

  private registerPrismaMiddleware() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.prisma.$use(async (params: any, next: (params: any) => Promise<any>) => {
      if (params.model === "User" && params.action === "update") {
        if (!this.isInternalUpdate) {
          const data = params.args?.data;
          if (data) {
            const forbiddenFields = Object.keys(data).filter((key) => ALLOWED_BLOGGER_FIELDS.has(key));
            if (forbiddenFields.length > 0) {
              this.logger.warn(`Blocked external User.update of blogger fields: ${forbiddenFields.join(", ")}`);
              for (const field of forbiddenFields) {
                delete data[field];
              }
            }
          }
        }
      }
      return next(params);
    });
  }

  private withInternalUpdate<T>(fn: () => Promise<T>): Promise<T> {
    this.isInternalUpdate = true;
    try {
      return fn().finally(() => {
        this.isInternalUpdate = false;
      });
    } catch (error) {
      this.isInternalUpdate = false;
      throw error;
    }
  }

  async calculateBloggerScore(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { followerCount: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const postStats = await this.prisma.communityPost.aggregate({
      where: { authorId: userId, isDeleted: false },
      _sum: { viewCount: true, likeCount: true, commentCount: true, bookmarkCount: true },
      _count: true,
    });

    const followerScore = Math.min((user.followerCount / 5000) * 100, 100);

    const totalViews = postStats._sum.viewCount ?? 0;
    const totalLikes = postStats._sum.likeCount ?? 0;
    const totalComments = postStats._sum.commentCount ?? 0;
    const totalBookmarks = postStats._sum.bookmarkCount ?? 0;
    const postCount = postStats._count;

    const rawEngagement = (totalLikes + totalComments * 2 + totalBookmarks * 3) / Math.max(totalViews, 1);
    const engagementScore = Math.min(rawEngagement * 100, 100);

    const contentScore = Math.min((postCount / 100) * 100, 100);

    const bookmarkRate = totalBookmarks / Math.max(totalViews, 1);
    const bookmarkScore = Math.min(bookmarkRate * 100, 100);

    const compositeScore =
      followerScore * 0.4 +
      engagementScore * 0.3 +
      contentScore * 0.2 +
      bookmarkScore * 0.1;

    return Math.round(compositeScore * 100) / 100;
  }

  determineBloggerLevel(score: number, followerCount: number): "big_v" | "blogger" | null {
    if (score >= 80 && followerCount >= 5000) {
      return "big_v";
    }
    if (score >= 60 && followerCount >= 500) {
      return "blogger";
    }
    return null;
  }

  async updateBloggerLevel(userId: string): Promise<{ score: number; level: string | null }> {
    const score = await this.calculateBloggerScore(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { bloggerLevel: true, followerCount: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const newLevel = this.determineBloggerLevel(score, user.followerCount);
    const currentLevel = user.bloggerLevel;

    const isDowngrade = currentLevel !== null && newLevel === null;
    const isLevelChange = currentLevel !== newLevel;

    if (isDowngrade) {
      const graceKey = `${GRACE_KEY_PREFIX}${REDIS_KEY_SEPARATOR}${userId}`;
      const inGrace = await this.redisService.exists(graceKey);

      if (!inGrace) {
        await this.redisService.setex(graceKey, GRACE_TTL_SECONDS, String(currentLevel));
        this.logger.log(`Blogger ${userId} downgraded from ${currentLevel}, grace period started (7 days)`);
        return { score, level: currentLevel };
      }
    }

    if (isLevelChange && !isDowngrade) {
      const graceKey = `${GRACE_KEY_PREFIX}${REDIS_KEY_SEPARATOR}${userId}`;
      await this.redisService.del(graceKey);
    }

    await this.withInternalUpdate(() =>
      this.prisma.user.update({
        where: { id: userId },
        data: {
          bloggerScore: score,
          bloggerLevel: isDowngrade ? currentLevel : newLevel,
          bloggerBadge: newLevel === "big_v" ? "big_v" : newLevel === "blogger" ? "blogger" : null,
        },
      }),
    );

    if (isLevelChange) {
      this.logger.log(`Blogger ${userId} level updated: ${currentLevel} -> ${isDowngrade ? currentLevel + " (grace)" : newLevel}`);
    }

    return { score, level: isDowngrade ? currentLevel : newLevel };
  }

  @Cron("0 0 3 1 * *")
  async monthlyRecalculation() {
    this.logger.log("Starting monthly blogger score recalculation...");

    const bloggers = await this.prisma.user.findMany({
      where: { bloggerLevel: { not: null } },
      select: { id: true },
    });

    let updated = 0;
    for (const blogger of bloggers) {
      try {
        await this.updateBloggerLevel(blogger.id);
        updated++;
      } catch (error) {
        this.logger.error(`Failed to recalculate score for ${blogger.id}: ${error instanceof Error ? error.message : "Unknown"}`);
      }
    }

    this.logger.log(`Monthly recalculation complete: ${updated}/${bloggers.length} bloggers updated`);
  }

  async checkGracePeriod(userId: string): Promise<boolean> {
    const graceKey = `${GRACE_KEY_PREFIX}${REDIS_KEY_SEPARATOR}${userId}`;
    return this.redisService.exists(graceKey);
  }
}
