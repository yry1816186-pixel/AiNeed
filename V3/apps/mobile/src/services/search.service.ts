import { api } from './api';
import type { ApiResponse } from '../types';

export type SearchTab = 'all' | 'clothing' | 'post' | 'user';

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

export interface SearchFilters {
  priceMin?: number;
  priceMax?: number;
  colors?: string[];
  styles?: string[];
  brands?: string[];
}

export interface SearchParams {
  q: string;
  tab?: SearchTab;
  sort?: SortOption;
  page?: number;
  limit?: number;
  filters?: SearchFilters;
}

export interface ClothingItem {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  brand: string;
  category: string;
}

export interface PostItem {
  id: string;
  title: string;
  coverUrl: string;
  authorName: string;
  authorAvatar: string;
  likeCount: number;
  height: number;
}

export interface UserItem {
  id: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  followerCount: number;
  isFollowing: boolean;
}

export interface SearchSuggestion {
  text: string;
  type: 'clothing' | 'post' | 'user';
}

export interface HotKeyword {
  id: string;
  text: string;
  heat: number;
}

export interface SearchHistoryItem {
  id: string;
  text: string;
  searchedAt: string;
}

export interface SearchResult {
  clothing: ClothingItem[];
  posts: PostItem[];
  users: UserItem[];
  total: number;
  page: number;
  limit: number;
}

export async function search(params: SearchParams): Promise<SearchResult> {
  const { data } = await api.get<ApiResponse<SearchResult>>('/search', { params });
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? '搜索失败');
  }
  return data.data;
}

export async function getSuggestions(q: string): Promise<SearchSuggestion[]> {
  const { data } = await api.get<ApiResponse<SearchSuggestion[]>>('/search/suggestions', { params: { q } });
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? '获取建议失败');
  }
  return data.data;
}

export async function getHotKeywords(): Promise<HotKeyword[]> {
  const { data } = await api.get<ApiResponse<HotKeyword[]>>('/search/hot');
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? '获取热门搜索失败');
  }
  return data.data;
}

export async function getHistory(): Promise<SearchHistoryItem[]> {
  const { data } = await api.get<ApiResponse<SearchHistoryItem[]>>('/search/history');
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? '获取搜索历史失败');
  }
  return data.data;
}

export async function deleteHistory(id: string): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>(`/search/history/${id}`);
  if (!data.success) {
    throw new Error(data.error?.message ?? '删除搜索历史失败');
  }
}

export async function clearHistory(): Promise<void> {
  const { data } = await api.delete<ApiResponse<null>>('/search/history');
  if (!data.success) {
    throw new Error(data.error?.message ?? '清空搜索历史失败');
  }
}
