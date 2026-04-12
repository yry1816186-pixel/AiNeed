import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { SocialModule } from '../../src/modules/social/social.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { E2eTestHelper, API_PREFIX } from './utils/test-app.helper';

describe('Social Flow E2E', () => {
  let app: INestApplication;
  let user1Tokens: { accessToken: string; userId: string };
  let user2Tokens: { accessToken: string; userId: string };

  function reRegisterUserMocks(): void {
    E2eTestHelper.prisma.user.findUnique.mockImplementation((args: { where: { id?: string; phone?: string } }) => {
      if (args.where.id === user1Tokens.userId || args.where.phone === '13800138050') {
        return Promise.resolve({
          id: user1Tokens.userId,
          phone: '13800138050',
          nickname: '用户8050',
          avatarUrl: null,
          role: 'user',
        });
      }
      if (args.where.id === user2Tokens.userId || args.where.phone === '13900139050') {
        return Promise.resolve({
          id: user2Tokens.userId,
          phone: '13900139050',
          nickname: '用户9050',
          avatarUrl: null,
          role: 'user',
        });
      }
      return Promise.resolve(null);
    });
  }

  beforeAll(async () => {
    app = await E2eTestHelper.initApp({ modules: [AuthModule, SocialModule] });
    user1Tokens = await E2eTestHelper.registerTestUser('13800138050');
    user2Tokens = await E2eTestHelper.createSecondUser('13900139050');
    reRegisterUserMocks();
  });

  afterAll(async () => {
    await E2eTestHelper.closeApp();
  });

  afterEach(() => {
    E2eTestHelper.resetMocks();
    reRegisterUserMocks();
  });

  describe('POST /social/follow/:userId', () => {
    it('should follow another user', async () => {
      E2eTestHelper.prisma.userFollow.findUnique.mockResolvedValue(null);
      E2eTestHelper.prisma.userFollow.create.mockResolvedValue({
        id: uuidv4(),
        followerId: user1Tokens.userId,
        followingId: user2Tokens.userId,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/social/follow/${user2Tokens.userId}`)
        .set(E2eTestHelper.authHeader(user1Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { isFollowing: boolean };
      };
      expect(body.success).toBe(true);
      expect(body.data.isFollowing).toBe(true);
    });

    it('should unfollow when toggling again', async () => {
      const followId = uuidv4();
      E2eTestHelper.prisma.userFollow.findUnique.mockResolvedValue({
        id: followId,
        followerId: user1Tokens.userId,
        followingId: user2Tokens.userId,
        createdAt: new Date(),
      });
      E2eTestHelper.prisma.userFollow.delete.mockResolvedValue({
        id: followId,
        followerId: user1Tokens.userId,
        followingId: user2Tokens.userId,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/social/follow/${user2Tokens.userId}`)
        .set(E2eTestHelper.authHeader(user1Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { isFollowing: boolean };
      };
      expect(body.success).toBe(true);
      expect(body.data.isFollowing).toBe(false);
    });

    it('should follow again after unfollowing', async () => {
      E2eTestHelper.prisma.userFollow.findUnique.mockResolvedValue(null);
      E2eTestHelper.prisma.userFollow.create.mockResolvedValue({
        id: uuidv4(),
        followerId: user1Tokens.userId,
        followingId: user2Tokens.userId,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/social/follow/${user2Tokens.userId}`)
        .set(E2eTestHelper.authHeader(user1Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { isFollowing: boolean };
      };
      expect(body.success).toBe(true);
      expect(body.data.isFollowing).toBe(true);
    });

    it('should reject follow without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/social/follow/${user2Tokens.userId}`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should reject following non-existent user', async () => {
      E2eTestHelper.prisma.user.findUnique.mockImplementation((args: { where: { id?: string; phone?: string } }) => {
        if (args.where.id === user1Tokens.userId) {
          return Promise.resolve({
            id: user1Tokens.userId,
            phone: '13800138050',
            nickname: '用户8050',
            avatarUrl: null,
            role: 'user',
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/social/follow/00000000-0000-0000-0000-000000000000`)
        .set(E2eTestHelper.authHeader(user1Tokens.accessToken));

      expect(res.status).toBe(404);
    });
  });

  describe('GET /social/following', () => {
    it('should return following list for current user', async () => {
      const followId = uuidv4();
      E2eTestHelper.prisma.userFollow.findMany.mockResolvedValue([
        {
          id: followId,
          followerId: user1Tokens.userId,
          followingId: user2Tokens.userId,
          following: {
            id: user2Tokens.userId,
            nickname: '用户9050',
            avatarUrl: null,
          },
          createdAt: new Date(),
        },
      ]);
      E2eTestHelper.prisma.userFollow.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/following`)
        .set(E2eTestHelper.authHeader(user1Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: { id: string; followerId: string; followingId: string; user: { id: string; nickname: string } }[]; total: number };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);

      const followedUser = body.data.items.find(
        (item) => item.user.id === user2Tokens.userId,
      );
      expect(followedUser).toBeDefined();
    });

    it('should return empty following list for user2 (not following anyone)', async () => {
      E2eTestHelper.prisma.userFollow.findMany.mockResolvedValue([]);
      E2eTestHelper.prisma.userFollow.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/following`)
        .set(E2eTestHelper.authHeader(user2Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: unknown[] };
      };
      expect(body.success).toBe(true);
      expect(body.data.items.length).toBe(0);
    });

    it('should support pagination', async () => {
      E2eTestHelper.prisma.userFollow.findMany.mockResolvedValue([]);
      E2eTestHelper.prisma.userFollow.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/following?page=1&limit=10`)
        .set(E2eTestHelper.authHeader(user1Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: unknown[]; page: number; limit: number };
      };
      expect(body.success).toBe(true);
      expect(body.data.page).toBe(1);
      expect(body.data.limit).toBe(10);
    });

    it('should reject without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/following`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('GET /social/followers', () => {
    it('should return followers list for current user', async () => {
      const followId = uuidv4();
      E2eTestHelper.prisma.userFollow.findMany.mockResolvedValue([
        {
          id: followId,
          followerId: user1Tokens.userId,
          followingId: user2Tokens.userId,
          follower: {
            id: user1Tokens.userId,
            nickname: '用户8050',
            avatarUrl: null,
          },
          createdAt: new Date(),
        },
      ]);
      E2eTestHelper.prisma.userFollow.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/followers`)
        .set(E2eTestHelper.authHeader(user2Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: { id: string; followerId: string; followingId: string; user: { id: string; nickname: string } }[]; total: number };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);

      const follower = body.data.items.find(
        (item) => item.user.id === user1Tokens.userId,
      );
      expect(follower).toBeDefined();
    });

    it('should return empty followers for user1 (no followers)', async () => {
      E2eTestHelper.prisma.userFollow.findMany.mockResolvedValue([]);
      E2eTestHelper.prisma.userFollow.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/followers`)
        .set(E2eTestHelper.authHeader(user1Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: unknown[] };
      };
      expect(body.success).toBe(true);
      expect(body.data.items.length).toBe(0);
    });

    it('should reject without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/followers`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('GET /social/followers/:userId', () => {
    it('should return followers for a specific user', async () => {
      const followId = uuidv4();
      E2eTestHelper.prisma.userFollow.findMany.mockResolvedValue([
        {
          id: followId,
          followerId: user1Tokens.userId,
          followingId: user2Tokens.userId,
          follower: {
            id: user1Tokens.userId,
            nickname: '用户8050',
            avatarUrl: null,
          },
          createdAt: new Date(),
        },
      ]);
      E2eTestHelper.prisma.userFollow.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/followers/${user2Tokens.userId}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: { id: string }[] };
      };
      expect(body.success).toBe(true);
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /social/following/:userId', () => {
    it('should return following for a specific user', async () => {
      const followId = uuidv4();
      E2eTestHelper.prisma.userFollow.findMany.mockResolvedValue([
        {
          id: followId,
          followerId: user1Tokens.userId,
          followingId: user2Tokens.userId,
          following: {
            id: user2Tokens.userId,
            nickname: '用户9050',
            avatarUrl: null,
          },
          createdAt: new Date(),
        },
      ]);
      E2eTestHelper.prisma.userFollow.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/following/${user1Tokens.userId}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: { id: string }[] };
      };
      expect(body.success).toBe(true);
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /social/counts/:userId', () => {
    it('should return follow/follower counts', async () => {
      E2eTestHelper.prisma.userFollow.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/counts/${user1Tokens.userId}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { followersCount: number; followingCount: number };
      };
      expect(body.success).toBe(true);
      expect(typeof body.data.followersCount).toBe('number');
      expect(typeof body.data.followingCount).toBe('number');
    });
  });

  describe('GET /social/status/:userId', () => {
    it('should return follow status for authenticated user', async () => {
      E2eTestHelper.prisma.userFollow.findUnique.mockResolvedValue({
        id: uuidv4(),
        followerId: user1Tokens.userId,
        followingId: user2Tokens.userId,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/status/${user2Tokens.userId}`)
        .set(E2eTestHelper.authHeader(user1Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { isFollowing: boolean };
      };
      expect(body.success).toBe(true);
      expect(body.data.isFollowing).toBe(true);
    });

    it('should return not-following status for non-followed user', async () => {
      E2eTestHelper.prisma.userFollow.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/status/${user1Tokens.userId}`)
        .set(E2eTestHelper.authHeader(user2Tokens.accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { isFollowing: boolean };
      };
      expect(body.success).toBe(true);
      expect(body.data.isFollowing).toBe(false);
    });

    it('should reject without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/social/status/${user2Tokens.userId}`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });
});
