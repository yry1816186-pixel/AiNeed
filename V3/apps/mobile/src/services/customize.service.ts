import { api } from './api';
import type { ApiResponse } from '../types';

export interface DesignElement {
  type: 'image' | 'text';
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  width: number;
  height: number;
  imageUrl?: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  opacity?: number;
}

export interface DesignData {
  elements: DesignElement[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor?: string;
}

export interface CustomDesign {
  id: string;
  userId: string;
  name: string;
  designData: DesignData;
  patternImageUrl?: string;
  previewImageUrl?: string;
  productType: string;
  productTemplateId?: string;
  isPublic: boolean;
  price?: number;
  likesCount: number;
  purchasesCount: number;
  tags: string[];
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface ProductTemplate {
  id: string;
  productType: string;
  material: string;
  baseCost: number;
  suggestedPrice: number;
  uvMapUrl: string;
  previewModelUrl?: string;
  availableSizes: string[];
  printArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  podProvider?: string;
  podProductId?: string;
  isActive: boolean;
}

export interface CreateDesignPayload {
  name: string;
  designData: DesignData;
  productType: string;
  productTemplateId?: string;
  patternImageUrl?: string;
  tags?: string[];
  price?: number;
}

export interface UpdateDesignPayload {
  name?: string;
  designData?: DesignData;
  productType?: string;
  productTemplateId?: string;
  patternImageUrl?: string;
  previewImageUrl?: string;
  tags?: string[];
  price?: number;
  isPublic?: boolean;
  status?: string;
}

export interface DesignListParams {
  page?: number;
  limit?: number;
  productType?: string;
  status?: string;
  tags?: string;
  sort?: 'newest' | 'oldest' | 'most_liked' | 'most_purchased';
}

export interface DesignListResponse {
  items: CustomDesign[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function extractData<T>(response: { data: ApiResponse<T> }): T {
  const { data } = response;
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? '请求失败');
  }
  return data.data;
}

export const customizeService = {
  createDesign(payload: CreateDesignPayload): Promise<CustomDesign> {
    return api
      .post<ApiResponse<CustomDesign>>('/customize/designs', payload)
      .then(extractData);
  },

  getDesigns(params?: DesignListParams): Promise<DesignListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.productType) queryParams.set('productType', params.productType);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.tags) queryParams.set('tags', params.tags);
    if (params?.sort) queryParams.set('sort', params.sort);

    const query = queryParams.toString();
    const url = `/customize/designs${query ? `?${query}` : ''}`;

    return api.get<ApiResponse<DesignListResponse>>(url).then(extractData);
  },

  getDesign(id: string): Promise<CustomDesign> {
    return api
      .get<ApiResponse<CustomDesign>>(`/customize/designs/${id}`)
      .then(extractData);
  },

  updateDesign(id: string, payload: UpdateDesignPayload): Promise<CustomDesign> {
    return api
      .patch<ApiResponse<CustomDesign>>(`/customize/designs/${id}`, payload)
      .then(extractData);
  },

  deleteDesign(id: string): Promise<void> {
    return api
      .delete<ApiResponse<null>>(`/customize/designs/${id}`)
      .then(() => undefined);
  },

  generatePreview(id: string): Promise<CustomDesign> {
    return api
      .post<ApiResponse<CustomDesign>>(`/customize/designs/${id}/preview`)
      .then(extractData);
  },

  publishDesign(id: string): Promise<CustomDesign> {
    return api
      .post<ApiResponse<CustomDesign>>(`/customize/designs/${id}/publish`)
      .then(extractData);
  },

  getProductTemplates(productType?: string): Promise<ProductTemplate[]> {
    const query = productType ? `?productType=${productType}` : '';
    return api
      .get<ApiResponse<ProductTemplate[]>>(`/customize/product-templates${query}`)
      .then(extractData);
  },
};
