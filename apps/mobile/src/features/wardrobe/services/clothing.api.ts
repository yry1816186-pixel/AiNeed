import apiClient from '../../../services/api/client';
import { ApiResponse, PaginatedResponse, ClothingAnalysisResult } from '../../../types';
import { compressImage } from '../../../utils/imageCompressor';
import {
  ClothingItem,
  ClothingFilter,
  ClothingSortOptions,
  ClothingItemInput,
  ClothingCategory,
  ClothingStyle,
  Occasion,
  Season,
} from '../../../types/clothing';

interface BackendBrand {
  id?: string;
  name?: string | null;
  logo?: string | null;
}

interface BackendClothingAttributes {
  style?: string[] | null;
  seasons?: string[] | null;
  season?: string[] | null;
  occasions?: string[] | null;
  colors?: string[] | null;
}

interface BackendClothingItem {
  id: string;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  colors?: string[] | null;
  sizes?: string[] | null;
  tags?: string[] | null;
  price?: number | string | null;
  originalPrice?: number | string | null;
  currency?: string | null;
  images?: string[] | null;
  mainImage?: string | null;
  externalUrl?: string | null;
  externalId?: string | null;
  attributes?: BackendClothingAttributes | null;
  viewCount?: number | null;
  likeCount?: number | null;
  brand?: BackendBrand | string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  isFavorite?: boolean | null;
}

interface BackendClothingListResponse {
  items?: BackendClothingItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  limit?: number;
  totalPages?: number;
  hasMore?: boolean;
}

const CATEGORY_MAP: Record<string, ClothingCategory> = {
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

const STYLE_MAP: Record<string, ClothingStyle> = {
  casual: "casual",
  formal: "formal",
  sporty: "sporty",
  bohemian: "bohemian",
  streetwear: "streetwear",
  minimalist: "minimalist",
  minimal: "minimalist",
  vintage: "vintage",
  preppy: "preppy",
  chic: "chic",
  elegant: "chic",
  business: "business",
  romantic: "romantic",
  edgy: "edgy",
};

const SEASON_MAP: Record<string, Season> = {
  spring: "spring",
  summer: "summer",
  fall: "fall",
  autumn: "fall",
  winter: "winter",
  all: "all",
  春: "spring",
  夏: "summer",
  秋: "fall",
  冬: "winter",
  四季: "all",
};

const OCCASION_MAP: Record<string, Occasion> = {
  daily: "everyday",
  everyday: "everyday",
  work: "work",
  office: "work",
  business: "work",
  date: "date",
  party: "party",
  wedding: "wedding",
  travel: "travel",
  gym: "gym",
  sport: "gym",
  beach: "beach",
  home: "home",
  formal: "formal_event",
  formal_event: "formal_event",
  日常: "everyday",
  通勤: "work",
  商务: "work",
  约会: "date",
  聚会: "party",
  婚礼: "wedding",
  旅行: "travel",
  运动: "gym",
  海边: "beach",
  居家: "home",
  正式场合: "formal_event",
};

function normalizePrice(value?: number | string | null): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeBrandName(brand?: BackendBrand | string | null): string | undefined {
  if (typeof brand === "string") {
    return brand;
  }

  return brand?.name ?? undefined;
}

const OFFICIAL_PURCHASE_URLS: Record<string, string> = {
  "ZARA::宽松版型西装外套":
    "https://www.zara.cn/cn/zh/%E5%AE%BD%E6%9D%BE%E7%89%88%E5%9E%8B%E4%BC%91%E9%97%B2%E8%A5%BF%E8%A3%85%E5%A4%96%E5%A5%97-p06861209.html",
  "ZARA::高腰阔腿裤":
    "https://www.zara.cn/cn/zh/%E9%AB%98%E8%85%B0%E9%98%94%E8%85%BF%E8%A3%A4-p02405590.html",
  "UNIQLO::HEATTECH保暖内衣套装": "https://www.uniqlo.cn/c/3wheattech.html",
  "UNIQLO::U系列棉质T恤": "https://www.uniqlo.com/us/en/products/E455758-001/00",
  "Nike::Air Max 270运动鞋": "https://www.nike.com/t/air-max-270-mens-shoes-KkLcGR",
  "COS::针织连衣裙":
    "https://www.cos.com/en-us/women/womenswear/dresses/sleeveless-dresses/product/circle-cut-knitted-mini-dress-white-1285099001",
  "COS::褶皱半身裙":
    "https://www.cos.com/en-us/women/womenswear/skirts/midlength/product/pleated-knitted-midi-skirt-black-1214947001",
  "Massimo Dutti::羊绒混纺大衣": "https://www.massimodutti.com/us/wool-blend-coat-l02891381",
};

const OFFICIAL_PURCHASE_URL_OVERRIDES: Record<string, string> = {
  "ZARA::ZW系列丝缎质感蕾丝半身裙":
    "https://www.zara.cn/cn/zh/zw-%E7%B3%BB%E5%88%97%E4%B8%9D%E7%BC%8E%E8%B4%A8%E6%84%9F%E8%95%BE%E4%B8%9D%E5%8D%8A%E8%BA%AB%E8%A3%99-p05919211.html",
  "Nike::Nike P-6000运动鞋": "https://www.nike.com/t/p-6000-shoes-XkgpKW/CD6404-002",
  "UNIQLO::轻型V领开衫": "https://www.uniqlo.com/us/en/products/E441478-000/",
  "COS::羊毛圆领开衫":
    "https://www.cos.com/en_usd/women/womenswear/knitwear/product.wool-crew-neck-cardigan-white.1211698002.html",
};

function buildOfficialPurchaseUrl(item: BackendClothingItem): string | undefined {
  const brandName = normalizeBrandName(item.brand)?.trim();
  const itemName = item.name?.trim();

  if (!brandName || !itemName) {
    return undefined;
  }

  const key = `${brandName}::${itemName}`;
  return OFFICIAL_PURCHASE_URL_OVERRIDES[key] ?? OFFICIAL_PURCHASE_URLS[key];
}

function buildMarketplaceSearchUrl(item: BackendClothingItem): string | undefined {
  const brandName = normalizeBrandName(item.brand)?.trim();
  const itemName = item.name?.trim();
  const query = [brandName, itemName].filter(Boolean).join(" ").trim();

  if (!query) {
    return undefined;
  }

  return `https://search.jd.com/Search?keyword=${encodeURIComponent(query)}`;
}

function normalizeCategory(value?: string | null): ClothingCategory {
  if (!value) {
    return "other";
  }

  return CATEGORY_MAP[value] ?? "other";
}

function normalizeStyles(attributes?: BackendClothingAttributes | null): ClothingStyle[] {
  return normalizeStringArray(attributes?.style)
    .map((style) => STYLE_MAP[style.toLowerCase()])
    .filter((style): style is ClothingStyle => Boolean(style));
}

function normalizeSeasons(attributes?: BackendClothingAttributes | null): Season[] {
  return normalizeStringArray(attributes?.seasons ?? attributes?.season)
    .map((season) => SEASON_MAP[season.toLowerCase()] ?? SEASON_MAP[season])
    .filter((season): season is Season => Boolean(season));
}

function normalizeOccasions(attributes?: BackendClothingAttributes | null): Occasion[] {
  return normalizeStringArray(attributes?.occasions)
    .map((occasion) => OCCASION_MAP[occasion.toLowerCase()] ?? OCCASION_MAP[occasion])
    .filter((occasion): occasion is Occasion => Boolean(occasion));
}

function toIsoString(value?: string | Date | null): string {
  if (!value) {
    return new Date(0).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function normalizeClothingItem(item: BackendClothingItem): ClothingItem {
  const attributes =
    item.attributes && typeof item.attributes === "object" ? item.attributes : undefined;
  const colors = normalizeStringArray(item.colors ?? attributes?.colors);
  const sizes = normalizeStringArray(item.sizes);
  const imageUri = item.mainImage ?? item.images?.[0] ?? "";
  const thumbnailUri =
    item.images?.find((image) => image !== imageUri) ??
    item.images?.[0] ??
    item.mainImage ??
    undefined;

  return {
    id: item.id,
    imageUri,
    thumbnailUri,
    externalUrl:
      item.externalUrl ?? buildOfficialPurchaseUrl(item) ?? buildMarketplaceSearchUrl(item),
    externalId: item.externalId ?? undefined,
    category: normalizeCategory(item.category),
    subcategory: item.subcategory ?? undefined,
    name: item.name ?? undefined,
    brand: normalizeBrandName(item.brand),
    size: sizes[0] ?? undefined,
    color: colors[0] ?? "",
    colors,
    style: normalizeStyles(attributes),
    seasons: normalizeSeasons(attributes),
    occasions: normalizeOccasions(attributes),
    tags: normalizeStringArray(item.tags),
    notes: item.description ?? undefined,
    price: normalizePrice(item.price),
    wearCount: item.viewCount ?? 0,
    isFavorite: item.isFavorite ?? false,
    createdAt: toIsoString(item.createdAt),
    updatedAt: toIsoString(item.updatedAt),
  };
}

function normalizePaginatedResponse(
  response: BackendClothingListResponse
): PaginatedResponse<ClothingItem> {
  const items = (response.items ?? []).map(normalizeClothingItem);
  const page = response.page ?? 1;
  const pageSize = (response.pageSize ?? response.limit ?? items.length) || 20;
  const total = response.total ?? items.length;
  const totalPages = response.totalPages ?? Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  return {
    items,
    page,
    pageSize,
    limit: pageSize,
    total,
    totalPages,
    hasMore: response.hasMore ?? page < totalPages,
  };
}

export const clothingApi = {
  async getAll(params?: {
    filter?: ClothingFilter;
    sort?: ClothingSortOptions;
    page?: number;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    brandId?: string;
    sizes?: string[];
  }): Promise<ApiResponse<PaginatedResponse<ClothingItem>>> {
    const queryParams: Record<string, string | number | undefined> = {
      page: params?.page,
      limit: params?.limit,
      category: params?.filter?.category as string | undefined,
      minPrice: params?.minPrice,
      maxPrice: params?.maxPrice,
      brandId: params?.brandId,
      colors: params?.filter?.seasons?.join(","),
      sizes: params?.sizes?.join(","),
      sortBy: params?.sort?.field,
      sortOrder: params?.sort?.direction,
    };

    const filteredParams = Object.fromEntries(
      Object.entries(queryParams).filter(([, v]) => v !== undefined && v !== null)
    );

    const response = await apiClient.get<BackendClothingListResponse>("/clothing", filteredParams);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizePaginatedResponse(response.data),
    };
  },

  async getById(id: string): Promise<ApiResponse<ClothingItem>> {
    const response = await apiClient.get<BackendClothingItem>(`/clothing/${id}`);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeClothingItem(response.data),
    };
  },

  async create(data: ClothingItemInput): Promise<ApiResponse<ClothingItem>> {
    const response = await apiClient.post<BackendClothingItem>("/clothing", data);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeClothingItem(response.data),
    };
  },

  async update(id: string, data: Partial<ClothingItemInput>): Promise<ApiResponse<ClothingItem>> {
    const response = await apiClient.put<BackendClothingItem>(`/clothing/${id}`, data);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeClothingItem(response.data),
    };
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/clothing/${id}`);
  },

  async uploadImage(
    imageUri: string,
    autoAnalyze: boolean = true
  ): Promise<ApiResponse<{ item: ClothingItem; analysis?: ClothingAnalysisResult }>> {
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

    formData.append("autoAnalyze", String(autoAnalyze));

    const response = await apiClient.upload<{
      item: BackendClothingItem;
      analysis?: ClothingAnalysisResult;
    }>("/clothing/upload", formData);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: {
        item: normalizeClothingItem(response.data.item),
        analysis: response.data.analysis,
      },
    };
  },

  async toggleFavorite(id: string): Promise<ApiResponse<ClothingItem>> {
    const response = await apiClient.post<BackendClothingItem>(`/clothing/${id}/favorite`);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeClothingItem(response.data),
    };
  },

  async incrementWearCount(id: string): Promise<ApiResponse<ClothingItem>> {
    const response = await apiClient.post<BackendClothingItem>(`/clothing/${id}/wear`);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizeClothingItem(response.data),
    };
  },

  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>("/clothing/categories");
  },

  async getStats(): Promise<
    ApiResponse<{
      total: number;
      byCategory: Record<string, number>;
      bySeason: Record<string, number>;
      mostWorn: ClothingItem[];
      leastWorn: ClothingItem[];
    }>
  > {
    const response = await apiClient.get<{
      total: number;
      byCategory: Record<string, number>;
      bySeason: Record<string, number>;
      mostWorn?: BackendClothingItem[];
      leastWorn?: BackendClothingItem[];
    }>("/clothing/stats");

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: {
        total: response.data.total ?? 0,
        byCategory: response.data.byCategory ?? {},
        bySeason: response.data.bySeason ?? {},
        mostWorn: (response.data.mostWorn ?? []).map(normalizeClothingItem),
        leastWorn: (response.data.leastWorn ?? []).map(normalizeClothingItem),
      },
    };
  },

  async search(
    query: string,
    filter?: ClothingFilter,
    extraParams?: {
      minPrice?: number;
      maxPrice?: number;
      sizes?: string[];
      sort?: string;
      brands?: string[];
      colors?: string[];
      subcategory?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<ClothingItem>>> {
    const response = await apiClient.post<BackendClothingListResponse>("/clothing/search", {
      query,
      filter,
      minPrice: extraParams?.minPrice,
      maxPrice: extraParams?.maxPrice,
      sizes: extraParams?.sizes,
      sort: extraParams?.sort,
      brands: extraParams?.brands,
      colors: extraParams?.colors,
      subcategory: extraParams?.subcategory,
      page: extraParams?.page ?? 1,
      limit: extraParams?.limit ?? 20,
    });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error,
      };
    }

    return {
      success: true,
      data: normalizePaginatedResponse(response.data),
    };
  },
};

export default clothingApi;
