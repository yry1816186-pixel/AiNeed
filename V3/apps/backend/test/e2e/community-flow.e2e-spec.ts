import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { CommunityModule } from '../../src/modules/community/community.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { E2eTestHelper, API_PREFIX } from './utils/test-app.helper';

describe('Community Flow E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;
  let postId: string;

  function reRegisterUserMock(): void {
    E2eTestHelper.prisma.user.findUnique.mockImplementation((args: { where: { id?: string; phone?: string } }) => {
      if (args.where.id === userId || args.where.phone === '13800138040') {
        return Promise.resolve({
          id: userId,
          phone: '13800138040',
          nickname: '用户8040',
          avatarUrl: null,
          role: 'user',
        });
      }
      return Promise.resolve(null);
    });
  }

  beforeAll(async () => {
    app = await E2eTestHelper.initApp({ modules: [AuthModule, CommunityModule] });
    const tokens = await E2eTestHelper.registerTestUser('13800138040');
    accessToken = tokens.accessToken;
    userId = tokens.userId;
  });

  afterAll(async () => {
    await E2eTestHelper.closeApp();
  });

  afterEach(() => {
    E2eTestHelper.resetMocks();
    reRegisterUserMock();
  });

  describe('POST /community/posts', () => {
    it('should create a new post', async () => {
      postId = uuidv4();
      E2eTestHelper.prisma.communityPost.create.mockResolvedValue({
        id: postId,
        userId,
        title: '今日穿搭分享',
        content: '白色T恤搭配牛仔裤，简约又好看！',
        imageUrls: ['https://example.com/outfit1.jpg'],
        tags: ['穿搭', '简约'],
        outfitId: null,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isFeatured: false,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, nickname: '用户8040', avatarUrl: null },
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({
          title: '今日穿搭分享',
          content: '白色T恤搭配牛仔裤，简约又好看！',
          image_urls: ['https://example.com/outfit1.jpg'],
          tags: ['穿搭', '简约'],
        })
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: {
          id: string;
          title: string;
          content: string;
          tags: string[];
          likesCount: number;
          commentsCount: number;
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe('今日穿搭分享');
      expect(body.data.content).toBe('白色T恤搭配牛仔裤，简约又好看！');
      expect(body.data.tags).toEqual(expect.arrayContaining(['穿搭', '简约']));
      expect(body.data.likesCount).toBe(0);
      expect(body.data.commentsCount).toBe(0);
      postId = body.data.id;
    });

    it('should create post without title', async () => {
      E2eTestHelper.prisma.communityPost.create.mockResolvedValue({
        id: uuidv4(),
        userId,
        title: null,
        content: '只有内容的帖子',
        imageUrls: ['https://example.com/img.jpg'],
        tags: [],
        outfitId: null,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isFeatured: false,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, nickname: '用户8040', avatarUrl: null },
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({
          content: '只有内容的帖子',
          image_urls: ['https://example.com/img.jpg'],
        })
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: { id: string; content: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
    });

    it('should reject post without content', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({
          title: 'No content',
          image_urls: ['https://example.com/img.jpg'],
        })
        .expect(400);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should reject post without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts`)
        .send({
          content: 'test',
          image_urls: ['https://example.com/img.jpg'],
        })
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should reject post with too many images', async () => {
      const images = Array.from(
        { length: 10 },
        (_, i) => `https://example.com/img${i}.jpg`,
      );

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({
          content: 'too many images',
          image_urls: images,
        })
        .expect(400);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('GET /community/posts', () => {
    it('should return posts list', async () => {
      E2eTestHelper.prisma.communityPost.findMany.mockResolvedValue([
        {
          id: postId,
          userId,
          title: '今日穿搭分享',
          content: '白色T恤搭配牛仔裤，简约又好看！',
          imageUrls: ['https://example.com/outfit1.jpg'],
          tags: ['穿搭', '简约'],
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          isFeatured: false,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: userId, nickname: '用户8040', avatarUrl: null },
        },
      ]);
      E2eTestHelper.prisma.communityPost.count.mockResolvedValue(1);
      E2eTestHelper.prisma.favorite.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/community/posts`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: { id: string; content: string }[]; total: number };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter posts by tag', async () => {
      E2eTestHelper.prisma.communityPost.findMany.mockResolvedValue([]);
      E2eTestHelper.prisma.communityPost.count.mockResolvedValue(0);
      E2eTestHelper.prisma.favorite.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/community/posts?tag=穿搭`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: unknown[] };
      };
      expect(body.success).toBe(true);
    });
  });

  describe('GET /community/posts/:id', () => {
    it('should return post detail', async () => {
      E2eTestHelper.prisma.communityPost.findUnique.mockResolvedValue({
        id: postId,
        userId,
        title: '今日穿搭分享',
        content: '白色T恤搭配牛仔裤，简约又好看！',
        imageUrls: ['https://example.com/outfit1.jpg'],
        tags: ['穿搭', '简约'],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isFeatured: false,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, nickname: '用户8040', avatarUrl: null },
      });
      E2eTestHelper.prisma.favorite.findUnique.mockResolvedValue(null);
      E2eTestHelper.prisma.postComment.findMany.mockResolvedValue([]);
      E2eTestHelper.prisma.favorite.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/community/posts/${postId}`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { id: string; title: string; content: string; likesCount: number; isLiked: boolean; comments: unknown[] };
      };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(postId);
    });

    it('should return 404 for non-existent post', async () => {
      E2eTestHelper.prisma.communityPost.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/community/posts/00000000-0000-0000-0000-000000000000`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(404);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('POST /community/posts/:id/comments', () => {
    it('should add a comment to a post', async () => {
      E2eTestHelper.prisma.communityPost.findUnique.mockResolvedValue({
        id: postId,
        userId,
        title: '今日穿搭分享',
        content: '白色T恤搭配牛仔裤，简约又好看！',
        imageUrls: ['https://example.com/outfit1.jpg'],
        tags: ['穿搭', '简约'],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isFeatured: false,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      E2eTestHelper.prisma.postComment.create.mockResolvedValue({
        id: uuidv4(),
        postId,
        userId,
        parentId: null,
        content: '好看!',
        likesCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, nickname: '用户8040', avatarUrl: null },
      });
      E2eTestHelper.prisma.communityPost.update.mockResolvedValue({
        id: postId,
        commentsCount: 1,
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts/${postId}/comments`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({ content: '好看!' })
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: { content: string; isLiked: boolean };
      };
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('好看!');
      expect(body.data.isLiked).toBe(false);
    });

    it('should reject comment without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts/${postId}/comments`)
        .send({ content: 'test' })
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should reject comment on non-existent post', async () => {
      E2eTestHelper.prisma.communityPost.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts/00000000-0000-0000-0000-000000000000/comments`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({ content: 'test' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /community/posts/:id/like', () => {
    it('should toggle like on a post (like)', async () => {
      E2eTestHelper.prisma.communityPost.findUnique.mockResolvedValue({
        id: postId,
        userId,
        likesCount: 0,
        commentsCount: 1,
        status: 'published',
      });
      E2eTestHelper.prisma.favorite.findUnique.mockResolvedValue(null);
      E2eTestHelper.prisma.favorite.create.mockResolvedValue({
        id: uuidv4(),
        userId,
        targetType: 'post',
        targetId: postId,
        createdAt: new Date(),
      });
      E2eTestHelper.prisma.communityPost.update.mockResolvedValue({
        id: postId,
        likesCount: 1,
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts/${postId}/like`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: { isLiked: boolean; likesCount: number };
      };
      expect(body.success).toBe(true);
      expect(body.data.isLiked).toBe(true);
    });

    it('should toggle like on a post (unlike)', async () => {
      const existingFavId = uuidv4();
      E2eTestHelper.prisma.communityPost.findUnique.mockResolvedValue({
        id: postId,
        userId,
        likesCount: 1,
        commentsCount: 1,
        status: 'published',
      });
      E2eTestHelper.prisma.favorite.findUnique.mockResolvedValue({
        id: existingFavId,
        userId,
        targetType: 'post',
        targetId: postId,
        createdAt: new Date(),
      });
      E2eTestHelper.prisma.favorite.delete.mockResolvedValue({
        id: existingFavId,
        userId,
        targetType: 'post',
        targetId: postId,
        createdAt: new Date(),
      });
      E2eTestHelper.prisma.communityPost.update.mockResolvedValue({
        id: postId,
        likesCount: 0,
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts/${postId}/like`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: { isLiked: boolean };
      };
      expect(body.success).toBe(true);
      expect(body.data.isLiked).toBe(false);
    });

    it('should reject like without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/community/posts/${postId}/like`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('DELETE /community/posts/:id', () => {
    it('should delete own post', async () => {
      const deletePostId = uuidv4();
      E2eTestHelper.prisma.communityPost.findUnique.mockResolvedValue({
        id: deletePostId,
        userId,
        title: 'to be deleted',
        content: 'delete me',
        imageUrls: ['https://example.com/del.jpg'],
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isFeatured: false,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      E2eTestHelper.prisma.communityPost.delete.mockResolvedValue({
        id: deletePostId,
        userId,
      });

      const res = await request(app.getHttpServer())
        .delete(`${API_PREFIX}/community/posts/${deletePostId}`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(200);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(true);
    });

    it('should reject deleting another users post', async () => {
      const otherUserId = uuidv4();
      const otherPostId = uuidv4();
      E2eTestHelper.prisma.communityPost.findUnique.mockResolvedValue({
        id: otherPostId,
        userId: otherUserId,
        title: 'other user post',
        content: 'not yours',
        imageUrls: ['https://example.com/other.jpg'],
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isFeatured: false,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .delete(`${API_PREFIX}/community/posts/${otherPostId}`)
        .set(E2eTestHelper.authHeader(accessToken));

      expect(res.status).toBe(403);
    });
  });
});
