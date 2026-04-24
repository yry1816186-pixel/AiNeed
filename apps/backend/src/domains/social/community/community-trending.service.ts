import {
  Injectable,
  Logger,
  ConflictException,
  ForbiddenException,
  Inject,
  Optional,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import Redis from "ioredis";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { REDIS_CLIENT, RedisKeyBuilder } from "../../../common/redis/redis.service";

import { ContentModerationService } from "./content-moderation.service";
import { CreateReportDto, TrendingQueryDto } from "./dto/community.dto";

@Injectable()
export class CommunityTrendingService {
  private readonly logger = new Logger(CommunityTrendingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Optional() private readonly contentModerationService: ContentModerationService
  ) {}

  async getTrending(query: TrendingQueryDto) {
    const { page = 1, pageSize = 20, type } = query;

    if (type === "tags") {
      const cachedTags = await this.redis.get("community:trending:tags");
      if (cachedTags) {
        const tags = JSON.parse(cachedTags) as Array<{ tag: string; count: number }>;
        return {
          data: tags.slice((page - 1) * pageSize, page * pageSize),
          meta: {
            total: tags.length,
            page,
            pageSize,
            totalPages: Math.ceil(tags.length / pageSize),
          },
        };
      }

      const posts = await this.prisma.communityPost.findMany({
        where: { isDeleted: false, hotScore: { gt: 0 } },
        select: { tags: true },
        orderBy: { hotScore: "desc" },
        take: 200,
      });

      const tagMap = new Map<string, number>();
      for (const post of posts) {
        for (const tag of post.tags) {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        }
      }

      const tags = Array.from(tagMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      await this.redis.setex("community:trending:tags", 300, JSON.stringify(tags));

      return {
        data: tags.slice((page - 1) * pageSize, page * pageSize),
        meta: {
          total: tags.length,
          page,
          pageSize,
          totalPages: Math.ceil(tags.length / pageSize),
        },
      };
    }

    const where: Prisma.CommunityPostWhereInput = {
      isDeleted: false,
      hotScore: { gt: 0 },
    };

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        orderBy: { hotScore: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Cron("*/10 * * * *")
  handleHotScoreRecalculation() {
    this.recalculateHotScores().catch((err) => {
      this.logger.error(`Hot score recalculation failed: ${err.message}`);
    });
  }

  async recalculateHotScores() {
    await this.prisma.$executeRaw`
      UPDATE "CommunityPost"
      SET "hotScore" = (
        ("likeCount" * 3 + "commentCount" * 2 + "bookmarkCount" * 5 + "shareCount" * 4)
        * (1.0 / (1 + EXTRACT(EPOCH FROM (NOW() - "createdAt")) / (168 * 3600)))
      )
      WHERE "isDeleted" = false
    `;

    const topPosts = await this.prisma.communityPost.findMany({
      where: { isDeleted: false },
      select: { id: true, hotScore: true },
      orderBy: { hotScore: "desc" },
      take: 50,
    });

    await this.redis.setex("community:trending", 300, JSON.stringify(topPosts));

    this.logger.log(`Recalculated hot scores for all active posts`);
    return { updated: "batch" };
  }

  async reportContent(userId: string, dto: CreateReportDto) {
    const existing = await this.prisma.contentReport.findUnique({
      where: {
        reporterId_contentType_contentId: {
          reporterId: userId,
          contentType: dto.contentType,
          contentId: dto.contentId,
        },
      },
    });
    if (existing) {
      throw new ConflictException("你已经举报过该内容");
    }

    const rateLimitKey = RedisKeyBuilder.rateLimit(userId, "report");
    const todayCount = await this.redis.incr(rateLimitKey);
    if (todayCount === 1) {
      await this.redis.expire(rateLimitKey, 86400);
    }
    if (todayCount > 20) {
      throw new ForbiddenException("今日举报次数已达上限");
    }

    const report = await this.prisma.contentReport.create({
      data: {
        reporterId: userId,
        contentType: dto.contentType,
        contentId: dto.contentId,
        reason: dto.reason,
      },
    });

    if (dto.contentType === "post") {
      const updatedPost = await this.prisma.communityPost.update({
        where: { id: dto.contentId },
        data: { reportCount: { increment: 1 } },
        select: { reportCount: true },
      });

      if (updatedPost.reportCount >= 3) {
        await this.prisma.communityPost.update({
          where: { id: dto.contentId },
          data: { moderationStatus: "pending", isHidden: true },
        });
        await this.prisma.contentModerationLog.create({
          data: {
            contentType: dto.contentType,
            contentId: dto.contentId,
            action: "auto_hide",
            reason: `累计 ${updatedPost.reportCount} 次举报，自动隐藏待审核`,
          },
        });
      }
    }

    if (this.contentModerationService) {
      await this.contentModerationService
        .handleReportThreshold(dto.contentType, dto.contentId)
        .catch((err) => {
          this.logger.warn(
            `Handle report threshold failed for ${dto.contentType}/${dto.contentId}: ${err.message}`
          );
        });
    }

    return report;
  }
}
