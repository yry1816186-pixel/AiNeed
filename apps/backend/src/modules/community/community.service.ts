import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { StorageService } from "../../common/storage/storage.service";

import {
  CreatePostDto,
  UpdatePostDto,
  PostQueryDto,
  CreateCommentDto,
  LikePostDto,
} from "./dto/community.dto";

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
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

    return post;
  }

  async getPosts(query: PostQueryDto) {
    const {
      page = 1,
      pageSize = 20,
      category,
      tags,
      authorId,
      sortBy = "latest",
    } = query;

    const where: Prisma.CommunityPostWhereInput = { isDeleted: false };

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

    return {
      data: posts.map((post) => ({
        ...post,
        relatedItems: post.relatedItems.map((ri) => ri.item),
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getPostById(postId: string, userId?: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId, isDeleted: false },
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

    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    let isLiked = false;
    let isFollowing = false;

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
    }

    const relatedItems = post.relatedItems.map((ri) => ri.item);

    return {
      ...post,
      relatedItems,
      isLiked,
      isFollowing,
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
    // Use transaction to prevent race conditions in like/unlike operations
    return this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.postLike.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (existingLike) {
        // Unlike: delete like and decrement count atomically
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
        // Like: create like, increment count, and create notification atomically
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

        // Only create notification if user is not liking their own post
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

    return comment;
  }

  async getComments(postId: string, page = 1, pageSize = 20) {
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
            take: 3,
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
      // 使用事务批量处理取消关注操作，避免多次数据库往返
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
      // 使用事务批量处理关注操作
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

      // 通知创建单独处理，不阻塞主流程
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

  // FIX: 优化关注动态查询，避免N+1问题和大量IN列表
  async getFollowingPosts(userId: string, page = 1, pageSize = 20) {
    // 使用Prisma的关系查询替代两次查询，避免N+1问题
    // 当关注数很大时，IN列表性能会显著下降
    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: {
          // FIX: 使用关系查询替代IN列表，性能更好
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
}
