import { api } from './api';
import type { ApiResponse } from '../types';

export type ProductType = 'tshirt' | 'hoodie' | 'cap' | 'bag' | 'phone_case';
export type MarketSortOption = 'newest' | 'popular';
export type ReportReason = 'inappropriate' | 'copyright' | 'spam' | 'violence' | 'other';

export interface Designer {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface DesignListItem {
  id: string;
  name: string;
  previewImageUrl: string | null;
  productType: string;
  likesCount: number;
  downloadsCount: number;
  tags: string[];
  createdAt: string;
  designer: Designer;
  isLiked: boolean;
}

export interface DesignDetail extends DesignListItem {
  designData: Record<string, unknown>;
  patternImageUrl: string | null;
  status: string;
  updatedAt: string;
}

export interface DesignListParams {
  sort?: MarketSortOption;
  product_type?: string;
  tag?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface DesignListResponse {
  items: DesignListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface LikeResponse {
  isLiked: boolean;
  likesCount: number;
}

export interface ReportParams {
  reason: ReportReason;
  description?: string;
}

export interface ReportResponse {
  reportId: string;
  status: string;
  reviewResult: Record<string, unknown> | null;
}

export interface DownloadResponse {
  designData: Record<string, unknown>;
  patternImageUrl: string | null;
  downloadsCount: number;
}

export interface PublishResponse {
  designId: string;
  status: string;
  reviewResult: Record<string, unknown> | null;
}

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  tshirt: 'T恤',
  hoodie: '卫衣',
  cap: '帽子',
  bag: '包包',
  phone_case: '手机壳',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate: '不当内容',
  copyright: '侵权',
  spam: '垃圾信息',
  violence: '暴力内容',
  other: '其他',
};

export const designMarketService = {
  listDesigns(params: DesignListParams = {}): Promise<DesignListResponse> {
    return api
      .get<ApiResponse<DesignListResponse>>('/market/designs', { params })
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取设计列表失败');
        }
        return data.data;
      });
  },

  getDesignDetail(designId: string): Promise<DesignDetail> {
    return api
      .get<ApiResponse<DesignDetail>>(`/market/designs/${designId}`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取设计详情失败');
        }
        return data.data;
      });
  },

  toggleLike(designId: string): Promise<LikeResponse> {
    return api
      .post<ApiResponse<LikeResponse>>(`/market/designs/${designId}/like`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '操作失败');
        }
        return data.data;
      });
  },

  reportDesign(designId: string, params: ReportParams): Promise<ReportResponse> {
    return api
      .post<ApiResponse<ReportResponse>>(`/market/designs/${designId}/report`, params)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '举报失败');
        }
        return data.data;
      });
  },

  downloadDesign(designId: string): Promise<DownloadResponse> {
    return api
      .get<ApiResponse<DownloadResponse>>(`/market/designs/${designId}/download`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '下载失败');
        }
        return data.data;
      });
  },

  publishDesign(designId: string): Promise<PublishResponse> {
    return api
      .post<ApiResponse<PublishResponse>>(`/market/designs/${designId}/publish`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '发布失败');
        }
        return data.data;
      });
  },
};
