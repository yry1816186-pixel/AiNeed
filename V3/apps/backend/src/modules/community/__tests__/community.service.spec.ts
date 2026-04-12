import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommunityService } from '../community.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';

const MOCK_USER_ID = 'user-001';
const MOCK_POST_ID = 'post-001';
const MOCK_COMMENT_ID = 'comment-001';

// ---------- factory helpers ----------

function createMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    communityPost: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    postComment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    favorite: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    ...overrides,
  };
}

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_POST_ID,
    userId: MOCK_USER_ID,
    title: 'Test Title',
    content: 'Test content for the post',
    imageUrls: ['https://example.com/img.png'],
    tags: ['outfit', 'summer'],
    outfitId: null,
    status: 'published',
    likesCount: 5,
    commentsCount: 2,
    sharesCount: 0,
    isFeatured: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    user: {
      id: MOCK_USER_ID,
      nickname: 'TestUser',
      avatarUrl: 'https://example.com/avatar.png',
    },
    ...overrides,
  };
}

function makeComment(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_COMMENT_ID,
    postId: MOCK_POST_ID,
    userId: MOCK_USER_ID,
    parentId: null,
    content: 'Nice post!',
    likesCount: 3,
    createdAt: new Date('2025-01-02'),
    user: {
      id: MOCK_USER_ID,
      nickname: 'TestUser',
      avatarUrl: 'https://example.com/avatar.png',
    },
    replies: [],
    ...overrides,
  };
}

// ---------- tests ----------

describe('CommunityService', () => {
  let service: CommunityService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CommunityService>(CommunityService);
  });

  // ============================================================
  // findPosts
  // ============================================================
  describe('findPosts', () => {
    it('should return paginated published posts with default params', async () => {
      const posts = [makePost()];
      mockPrisma.communityPost.findMany.mockResolvedValue(posts);
      mockPrisma.communityPost.count.mockResolvedValue(1);
      mockPrisma.favorite.findMany.mockResolvedValue([]);

      const result = await service.findPosts({});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].isLiked).toBe(false);
      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'published' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should sort by newest (createdAt desc) by default', async () => {
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(0);

      await service.findPosts({ sort: 'newest' });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should sort by popular (likesCount desc, then createdAt desc)', async () => {
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(0);

      await service.findPosts({ sort: 'popular' });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
        }),
      );
    });

    it('should filter by featured flag when sort=featured', async () => {
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(0);

      await service.findPosts({ sort: 'featured' });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isFeatured: true }),
        }),
      );
    });

    it('should filter by tag when provided', async () => {
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(0);

      await service.findPosts({ tag: 'summer' });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tags: { has: 'summer' } }),
        }),
      );
    });

    it('should paginate correctly for page 2 with limit 10', async () => {
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(25);

      await service.findPosts({ page: 2, limit: 10 });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(25);

      const result = await service.findPosts({ limit: 10 });

      expect(result.totalPages).toBe(3);
    });

    it('should mark posts as isLiked when user has liked them', async () => {
      const post = makePost();
      mockPrisma.communityPost.findMany.mockResolvedValue([post]);
      mockPrisma.communityPost.count.mockResolvedValue(1);
      mockPrisma.favorite.findMany.mockResolvedValue([
        { targetId: MOCK_POST_ID },
      ]);

      const result = await service.findPosts({ userId: MOCK_USER_ID });

      expect(result.items[0].isLiked).toBe(true);
    });

    it('should mark posts as isLiked=false when userId is not provided', async () => {
      mockPrisma.communityPost.findMany.mockResolvedValue([makePost()]);
      mockPrisma.communityPost.count.mockResolvedValue(1);

      const result = await service.findPosts({});

      expect(result.items[0].isLiked).toBe(false);
      // favorite.findMany should NOT be called when there is no userId
      expect(mockPrisma.favorite.findMany).not.toHaveBeenCalled();
    });

    it('should return isLiked=false for all posts when list is empty', async () => {
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(0);

      const result = await service.findPosts({ userId: MOCK_USER_ID });

      expect(result.items).toHaveLength(0);
    });

    it('should use default sort for unknown sort values', async () => {
      mockPrisma.communityPost.findMany.mockResolvedValue([]);
      mockPrisma.communityPost.count.mockResolvedValue(0);

      await service.findPosts({ sort: 'unknown' as 'newest' });

      expect(mockPrisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ============================================================
  // findPostById
  // ============================================================
  describe('findPostById', () => {
    it('should return post detail with comments', async () => {
      const post = makePost();
      const comment = makeComment();
      mockPrisma.communityPost.findUnique.mockResolvedValue(post);
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.postComment.findMany.mockResolvedValue([comment]);
      mockPrisma.favorite.findMany.mockResolvedValue([]);

      const result = await service.findPostById(MOCK_POST_ID, MOCK_USER_ID);

      expect((result as Record<string, unknown>).id).toBe(MOCK_POST_ID);
      expect(result.isLiked).toBe(false);
      expect(result.comments).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent post', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(null);

      await expect(service.findPostById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return isLiked=true when user has liked the post', async () => {
      const post = makePost();
      mockPrisma.communityPost.findUnique.mockResolvedValue(post);
      mockPrisma.favorite.findUnique.mockResolvedValue({
        userId: MOCK_USER_ID,
        targetId: MOCK_POST_ID,
      });
      mockPrisma.postComment.findMany.mockResolvedValue([]);

      const result = await service.findPostById(MOCK_POST_ID, MOCK_USER_ID);

      expect(result.isLiked).toBe(true);
    });

    it('should return isLiked=false when userId is not provided', async () => {
      const post = makePost();
      mockPrisma.communityPost.findUnique.mockResolvedValue(post);
      mockPrisma.postComment.findMany.mockResolvedValue([]);

      const result = await service.findPostById(MOCK_POST_ID);

      expect(result.isLiked).toBe(false);
      expect(mockPrisma.favorite.findUnique).not.toHaveBeenCalled();
    });

    it('should include nested replies in comments', async () => {
      const post = makePost();
      const reply = makeComment({ id: 'reply-001', parentId: MOCK_COMMENT_ID });
      const comment = makeComment({ replies: [reply] });
      mockPrisma.communityPost.findUnique.mockResolvedValue(post);
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.postComment.findMany.mockResolvedValue([comment]);
      mockPrisma.favorite.findMany.mockResolvedValue([]);

      const result = await service.findPostById(MOCK_POST_ID, MOCK_USER_ID);

      expect((result.comments as Array<Record<string, unknown>>)[0].replies).toHaveLength(1);
    });

    it('should enrich comments and replies with isLiked status', async () => {
      const post = makePost();
      const reply = makeComment({ id: 'reply-001', parentId: MOCK_COMMENT_ID });
      const comment = makeComment({ replies: [reply] });
      mockPrisma.communityPost.findUnique.mockResolvedValue(post);
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.postComment.findMany.mockResolvedValue([comment]);
      mockPrisma.favorite.findMany.mockResolvedValue([
        { targetId: MOCK_COMMENT_ID },
      ]);

      const result = await service.findPostById(MOCK_POST_ID, MOCK_USER_ID);

      const comments = result.comments as Array<Record<string, unknown>>;
      expect(comments[0].isLiked).toBe(true);
      const replies = comments[0].replies as Array<Record<string, unknown>>;
      expect(replies[0].isLiked).toBe(false);
    });

    it('should handle comments with no replies', async () => {
      const post = makePost();
      const comment = makeComment({ replies: undefined });
      mockPrisma.communityPost.findUnique.mockResolvedValue(post);
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.postComment.findMany.mockResolvedValue([comment]);
      mockPrisma.favorite.findMany.mockResolvedValue([]);

      const result = await service.findPostById(MOCK_POST_ID, MOCK_USER_ID);

      const comments = result.comments as Array<Record<string, unknown>>;
      expect(comments).toHaveLength(1);
    });

    it('should mark comments as isLiked=false when userId is absent', async () => {
      const post = makePost();
      const comment = makeComment();
      mockPrisma.communityPost.findUnique.mockResolvedValue(post);
      mockPrisma.postComment.findMany.mockResolvedValue([comment]);

      const result = await service.findPostById(MOCK_POST_ID);

      const comments = result.comments as Array<Record<string, unknown>>;
      expect(comments[0].isLiked).toBe(false);
    });
  });

  // ============================================================
  // createPost
  // ============================================================
  describe('createPost', () => {
    const dto: CreatePostDto = {
      content: 'My new post',
      image_urls: ['https://example.com/a.png'],
      tags: ['fashion'],
    };

    it('should create and return a new post', async () => {
      const created = makePost({
        content: dto.content,
        imageUrls: dto.image_urls,
        tags: dto.tags,
      });
      mockPrisma.communityPost.create.mockResolvedValue(created);

      const result = await service.createPost(MOCK_USER_ID, dto);

      expect((result as Record<string, unknown>).id).toBe(MOCK_POST_ID);
      expect(result.isLiked).toBe(false);
      expect(mockPrisma.communityPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: MOCK_USER_ID,
          content: dto.content,
          imageUrls: dto.image_urls,
          tags: dto.tags,
          status: 'published',
        }),
        include: {
          user: {
            select: { id: true, nickname: true, avatarUrl: true },
          },
        },
      });
    });

    it('should create post with optional title and outfit_id', async () => {
      const fullDto: CreatePostDto = {
        title: 'Hello World',
        content: 'Content here',
        image_urls: [],
        tags: [],
        outfit_id: 'outfit-001',
      };
      const created = makePost({
        title: fullDto.title,
        outfitId: fullDto.outfit_id,
      });
      mockPrisma.communityPost.create.mockResolvedValue(created);

      await service.createPost(MOCK_USER_ID, fullDto);

      expect(mockPrisma.communityPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: fullDto.title,
          outfitId: fullDto.outfit_id,
        }),
        include: expect.any(Object),
      });
    });

    it('should default title and outfitId to null when not provided', async () => {
      const minimalDto: CreatePostDto = {
        content: 'Just content',
        image_urls: [],
      };
      const created = makePost({ title: null, outfitId: null });
      mockPrisma.communityPost.create.mockResolvedValue(created);

      await service.createPost(MOCK_USER_ID, minimalDto);

      expect(mockPrisma.communityPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: null,
          tags: [],
          outfitId: null,
        }),
        include: expect.any(Object),
      });
    });
  });

  // ============================================================
  // deletePost
  // ============================================================
  describe('deletePost', () => {
    it('should delete a post owned by the user', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(makePost());
      mockPrisma.communityPost.delete.mockResolvedValue(undefined);

      await service.deletePost(MOCK_USER_ID, MOCK_POST_ID);

      expect(mockPrisma.communityPost.delete).toHaveBeenCalledWith({
        where: { id: MOCK_POST_ID },
      });
    });

    it('should throw NotFoundException for non-existent post', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(null);

      await expect(
        service.deletePost(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the post', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(
        makePost({ userId: 'other-user' }),
      );

      await expect(
        service.deletePost(MOCK_USER_ID, MOCK_POST_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // togglePostLike
  // ============================================================
  describe('togglePostLike', () => {
    it('should like a post when not previously liked', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(makePost());
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.favorite.create.mockResolvedValue({});
      mockPrisma.communityPost.update.mockResolvedValue(makePost({ likesCount: 6 }));

      const result = await service.togglePostLike(MOCK_USER_ID, MOCK_POST_ID);

      expect(result.isLiked).toBe(true);
      expect(result.likesCount).toBe(6);
      expect(mockPrisma.favorite.create).toHaveBeenCalledWith({
        data: {
          userId: MOCK_USER_ID,
          targetType: 'post',
          targetId: MOCK_POST_ID,
        },
      });
    });

    it('should unlike a post when previously liked', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(makePost());
      mockPrisma.favorite.findUnique.mockResolvedValue({
        userId: MOCK_USER_ID,
        targetType: 'post',
        targetId: MOCK_POST_ID,
      });
      mockPrisma.favorite.delete.mockResolvedValue({});
      mockPrisma.communityPost.update.mockResolvedValue(makePost({ likesCount: 4 }));

      const result = await service.togglePostLike(MOCK_USER_ID, MOCK_POST_ID);

      expect(result.isLiked).toBe(false);
      expect(result.likesCount).toBe(4);
      expect(mockPrisma.favorite.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent post', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(null);

      await expect(
        service.togglePostLike(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should increment likesCount on like', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(makePost({ likesCount: 10 }));
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.favorite.create.mockResolvedValue({});
      mockPrisma.communityPost.update.mockResolvedValue(makePost({ likesCount: 11 }));

      await service.togglePostLike(MOCK_USER_ID, MOCK_POST_ID);

      expect(mockPrisma.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { likesCount: { increment: 1 } },
        }),
      );
    });

    it('should decrement likesCount on unlike', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(makePost({ likesCount: 10 }));
      mockPrisma.favorite.findUnique.mockResolvedValue({
        userId: MOCK_USER_ID,
        targetType: 'post',
        targetId: MOCK_POST_ID,
      });
      mockPrisma.favorite.delete.mockResolvedValue({});
      mockPrisma.communityPost.update.mockResolvedValue(makePost({ likesCount: 9 }));

      await service.togglePostLike(MOCK_USER_ID, MOCK_POST_ID);

      expect(mockPrisma.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { likesCount: { decrement: 1 } },
        }),
      );
    });
  });

  // ============================================================
  // createComment
  // ============================================================
  describe('createComment', () => {
    const dto: CreateCommentDto = {
      content: 'Great post!',
    };

    it('should create a top-level comment', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(makePost());
      mockPrisma.postComment.create.mockResolvedValue(
        makeComment({ content: dto.content }),
      );
      mockPrisma.communityPost.update.mockResolvedValue(undefined);

      const result = await service.createComment(MOCK_USER_ID, MOCK_POST_ID, dto);

      expect((result as Record<string, unknown>).content).toBe(dto.content);
      expect(result.isLiked).toBe(false);
      expect(result.replies).toEqual([]);
      expect(mockPrisma.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { commentsCount: { increment: 1 } },
        }),
      );
    });

    it('should create a reply comment when parent_id is provided', async () => {
      const replyDto: CreateCommentDto = {
        content: 'Reply to comment',
        parent_id: MOCK_COMMENT_ID,
      };
      mockPrisma.communityPost.findUnique.mockResolvedValue(makePost());
      mockPrisma.postComment.findUnique.mockResolvedValue(
        makeComment({ id: MOCK_COMMENT_ID, postId: MOCK_POST_ID }),
      );
      mockPrisma.postComment.create.mockResolvedValue(
        makeComment({
          id: 'reply-001',
          parentId: MOCK_COMMENT_ID,
          content: replyDto.content,
        }),
      );
      mockPrisma.communityPost.update.mockResolvedValue(undefined);

      const result = await service.createComment(MOCK_USER_ID, MOCK_POST_ID, replyDto);

      expect((result as Record<string, unknown>).parentId).toBe(MOCK_COMMENT_ID);
      expect(mockPrisma.postComment.findUnique).toHaveBeenCalledWith({
        where: { id: MOCK_COMMENT_ID },
      });
    });

    it('should throw NotFoundException when post does not exist', async () => {
      mockPrisma.communityPost.findUnique.mockResolvedValue(null);

      await expect(
        service.createComment(MOCK_USER_ID, 'non-existent', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when parent comment does not exist', async () => {
      const replyDto: CreateCommentDto = {
        content: 'Reply',
        parent_id: 'non-existent-comment',
      };
      mockPrisma.communityPost.findUnique.mockResolvedValue(makePost());
      mockPrisma.postComment.findUnique.mockResolvedValue(null);

      await expect(
        service.createComment(MOCK_USER_ID, MOCK_POST_ID, replyDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when parent comment belongs to different post', async () => {
      const replyDto: CreateCommentDto = {
        content: 'Reply',
        parent_id: MOCK_COMMENT_ID,
      };
      mockPrisma.communityPost.findUnique.mockResolvedValue(makePost());
      mockPrisma.postComment.findUnique.mockResolvedValue(
        makeComment({ id: MOCK_COMMENT_ID, postId: 'other-post' }),
      );

      await expect(
        service.createComment(MOCK_USER_ID, MOCK_POST_ID, replyDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // deleteComment
  // ============================================================
  describe('deleteComment', () => {
    it('should delete a comment owned by the user', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(makeComment());
      mockPrisma.postComment.count.mockResolvedValue(0);
      mockPrisma.communityPost.update.mockResolvedValue(undefined);
      mockPrisma.postComment.delete.mockResolvedValue(undefined);

      await service.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(mockPrisma.postComment.delete).toHaveBeenCalledWith({
        where: { id: MOCK_COMMENT_ID },
      });
    });

    it('should throw NotFoundException for non-existent comment', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteComment(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the comment', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(
        makeComment({ userId: 'other-user' }),
      );

      await expect(
        service.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should decrement post commentsCount by 1 + number of replies', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(makeComment());
      mockPrisma.postComment.count.mockResolvedValue(3);
      mockPrisma.communityPost.update.mockResolvedValue(undefined);
      mockPrisma.postComment.delete.mockResolvedValue(undefined);

      await service.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(mockPrisma.communityPost.update).toHaveBeenCalledWith({
        where: { id: MOCK_POST_ID },
        data: { commentsCount: { decrement: 4 } },
      });
    });

    it('should decrement commentsCount by 1 when comment has no replies', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(makeComment());
      mockPrisma.postComment.count.mockResolvedValue(0);
      mockPrisma.communityPost.update.mockResolvedValue(undefined);
      mockPrisma.postComment.delete.mockResolvedValue(undefined);

      await service.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(mockPrisma.communityPost.update).toHaveBeenCalledWith({
        where: { id: MOCK_POST_ID },
        data: { commentsCount: { decrement: 1 } },
      });
    });
  });

  // ============================================================
  // toggleCommentLike
  // ============================================================
  describe('toggleCommentLike', () => {
    it('should like a comment when not previously liked', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(makeComment());
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.favorite.create.mockResolvedValue({});
      mockPrisma.postComment.update.mockResolvedValue(makeComment({ likesCount: 4 }));

      const result = await service.toggleCommentLike(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(result.isLiked).toBe(true);
      expect(result.likesCount).toBe(4);
      expect(mockPrisma.favorite.create).toHaveBeenCalledWith({
        data: {
          userId: MOCK_USER_ID,
          targetType: 'comment',
          targetId: MOCK_COMMENT_ID,
        },
      });
    });

    it('should unlike a comment when previously liked', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(makeComment());
      mockPrisma.favorite.findUnique.mockResolvedValue({
        userId: MOCK_USER_ID,
        targetType: 'comment',
        targetId: MOCK_COMMENT_ID,
      });
      mockPrisma.favorite.delete.mockResolvedValue({});
      mockPrisma.postComment.update.mockResolvedValue(makeComment({ likesCount: 2 }));

      const result = await service.toggleCommentLike(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(result.isLiked).toBe(false);
      expect(result.likesCount).toBe(2);
      expect(mockPrisma.favorite.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent comment', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleCommentLike(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should increment likesCount on like', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(makeComment({ likesCount: 10 }));
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.favorite.create.mockResolvedValue({});
      mockPrisma.postComment.update.mockResolvedValue(makeComment({ likesCount: 11 }));

      await service.toggleCommentLike(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(mockPrisma.postComment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { likesCount: { increment: 1 } },
        }),
      );
    });

    it('should decrement likesCount on unlike', async () => {
      mockPrisma.postComment.findUnique.mockResolvedValue(makeComment({ likesCount: 10 }));
      mockPrisma.favorite.findUnique.mockResolvedValue({
        userId: MOCK_USER_ID,
        targetType: 'comment',
        targetId: MOCK_COMMENT_ID,
      });
      mockPrisma.favorite.delete.mockResolvedValue({});
      mockPrisma.postComment.update.mockResolvedValue(makeComment({ likesCount: 9 }));

      await service.toggleCommentLike(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(mockPrisma.postComment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { likesCount: { decrement: 1 } },
        }),
      );
    });
  });
});
