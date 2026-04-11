import { api } from './api';
import type { ApiResponse } from '../types';

export type ClothingCategory = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'bag' | 'accessory';

export interface ClothingColor {
  name: string;
  hex: string;
}

export interface WardrobeItem {
  id: string;
  clothingId: string;
  name: string;
  category: ClothingCategory;
  color: ClothingColor;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  brand: string | null;
  createdAt: string;
}

export interface WardrobeListParams {
  page?: number;
  limit?: number;
  category?: ClothingCategory;
}

export interface WardrobeListResponse {
  items: WardrobeItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoryStat {
  category: ClothingCategory;
  count: number;
}

export interface ColorStat {
  name: string;
  hex: string;
  count: number;
}

export interface WardrobeStatsResponse {
  total: number;
  categories: CategoryStat[];
  colors: ColorStat[];
}

export const wardrobeService = {
  getWardrobe(params: WardrobeListParams = {}): Promise<WardrobeListResponse> {
    return api
      .get<ApiResponse<WardrobeListResponse>>('/wardrobe', { params })
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取衣橱失败');
        }
        return data.data;
      });
  },

  addToWardrobe(clothingId: string): Promise<WardrobeItem> {
    return api
      .post<ApiResponse<WardrobeItem>>('/wardrobe', { clothingId })
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '添加失败');
        }
        return data.data;
      });
  },

  removeFromWardrobe(id: string): Promise<void> {
    return api
      .delete<ApiResponse<null>>(`/wardrobe/${id}`)
      .then(({ data }) => {
        if (!data.success) {
          throw new Error(data.error?.message ?? '删除失败');
        }
      });
  },

  getStats(): Promise<WardrobeStatsResponse> {
    return api
      .get<ApiResponse<WardrobeStatsResponse>>('/wardrobe/stats')
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取统计失败');
        }
        return data.data;
      });
  },
};
