import { api } from './api';
import type { ApiResponse, User } from '../types';

export interface ClothingRecommendation {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  category: string;
}

export interface UserAvatarData {
  id: string;
  userId: string;
  templateId: string;
  avatarParams: Record<string, unknown>;
  clothingMap?: Record<string, { color: string; type: string; pattern?: string }>;
  thumbnailUrl?: string;
}

export const homeService = {
  getDailyRecommendations: async (): Promise<ClothingRecommendation[]> => {
    const { data } = await api.get<ApiResponse<ClothingRecommendation[]>>(
      '/clothing/recommend',
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取推荐失败');
    }
    return data.data;
  },

  getUserAvatar: async (): Promise<UserAvatarData> => {
    const { data } = await api.get<ApiResponse<UserAvatarData>>('/avatar/me');
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取形象失败');
    }
    return data.data;
  },

  getUserProfile: async (): Promise<User> => {
    const { data } = await api.get<ApiResponse<User>>('/users/me');
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取用户信息失败');
    }
    return data.data;
  },
};
