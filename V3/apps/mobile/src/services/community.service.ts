import { api } from './api';
import type { ApiResponse } from '../types';

export type PostSortOption = 'newest' | 'popular' | 'featured';

export interface PostAuthor {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface CommunityPost {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  imageUrls: string[];
  tags: string[];
  outfitId: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isFeatured: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: PostAuthor | null;
  isLiked: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  createdAt: string;
  user: PostAuthor | null;
  replies: PostComment[];
  isLiked: boolean;
}

export interface PostListParams {
  sort?: PostSortOption;
  tag?: string;
  page?: number;
  limit?: number;
}

export interface PostListResponse {
  items: CommunityPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PostDetailResponse extends Omit<CommunityPost, 'commentsCount'> {
  commentsCount: number;
  comments: PostComment[];
}

export interface LikeResponse {
  isLiked: boolean;
  likesCount: number;
}

export interface CreatePostPayload {
  title?: string;
  content: string;
  image_urls: string[];
  tags?: string[];
  outfit_id?: string;
}

export interface CreateCommentPayload {
  content: string;
  parent_id?: string;
}

export const communityService = {
  getPosts(params: PostListParams = {}): Promise<PostListResponse> {
    return api
      .get<ApiResponse<PostListResponse>>('/community/posts', { params })
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取帖子列表失败');
        }
        return data.data;
      });
  },

  getPostById(postId: string): Promise<PostDetailResponse> {
    return api
      .get<ApiResponse<PostDetailResponse>>(`/community/posts/${postId}`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取帖子详情失败');
        }
        return data.data;
      });
  },

  createPost(payload: CreatePostPayload): Promise<CommunityPost> {
    return api
      .post<ApiResponse<CommunityPost>>('/community/posts', payload)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '发帖失败');
        }
        return data.data;
      });
  },

  deletePost(postId: string): Promise<void> {
    return api
      .delete<ApiResponse<null>>(`/community/posts/${postId}`)
      .then(({ data }) => {
        if (!data.success) {
          throw new Error(data.error?.message ?? '删除帖子失败');
        }
      });
  },

  togglePostLike(postId: string): Promise<LikeResponse> {
    return api
      .post<ApiResponse<LikeResponse>>(`/community/posts/${postId}/like`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '点赞操作失败');
        }
        return data.data;
      });
  },

  createComment(postId: string, payload: CreateCommentPayload): Promise<PostComment> {
    return api
      .post<ApiResponse<PostComment>>(`/community/posts/${postId}/comments`, payload)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '评论失败');
        }
        return data.data;
      });
  },

  deleteComment(commentId: string): Promise<void> {
    return api
      .delete<ApiResponse<null>>(`/community/comments/${commentId}`)
      .then(({ data }) => {
        if (!data.success) {
          throw new Error(data.error?.message ?? '删除评论失败');
        }
      });
  },

  toggleCommentLike(commentId: string): Promise<LikeResponse> {
    return api
      .post<ApiResponse<LikeResponse>>(`/community/comments/${commentId}/like`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '评论点赞失败');
        }
        return data.data;
      });
  },
};
