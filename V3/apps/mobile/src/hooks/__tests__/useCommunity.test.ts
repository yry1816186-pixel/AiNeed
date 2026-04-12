import { communityService } from '../../services/community.service';
import { COMMUNITY_KEYS, SORT_LABELS } from '../useCommunity';
import type { CommunityPost, PostComment, PostListResponse, PostDetailResponse } from '../../services/community.service';

jest.mock('../../services/community.service');

const mockCommunityService = communityService as jest.Mocked<typeof communityService>;

const makePost = (overrides: Partial<CommunityPost> = {}): CommunityPost => ({
  id: 'post-1',
  userId: 'user-1',
  title: null,
  content: 'Hello World',
  imageUrls: [],
  tags: [],
  outfitId: null,
  likesCount: 0,
  commentsCount: 0,
  sharesCount: 0,
  isFeatured: false,
  status: 'published',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  user: null,
  isLiked: false,
  ...overrides,
});

const makeComment = (overrides: Partial<PostComment> = {}): PostComment => ({
  id: 'comment-1',
  postId: 'post-1',
  userId: 'user-1',
  parentId: null,
  content: 'Nice post!',
  likesCount: 0,
  createdAt: '2026-01-01',
  user: null,
  replies: [],
  isLiked: false,
  ...overrides,
});

describe('useCommunity hook logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('COMMUNITY_KEYS', () => {
    it('should generate correct all key', () => {
      expect(COMMUNITY_KEYS.all).toEqual(['community']);
    });

    it('should generate correct posts key with params', () => {
      const params = { sort: 'newest' as const, page: 1, limit: 10 };
      const key = COMMUNITY_KEYS.posts(params);
      expect(key).toEqual(['community', 'posts', params]);
    });

    it('should generate correct postDetail key', () => {
      const key = COMMUNITY_KEYS.postDetail('post-123');
      expect(key).toEqual(['community', 'post', 'post-123']);
    });

    it('should generate unique keys for different post IDs', () => {
      const key1 = COMMUNITY_KEYS.postDetail('post-1');
      const key2 = COMMUNITY_KEYS.postDetail('post-2');
      expect(key1).not.toEqual(key2);
    });

    it('should generate unique keys for different params', () => {
      const key1 = COMMUNITY_KEYS.posts({ sort: 'newest' });
      const key2 = COMMUNITY_KEYS.posts({ sort: 'popular' });
      expect(key1).not.toEqual(key2);
    });
  });

  describe('SORT_LABELS', () => {
    it('should have label for newest', () => {
      expect(SORT_LABELS['newest']).toBe('最新');
    });

    it('should have label for popular', () => {
      expect(SORT_LABELS['popular']).toBe('热门');
    });

    it('should have label for featured', () => {
      expect(SORT_LABELS['featured']).toBe('精选');
    });
  });

  describe('communityService.getPosts', () => {
    it('should call service with default params', async () => {
      const mockResponse: PostListResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockCommunityService.getPosts.mockResolvedValue(mockResponse);

      const result = await communityService.getPosts();
      expect(mockCommunityService.getPosts).toHaveBeenCalledWith();
      expect(result).toEqual(mockResponse);
    });

    it('should call service with sort params', async () => {
      const mockResponse: PostListResponse = {
        items: [makePost()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockCommunityService.getPosts.mockResolvedValue(mockResponse);

      const result = await communityService.getPosts({ sort: 'popular' });
      expect(mockCommunityService.getPosts).toHaveBeenCalledWith({ sort: 'popular' });
      expect(result.items).toHaveLength(1);
    });

    it('should handle API errors', async () => {
      mockCommunityService.getPosts.mockRejectedValue(new Error('获取帖子列表失败'));

      await expect(communityService.getPosts()).rejects.toThrow('获取帖子列表失败');
    });
  });

  describe('communityService.createPost', () => {
    it('should create a post with valid payload', async () => {
      const payload = {
        content: 'Hello World',
        image_urls: ['https://example.com/img.jpg'],
        tags: ['fashion'],
      };
      const mockPost = makePost({ content: 'Hello World' });
      mockCommunityService.createPost.mockResolvedValue(mockPost);

      const result = await communityService.createPost(payload);
      expect(mockCommunityService.createPost).toHaveBeenCalledWith(payload);
      expect(result.id).toBe('post-1');
    });
  });

  describe('communityService.togglePostLike', () => {
    it('should toggle like on a post', async () => {
      const mockLikeResponse = { isLiked: true, likesCount: 5 };
      mockCommunityService.togglePostLike.mockResolvedValue(mockLikeResponse);

      const result = await communityService.togglePostLike('post-1');
      expect(mockCommunityService.togglePostLike).toHaveBeenCalledWith('post-1');
      expect(result.isLiked).toBe(true);
      expect(result.likesCount).toBe(5);
    });
  });

  describe('communityService.createComment', () => {
    it('should create a comment on a post', async () => {
      const payload = { content: 'Nice post!' };
      const mockComment = makeComment();
      mockCommunityService.createComment.mockResolvedValue(mockComment);

      const result = await communityService.createComment('post-1', payload);
      expect(mockCommunityService.createComment).toHaveBeenCalledWith('post-1', payload);
      expect(result.id).toBe('comment-1');
    });
  });

  describe('communityService.deletePost', () => {
    it('should delete a post', async () => {
      mockCommunityService.deletePost.mockResolvedValue(undefined);

      await communityService.deletePost('post-1');
      expect(mockCommunityService.deletePost).toHaveBeenCalledWith('post-1');
    });
  });

  describe('communityService.deleteComment', () => {
    it('should delete a comment', async () => {
      mockCommunityService.deleteComment.mockResolvedValue(undefined);

      await communityService.deleteComment('comment-1');
      expect(mockCommunityService.deleteComment).toHaveBeenCalledWith('comment-1');
    });
  });

  describe('communityService.toggleCommentLike', () => {
    it('should toggle like on a comment', async () => {
      const mockResponse = { isLiked: true, likesCount: 3 };
      mockCommunityService.toggleCommentLike.mockResolvedValue(mockResponse);

      const result = await communityService.toggleCommentLike('comment-1');
      expect(result.isLiked).toBe(true);
    });
  });
});
