import { Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { ContentModerationService } from "./content-moderation.service";
import { CreateCommentDto } from "./dto/community.dto";

@Injectable()
export class CommunityCommentService {
  private readonly logger = new Logger(CommunityCommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly contentModerationService: ContentModerationService
  ) {}

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
      await this.contentModerationService
        .moderateContent("comment", comment.id, dto.content)
        .catch((err) => {
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
}
