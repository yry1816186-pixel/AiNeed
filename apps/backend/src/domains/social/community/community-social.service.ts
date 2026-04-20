import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class CommunitySocialService {
  private readonly logger = new Logger(CommunitySocialService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to create follow notification: ${err instanceof Error ? err.message : String(err)}`
          );
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

    const [postsCount, followRecord] = await Promise.all([
      this.prisma.communityPost.count({
        where: { authorId: userId, deletedAt: null },
      }),
      currentUserId
        ? this.prisma.userFollow.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentUserId,
                followingId: userId,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const isFollowing = !!followRecord;

    return {
      ...user,
      postsCount,
      isFollowing,
    };
  }
}
