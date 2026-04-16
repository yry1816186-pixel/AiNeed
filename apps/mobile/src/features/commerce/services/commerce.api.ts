import apiClient from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { compressImage } from '../../../utils/imageCompressor';
import {
  ApiResponse,
  PaginatedResponse,
  CartItem,
  Order,
  OrderStatus,
  Address,
  SearchFilters,
} from '../../../types';
import type { ClothingItem } from '../../../types/clothing';
import type { FormDataValue } from '../../../types';

interface BackendBrand {
  id?: string;
  name?: string | null;
  logo?: string | null;
}

interface BackendCommerceItem {
  id: string;
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  colors?: string[] | null;
  sizes?: string[] | null;
  tags?: string[] | null;
  price?: number | string | null;
  originalPrice?: number | string | null;
  mainImage?: string | null;
  images?: string[] | null;
  viewCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
  brand?: BackendBrand | null;
}

interface BackendVisualSearchItem {
  id: string;
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  colors?: string[] | null;
  tags?: string[] | null;
  price?: number | string | null;
  images?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  brand?: BackendBrand | null;
}

interface BackendTrendingSearchResponse {
  keywords?: string[] | null;
}

interface BackendCartItem {
  id: string;
  itemId: string;
  color?: string | null;
  size?: string | null;
  quantity?: number | null;
  selected?: boolean | null;
  item?: BackendCommerceItem | null;
}

interface BackendCartSummary {
  totalItems?: number;
  selectedItems?: number;
  totalPrice?: number | string;
  selectedPrice?: number | string;
}

interface BackendPaginatedResponse<T> {
  items?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  limit?: number;
  hasMore?: boolean;
  totalPages?: number;
}

interface BackendAddress {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  isDefault?: boolean;
  createdAt?: string;
}

interface BackendOrderItem {
  id: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  color: string;
  size: string;
  quantity: number;
  price: number | string;
}

interface BackendOrder {
  id: string;
  orderNo?: string;
  status: OrderStatus;
  items: BackendOrderItem[];
  totalAmount?: number | string;
  finalAmount?: number | string;
  shippingAddress: Omit<BackendAddress, "id" | "isDefault" | "createdAt">;
  createdAt: string;
  updatedAt: string;
}

const SEARCH_CATEGORY_MAP: Record<string, ClothingItem["category"]> = {
  tops: "tops",
  bottoms: "bottoms",
  dresses: "dresses",
  outerwear: "outerwear",
  footwear: "shoes",
  shoes: "shoes",
  accessories: "accessories",
  activewear: "activewear",
  swimwear: "swimwear",
  formal: "formal",
  underwear: "underwear",
  sleepwear: "sleepwear",
};

function normalizePrice(value?: number | string | null): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeIsoDate(value?: string | null): string {
  if (!value) {
    return new Date(0).toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function normalizeSearchCategory(value?: string | null): ClothingItem["category"] {
  if (!value) {
    return "other";
  }

  return SEARCH_CATEGORY_MAP[value] ?? "other";
}

function normalizeAddress(address: BackendAddress): Address {
  return {
    id: address.id,
    name: address.name,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.address,
    isDefault: address.isDefault ?? false,
  };
}

function normalizeCartItem(item: BackendCartItem): CartItem {
  return {
    id: item.id,
    productId: item.itemId,
    name: item.item?.name ?? "",
    imageUri: item.item?.mainImage ?? item.item?.images?.[0] ?? "",
    color: item.color ?? item.item?.colors?.[0] ?? "",
    size: item.size ?? item.item?.sizes?.[0] ?? "",
    quantity: item.quantity ?? 1,
    price: normalizePrice(item.item?.price),
    originalPrice:
      item.item?.originalPrice === null ? undefined : normalizePrice(item.item?.originalPrice),
    selected: item.selected ?? false,
  };
}

function normalizeFavoriteItem(item: BackendCommerceItem): ClothingItem {
  return {
    id: item.id,
    imageUri: item.mainImage ?? item.images?.[0] ?? "",
    thumbnailUri: item.images?.[0] ?? item.mainImage ?? undefined,
    category: (item.category ?? "other") as ClothingItem["category"],
    subcategory: item.subcategory ?? undefined,
    name: item.name ?? undefined,
    brand: item.brand?.name ?? undefined,
    size: item.sizes?.[0] ?? undefined,
    color: item.colors?.[0] ?? "",
    colors: item.colors ?? [],
    style: [],
    seasons: [],
    occasions: [],
    tags: item.tags ?? [],
    price: normalizePrice(item.price),
    wearCount: item.viewCount ?? 0,
    isFavorite: true,
    createdAt: item.createdAt ?? new Date(0).toISOString(),
    updatedAt: item.updatedAt ?? item.createdAt ?? new Date(0).toISOString(),
  };
}

function normalizeSearchResult(item: BackendVisualSearchItem): ClothingItem {
  const colors = normalizeStringArray(item.colors);
  const imageUri = item.images?.[0] ?? "";
  const thumbnailUri = item.images?.[1] ?? item.images?.[0] ?? undefined;

  return {
    id: item.id,
    imageUri,
    thumbnailUri,
    category: normalizeSearchCategory(item.category),
    subcategory: item.subcategory ?? undefined,
    name: item.name ?? undefined,
    brand: item.brand?.name ?? undefined,
    color: colors[0] ?? "",
    colors,
    style: [],
    seasons: [],
    occasions: [],
    tags: normalizeStringArray(item.tags),
    price: normalizePrice(item.price),
    wearCount: 0,
    isFavorite: false,
    createdAt: normalizeIsoDate(item.createdAt),
    updatedAt: normalizeIsoDate(item.updatedAt),
  };
}

function normalizeOrderItem(item: BackendOrderItem): CartItem {
  return {
    id: item.id,
    productId: item.itemId,
    name: item.itemName,
    imageUri: item.itemImage,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
    price: normalizePrice(item.price),
    selected: true,
  };
}

function normalizeShippingAddress(address: BackendOrder["shippingAddress"]): Address {
  return {
    id: "",
    name: address.name,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.address,
    isDefault: false,
  };
}

function normalizeOrder(order: BackendOrder): Order {
  return {
    id: order.id,
    items: (order.items ?? []).map(normalizeOrderItem),
    status: order.status,
    totalAmount: normalizePrice(order.finalAmount ?? order.totalAmount),
    shippingAddress: normalizeShippingAddress(order.shippingAddress),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

const LOCAL_SEARCH_HISTORY_KEY = "search-history-cache";
const LOCAL_SEARCH_HISTORY_LIMIT = 10;

async function loadLocalSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_SEARCH_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch (error) {
    console.error('Commerce API request failed:', error);
    return [];
  }
}

async function persistLocalSearchHistory(history: string[]): Promise<void> {
  await AsyncStorage.setItem(
    LOCAL_SEARCH_HISTORY_KEY,
    JSON.stringify(history.slice(0, LOCAL_SEARCH_HISTORY_LIMIT))
  );
}

async function saveLocalSearchHistory(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return loadLocalSearchHistory();
  }

  const history = await loadLocalSearchHistory();
  const nextHistory = [
    trimmed,
    ...history.filter(
      (entry) => entry.localeCompare(trimmed, "zh-CN", { sensitivity: "accent" }) !== 0
    ),
  ].slice(0, LOCAL_SEARCH_HISTORY_LIMIT);

  await persistLocalSearchHistory(nextHistory);
  return nextHistory;
}

async function clearLocalSearchHistory(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_SEARCH_HISTORY_KEY);
}

function toBackendAddressPayload(data: Partial<Address>) {
  return {
    name: data.name,
    phone: data.phone,
    province: data.province,
    city: data.city,
    district: data.district,
    address: data.detail,
    isDefault: data.isDefault,
  };
}

export const cartApi = {
  async get(): Promise<ApiResponse<CartItem[]>> {
    const response = await apiClient.get<BackendCartItem[]>("/cart");

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: response.data.map(normalizeCartItem),
    };
  },

  async add(params: {
    productId?: string;
    itemId?: string;
    color: string;
    size: string;
    quantity: number;
  }): Promise<ApiResponse<CartItem>> {
    const itemId = params.itemId ?? params.productId;

    if (!itemId) {
      return {
        success: false,
        error: {
          code: "MISSING_ITEM_ID",
          message: "Item ID is required",
        },
      };
    }

    const response = await apiClient.post<BackendCartItem>("/cart", {
      itemId,
      color: params.color,
      size: params.size,
      quantity: params.quantity,
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeCartItem(response.data),
    };
  },

  async update(
    itemId: string,
    data: { quantity?: number; color?: string; size?: string; selected?: boolean }
  ): Promise<ApiResponse<CartItem>> {
    const response = await apiClient.put<BackendCartItem>(`/cart/${itemId}`, {
      quantity: data.quantity,
      selected: data.selected,
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeCartItem(response.data),
    };
  },

  async remove(itemId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/cart/${itemId}`);
  },

  async clear(): Promise<ApiResponse<void>> {
    return apiClient.delete<void>("/cart");
  },

  async selectAll(selected: boolean): Promise<ApiResponse<void>> {
    return apiClient.put<void>("/cart/select-all", { selected });
  },

  async getTotal(): Promise<ApiResponse<{ items: number; price: number }>> {
    const response = await apiClient.get<BackendCartSummary>("/cart/summary");

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: {
        items: response.data.totalItems ?? 0,
        price: normalizePrice(response.data.totalPrice),
      },
    };
  },
};

export const orderApi = {
  async getAll(params?: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Order>>> {
    const response = await apiClient.get<BackendPaginatedResponse<BackendOrder>>("/orders", params);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    const page = response.data.page ?? params?.page ?? 1;
    const pageSize = response.data.pageSize ?? response.data.limit ?? params?.limit ?? 10;
    const total = response.data.total ?? 0;
    const items = (response.data.items ?? []).map(normalizeOrder);
    const hasMore = response.data.hasMore ?? (pageSize > 0 ? page * pageSize < total : false);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        limit: pageSize,
        totalPages: pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1,
        hasMore,
      },
    };
  },

  async getById(id: string): Promise<ApiResponse<Order>> {
    const response = await apiClient.get<BackendOrder>(`/orders/${id}`);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeOrder(response.data),
    };
  },

  async create(params: {
    addressId: string;
    items?: {
      itemId: string;
      color: string;
      size: string;
      quantity: number;
    }[];
    remark?: string;
    paymentMethod?: string;
  }): Promise<ApiResponse<Order>> {
    if (!params.items || params.items.length === 0) {
      return {
        success: false,
        error: {
          code: "MISSING_ORDER_ITEMS",
          message: "Order items are required",
        },
      };
    }

    const response = await apiClient.post<BackendOrder>("/orders", {
      addressId: params.addressId,
      items: params.items,
      remark: params.remark,
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeOrder(response.data),
    };
  },

  async cancel(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/orders/${id}/cancel`);
  },

  async track(id: string): Promise<
    ApiResponse<{
      status: OrderStatus;
      timeline: { status: string; time: string; description: string }[];
    }>
  > {
    return apiClient.get(`/orders/${id}/tracking`);
  },
};

export const addressApi = {
  async getAll(): Promise<ApiResponse<Address[]>> {
    const response = await apiClient.get<BackendAddress[]>("/addresses");

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: response.data.map(normalizeAddress),
    };
  },

  async create(data: Omit<Address, "id">): Promise<ApiResponse<Address>> {
    const response = await apiClient.post<BackendAddress>(
      "/addresses",
      toBackendAddressPayload(data)
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeAddress(response.data),
    };
  },

  async update(id: string, data: Partial<Address>): Promise<ApiResponse<Address>> {
    const response = await apiClient.put<BackendAddress>(
      `/addresses/${id}`,
      toBackendAddressPayload(data)
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeAddress(response.data),
    };
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/addresses/${id}`);
  },

  async setDefault(id: string): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`/addresses/${id}/default`);
  },
};

export const favoriteApi = {
  async getAll(params?: { page?: number; limit?: number }): Promise<ApiResponse<ClothingItem[]>> {
    const response = await apiClient.get<BackendPaginatedResponse<BackendCommerceItem>>(
      "/favorites",
      {
        page: params?.page,
        limit: params?.limit,
      }
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: (response.data.items ?? []).map(normalizeFavoriteItem),
    };
  },

  async add(itemId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/favorites/${itemId}`);
  },

  async remove(itemId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/favorites/${itemId}`);
  },

  async check(itemId: string): Promise<ApiResponse<{ isFavorite: boolean }>> {
    return apiClient.get(`/favorites/check/${itemId}`);
  },
};

export const searchApi = {
  async searchClothing(filters: SearchFilters): Promise<ApiResponse<ClothingItem[]>> {
    const params: Record<string, unknown> = {};
    if (filters.query) {
      params.q = filters.query;
    }
    if (filters.category) {
      params.category = filters.category;
    }
    // eslint-disable-next-line eqeqeq
    if (filters.minPrice != null) {
      params.minPrice = filters.minPrice;
    }
    // eslint-disable-next-line eqeqeq
    if (filters.maxPrice != null) {
      params.maxPrice = filters.maxPrice;
    }
    return apiClient.get("/search", params);
  },

  async searchByImage(
    imageUri: string,
    params?: { category?: string; limit?: number }
  ): Promise<ApiResponse<ClothingItem[]>> {
    const compressedUri = await compressImage(imageUri);
    const formData = new FormData();
    const filename = compressedUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: compressedUri,
      name: filename,
      type,
    } satisfies FormDataValue);

    const query = new URLSearchParams();
    if (params?.category) {
      query.set("category", params.category);
    }
    if (typeof params?.limit === "number") {
      query.set("limit", String(params.limit));
    }

    const queryString = query.toString();
    const url = queryString.length > 0 ? `/search/image?${queryString}` : "/search/image";
    const response = await apiClient.upload<BackendVisualSearchItem[]>(url, formData);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: response.data.map(normalizeSearchResult),
    };
  },

  async getTrending(): Promise<ApiResponse<string[]>> {
    const response = await apiClient.get<BackendTrendingSearchResponse | string[]>(
      "/search/trending"
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    const keywords = Array.isArray(response.data)
      ? response.data.filter((entry): entry is string => typeof entry === "string")
      : normalizeStringArray(response.data.keywords);

    return {
      success: true,
      data: keywords,
    };
  },

  async getHistory(): Promise<ApiResponse<string[]>> {
    return {
      success: true,
      data: await loadLocalSearchHistory(),
    };
  },

  async clearHistory(): Promise<ApiResponse<void>> {
    await clearLocalSearchHistory();

    return {
      success: true,
      data: undefined,
    };
  },

  async saveHistory(query: string): Promise<ApiResponse<string[]>> {
    return {
      success: true,
      data: await saveLocalSearchHistory(query),
    };
  },
};

// ==================== Phase 5: New types ====================

export interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED" | "SHIPPING";
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  applicableCategories: string[];
  applicableBrandId: string | null;
  description: string;
}

export interface UserCoupon {
  id: string;
  couponId: string;
  coupon: Coupon;
  status: "AVAILABLE" | "USED" | "EXPIRED";
  usedAt: string | null;
  createdAt: string;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  type: "REFUND_ONLY" | "RETURN_REFUND";
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  reason: string;
  description: string | null;
  amount: number;
  images: string[];
  trackingNumber: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockNotification {
  id: string;
  itemId: string;
  color: string | null;
  size: string | null;
  status: "PENDING" | "NOTIFIED" | "CANCELLED";
  item?: {
    id: string;
    name: string;
    mainImage: string | null;
    images: string[];
  };
  createdAt: string;
}

export interface SizeRecommendation {
  recommendedSize: string;
  confidence: number;
  reasons: string[];
  sizeChart: { size: string; label: string; matchScore: number }[];
}

export interface FilterOptions {
  brands: { id: string; name: string }[];
  colors: string[];
  sizes: string[];
  priceRange: { min: number; max: number };
}

export interface Subcategory {
  name: string;
  count: number;
}

// Backend response types for Phase 5

interface BackendCoupon {
  id: string;
  code?: string;
  type?: string;
  value?: number | string;
  minOrderAmount?: number | string;
  maxDiscount?: number | string | null;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usedCount?: number;
  isActive?: boolean;
  applicableCategories?: string[];
  applicableBrandId?: string | null;
  description?: string;
}

interface BackendUserCoupon {
  id: string;
  couponId?: string;
  coupon?: BackendCoupon;
  status?: string;
  usedAt?: string | null;
  createdAt?: string;
}

interface BackendRefundRequest {
  id: string;
  orderId?: string;
  type?: string;
  status?: string;
  reason?: string;
  description?: string | null;
  amount?: number | string;
  images?: string[];
  trackingNumber?: string | null;
  adminNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendStockNotification {
  id: string;
  itemId?: string;
  color?: string | null;
  size?: string | null;
  status?: string;
  item?: {
    id: string;
    name: string;
    mainImage: string | null;
    images: string[];
  };
  createdAt?: string;
}

interface BackendSizeRecommendation {
  recommendedSize?: string;
  confidence?: number;
  reasons?: string[];
  sizeChart?: { size: string; label: string; matchScore: number }[];
}

interface BackendFilterOptions {
  brands?: { id: string; name: string }[];
  colors?: string[];
  sizes?: string[];
  priceRange?: { min: number | string; max: number | string };
}

// ==================== Phase 5: Normalize functions ====================

function normalizeCoupon(raw: BackendCoupon): Coupon {
  return {
    id: raw.id,
    code: raw.code ?? "",
    type: (raw.type as Coupon["type"]) ?? "FIXED",
    value: normalizePrice(raw.value),
    minOrderAmount: normalizePrice(raw.minOrderAmount),
    maxDiscount: raw.maxDiscount !== null ? normalizePrice(raw.maxDiscount) : null,
    startDate: raw.startDate ?? "",
    endDate: raw.endDate ?? "",
    usageLimit: raw.usageLimit ?? 0,
    usedCount: raw.usedCount ?? 0,
    isActive: raw.isActive ?? true,
    applicableCategories: normalizeStringArray(raw.applicableCategories),
    applicableBrandId: raw.applicableBrandId ?? null,
    description: raw.description ?? "",
  };
}

function normalizeUserCoupon(raw: BackendUserCoupon): UserCoupon {
  return {
    id: raw.id,
    couponId: raw.couponId ?? "",
    coupon: raw.coupon
      ? normalizeCoupon(raw.coupon)
      : {
          id: raw.couponId ?? "",
          code: "",
          type: "FIXED",
          value: 0,
          minOrderAmount: 0,
          maxDiscount: null,
          startDate: "",
          endDate: "",
          usageLimit: 0,
          usedCount: 0,
          isActive: false,
          applicableCategories: [],
          applicableBrandId: null,
          description: "",
        },
    status: (raw.status as UserCoupon["status"]) ?? "AVAILABLE",
    usedAt: raw.usedAt ?? null,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
  };
}

function normalizeRefundRequest(raw: BackendRefundRequest): RefundRequest {
  return {
    id: raw.id,
    orderId: raw.orderId ?? "",
    type: (raw.type as RefundRequest["type"]) ?? "REFUND_ONLY",
    status: (raw.status as RefundRequest["status"]) ?? "PENDING",
    reason: raw.reason ?? "",
    description: raw.description ?? null,
    amount: normalizePrice(raw.amount),
    images: normalizeStringArray(raw.images),
    trackingNumber: raw.trackingNumber ?? null,
    adminNote: raw.adminNote ?? null,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
    updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
  };
}

function normalizeStockNotification(raw: BackendStockNotification): StockNotification {
  return {
    id: raw.id,
    itemId: raw.itemId ?? "",
    color: raw.color ?? null,
    size: raw.size ?? null,
    status: (raw.status as StockNotification["status"]) ?? "PENDING",
    item: raw.item,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
  };
}

function normalizeSizeRecommendation(raw: BackendSizeRecommendation): SizeRecommendation | null {
  if (!raw.recommendedSize) {
    return null;
  }
  return {
    recommendedSize: raw.recommendedSize,
    confidence: raw.confidence ?? 0,
    reasons: normalizeStringArray(raw.reasons),
    sizeChart: raw.sizeChart ?? [],
  };
}

function normalizeFilterOptions(raw: BackendFilterOptions): FilterOptions {
  const priceRange = raw.priceRange ?? { min: 0, max: 0 };
  return {
    brands: raw.brands ?? [],
    colors: normalizeStringArray(raw.colors),
    sizes: normalizeStringArray(raw.sizes),
    priceRange: {
      min: normalizePrice(priceRange.min),
      max: normalizePrice(priceRange.max),
    },
  };
}

// ==================== Phase 5: Payment API ====================

export const paymentApi = {
  async createPayment(
    orderId: string,
    provider: "alipay" | "wechat"
  ): Promise<ApiResponse<{ paymentUrl?: string; qrCode?: string; orderId: string }>> {
    const response = await apiClient.post<{
      paymentUrl?: string;
      qrCode?: string;
    }>(`/orders/${orderId}/pay`, {
      paymentMethod: provider === "alipay" ? "ALIPAY" : "WECHAT",
    });

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      data: {
        paymentUrl: response.data.paymentUrl,
        qrCode: response.data.qrCode,
        orderId,
      },
    };
  },

  async pollPaymentStatus(
    orderId: string
  ): Promise<ApiResponse<{ status: string; paid: boolean }>> {
    return apiClient.get(`/payment/query/${orderId}`);
  },
};

// ==================== Phase 5: Coupon API ====================

export const couponApi = {
  async validateCoupon(
    code: string,
    orderAmount: number,
    categoryIds?: string[],
    brandId?: string
  ): Promise<ApiResponse<{ valid: boolean; discount: number; coupon?: Coupon }>> {
    return apiClient.post("/coupons/validate", {
      code,
      orderAmount,
      categoryIds,
      brandId,
    });
  },

  async applyCoupon(code: string): Promise<ApiResponse<UserCoupon>> {
    const response = await apiClient.post<BackendUserCoupon>("/coupons/apply", {
      code,
    });

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return { success: true, data: normalizeUserCoupon(response.data) };
  },

  async getUserCoupons(status?: string): Promise<ApiResponse<UserCoupon[]>> {
    const params: Record<string, unknown> = {};
    if (status) {
      params.status = status;
    }
    const response = await apiClient.get<BackendUserCoupon[]>("/coupons", params);

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return { success: true, data: response.data.map(normalizeUserCoupon) };
  },

  async getApplicableCoupons(): Promise<ApiResponse<UserCoupon[]>> {
    const response = await apiClient.get<BackendUserCoupon[]>("/coupons/applicable");

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return { success: true, data: response.data.map(normalizeUserCoupon) };
  },
};

// ==================== Phase 5: Refund API ====================

export const refundApi = {
  async createRefund(data: {
    orderId: string;
    type: "REFUND_ONLY" | "RETURN_REFUND";
    reason: string;
    description?: string;
    images?: string[];
  }): Promise<ApiResponse<RefundRequest>> {
    const response = await apiClient.post<BackendRefundRequest>("/refund-requests", data);

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return { success: true, data: normalizeRefundRequest(response.data) };
  },

  async getOrderRefunds(orderId: string): Promise<ApiResponse<RefundRequest[]>> {
    const response = await apiClient.get<BackendRefundRequest[]>(
      `/refund-requests/order/${orderId}`
    );

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      data: response.data.map(normalizeRefundRequest),
    };
  },

  async getUserRefunds(): Promise<ApiResponse<RefundRequest[]>> {
    const response = await apiClient.get<BackendRefundRequest[]>("/refund-requests");

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      data: response.data.map(normalizeRefundRequest),
    };
  },

  async addRefundTracking(id: string, trackingNumber: string): Promise<ApiResponse<RefundRequest>> {
    const response = await apiClient.patch<BackendRefundRequest>(
      `/refund-requests/${id}/tracking`,
      { trackingNumber }
    );

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return { success: true, data: normalizeRefundRequest(response.data) };
  },
};

// ==================== Phase 5: Stock Notification API ====================

export const stockNotificationApi = {
  async subscribe(
    itemId: string,
    color?: string,
    size?: string
  ): Promise<ApiResponse<StockNotification>> {
    const response = await apiClient.post<BackendStockNotification>("/stock-notifications", {
      itemId,
      color,
      size,
    });

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      data: normalizeStockNotification(response.data),
    };
  },

  async unsubscribe(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/stock-notifications/${id}`);
  },

  async getAll(): Promise<ApiResponse<StockNotification[]>> {
    const response = await apiClient.get<BackendStockNotification[]>("/stock-notifications");

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      data: response.data.map(normalizeStockNotification),
    };
  },
};

// ==================== Phase 5: Enhanced Order API ====================

export const orderEnhancementApi = {
  async confirmReceipt(orderId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.patch<{ success: boolean }>(`/orders/${orderId}/confirm`);
  },

  async softDeleteOrder(orderId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete<{ success: boolean }>(`/orders/${orderId}`);
  },

  async getOrdersByTab(
    tab: string,
    page?: number,
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<Order>>> {
    const params: Record<string, unknown> = {};
    if (page !== null) {
      params.page = page;
    }
    if (limit !== null) {
      params.limit = limit;
    }
    const response = await apiClient.get<BackendPaginatedResponse<BackendOrder>>(
      `/orders/tab/${tab}`,
      params
    );

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    const resPage = response.data.page ?? page ?? 1;
    const pageSize = response.data.pageSize ?? response.data.limit ?? limit ?? 10;
    const total = response.data.total ?? 0;
    const items = (response.data.items ?? []).map(normalizeOrder);
    const hasMore = response.data.hasMore ?? (pageSize > 0 ? resPage * pageSize < total : false);

    return {
      success: true,
      data: {
        items,
        total,
        page: resPage,
        pageSize,
        limit: pageSize,
        totalPages: pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1,
        hasMore,
      },
    };
  },
};

// ==================== Phase 5: Size Recommendation API ====================

export const sizeRecommendationApi = {
  async getSizeRecommendation(itemId: string): Promise<ApiResponse<SizeRecommendation | null>> {
    const response = await apiClient.get<BackendSizeRecommendation>(
      `/size-recommendation/${itemId}`
    );

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      data: normalizeSizeRecommendation(response.data),
    };
  },

  async getSizeChart(
    itemId: string
  ): Promise<ApiResponse<{ size: string; label: string; matchScore: number }[]>> {
    return apiClient.get(`/size-recommendation/${itemId}/chart`);
  },
};

// ==================== Phase 5: Search Enhancement API ====================

export const searchEnhancementApi = {
  async getFilterOptions(category?: string): Promise<ApiResponse<FilterOptions>> {
    const params: Record<string, unknown> = {};
    if (category) {
      params.category = category;
    }
    const response = await apiClient.get<BackendFilterOptions>("/search/filter-options", params);

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      data: normalizeFilterOptions(response.data),
    };
  },
};

// ==================== Phase 5: Clothing Enhancement API ====================

export const clothingEnhancementApi = {
  async getRelatedItems(itemId: string): Promise<ApiResponse<ClothingItem[]>> {
    const response = await apiClient.get<BackendCommerceItem[]>(`/clothing/${itemId}/related`);

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      data: response.data.map(normalizeFavoriteItem),
    };
  },

  async getSubcategories(category?: string): Promise<ApiResponse<Subcategory[]>> {
    const params: Record<string, unknown> = {};
    if (category) {
      params.category = category;
    }
    return apiClient.get<Subcategory[]>("/clothing/subcategories", params);
  },
};

// ==================== Phase 5: Merchant API ====================

export const merchantApi = {
  async applyForMerchant(data: {
    brandName: string;
    businessLicense: string;
    contactName: string;
    phone: string;
    description?: string;
  }): Promise<ApiResponse<{ id: string; status: string }>> {
    return apiClient.post("/merchants/apply", data);
  },

  async getMerchantApplicationStatus(): Promise<
    ApiResponse<{ id: string; status: string; reason?: string } | null>
  > {
    return apiClient.get("/merchants/application");
  },

  async getMerchantPendingApplications(): Promise<
    ApiResponse<{ id: string; status: string; brandName: string }[]>
  > {
    return apiClient.get("/merchants/applications");
  },
};

// ==================== Phase 5: Enhanced Cart API ====================

export const cartEnhancementApi = {
  async getCartSummary(couponCode?: string): Promise<
    ApiResponse<{
      totalItems: number;
      selectedItems: number;
      totalAmount: number;
      selectedAmount: number;
      discountAmount: number;
      shippingFee: number;
      finalAmount: number;
    }>
  > {
    const params: Record<string, unknown> = {};
    if (couponCode) {
      params.couponCode = couponCode;
    }
    const response = await apiClient.get<{
      totalItems?: number;
      selectedItems?: number;
      totalAmount?: number | string;
      selectedAmount?: number | string;
      discountAmount?: number | string;
      shippingFee?: number | string;
      finalAmount?: number | string;
    }>("/cart/summary", params);

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    const d = response.data;
    return {
      success: true,
      data: {
        totalItems: d.totalItems ?? 0,
        selectedItems: d.selectedItems ?? 0,
        totalAmount: normalizePrice(d.totalAmount),
        selectedAmount: normalizePrice(d.selectedAmount),
        discountAmount: normalizePrice(d.discountAmount),
        shippingFee: normalizePrice(d.shippingFee),
        finalAmount: normalizePrice(d.finalAmount),
      },
    };
  },

  async getInvalidCartItems(): Promise<ApiResponse<CartItem[]>> {
    const response = await apiClient.get<BackendCartItem[]>("/cart/invalid");

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      data: response.data.map(normalizeCartItem),
    };
  },

  async batchDeleteCartItems(_ids: string[]): Promise<ApiResponse<{ count: number }>> {
    return apiClient.delete<{ count: number }>("/cart/batch");
  },

  async moveCartToFavorites(ids: string[]): Promise<ApiResponse<{ moved: number }>> {
    return apiClient.post<{ moved: number }>("/cart/move-to-favorites", {
      cartItemIds: ids,
    });
  },

  async updateCartItemSku(
    id: string,
    color?: string,
    size?: string
  ): Promise<ApiResponse<CartItem>> {
    const response = await apiClient.patch<BackendCartItem>(`/cart/${id}/sku`, {
      color,
      size,
    });

    if (!response.success || !response.data) {
      return { success: false, error: response.error };
    }

    return { success: true, data: normalizeCartItem(response.data) };
  },
};

export default {
  cartApi,
  orderApi,
  addressApi,
  favoriteApi,
  searchApi,
  paymentApi,
  couponApi,
  refundApi,
  stockNotificationApi,
  orderEnhancementApi,
  sizeRecommendationApi,
  searchEnhancementApi,
  clothingEnhancementApi,
  merchantApi,
  cartEnhancementApi,
};
