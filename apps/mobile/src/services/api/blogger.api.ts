import apiClient from "./client";
import type { ApiResponse, PaginatedResponse } from "../../types";

export type BloggerProductType = "digital" | "physical";

export interface BloggerProduct {
  id: string;
  bloggerId: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  originalPrice?: number;
  type: BloggerProductType;
  externalUrl?: string;
  salesCount: number;
  rating: number;
  reviewCount: number;
  isPurchased: boolean;
  content?: string;
  createdAt: string;
  updatedAt: string;
  blogger?: {
    id: string;
    nickname: string;
    avatar: string | null;
    badge?: "blogger" | "big_v" | null;
  };
}

export interface BloggerDashboardData {
  views: number;
  viewsChange: number;
  likes: number;
  likesChange: number;
  bookmarks: number;
  bookmarksChange: number;
  comments: number;
  commentsChange: number;
  conversionRate?: number;
  conversionRateChange?: number;
  followerGrowth?: number;
  followerGrowthChange?: number;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export type TrendMetric = "views" | "likes" | "bookmarks" | "followers";

export interface BloggerProductInput {
  title: string;
  description: string;
  images: string[];
  price: number;
  originalPrice?: number;
  type: BloggerProductType;
  externalUrl?: string;
}

export interface PurchaseInput {
  paymentMethod: "alipay" | "wechat";
}

interface BackendBloggerProduct {
  id: string;
  bloggerId: string;
  title?: string | null;
  description?: string | null;
  images?: string[] | null;
  price?: number | string | null;
  originalPrice?: number | string | null;
  type?: BloggerProductType | null;
  externalUrl?: string | null;
  salesCount?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  isPurchased?: boolean;
  content?: string | null;
  createdAt?: string;
  updatedAt?: string;
  blogger?: {
    id: string;
    nickname?: string | null;
    avatar?: string | null;
    badge?: "blogger" | "big_v" | null;
  } | null;
  _count?: {
    sales?: number;
    reviews?: number;
  };
}

interface BackendDashboardData {
  views?: number;
  viewsChange?: number;
  likes?: number;
  likesChange?: number;
  bookmarks?: number;
  bookmarksChange?: number;
  comments?: number;
  commentsChange?: number;
  conversionRate?: number;
  conversionRateChange?: number;
  followerGrowth?: number;
  followerGrowthChange?: number;
}

interface BackendTrendPoint {
  date?: string;
  value?: number;
}

function normalizeBloggerProduct(item: BackendBloggerProduct): BloggerProduct {
  return {
    id: item.id,
    bloggerId: item.bloggerId,
    title: item.title ?? "",
    description: item.description ?? "",
    images: item.images ?? [],
    price: Number(item.price ?? 0),
    originalPrice: item.originalPrice != null ? Number(item.originalPrice) : undefined,
    type: item.type ?? "digital",
    externalUrl: item.externalUrl ?? undefined,
    salesCount: item.salesCount ?? item._count?.sales ?? 0,
    rating: item.rating ?? 0,
    reviewCount: item.reviewCount ?? item._count?.reviews ?? 0,
    isPurchased: item.isPurchased ?? false,
    content: item.content ?? undefined,
    createdAt: item.createdAt ?? new Date(0).toISOString(),
    updatedAt: item.updatedAt ?? item.createdAt ?? new Date(0).toISOString(),
    blogger: item.blogger
      ? {
          id: item.blogger.id,
          nickname: item.blogger.nickname ?? "",
          avatar: item.blogger.avatar ?? null,
          badge: item.blogger.badge ?? null,
        }
      : undefined,
  };
}

function normalizeDashboardData(data: BackendDashboardData): BloggerDashboardData {
  return {
    views: data.views ?? 0,
    viewsChange: data.viewsChange ?? 0,
    likes: data.likes ?? 0,
    likesChange: data.likesChange ?? 0,
    bookmarks: data.bookmarks ?? 0,
    bookmarksChange: data.bookmarksChange ?? 0,
    comments: data.comments ?? 0,
    commentsChange: data.commentsChange ?? 0,
    conversionRate: data.conversionRate,
    conversionRateChange: data.conversionRateChange,
    followerGrowth: data.followerGrowth,
    followerGrowthChange: data.followerGrowthChange,
  };
}

export const bloggerApi = {
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    bloggerId?: string;
  }): Promise<ApiResponse<PaginatedResponse<BloggerProduct>>> => {
    const response = await apiClient.get<{
      data?: BackendBloggerProduct[];
      meta?: { total?: number; page?: number; pageSize?: number; totalPages?: number };
    }>("/blogger/products", {
      page: params?.page,
      pageSize: params?.limit,
      bloggerId: params?.bloggerId,
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? { code: "BLOGGER_PRODUCTS_FAILED", message: "Failed to load products" },
      };
    }

    const items = (response.data.data ?? []).map(normalizeBloggerProduct);
    const meta = response.data.meta ?? {};
    const total = meta.total ?? items.length;
    const page = meta.page ?? 1;
    const pageSize = meta.pageSize ?? items.length;

    return {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: meta.totalPages ?? (pageSize > 0 ? Math.ceil(total / pageSize) : 0),
        hasMore: page * pageSize < total,
      },
    };
  },

  getProductById: async (id: string): Promise<ApiResponse<BloggerProduct>> => {
    const response = await apiClient.get<BackendBloggerProduct>(`/blogger/products/${id}`);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? { code: "BLOGGER_PRODUCT_NOT_FOUND", message: "Product not found" },
      };
    }

    return { success: true, data: normalizeBloggerProduct(response.data) };
  },

  createProduct: async (data: BloggerProductInput): Promise<ApiResponse<BloggerProduct>> => {
    const response = await apiClient.post<BackendBloggerProduct>("/blogger/products", data);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? { code: "BLOGGER_PRODUCT_CREATE_FAILED", message: "Failed to create product" },
      };
    }

    return { success: true, data: normalizeBloggerProduct(response.data) };
  },

  updateProduct: async (id: string, data: Partial<BloggerProductInput>): Promise<ApiResponse<BloggerProduct>> => {
    const response = await apiClient.put<BackendBloggerProduct>(`/blogger/products/${id}`, data);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? { code: "BLOGGER_PRODUCT_UPDATE_FAILED", message: "Failed to update product" },
      };
    }

    return { success: true, data: normalizeBloggerProduct(response.data) };
  },

  deleteProduct: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/blogger/products/${id}`);
  },

  purchaseProduct: async (id: string, data: PurchaseInput): Promise<ApiResponse<{ success: boolean; orderId?: string }>> => {
    return apiClient.post<{ success: boolean; orderId?: string }>(`/blogger/products/${id}/purchase`, data);
  },

  getDashboard: async (period: "7d" | "30d" = "7d"): Promise<ApiResponse<BloggerDashboardData>> => {
    const response = await apiClient.get<BackendDashboardData>("/blogger/dashboard", { period });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? { code: "BLOGGER_DASHBOARD_FAILED", message: "Failed to load dashboard" },
      };
    }

    return { success: true, data: normalizeDashboardData(response.data) };
  },

  getTrendData: async (metric: TrendMetric, period: "7d" | "30d" = "7d"): Promise<ApiResponse<TrendDataPoint[]>> => {
    const response = await apiClient.get<BackendTrendPoint[]>(`/blogger/dashboard/trend/${metric}`, { period });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? { code: "BLOGGER_TREND_FAILED", message: "Failed to load trend data" },
      };
    }

    return {
      success: true,
      data: response.data.map((p) => ({
        date: p.date ?? "",
        value: p.value ?? 0,
      })),
    };
  },

  getBloggerProducts: async (bloggerId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<BloggerProduct>>> => {
    return bloggerApi.getProducts({ ...params, bloggerId });
  },
};
