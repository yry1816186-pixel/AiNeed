import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class CommunityFeedService {
  private readonly logger = new Logger(CommunityFeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getFollowingPosts(userId: string, page = 1, pageSize = 20) {
    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: {
          author: {
            followers: {
              some: { followerId: userId },
            },
          },
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.communityPost.count({
        where: {
          author: {
            followers: {
              some: { followerId: userId },
            },
          },
          isDeleted: false,
        },
      }),
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

  async getFollowingFeed(userId: string, page = 1, pageSize = 20) {
    const followingUsers = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followingUsers.map((f: { followingId: string }) => f.followingId);

    if (followingIds.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, pageSize, totalPages: 0 },
      };
    }

    const [posts, likes] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: { authorId: { in: followingIds }, isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: pageSize * 2,
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.postLike.findMany({
        where: {
          userId: { in: followingIds },
          post: { isDeleted: false },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          post: {
            select: {
              id: true,
              title: true,
              images: true,
              author: { select: { id: true, nickname: true, avatar: true } },
            },
          },
        },
      }),
    ]);

    const tryOns: {
      id: string;
      createdAt: Date;
      userId: string;
      user: unknown;
      tryOnResult?: unknown;
      resultImageUrl?: string;
    }[] = [];

    const feedItems = [
      ...posts.map((p: (typeof posts)[number]) => ({
        ...p,
        feedType: "post" as const,
        feedTime: p.createdAt.getTime(),
      })),
      ...likes.map((l: (typeof likes)[number]) => ({
        feedType: "like" as const,
        feedTime: l.createdAt.getTime(),
        userId: l.userId,
        user: l.user,
        postId: l.postId,
        post: l.post,
      })),
      ...tryOns.map((t: (typeof tryOns)[number]) => ({
        feedType: "try_on" as const,
        feedTime: t.createdAt?.getTime() ?? 0,
        userId: t.userId,
        user: t.user,
        tryOnId: t.id,
        resultImageUrl: t.resultImageUrl,
      })),
    ];

    feedItems.sort((a, b) => b.feedTime - a.feedTime);

    const total = feedItems.length;
    const pagedItems = feedItems.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: pagedItems,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getRecommendedPosts(userId: string, page = 1, pageSize = 20) {
    const userPreferences = await this.prisma.userPreferenceWeight.findMany({
      where: { userId, weight: { gt: 0.3 } },
      select: { category: true, weight: true },
    });

    const preferredCategories = userPreferences.map((p: { category: string }) => p.category);

    const where: Prisma.CommunityPostWhereInput = { isDeleted: false };

    if (preferredCategories.length > 0) {
      where.OR = [
        { tags: { hasSome: preferredCategories } },
        { category: { in: preferredCategories } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        orderBy: [{ likeCount: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
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
}
