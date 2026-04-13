import { get, put, del } from '@/services/request';
import type { PaginatedResponse, PaginationParams } from '@/types/api';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  categories: string[];
  priceRange: string;
  isActive: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  businessLicense: string | null;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  brandId: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  category: string;
  subcategory: string | null;
  colors: string[];
  sizes: string[];
  tags: string[];
  price: string;
  originalPrice: string | null;
  currency: string;
  stock: number;
  images: string[];
  mainImage: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isDeleted: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export const brandApi = {
  getList: (params: PaginationParams & { keyword?: string; verified?: boolean; isActive?: boolean }) =>
    get<PaginatedResponse<Brand>>('/admin/brands', { params } as Record<string, unknown>),
  getDetail: (id: string) => get<Brand>(`/admin/brands/${id}`),
  verify: (id: string) => put(`/admin/brands/${id}/verify`),
  reject: (id: string, reason?: string) => put(`/admin/brands/${id}/reject`, { reason }),
  activate: (id: string) => put(`/admin/brands/${id}/activate`),
  deactivate: (id: string) => put(`/admin/brands/${id}/deactivate`),
};

export const productApi = {
  getList: (params: PaginationParams & { brandId?: string; category?: string; isActive?: boolean }) =>
    get<PaginatedResponse<Product>>('/admin/products', { params } as Record<string, unknown>),
  getDetail: (id: string) => get<Product>(`/admin/products/${id}`),
  activate: (id: string) => put(`/admin/products/${id}/activate`),
  deactivate: (id: string) => put(`/admin/products/${id}/deactivate`),
  feature: (id: string) => put(`/admin/products/${id}/feature`),
  unfeature: (id: string) => put(`/admin/products/${id}/unfeature`),
  delete: (id: string) => del(`/admin/products/${id}`),
};
