import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException, Inject, Optional } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import Redis from "ioredis";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { REDIS_CLIENT, RedisKeyBuilder } from "../../../common/redis/redis.service";
import { StorageService } from "../../../common/storage/storage.service";

import { ContentModerationService } from "./content-moderation.service";
import {
  CreatePostDto,
  UpdatePostDto,
  PostQueryDto,
  CreateCommentDto,
  LikePostDto,
  BookmarkPostDto,
  CreateReportDto,
  ReportQueryDto,
  TrendingQueryDto,
} from "./dto/community.dto";

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Optional() private readonly contentModerationService: ContentModerationService,
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
      await this.contentModerationService.moderateContent(
        'post',
        post.id,
        post.content,
        post.images as string[] | undefined,
      ).catch((err) => {
        this.logger.warn(`Content moderation failed for post ${post.id}: ${err.message}`);
      });
    }

    return post;
  }

  async getPosts(query: PostQueryDto, userId?: string, adminMode = false) {
    const {
      page = 1,
      pageSize = 20,
      category,
      tags,
      authorId,
      sortBy = "latest",
    } = query;

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

    let orderBy: Prisma.CommunityPostOrderByWithRelationInput | Prisma.CommunityPostOrderByWithRelationInput[] = { createdAt: "desc" };

    switch (sortBy) {
      case "popular":
        orderBy = [{ likeCount: "desc" }, { viewCount: "desc" }];
        break;
      case "trending":
        orderBy = [
          { commentCount: "desc" },
          { likeCount: "desc" },
          { createdAt: "desc" },
        ];
        break;
      case "latest":
      default:
        orderBy = { createdAt: "desc" };
    }

    if (sortBy === "trending") {
      const cached = await this.redis.get("community:trending");
      if (cached) {
        const trendingIds = (JSON.parse(cached) as Array<{ id: string }>).map((p) => p.id);
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
              .map((id) => posts.find((p) => p.id === id))
              .filter(Boolean);

            const bookmarkedIds = userId
              ? (
                  await this.prisma.postBookmark.findMany({
                    where: { userId, postId: { in: pagedIds } },
                    select: { postId: true },
                  })
                ).map((b) => b.postId)
              : [];

            return {
              data: sortedPosts.map((post) => ({
                ...post!,
                relatedItems: post!.relatedItems.map((ri) => ri.item),
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

    const postIds = posts.map((p) => p.id);
    const bookmarkedIds = userId
      ? (
          await this.prisma.postBookmark.findMany({
            where: { userId, postId: { in: postIds } },
            select: { postId: true },
          })
        ).map((b) => b.postId)
      : [];

    return {
      data: posts.map((post) => ({
        ...post,
        relatedItems: post.relatedItems.map((ri) => ri.item),
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
      const likeRecord = await this.prisma.postLike.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });
      isLiked = !!likeRecord;

      const followRecord = await this.prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: post.authorId,
          },
        },
      });
      isFollowing = !!followRecord;

      const bookmarkRecord = await this.prisma.postBookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });
      isBookmarked = !!bookmarkRecord;
    }

    const relatedItems = (post as { relatedItems?: Array<{ item: unknown }> }).relatedItems?.map((ri) => ri.item) ?? [];

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

  async likePost(userId: string, postId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.postLike.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (existingLike) {
        await tx.postLike.delete({
          where: {
            userId_postId: { userId, postId },
          },
        });

        await tx.communityPost.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        });

        this.logger.debug(`User ${userId} unliked post ${postId}`);
        return { liked: false };
      } else {
        const post = await tx.communityPost.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });

        if (!post) {
          throw new NotFoundException("帖子不存在");
        }

        await tx.postLike.create({
          data: { userId, postId },
        });

        await tx.communityPost.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        });

        if (post.authorId !== userId) {
          await tx.notification.create({
            data: {
              userId: post.authorId,
              type: "like",
              title: "收到新的点赞",
              content: "有人赞了你的帖子",
              data: { postId, likerId: userId },
            },
          });
        }

        this.logger.debug(`User ${userId} liked post ${postId}`);
        return { liked: true };
      }
    });
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId, isDeleted: false },
    });

    if (!post) {
      throw new NotFoundException("帖子不存在");
    }

    const comment = await this.prisma.postComment.create({
      data: {
        authorId: userId,
        postId,
        parentId: dto.parentId,
        content: dto.content,
        images: dto.images || [],
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

    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    if (dto.parentId) {
      const parentComment = await this.prisma.postComment.findUnique({
        where: { id: dto.parentId },
      });
      if (parentComment && parentComment.authorId !== userId) {
        await this.prisma.notification.create({
          data: {
            userId: parentComment.authorId,
            type: "comment",
            title: "收到新的回复",
            content: dto.content.substring(0, 50),
            data: { postId, commentId: comment.id },
          },
        });
      }
    } else if (post.authorId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "comment",
          title: "收到新的评论",
          content: dto.content.substring(0, 50),
          data: { postId, commentId: comment.id },
        },
      });
    }

    if (this.contentModerationService) {
      await this.contentModerationService.moderateContent(
        'comment',
        comment.id,
        dto.content,
      ).catch((err) => {
        this.logger.warn(`Content moderation failed for comment ${comment.id}: ${err.message}`);
      });
    }

    return comment;
  }

  async getComments(postId: string, page = 1, pageSize = 20, repliesLimit = 2) {
    const [comments, total] = await Promise.all([
      this.prisma.postComment.findMany({
        where: { postId, parentId: null, isDeleted: false },
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
          replies: {
            where: { isDeleted: false },
            take: repliesLimit,
            orderBy: { createdAt: "asc" },
            include: {
              author: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                },
              },
            },
          },
          _count: {
            select: { replies: true },
          },
        },
      }),
      this.prisma.postComment.count({
        where: { postId, parentId: null, isDeleted: false },
      }),
    ]);

    return {
      data: comments,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async followUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new Error("不能关注自己");
    }

    const existingFollow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      await this.prisma.$transaction([
        this.prisma.userFollow.delete({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: targetUserId,
            },
          },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { followingCount: { decrement: 1 } },
        }),
        this.prisma.user.update({
          where: { id: targetUserId },
          data: { followerCount: { decrement: 1 } },
        }),
      ]);

      return { following: false };
    } else {
      await this.prisma.$transaction([
        this.prisma.userFollow.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { followingCount: { increment: 1 } },
        }),
        this.prisma.user.update({
          where: { id: targetUserId },
          data: { followerCount: { increment: 1 } },
        }),
      ]);

      this.prisma.notification
        .create({
          data: {
            userId: targetUserId,
            type: "new_follower",
            title: "你有新的粉丝",
            content: "有人关注了你",
            data: { followerId: userId },
          },
        })
        .catch((err) => {
          this.logger.warn(`Failed to create follow notification: ${err.message}`);
        });

      return { following: true };
    }
  }

  async getUserPublicProfile(userId: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        bio: true,
        followerCount: true,
        followingCount: true,
      },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const postsCount = await this.prisma.communityPost.count({
      where: { authorId: userId, deletedAt: null },
    });

    let isFollowing = false;
    if (currentUserId) {
      const follow = await this.prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });
      isFollowing = !!follow;
    }

    return {
      ...user,
      postsCount,
      isFollowing,
    };
  }

  async getFollowingPosts(userId: string, page = 1, pageSize = 20) {
    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: {
          author: {
            followers: {
              some: { followerId: userId }
            }
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
              some: { followerId: userId }
            }
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
    const followingIds = followingUsers.map((f) => f.followingId);

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

    const tryOns: { id: string; createdAt: Date; userId: string; user: unknown; tryOnResult?: unknown; resultImageUrl?: string }[] = [];

    const feedItems = [
      ...posts.map((p: typeof posts[number]) => ({ ...p, feedType: "post" as const, feedTime: p.createdAt.getTime() })),
      ...likes.map((l: typeof likes[number]) => ({
        feedType: "like" as const,
        feedTime: l.createdAt.getTime(),
        userId: l.userId,
        user: l.user,
        postId: l.postId,
        post: l.post,
      })),
      ...tryOns.map((t: typeof tryOns[number]) => ({
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
      where: { userId },
      select: { category: true, weight: true },
    });

    const preferredCategories = userPreferences
      .filter((p) => Number(p.weight) > 0.3)
      .map((p) => p.category);

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
        orderBy: [
          { likeCount: "desc" },
          { viewCount: "desc" },
          { createdAt: "desc" },
        ],
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

  async bookmarkPost(userId: string, postId: string, dto: BookmarkPostDto) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId, isDeleted: false },
    });
    if (!post) {
      throw new NotFoundException("帖子不存在");
    }

    if (dto.bookmarked) {
      const existing = await this.prisma.postBookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });
      if (existing) {
        return { bookmarked: true };
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.postBookmark.create({
          data: { userId, postId, collectionId: dto.collectionId },
        });
        await tx.communityPost.update({
          where: { id: postId },
          data: { bookmarkCount: { increment: 1 } },
        });
        if (dto.collectionId) {
          await tx.wardrobeCollectionItem.create({
            data: {
              collectionId: dto.collectionId,
              userId,
              itemType: "post",
              itemId: postId,
            },
          }).catch(() => {});
        }
      });
      return { bookmarked: true };
    } else {
      const existing = await this.prisma.postBookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });
      if (!existing) {
        return { bookmarked: false };
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.postBookmark.delete({
          where: { userId_postId: { userId, postId } },
        });
        await tx.communityPost.update({
          where: { id: postId },
          data: { bookmarkCount: { decrement: 1 } },
        });
        if (existing.collectionId) {
          await tx.wardrobeCollectionItem.deleteMany({
            where: {
              collectionId: existing.collectionId,
              itemType: "post",
              itemId: postId,
            },
          }).catch(() => {});
        }
      });
      return { bookmarked: false };
    }
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
      await this.contentModerationService.handleReportThreshold(
        dto.contentType,
        dto.contentId,
      ).catch((err) => {
        this.logger.warn(`Handle report threshold failed for ${dto.contentType}/${dto.contentId}: ${err.message}`);
      });
    }

    return report;
  }

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
    const posts = await this.prisma.communityPost.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        likeCount: true,
        commentCount: true,
        bookmarkCount: true,
        shareCount: true,
        createdAt: true,
      },
    });

    const updates = posts.map((post) => {
      const hoursSinceCreation =
        (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
      const timeDecay = 1 / (1 + hoursSinceCreation / 168);
      const hotScore =
        (post.likeCount * 3 +
          post.commentCount * 2 +
          post.bookmarkCount * 5 +
          post.shareCount * 4) *
        timeDecay;

      return this.prisma.communityPost.update({
        where: { id: post.id },
        data: { hotScore },
        select: { id: true, hotScore: true },
      });
    });

    const results = await Promise.all(updates);

    const topPosts = results
      .sort((a, b) => b.hotScore - a.hotScore)
      .slice(0, 50);

    await this.redis.setex(
      "community:trending",
      300,
      JSON.stringify(topPosts),
    );

    this.logger.log(`Recalculated hot scores for ${posts.length} posts`);
    return { updated: posts.length };
  }
}
