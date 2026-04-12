import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { sanitizeHtml } from '../../common/utils/sanitize.util';

type PostSortOption = 'newest' | 'popular' | 'featured';

interface FindPostsParams {
  sort?: PostSortOption;
  tag?: string;
  page?: number;
  limit?: number;
  userId?: string;
}

interface CommunityPostDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
  count(args: Record<string, unknown>): Promise<number>;
}

interface PostCommentDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
  count(args: Record<string, unknown>): Promise<number>;
}

interface FavoriteDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
}

interface PrismaDelegates {
  communityPost: CommunityPostDelegate;
  postComment: PostCommentDelegate;
  favorite: FavoriteDelegate;
}

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);
  private readonly db: PrismaDelegates;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as PrismaDelegates;
  }

  async findPosts(params: FindPostsParams) {
    const {
      sort = 'newest',
      tag,
      page = 1,
      limit = 20,
      userId,
    } = params;

    const where: Record<string, unknown> = {
      status: 'published',
    };

    if (tag) {
      where.tags = { has: tag };
    }

    if (sort === 'featured') {
      where.isFeatured = true;
    }

    const orderBy = this.buildPostOrderBy(sort);

    const [items, total] = await Promise.all([
      this.db.communityPost.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, nickname: true, avatarUrl: true },
          },
        },
      }),
      this.db.communityPost.count({ where }),
    ]);

    const enrichedItems = await this.enrichPostsWithLikeStatus(
      items as Array<Record<string, unknown>>,
      userId,
    );

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPostById(postId: string, userId?: string, commentLimit = 50) {
    const post = await this.db.communityPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    const postRecord = post as Record<string, unknown>;
    const isLiked = userId
      ? await this.checkPostLiked(postId, userId)
      : false;

    const comments = await this.db.postComment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: 'asc' },
      take: commentLimit,
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          take: 20,
          include: {
            user: {
              select: { id: true, nickname: true, avatarUrl: true },
            },
          },
        },
      },
    });

    const enrichedComments = await this.enrichCommentsWithLikeStatus(
      comments as Array<Record<string, unknown>>,
      userId,
    );

    return {
      ...postRecord,
      isLiked,
      comments: enrichedComments,
    };
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.db.communityPost.create({
      data: {
        userId,
        title: dto.title ? sanitizeHtml(dto.title) : null,
        content: sanitizeHtml(dto.content),
        imageUrls: dto.image_urls,
        tags: dto.tags ?? [],
        outfitId: dto.outfit_id ?? null,
        status: 'published',
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
    });

    this.logger.log(`User ${userId} created post ${(post as Record<string, unknown>).id}`);
    return { ...post as Record<string, unknown>, isLiked: false };
  }

  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await this.db.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    const postRecord = post as Record<string, unknown>;
    if (postRecord.userId !== userId) {
      throw new ForbiddenException('无权删除此帖子');
    }

    await this.db.communityPost.delete({ where: { id: postId } });
    this.logger.log(`User ${userId} deleted post ${postId}`);
  }

  async togglePostLike(userId: string, postId: string) {
    const post = await this.db.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    const existing = await this.db.favorite.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'post',
          targetId: postId,
        },
      },
    });

    if (existing) {
      await this.db.favorite.delete({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: 'post',
            targetId: postId,
          },
        },
      });

      const updated = await this.db.communityPost.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });

      return {
        isLiked: false,
        likesCount: (updated as Record<string, unknown>).likesCount as number,
      };
    }

    await this.db.favorite.create({
      data: {
        userId,
        targetType: 'post',
        targetId: postId,
      },
    });

    const updated = await this.db.communityPost.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
    });

    return {
      isLiked: true,
      likesCount: (updated as Record<string, unknown>).likesCount as number,
    };
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.db.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    if (dto.parent_id) {
      const parent = await this.db.postComment.findUnique({
        where: { id: dto.parent_id },
      });
      if (!parent) {
        throw new NotFoundException('父评论不存在');
      }
      const parentRecord = parent as Record<string, unknown>;
      if (parentRecord.postId !== postId) {
        throw new ForbiddenException('父评论不属于该帖子');
      }
    }

    const comment = await this.db.postComment.create({
      data: {
        postId,
        userId,
        parentId: dto.parent_id ?? null,
        content: sanitizeHtml(dto.content),
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
    });

    await this.db.communityPost.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    this.logger.log(`User ${userId} commented on post ${postId}`);
    return { ...(comment as Record<string, unknown>), isLiked: false, replies: [] };
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const comment = await this.db.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    const commentRecord = comment as Record<string, unknown>;
    if (commentRecord.userId !== userId) {
      throw new ForbiddenException('无权删除此评论');
    }

    const postId = commentRecord.postId as string;

    const replyCount = await this.db.postComment.count({
      where: { parentId: commentId },
    });

    const decrementAmount = 1 + replyCount;

    await this.db.communityPost.update({
      where: { id: postId },
      data: { commentsCount: { decrement: decrementAmount } },
    });

    await this.db.postComment.delete({ where: { id: commentId } });
    this.logger.log(`User ${userId} deleted comment ${commentId}`);
  }

  async toggleCommentLike(userId: string, commentId: string) {
    const comment = await this.db.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    const existing = await this.db.favorite.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'comment',
          targetId: commentId,
        },
      },
    });

    if (existing) {
      await this.db.favorite.delete({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: 'comment',
            targetId: commentId,
          },
        },
      });

      const updated = await this.db.postComment.update({
        where: { id: commentId },
        data: { likesCount: { decrement: 1 } },
      });

      return {
        isLiked: false,
        likesCount: (updated as Record<string, unknown>).likesCount as number,
      };
    }

    await this.db.favorite.create({
      data: {
        userId,
        targetType: 'comment',
        targetId: commentId,
      },
    });

    const updated = await this.db.postComment.update({
      where: { id: commentId },
      data: { likesCount: { increment: 1 } },
    });

    return {
      isLiked: true,
      likesCount: (updated as Record<string, unknown>).likesCount as number,
    };
  }

  private buildPostOrderBy(sort: PostSortOption) {
    switch (sort) {
      case 'newest':
        return { createdAt: 'desc' as const };
      case 'popular':
        return [{ likesCount: 'desc' as const }, { createdAt: 'desc' as const }];
      case 'featured':
        return [{ createdAt: 'desc' as const }];
      default:
        return { createdAt: 'desc' as const };
    }
  }

  private async checkPostLiked(postId: string, userId: string): Promise<boolean> {
    const existing = await this.db.favorite.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'post',
          targetId: postId,
        },
      },
    });
    return existing !== null;
  }

  private async enrichPostsWithLikeStatus(
    posts: Array<Record<string, unknown>>,
    userId?: string,
  ) {
    if (!userId || posts.length === 0) {
      return posts.map((p) => ({ ...p, isLiked: false }));
    }

    const postIds = posts.map((p) => p.id as string);

    const likes = await this.db.favorite.findMany({
      where: {
        userId,
        targetType: 'post',
        targetId: { in: postIds },
      },
      select: { targetId: true },
    });
    const likedSet = new Set((likes as Array<Record<string, unknown>>).map((l) => l.targetId as string));

    return posts.map((p) => ({ ...p, isLiked: likedSet.has(p.id as string) }));
  }

  private async enrichCommentsWithLikeStatus(
    comments: Array<Record<string, unknown>>,
    userId?: string,
  ) {
    if (!userId || comments.length === 0) {
      return comments.map((c) => ({
        ...c,
        isLiked: false,
        replies: this.enrichRepliesWithLikeStatus(
          (c.replies as Array<Record<string, unknown>>) ?? [],
          userId,
        ),
      }));
    }

    const commentIds = comments.map((c) => c.id as string);
    const replies = comments.flatMap(
      (c) => (c.replies as Array<Record<string, unknown>>) ?? [],
    );
    const replyIds = replies.map((r) => r.id as string);

    const allIds = [...commentIds, ...replyIds];

    const likes = await this.db.favorite.findMany({
      where: {
        userId,
        targetType: 'comment',
        targetId: { in: allIds },
      },
      select: { targetId: true },
    });
    const likedSet = new Set((likes as Array<Record<string, unknown>>).map((l) => l.targetId as string));

    const commentLikeMap = new Map<string, boolean>();
    allIds.forEach((id) => commentLikeMap.set(id, likedSet.has(id)));

    return comments.map((c) => ({
      ...c,
      isLiked: commentLikeMap.get(c.id as string) ?? false,
      replies: ((c.replies as Array<Record<string, unknown>>) ?? []).map((r) => ({
        ...r,
        isLiked: commentLikeMap.get(r.id as string) ?? false,
      })),
    }));
  }

  private enrichRepliesWithLikeStatus(
    replies: Array<Record<string, unknown>>,
    _userId?: string,
  ) {
    return replies.map((r) => ({ ...r, isLiked: false }));
  }
}
