import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommunityController } from '../community.controller';
import { CommunityService } from '../community.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';

const MOCK_USER_ID = 'user-001';
const MOCK_POST_ID = 'post-001';
const MOCK_COMMENT_ID = 'comment-001';

function createMockService() {
  return {
    findPosts: jest.fn(),
    findPostById: jest.fn(),
    createPost: jest.fn(),
    deletePost: jest.fn(),
    togglePostLike: jest.fn(),
    createComment: jest.fn(),
    deleteComment: jest.fn(),
    toggleCommentLike: jest.fn(),
  };
}

describe('CommunityController', () => {
  let controller: CommunityController;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(async () => {
    mockService = createMockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunityController],
      providers: [
        {
          provide: CommunityService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CommunityController>(CommunityController);
  });

  // ============================================================
  // findPosts
  // ============================================================
  describe('findPosts', () => {
    it('should call service with default values', async () => {
      mockService.findPosts.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      const req = { user: { id: MOCK_USER_ID } };

      await controller.findPosts(req);

      expect(mockService.findPosts).toHaveBeenCalledWith({
        sort: undefined,
        tag: undefined,
        page: undefined,
        limit: undefined,
        userId: MOCK_USER_ID,
      });
    });

    it('should pass sort, tag, page, limit and userId to service', async () => {
      mockService.findPosts.mockResolvedValue({ items: [], total: 0, page: 2, limit: 5, totalPages: 0 });
      const req = { user: { id: MOCK_USER_ID } };

      await controller.findPosts(req, 'popular', 'summer', 2, 5);

      expect(mockService.findPosts).toHaveBeenCalledWith({
        sort: 'popular',
        tag: 'summer',
        page: 2,
        limit: 5,
        userId: MOCK_USER_ID,
      });
    });

    it('should convert string page and limit to numbers', async () => {
      mockService.findPosts.mockResolvedValue({ items: [], total: 0, page: 3, limit: 10, totalPages: 0 });
      const req = { user: { id: MOCK_USER_ID } };

      await controller.findPosts(req, undefined, undefined, '3' as unknown as number, '10' as unknown as number);

      expect(mockService.findPosts).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 10 }),
      );
    });

    it('should pass undefined for page/limit when not provided', async () => {
      mockService.findPosts.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      const req = { user: { id: MOCK_USER_ID } };

      await controller.findPosts(req, 'newest', 'tag1');

      expect(mockService.findPosts).toHaveBeenCalledWith(
        expect.objectContaining({ page: undefined, limit: undefined }),
      );
    });

    it('should handle undefined user gracefully', async () => {
      mockService.findPosts.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      const req = {};

      await controller.findPosts(req);

      expect(mockService.findPosts).toHaveBeenCalledWith(
        expect.objectContaining({ userId: undefined }),
      );
    });
  });

  // ============================================================
  // findPostById
  // ============================================================
  describe('findPostById', () => {
    it('should call service with id and userId', async () => {
      mockService.findPostById.mockResolvedValue({ id: MOCK_POST_ID });
      const req = { user: { id: MOCK_USER_ID } };

      const result = await controller.findPostById(MOCK_POST_ID, req);

      expect(mockService.findPostById).toHaveBeenCalledWith(MOCK_POST_ID, MOCK_USER_ID);
      expect((result as Record<string, unknown>).id).toBe(MOCK_POST_ID);
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.findPostById.mockRejectedValue(new NotFoundException('帖子不存在'));
      const req = { user: { id: MOCK_USER_ID } };

      await expect(controller.findPostById('non-existent', req)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================
  // createPost
  // ============================================================
  describe('createPost', () => {
    const dto: CreatePostDto = {
      content: 'Hello world',
      image_urls: ['https://example.com/img.png'],
      tags: ['test'],
    };

    it('should call service with userId and dto', async () => {
      mockService.createPost.mockResolvedValue({ id: MOCK_POST_ID, isLiked: false });

      const result = await controller.createPost(MOCK_USER_ID, dto);

      expect(mockService.createPost).toHaveBeenCalledWith(MOCK_USER_ID, dto);
      expect((result as Record<string, unknown>).id).toBe(MOCK_POST_ID);
    });
  });

  // ============================================================
  // deletePost
  // ============================================================
  describe('deletePost', () => {
    it('should call service with userId and postId', async () => {
      mockService.deletePost.mockResolvedValue(undefined);

      await controller.deletePost(MOCK_USER_ID, MOCK_POST_ID);

      expect(mockService.deletePost).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_POST_ID);
    });

    it('should propagate ForbiddenException from service', async () => {
      mockService.deletePost.mockRejectedValue(new ForbiddenException('无权删除此帖子'));

      await expect(
        controller.deletePost(MOCK_USER_ID, MOCK_POST_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.deletePost.mockRejectedValue(new NotFoundException('帖子不存在'));

      await expect(
        controller.deletePost(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // togglePostLike
  // ============================================================
  describe('togglePostLike', () => {
    it('should call service with userId and postId', async () => {
      mockService.togglePostLike.mockResolvedValue({ isLiked: true, likesCount: 6 });

      const result = await controller.togglePostLike(MOCK_USER_ID, MOCK_POST_ID);

      expect(mockService.togglePostLike).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_POST_ID);
      expect(result.isLiked).toBe(true);
      expect(result.likesCount).toBe(6);
    });
  });

  // ============================================================
  // createComment
  // ============================================================
  describe('createComment', () => {
    const dto: CreateCommentDto = {
      content: 'Nice outfit!',
    };

    it('should call service with userId, postId and dto', async () => {
      mockService.createComment.mockResolvedValue({
        id: MOCK_COMMENT_ID,
        isLiked: false,
        replies: [],
      });

      const result = await controller.createComment(MOCK_USER_ID, MOCK_POST_ID, dto);

      expect(mockService.createComment).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_POST_ID, dto);
      expect((result as Record<string, unknown>).id).toBe(MOCK_COMMENT_ID);
    });

    it('should propagate NotFoundException when post not found', async () => {
      mockService.createComment.mockRejectedValue(new NotFoundException('帖子不存在'));

      await expect(
        controller.createComment(MOCK_USER_ID, 'non-existent', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate NotFoundException when parent comment not found', async () => {
      const replyDto: CreateCommentDto = {
        content: 'Reply',
        parent_id: 'non-existent-comment',
      };
      mockService.createComment.mockRejectedValue(new NotFoundException('父评论不存在'));

      await expect(
        controller.createComment(MOCK_USER_ID, MOCK_POST_ID, replyDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when parent belongs to different post', async () => {
      const replyDto: CreateCommentDto = {
        content: 'Reply',
        parent_id: MOCK_COMMENT_ID,
      };
      mockService.createComment.mockRejectedValue(new ForbiddenException('父评论不属于该帖子'));

      await expect(
        controller.createComment(MOCK_USER_ID, MOCK_POST_ID, replyDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // deleteComment
  // ============================================================
  describe('deleteComment', () => {
    it('should call service with userId and commentId', async () => {
      mockService.deleteComment.mockResolvedValue(undefined);

      await controller.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(mockService.deleteComment).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_COMMENT_ID);
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.deleteComment.mockRejectedValue(new NotFoundException('评论不存在'));

      await expect(
        controller.deleteComment(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service', async () => {
      mockService.deleteComment.mockRejectedValue(new ForbiddenException('无权删除此评论'));

      await expect(
        controller.deleteComment(MOCK_USER_ID, MOCK_COMMENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // toggleCommentLike
  // ============================================================
  describe('toggleCommentLike', () => {
    it('should call service with userId and commentId', async () => {
      mockService.toggleCommentLike.mockResolvedValue({ isLiked: true, likesCount: 4 });

      const result = await controller.toggleCommentLike(MOCK_USER_ID, MOCK_COMMENT_ID);

      expect(mockService.toggleCommentLike).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_COMMENT_ID);
      expect(result.isLiked).toBe(true);
      expect(result.likesCount).toBe(4);
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.toggleCommentLike.mockRejectedValue(new NotFoundException('评论不存在'));

      await expect(
        controller.toggleCommentLike(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
