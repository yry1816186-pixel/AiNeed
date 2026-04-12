import { api } from './api';
import type { ApiResponse } from '../types';

export interface OutfitItemInput {
  name: string;
  color: string;
  category: 'top' | 'bottom' | 'outer' | 'shoes' | 'accessory' | 'dress';
}

export interface GenerateOutfitImagePayload {
  items: OutfitItemInput[];
  occasion: string;
  styleTips?: string;
}

export interface OutfitImageResult {
  id: string;
  userId: string;
  items: OutfitItemInput[];
  occasion?: string;
  styleTips?: string;
  prompt?: string;
  imageUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  cost: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface OutfitImageHistoryResponse {
  items: OutfitImageResult[];
  total: number;
  page: number;
  limit: number;
}

export const outfitImageService = {
  generate(payload: GenerateOutfitImagePayload): Promise<OutfitImageResult> {
    return api
      .post<ApiResponse<OutfitImageResult>>('/outfit-image/generate', payload)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '生成穿搭效果图失败');
        }
        return data.data;
      });
  },

  getById(id: string): Promise<OutfitImageResult> {
    return api
      .get<ApiResponse<OutfitImageResult>>(`/outfit-image/${id}`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取穿搭效果图失败');
        }
        return data.data;
      });
  },

  history(page: number = 1, limit: number = 20): Promise<OutfitImageHistoryResponse> {
    return api
      .get<ApiResponse<OutfitImageResult[]>>('/outfit-image/history', {
        params: { page, limit },
      })
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取历史记录失败');
        }
        return {
          items: data.data,
          total: data.meta?.total ?? 0,
          page: data.meta?.page ?? page,
          limit: data.meta?.limit ?? limit,
        };
      });
  },
};
