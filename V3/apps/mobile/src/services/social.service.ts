import { api } from './api';
import type {
  ApiResponse,
  FollowItem,
  FollowToggleResult,
  FollowStatus,
  FollowCounts,
  User,
  CommunityPost,
} from '../types';

export const socialService = {
  toggleFollow: async (
    userId: string,
  ): Promise<FollowToggleResult> => {
    const { data } = await api.post<ApiResponse<FollowToggleResult>>(
      `/social/follow/${userId}`,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '操作失败');
    }
    return data.data;
  },

  getMyFollowers: async (
    page = 1,
    limit = 20,
  ): Promise<{ items: FollowItem[]; total: number }> => {
    const { data } = await api.get<
      ApiResponse<FollowItem[]>
    >('/social/followers', {
      params: { page, limit },
    });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取粉丝列表失败');
    }
    return {
      items: data.data,
      total: data.meta?.total ?? 0,
    };
  },

  getMyFollowing: async (
    page = 1,
    limit = 20,
  ): Promise<{ items: FollowItem[]; total: number }> => {
    const { data } = await api.get<
      ApiResponse<FollowItem[]>
    >('/social/following', {
      params: { page, limit },
    });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取关注列表失败');
    }
    return {
      items: data.data,
      total: data.meta?.total ?? 0,
    };
  },

  getUserFollowers: async (
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: FollowItem[]; total: number }> => {
    const { data } = await api.get<
      ApiResponse<FollowItem[]>
    >(`/social/followers/${userId}`, {
      params: { page, limit },
    });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取粉丝列表失败');
    }
    return {
      items: data.data,
      total: data.meta?.total ?? 0,
    };
  },

  getUserFollowing: async (
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: FollowItem[]; total: number }> => {
    const { data } = await api.get<
      ApiResponse<FollowItem[]>
    >(`/social/following/${userId}`, {
      params: { page, limit },
    });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取关注列表失败');
    }
    return {
      items: data.data,
      total: data.meta?.total ?? 0,
    };
  },

  getFollowStatus: async (
    userId: string,
  ): Promise<FollowStatus> => {
    const { data } = await api.get<ApiResponse<FollowStatus>>(
      `/social/status/${userId}`,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取关注状态失败');
    }
    return data.data;
  },

  getFollowCounts: async (
    userId: string,
  ): Promise<FollowCounts> => {
    const { data } = await api.get<ApiResponse<FollowCounts>>(
      `/social/counts/${userId}`,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取关注数失败');
    }
    return data.data;
  },

  getUserProfile: async (
    userId: string,
  ): Promise<User> => {
    const { data } = await api.get<ApiResponse<User>>(
      `/users/${userId}/profile`,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取用户信息失败');
    }
    return data.data;
  },

  getUserPosts: async (
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ items: CommunityPost[]; total: number }> => {
    const { data } = await api.get<
      ApiResponse<CommunityPost[]>
    >('/community/posts', {
      params: { user_id: userId, page, limit },
    });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取帖子失败');
    }
    return {
      items: data.data,
      total: data.meta?.total ?? 0,
    };
  },
};
