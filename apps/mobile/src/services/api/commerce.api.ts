import apiClient from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ApiResponse,
  PaginatedResponse,
  CartItem,
  Order,
  OrderStatus,
  Address,
  SearchFilters,
} from "../../types";
import type { ClothingItem } from "../../types/clothing";
import type { FormDataValue } from "../../types";

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
  return Number.isNaN(parsed.getTime())
    ? new Date(0).toISOString()
    : parsed.toISOString();
}

function normalizeSearchCategory(
  value?: string | null,
): ClothingItem["category"] {
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
      item.item?.originalPrice == null
        ? undefined
        : normalizePrice(item.item.originalPrice),
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

function normalizeShippingAddress(
  address: BackendOrder["shippingAddress"],
): Address {
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
  } catch {
    return [];
  }
}

async function persistLocalSearchHistory(history: string[]): Promise<void> {
  await AsyncStorage.setItem(
    LOCAL_SEARCH_HISTORY_KEY,
    JSON.stringify(history.slice(0, LOCAL_SEARCH_HISTORY_LIMIT)),
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
      (entry) => entry.localeCompare(trimmed, "zh-CN", { sensitivity: "accent" }) !== 0,
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
    data: { quantity?: number; color?: string; size?: string; selected?: boolean },
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
    const response = await apiClient.get<BackendPaginatedResponse<BackendOrder>>(
      "/orders",
      params,
    );

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
    const hasMore =
      response.data.hasMore ??
      (pageSize > 0 ? page * pageSize < total : false);

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
    items?: Array<{
      itemId: string;
      color: string;
      size: string;
      quantity: number;
    }>;
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
      toBackendAddressPayload(data),
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

  async update(
    id: string,
    data: Partial<Address>,
  ): Promise<ApiResponse<Address>> {
    const response = await apiClient.put<BackendAddress>(
      `/addresses/${id}`,
      toBackendAddressPayload(data),
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
  async getAll(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ClothingItem[]>> {
    const response = await apiClient.get<BackendPaginatedResponse<BackendCommerceItem>>(
      "/favorites",
      {
        page: params?.page,
        limit: params?.limit,
      },
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
    return apiClient.post("/search/clothing", filters);
  },

  async searchByImage(
    imageUri: string,
    params?: { category?: string; limit?: number },
  ): Promise<ApiResponse<ClothingItem[]>> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
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
      "/search/trending",
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

export default { cartApi, orderApi, addressApi, favoriteApi, searchApi };
