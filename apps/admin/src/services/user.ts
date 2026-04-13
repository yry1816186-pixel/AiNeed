import { get, put } from '@/services/request';
import type { PaginatedResponse, PaginationParams } from '@/types/api';

export interface User {
  id: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  gender: string | null;
  phone: string | null;
  status: 'active' | 'banned' | 'deactivated';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserProfile {
  userId: string;
  bodyType: string | null;
  skinTone: string | null;
  stylePreferences: string[];
  budget: string | null;
  colorSeason: string | null;
}

export interface UserStats {
  tryOnCount: number;
  favoriteCount: number;
  aiConsultCount: number;
}

export const userApi = {
  getList: (params: PaginationParams & { keyword?: string; status?: string }) =>
    get<PaginatedResponse<User>>('/users', { params }),
  getDetail: (id: string) => get<User>(`/users/${id}`),
  getProfile: (id: string) => get<UserProfile>(`/users/${id}/profile`),
  ban: (id: string) => put(`/users/${id}/ban`),
  unban: (id: string) => put(`/users/${id}/unban`),
  getStats: (id: string) => get<UserStats>(`/users/${id}/stats`),
};
