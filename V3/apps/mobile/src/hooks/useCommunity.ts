import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  communityService,
  type PostListParams,
  type CreatePostPayload,
  type CreateCommentPayload,
  type PostSortOption,
} from '../services/community.service';

export type { PostSortOption };

export const COMMUNITY_KEYS = {
  all: ['community'] as const,
  posts: (params: PostListParams) => ['community', 'posts', params] as const,
  postDetail: (postId: string) => ['community', 'post', postId] as const,
};

export function usePostList(params: PostListParams = {}) {
  return useQuery({
    queryKey: COMMUNITY_KEYS.posts(params),
    queryFn: () => communityService.getPosts(params),
  });
}

export function usePostDetail(postId: string) {
  return useQuery({
    queryKey: COMMUNITY_KEYS.postDetail(postId),
    queryFn: () => communityService.getPostById(postId),
    enabled: !!postId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePostPayload) => communityService.createPost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => communityService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
    },
  });
}

export function useTogglePostLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => communityService.togglePostLike(postId),
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.postDetail(postId) });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, payload }: { postId: string; payload: CreateCommentPayload }) =>
      communityService.createComment(postId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.postDetail(variables.postId) });
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => communityService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
    },
  });
}

export function useToggleCommentLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => communityService.toggleCommentLike(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
    },
  });
}

export const SORT_LABELS: Record<string, string> = {
  newest: '最新',
  popular: '热门',
  featured: '精选',
};
