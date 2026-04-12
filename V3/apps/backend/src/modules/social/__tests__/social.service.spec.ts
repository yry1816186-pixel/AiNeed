import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SocialService } from '../social.service';
import { PrismaService } from '../../../prisma/prisma.service';

const USER_ID = 'user-001';
const TARGET_USER_ID = 'user-002';
const FOLLOW_ID = 'follow-001';

const mockFollow = {
  id: FOLLOW_ID,
  followerId: USER_ID,
  followingId: TARGET_USER_ID,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const prismaMockFactory = () => ({
  user: {
    findUnique: jest.fn(),
  },
  userFollow: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
});

describe('SocialService', () => {
  let service: SocialService;
  let prisma: ReturnType<typeof prismaMockFactory>;

  beforeEach(async () => {
    prisma = prismaMockFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
  });

  describe('toggleFollow', () => {
    it('should follow a user when not already following', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TARGET_USER_ID });
      prisma.userFollow.findUnique.mockResolvedValue(null);
      prisma.userFollow.create.mockResolvedValue(mockFollow);

      const result = await service.toggleFollow(USER_ID, TARGET_USER_ID);

      expect(result).toEqual({ isFollowing: true });
      expect(prisma.userFollow.create).toHaveBeenCalledWith({
        data: { followerId: USER_ID, followingId: TARGET_USER_ID },
      });
    });

    it('should unfollow a user when already following', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TARGET_USER_ID });
      prisma.userFollow.findUnique.mockResolvedValue(mockFollow);
      prisma.userFollow.delete.mockResolvedValue(mockFollow);

      const result = await service.toggleFollow(USER_ID, TARGET_USER_ID);

      expect(result).toEqual({ isFollowing: false });
      expect(prisma.userFollow.delete).toHaveBeenCalledWith({
        where: { id: FOLLOW_ID },
      });
    });

    it('should throw BadRequestException when following self', async () => {
      await expect(
        service.toggleFollow(USER_ID, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleFollow(USER_ID, TARGET_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFollowers', () => {
    const mockFollowerWithUser = {
      id: FOLLOW_ID,
      followerId: TARGET_USER_ID,
      followingId: USER_ID,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      follower: {
        id: TARGET_USER_ID,
        nickname: 'FollowerUser',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    };

    it('should return paginated followers list', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
      prisma.userFollow.findMany.mockResolvedValue([mockFollowerWithUser]);
      prisma.userFollow.count.mockResolvedValue(1);

      const result = await service.getFollowers(USER_ID, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].user).toEqual({
        id: TARGET_USER_ID,
        nickname: 'FollowerUser',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getFollowers('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce minimum page of 1', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
      prisma.userFollow.findMany.mockResolvedValue([]);
      prisma.userFollow.count.mockResolvedValue(0);

      const result = await service.getFollowers(USER_ID, -1, 20);

      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit of 100', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
      prisma.userFollow.findMany.mockResolvedValue([]);
      prisma.userFollow.count.mockResolvedValue(0);

      const result = await service.getFollowers(USER_ID, 1, 200);

      expect(result.limit).toBe(100);
    });
  });

  describe('getFollowing', () => {
    const mockFollowingWithUser = {
      id: FOLLOW_ID,
      followerId: USER_ID,
      followingId: TARGET_USER_ID,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      following: {
        id: TARGET_USER_ID,
        nickname: 'FollowingUser',
        avatarUrl: 'https://example.com/avatar2.jpg',
      },
    };

    it('should return paginated following list', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
      prisma.userFollow.findMany.mockResolvedValue([mockFollowingWithUser]);
      prisma.userFollow.count.mockResolvedValue(1);

      const result = await service.getFollowing(USER_ID, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].user).toEqual({
        id: TARGET_USER_ID,
        nickname: 'FollowingUser',
        avatarUrl: 'https://example.com/avatar2.jpg',
      });
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getFollowing('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFollowStatus', () => {
    it('should return isFollowing true when follow exists', async () => {
      prisma.userFollow.findUnique.mockResolvedValue({ id: FOLLOW_ID });

      const result = await service.getFollowStatus(USER_ID, TARGET_USER_ID);

      expect(result).toEqual({ isFollowing: true });
    });

    it('should return isFollowing false when follow does not exist', async () => {
      prisma.userFollow.findUnique.mockResolvedValue(null);

      const result = await service.getFollowStatus(USER_ID, TARGET_USER_ID);

      expect(result).toEqual({ isFollowing: false });
    });
  });

  describe('getFollowCounts', () => {
    it('should return followers and following counts', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
      prisma.userFollow.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);

      const result = await service.getFollowCounts(USER_ID);

      expect(result).toEqual({ followersCount: 10, followingCount: 5 });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getFollowCounts('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
