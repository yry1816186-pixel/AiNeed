import { Injectable, Logger, NotFoundException, Inject, Optional } from "@nestjs/common";
import Redis from "ioredis";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { REDIS_CLIENT } from "../../../common/redis/redis.service";

import { ContentModerationService } from "./content-moderation.service";
import { CreatePostDto, UpdatePostDto, PostQueryDto } from "./dto/community.dto";

@Injectable()
export class CommunityPostService {
  private readonly logger = new Logger(CommunityPostService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Optional() private readonly contentModerationService: ContentModerationService
  ) {}

  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.communityPost.create({
      data: {
        authorId: userId,
        title: dto.title,
        content: dto.content,
        images: dto.images || [],
        tags: dto.tags || [],
        category: dto.category,
      },
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
    });

    if (dto.relatedItemIds && dto.relatedItemIds.length > 0) {
      await this.prisma.communityPostItem.createMany({
        data: dto.relatedItemIds.map((itemId) => ({
          postId: post.id,
          itemId,
        })),
        skipDuplicates: true,
      });
    }

    await this.prisma.userBehaviorEvent.create({
      data: {
        userId,
        sessionId: "default",
        eventType: "post_create",
        category: "community",
        action: "create",
        targetType: "community_post",
        targetId: post.id,
        metadata: { category: dto.category },
      },
    });

    if (this.contentModerationService) {
      await this.contentModerationService
        .moderateContent("post", post.id, post.content, post.images as string[] | undefined)
        .catch((err) => {
          this.logger.warn(`Content moderation failed for post ${post.id}: ${err.message}`);
        });
    }

    return post;
  }

  async getPosts(query: PostQueryDto, userId?: string, adminMode = false) {
    const { page = 1, pageSize = 20, category, tags, authorId, sortBy = "latest" } = query;

    const where: Prisma.CommunityPostWhereInput = { isDeleted: false };

    if (!adminMode) {
      where.moderationStatus = "approved";
    }

    if (category) {
      where.category = category;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (authorId) {
      where.authorId = authorId;
    }

    let orderBy:
      | Prisma.CommunityPostOrderByWithRelationInput
      | Prisma.CommunityPostOrderByWithRelationInput[] = { createdAt: "desc" };

    switch (sortBy) {
      case "popular":
        orderBy = [{ likeCount: "desc" }, { viewCount: "desc" }];
        break;
      case "trending":
        orderBy = [{ commentCount: "desc" }, { likeCount: "desc" }, { createdAt: "desc" }];
        break;
      case "latest":
      default:
        orderBy = { createdAt: "desc" };
    }

    if (sortBy === "trending") {
      const cached = await this.redis.get("community:trending");
      if (cached) {
        const trendingIds = (JSON.parse(cached) as Array<{ id: string }>).map(
          (p: { id: string }) => p.id
        );
        if (trendingIds.length > 0) {
          const skip = (page - 1) * pageSize;
          const pagedIds = trendingIds.slice(skip, skip + pageSize);
          if (pagedIds.length > 0) {
            const posts = await this.prisma.communityPost.findMany({
              where: { id: { in: pagedIds }, ...where },
              include: {
                author: {
                  select: { id: true, nickname: true, avatar: true },
                },
                relatedItems: {
                  select: {
                    item: {
                      select: { id: true, name: true, mainImage: true, price: true },
                    },
                  },
                  take: 3,
                },
                _count: {
                  select: { likes: true, comments: true },
                },
              },
            });

            const sortedPosts = pagedIds
              .map((id: string) => posts.find((p: { id: string }) => p.id === id))
              .filter(Boolean);

            const bookmarkedIds = userId
              ? (
                  await this.prisma.postBookmark.findMany({
                    where: { userId, postId: { in: pagedIds } },
                    select: { postId: true },
                  })
                ).map((b: { postId: string }) => b.postId)
              : [];

            return {
              data: sortedPosts.map((post) => ({
                ...post!,
                relatedItems: post!.relatedItems.map((ri: { item: unknown }) => ri.item),
                isBookmarked: bookmarkedIds.includes(post!.id),
              })),
              meta: {
                total: trendingIds.length,
                page,
                pageSize,
                totalPages: Math.ceil(trendingIds.length / pageSize),
              },
            };
          }
        }
      }
    }

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        orderBy,
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
          relatedItems: {
            select: {
              item: {
                select: {
                  id: true,
                  name: true,
                  mainImage: true,
                  price: true,
                },
              },
            },
            take: 3,
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

    const postIds = posts.map((p: { id: string }) => p.id);
    const bookmarkedIds = userId
      ? (
          await this.prisma.postBookmark.findMany({
            where: { userId, postId: { in: postIds } },
            select: { postId: true },
          })
        ).map((b: { postId: string }) => b.postId)
      : [];

    return {
      data: posts.map((post) => ({
        ...post,
        relatedItems: post.relatedItems.map((ri: { item: unknown }) => ri.item),
        isBookmarked: bookmarkedIds.includes(post.id),
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getPostById(postId: string, userId?: string, adminMode = false) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            bio: true,
            followerCount: true,
            isVerified: true,
          },
        },
        relatedItems: {
          select: {
            item: {
              select: {
                id: true,
                name: true,
                mainImage: true,
                price: true,
                brand: {
                  select: { name: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException("帖子不存在");
    }

    if (post.isDeleted) {
      throw new NotFoundException("帖子不存在");
    }

    if (!adminMode && post.moderationStatus !== "approved") {
      throw new NotFoundException("帖子不存在");
    }

    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    let isLiked = false;
    let isFollowing = false;
    let isBookmarked = false;

    if (userId) {
      const [likeRecord, followRecord, bookmarkRecord] = await Promise.all([
        this.prisma.postLike.findUnique({
          where: {
            userId_postId: { userId, postId },
          },
        }),
        this.prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: post.authorId,
            },
          },
        }),
        this.prisma.postBookmark.findUnique({
          where: { userId_postId: { userId, postId } },
        }),
      ]);
      isLiked = !!likeRecord;
      isFollowing = !!followRecord;
      isBookmarked = !!bookmarkRecord;
    }

    const relatedItems =
      (post as { relatedItems?: Array<{ item: unknown }> }).relatedItems?.map((ri) => ri.item) ??
      [];

    return {
      ...post,
      relatedItems,
      isLiked,
      isFollowing,
      isBookmarked,
    };
  }

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    const existingPost = await this.prisma.communityPost.findFirst({
      where: { id: postId, authorId: userId, isDeleted: false },
    });

    if (!existingPost) {
      throw new NotFoundException("帖子不存在或无权编辑");
    }

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        title: dto.title,
        content: dto.content,
        images: dto.images,
        tags: dto.tags,
        category: dto.category,
      },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });
  }

  async deletePost(userId: string, postId: string) {
    const existingPost = await this.prisma.communityPost.findFirst({
      where: { id: postId, authorId: userId, isDeleted: false },
    });

    if (!existingPost) {
      throw new NotFoundException("帖子不存在或无权删除");
    }

    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return { success: true };
  }

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

  async sharePost(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId, isDeleted: false },
    });
    if (!post) {
      throw new NotFoundException("帖子不存在");
    }

    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
    });

    return { shared: true };
  }
}
