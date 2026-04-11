import { api } from './api';
import type { ApiResponse } from '../types';

export interface ClothingImage {
  id: string;
  url: string;
  alt?: string;
}

export interface ClothingBrand {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface ClothingItem {
  id: string;
  name: string;
  brand: ClothingBrand;
  images: ClothingImage[];
  price: number;
  originalPrice?: number;
  description?: string;
  colors: ClothingColor[];
  sizes: string[];
  styleTags: string[];
  occasionTags: string[];
  seasonTags: string[];
  material?: string;
  purchaseUrl?: string;
  isFavorited: boolean;
  isInWardrobe: boolean;
  category?: string;
}

export interface ClothingColor {
  name: string;
  hex: string;
}

export interface SimilarItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  brand: string;
}

export const clothingService = {
  getClothing(id: string): Promise<ClothingItem> {
    return api
      .get<ApiResponse<ClothingItem>>(`/clothing/${id}`)
      .then((res) => {
        if (!res.data.success || !res.data.data) {
          throw new Error(res.data.error?.message ?? '获取服装详情失败');
        }
        return res.data.data;
      });
  },

  getSimilar(id: string): Promise<SimilarItem[]> {
    return api
      .get<ApiResponse<SimilarItem[]>>(`/recommendations/similar/${id}`)
      .then((res) => {
        if (!res.data.success || !res.data.data) {
          throw new Error(res.data.error?.message ?? '获取推荐失败');
        }
        return res.data.data;
      });
  },

  toggleFavorite(id: string, isFavorited: boolean): Promise<void> {
    if (isFavorited) {
      return api
        .delete<ApiResponse<null>>(`/favorites`, { data: { clothingId: id } })
        .then((res) => {
          if (!res.data.success) {
            throw new Error(res.data.error?.message ?? '取消收藏失败');
          }
        });
    }
    return api
      .post<ApiResponse<null>>('/favorites', { clothingId: id })
      .then((res) => {
        if (!res.data.success) {
          throw new Error(res.data.error?.message ?? '收藏失败');
        }
      });
  },

  addToWardrobe(id: string): Promise<void> {
    return api
      .post<ApiResponse<null>>('/wardrobe', { clothingId: id })
      .then((res) => {
        if (!res.data.success) {
          throw new Error(res.data.error?.message ?? '加入衣橱失败');
        }
      });
  },
};
