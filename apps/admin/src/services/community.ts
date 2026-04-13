import { get, put, post, del } from '@/services/request';
import type { PaginatedResponse, PaginationParams } from '@/types/api';

export interface Post {
  id: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string | null;
  content: string;
  images: string[];
  tags: string[];
  likeCount: number;
  commentCount: number;
  reportCount: number;
  status: 'published' | 'hidden' | 'reported';
  createdAt: string;
}

export interface Report {
  id: string;
  postId: string;
  reporterId: string;
  reporterNickname: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  createdAt: string;
}

export const postApi = {
  getList: (params: PaginationParams & { keyword?: string; status?: string }) =>
    get<PaginatedResponse<Post>>('/admin/community/posts', params as Record<string, unknown>),
  getDetail: (id: string) => get<Post>(`/admin/community/posts/${id}`),
  hide: (id: string) => put(`/admin/community/posts/${id}/hide`),
  show: (id: string) => put(`/admin/community/posts/${id}/show`),
  delete: (id: string) => del(`/admin/community/posts/${id}`),
};

export const reportApi = {
  getList: (params: PaginationParams & { status?: string }) =>
    get<PaginatedResponse<Report>>('/admin/community/reports', params as Record<string, unknown>),
  resolve: (id: string, action: 'hide' | 'dismiss') =>
    put(`/admin/community/reports/${id}/resolve`, { action }),
};

export const tagApi = {
  getList: (params: PaginationParams & { keyword?: string; category?: string }) =>
    get<PaginatedResponse<Tag>>('/admin/community/tags', params as Record<string, unknown>),
  create: (data: { name: string; category: string }) => post<Tag>('/admin/community/tags', data),
  update: (id: string, data: { name?: string; category?: string }) => put<Tag>(`/admin/community/tags/${id}`, data),
  delete: (id: string) => del(`/admin/community/tags/${id}`),
};
