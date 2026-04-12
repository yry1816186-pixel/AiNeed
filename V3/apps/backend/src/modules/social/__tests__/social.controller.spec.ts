import { Test, TestingModule } from '@nestjs/testing';
import { SocialController } from '../social.controller';
import { SocialService } from '../social.service';

describe('SocialController', () => {
  let controller: SocialController;
  let service: SocialService;

  const mockSocialService = {
    toggleFollow: jest.fn(),
    getFollowers: jest.fn(),
    getFollowing: jest.fn(),
    getFollowCounts: jest.fn(),
    getFollowStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SocialController],
      providers: [
        { provide: SocialService, useValue: mockSocialService },
      ],
    }).compile();

    controller = module.get<SocialController>(SocialController);
    service = module.get<SocialService>(SocialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('toggleFollow', () => {
    it('should call service.toggleFollow with current user and target user', async () => {
      mockSocialService.toggleFollow.mockResolvedValue({ isFollowing: true });

      const result = await controller.toggleFollow('user-001', 'user-002');

      expect(service.toggleFollow).toHaveBeenCalledWith('user-001', 'user-002');
      expect(result).toEqual({ isFollowing: true });
    });

    it('should return unfollow result', async () => {
      mockSocialService.toggleFollow.mockResolvedValue({ isFollowing: false });

      const result = await controller.toggleFollow('user-001', 'user-002');

      expect(result).toEqual({ isFollowing: false });
    });
  });

  describe('getMyFollowers', () => {
    const followersResponse = {
      items: [
        {
          id: 'follow-001',
          followerId: 'user-002',
          followingId: 'user-001',
          createdAt: '2026-01-01T00:00:00.000Z',
          user: { id: 'user-002', nickname: 'User2', avatarUrl: null },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    it('should call service.getFollowers with current user id and default pagination', async () => {
      mockSocialService.getFollowers.mockResolvedValue(followersResponse);

      const result = await controller.getMyFollowers('user-001');

      expect(service.getFollowers).toHaveBeenCalledWith('user-001', undefined, undefined);
      expect(result).toEqual(followersResponse);
    });

    it('should pass page and limit query params', async () => {
      mockSocialService.getFollowers.mockResolvedValue(followersResponse);

      await controller.getMyFollowers('user-001', 2, 10);

      expect(service.getFollowers).toHaveBeenCalledWith('user-001', 2, 10);
    });

    it('should handle undefined page and limit', async () => {
      mockSocialService.getFollowers.mockResolvedValue(followersResponse);

      await controller.getMyFollowers('user-001', undefined, undefined);

      expect(service.getFollowers).toHaveBeenCalledWith('user-001', undefined, undefined);
    });
  });

  describe('getMyFollowing', () => {
    const followingResponse = {
      items: [
        {
          id: 'follow-002',
          followerId: 'user-001',
          followingId: 'user-002',
          createdAt: '2026-01-01T00:00:00.000Z',
          user: { id: 'user-002', nickname: 'User2', avatarUrl: null },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    it('should call service.getFollowing with current user id and default pagination', async () => {
      mockSocialService.getFollowing.mockResolvedValue(followingResponse);

      const result = await controller.getMyFollowing('user-001');

      expect(service.getFollowing).toHaveBeenCalledWith('user-001', undefined, undefined);
      expect(result).toEqual(followingResponse);
    });

    it('should pass page and limit query params', async () => {
      mockSocialService.getFollowing.mockResolvedValue(followingResponse);

      await controller.getMyFollowing('user-001', 3, 50);

      expect(service.getFollowing).toHaveBeenCalledWith('user-001', 3, 50);
    });
  });

  describe('getUserFollowers', () => {
    it('should call service.getFollowers with specified user id and pagination', async () => {
      const response = { items: [], total: 0, page: 1, limit: 20 };
      mockSocialService.getFollowers.mockResolvedValue(response);

      const result = await controller.getUserFollowers('user-003', 1, 20);

      expect(service.getFollowers).toHaveBeenCalledWith('user-003', 1, 20);
      expect(result).toEqual(response);
    });

    it('should handle undefined pagination params', async () => {
      const response = { items: [], total: 0, page: 1, limit: 20 };
      mockSocialService.getFollowers.mockResolvedValue(response);

      await controller.getUserFollowers('user-003', undefined, undefined);

      expect(service.getFollowers).toHaveBeenCalledWith('user-003', undefined, undefined);
    });
  });

  describe('getUserFollowing', () => {
    it('should call service.getFollowing with specified user id and pagination', async () => {
      const response = { items: [], total: 0, page: 1, limit: 20 };
      mockSocialService.getFollowing.mockResolvedValue(response);

      const result = await controller.getUserFollowing('user-003', 2, 10);

      expect(service.getFollowing).toHaveBeenCalledWith('user-003', 2, 10);
      expect(result).toEqual(response);
    });

    it('should handle undefined pagination params', async () => {
      const response = { items: [], total: 0, page: 1, limit: 20 };
      mockSocialService.getFollowing.mockResolvedValue(response);

      await controller.getUserFollowing('user-003', undefined, undefined);

      expect(service.getFollowing).toHaveBeenCalledWith('user-003', undefined, undefined);
    });
  });

  describe('getFollowCounts', () => {
    it('should call service.getFollowCounts with the specified user id', async () => {
      const response = { followersCount: 10, followingCount: 5 };
      mockSocialService.getFollowCounts.mockResolvedValue(response);

      const result = await controller.getFollowCounts('user-001');

      expect(service.getFollowCounts).toHaveBeenCalledWith('user-001');
      expect(result).toEqual(response);
    });
  });

  describe('getFollowStatus', () => {
    it('should call service.getFollowStatus with current and target user ids', async () => {
      const response = { isFollowing: true };
      mockSocialService.getFollowStatus.mockResolvedValue(response);

      const result = await controller.getFollowStatus('user-001', 'user-002');

      expect(service.getFollowStatus).toHaveBeenCalledWith('user-001', 'user-002');
      expect(result).toEqual({ isFollowing: true });
    });

    it('should return isFollowing false when not following', async () => {
      mockSocialService.getFollowStatus.mockResolvedValue({ isFollowing: false });

      const result = await controller.getFollowStatus('user-001', 'user-002');

      expect(result).toEqual({ isFollowing: false });
    });
  });
});
