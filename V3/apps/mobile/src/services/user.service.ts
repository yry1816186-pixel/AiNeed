import { api } from './api';
import type { ApiResponse, User } from '../types';

export interface UserStats {
  favorites: number;
  tryOnCount: number;
  customOrders: number;
}

export interface UserPreferences {
  styleTags: string[];
  occasionTags: string[];
  colorPreferences: string[];
  budgetMin: number;
  budgetMax: number;
}

export interface ProfileData extends User {
  bio?: string;
  stats: UserStats;
  preferences: UserPreferences;
}

export interface UpdateProfilePayload {
  nickname?: string;
  bio?: string;
  avatarUrl?: string;
  gender?: string;
  height?: number;
  weight?: number;
  bodyType?: string;
  colorSeason?: string;
  language?: string;
}

export interface UploadImageResponse {
  url: string;
}

export const userService = {
  getProfile(): Promise<ProfileData> {
    return api
      .get<ApiResponse<ProfileData>>('/users/me')
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取用户信息失败');
        }
        return data.data;
      });
  },

  updateProfile(payload: UpdateProfilePayload): Promise<ProfileData> {
    return api
      .patch<ApiResponse<ProfileData>>('/users/me', payload)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '更新用户信息失败');
        }
        return data.data;
      });
  },

  updatePreferences(payload: Partial<UserPreferences>): Promise<UserPreferences> {
    return api
      .patch<ApiResponse<UserPreferences>>('/users/me/preferences', payload)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '更新偏好设置失败');
        }
        return data.data;
      });
  },

  uploadAvatar(file: FormData): Promise<string> {
    return api
      .post<ApiResponse<UploadImageResponse>>('/upload/image', file, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '上传图片失败');
        }
        return data.data.url;
      })
      .then((url: string) =>
        userService.updateProfile({ avatarUrl: url }).then(() => url),
      );
  },
};
