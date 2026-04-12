import { api } from './api';
import type { ApiResponse } from '../types';

export interface StudioOwner {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface BespokeStudio {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  city: string | null;
  address: string | null;
  specialties: string[];
  serviceTypes: string[];
  priceRange: string | null;
  portfolioImages: string[];
  rating: number;
  reviewCount: number;
  orderCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: StudioOwner;
}

export interface StudioReview {
  id: string;
  orderId: string;
  userId: string;
  studioId: string;
  rating: number;
  content: string | null;
  images: string[];
  isAnonymous: boolean;
  createdAt: string;
  user?: { id: string; nickname: string | null; avatarUrl: string | null };
}

export interface PaginatedStudios {
  items: BespokeStudio[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PaginatedReviews {
  items: StudioReview[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type StudioSortOption = 'rating_desc' | 'review_count_desc' | 'order_count_desc' | 'newest';

export interface StudioQueryParams {
  page?: number;
  limit?: number;
  city?: string;
  specialties?: string;
  serviceTypes?: string;
  priceRange?: string;
  isVerified?: boolean;
  sort?: StudioSortOption;
}

export interface CreateStudioPayload {
  name: string;
  slug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  city?: string;
  address?: string;
  specialties: string[];
  serviceTypes: string[];
  priceRange?: string;
  portfolioImages?: string[];
}

export interface UpdateStudioPayload {
  name?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  city?: string;
  address?: string;
  specialties?: string[];
  serviceTypes?: string[];
  priceRange?: string;
  portfolioImages?: string[];
  isActive?: boolean;
}

export const STUDIO_SPECIALTIES = ['西装', '旗袍', '汉服', '街头', '改造'] as const;
export const STUDIO_SERVICE_TYPES = ['量身定制', '面料选购', '改衣', '设计咨询'] as const;
export const STUDIO_PRICE_RANGES = ['1000-3000', '3000-8000', '8000+'] as const;

export const PRICE_RANGE_LABELS: Record<string, string> = {
  '1000-3000': '¥1,000 - ¥3,000',
  '3000-8000': '¥3,000 - ¥8,000',
  '8000+': '¥8,000+',
};

export const bespokeService = {
  getStudios(params: StudioQueryParams = {}): Promise<PaginatedStudios> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.city) query.set('city', params.city);
    if (params.specialties) query.set('specialties', params.specialties);
    if (params.serviceTypes) query.set('serviceTypes', params.serviceTypes);
    if (params.priceRange) query.set('priceRange', params.priceRange);
    if (params.isVerified !== undefined) query.set('isVerified', String(params.isVerified));
    if (params.sort) query.set('sort', params.sort);

    const qs = query.toString();
    return api
      .get<ApiResponse<BespokeStudio[]>>(`/bespoke/studios${qs ? `?${qs}` : ''}`)
      .then((res) => {
        if (!res.data.success || !res.data.data) {
          throw new Error(res.data.error?.message ?? '获取工作室列表失败');
        }
        return {
          items: res.data.data,
          meta: res.data.meta as PaginatedStudios['meta'],
        };
      });
  },

  getStudio(id: string): Promise<BespokeStudio> {
    return api
      .get<ApiResponse<BespokeStudio>>(`/bespoke/studios/${id}`)
      .then((res) => {
        if (!res.data.success || !res.data.data) {
          throw new Error(res.data.error?.message ?? '获取工作室详情失败');
        }
        return res.data.data;
      });
  },

  getMyStudio(): Promise<BespokeStudio> {
    return api
      .get<ApiResponse<BespokeStudio>>('/bespoke/studios/me')
      .then((res) => {
        if (!res.data.success || !res.data.data) {
          throw new Error(res.data.error?.message ?? '获取我的工作室失败');
        }
        return res.data.data;
      });
  },

  createStudio(payload: CreateStudioPayload): Promise<BespokeStudio> {
    return api
      .post<ApiResponse<BespokeStudio>>('/bespoke/studios', payload)
      .then((res) => {
        if (!res.data.success || !res.data.data) {
          throw new Error(res.data.error?.message ?? '创建工作室失败');
        }
        return res.data.data;
      });
  },

  updateStudio(id: string, payload: UpdateStudioPayload): Promise<BespokeStudio> {
    return api
      .patch<ApiResponse<BespokeStudio>>(`/bespoke/studios/${id}`, payload)
      .then((res) => {
        if (!res.data.success || !res.data.data) {
          throw new Error(res.data.error?.message ?? '更新工作室失败');
        }
        return res.data.data;
      });
  },

  getStudioReviews(
    studioId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedReviews> {
    return api
      .get<ApiResponse<StudioReview[]>>(
        `/bespoke/studios/${studioId}/reviews?page=${page}&limit=${limit}`,
      )
      .then((res) => {
        if (!res.data.success || !res.data.data) {
          throw new Error(res.data.error?.message ?? '获取评价列表失败');
        }
        return {
          items: res.data.data,
          meta: res.data.meta as PaginatedReviews['meta'],
        };
      });
  },
};
