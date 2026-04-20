import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { BookmarkPostDto } from "./dto/community.dto";

@Injectable()
export class CommunityLikeService {
  private readonly logger = new Logger(CommunityLikeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async likePost(userId: string, postId: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.postBookmark.create({
          data: { userId, postId, collectionId: dto.collectionId },
        });
        await tx.communityPost.update({
          where: { id: postId },
          data: { bookmarkCount: { increment: 1 } },
        });
        if (dto.collectionId) {
          await tx.wardrobeCollectionItem
            .create({
              data: {
                collectionId: dto.collectionId,
                userId,
                itemType: "post",
                itemId: postId,
              },
            })
            .catch((error: unknown) => {
              this.logger.warn(
                "Failed to add post to wardrobe collection",
                error instanceof Error ? error.message : String(error)
              );
            });
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

      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.postBookmark.delete({
          where: { userId_postId: { userId, postId } },
        });
        await tx.communityPost.update({
          where: { id: postId },
          data: { bookmarkCount: { decrement: 1 } },
        });
        if (existing.collectionId) {
          await tx.wardrobeCollectionItem
            .deleteMany({
              where: {
                collectionId: existing.collectionId,
                itemType: "post",
                itemId: postId,
              },
            })
            .catch((error: unknown) => {
              this.logger.warn(
                "Failed to remove post from wardrobe collection",
                error instanceof Error ? error.message : String(error)
              );
            });
        }
      });
      return { bookmarked: false };
    }
  }
}
