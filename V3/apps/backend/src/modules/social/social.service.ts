import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SocialService {

  constructor(private readonly prisma: PrismaService) {}

  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const existing = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existing) {
      await this.prisma.userFollow.delete({
        where: { id: existing.id },
      });
      return { isFollowing: false };
    }

    await this.prisma.userFollow.create({
      data: { followerId, followingId },
    });
    return { isFollowing: true };
  }

  async getFollowers(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const [followers, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followingId: userId },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.userFollow.count({ where: { followingId: userId } }),
    ]);

    const items = followers.map((f) => ({
      id: f.id,
      followerId: f.followerId,
      followingId: f.followingId,
      createdAt: f.createdAt.toISOString(),
      user: f.follower,
    }));

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async getFollowing(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const [following, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followerId: userId },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.userFollow.count({ where: { followerId: userId } }),
    ]);

    const items = following.map((f) => ({
      id: f.id,
      followerId: f.followerId,
      followingId: f.followingId,
      createdAt: f.createdAt.toISOString(),
      user: f.following,
    }));

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async getFollowStatus(currentUserId: string, targetUserId: string) {
    const follow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
      select: { id: true },
    });

    return { isFollowing: !!follow };
  }

  async getFollowCounts(userId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const [followersCount, followingCount] = await Promise.all([
      this.prisma.userFollow.count({ where: { followingId: userId } }),
      this.prisma.userFollow.count({ where: { followerId: userId } }),
    ]);

    return { followersCount, followingCount };
  }
}
