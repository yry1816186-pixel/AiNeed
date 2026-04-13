import apiClient from "./client";
import { ApiResponse } from "../../types";
import {
  buildPhotoAssetUrl,
  buildTryOnResultAssetUrl,
  normalizeAssetUrl,
} from "./asset-url";

export interface TryOnResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  resultImageUrl?: string;
  resultImageDataUri?: string;
  errorMessage?: string;
  photo: {
    id: string;
    thumbnailUrl?: string;
  };
  item: {
    id: string;
    name: string;
    mainImage: string;
  };
  createdAt: string;
  completedAt?: string;
}

function normalizeTryOnResult(payload: TryOnResult): TryOnResult {
  return {
    ...payload,
    resultImageUrl: buildTryOnResultAssetUrl(payload.id, payload.resultImageUrl),
    resultImageDataUri: payload.resultImageDataUri,
    photo: {
      ...payload.photo,
      thumbnailUrl: buildPhotoAssetUrl(
        payload.photo?.id ?? "",
        "thumbnail",
        payload.photo?.thumbnailUrl,
      ),
    },
    item: {
      ...payload.item,
      mainImage: normalizeAssetUrl(payload.item?.mainImage),
    },
  };
}

export const tryOnApi = {
  async create(
    photoId: string,
    itemId: string,
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    return apiClient.post("/try-on", { photoId, itemId });
  },

  async getStatus(id: string): Promise<ApiResponse<TryOnResult>> {
    const response = await apiClient.get<TryOnResult>(`/try-on/${id}`);

    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: normalizeTryOnResult(response.data),
    };
  },

  async getHistory(
    page?: number,
    limit?: number,
  ): Promise<ApiResponse<{ items: TryOnResult[]; total: number }>> {
    const response = await apiClient.get<{
      items: TryOnResult[];
      total: number;
    }>("/try-on/history", { page, limit });

    if (!response.success || !response.data) {
      return response;
    }

    return {
      success: true,
      data: {
        ...response.data,
        items: Array.isArray(response.data.items)
          ? response.data.items.map(normalizeTryOnResult)
          : [],
      },
    };
  },

  async deleteTryOn(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/try-on/${id}`);
  },

  async retryTryOn(id: string): Promise<ApiResponse<{ id: string; status: string }>> {
    return apiClient.post(`/try-on/${id}/retry`);
  },

  async getDailyQuota(): Promise<ApiResponse<{ used: number; limit: number; remaining: number }>> {
    return apiClient.get("/try-on/daily-quota");
  },
};

export interface RecommendedItem {
  id: string;
  name: string;
  brand?: string;
  price: number;
  mainImage: string;
  category: string;
  score?: number;
  matchReasons?: string[];
  externalUrl?: string;
}

interface RecommendationBrand {
  name?: string;
}

interface RecommendationItemPayload {
  id?: string;
  name?: string;
  brand?: RecommendationBrand | string | null;
  price?: number | string | null;
  mainImage?: string | null;
  images?: string[] | null;
  category?: string | null;
  externalUrl?: string | null;
  score?: number | string | null;
  matchReasons?: string[] | null;
}

interface RecommendationResultRow {
  item?: RecommendationItemPayload | null;
  score?: number | string | null;
  matchReasons?: string[] | null;
}

interface RecommendationListResponse {
  items?: Array<RecommendationResultRow | RecommendationItemPayload>;
  total?: number;
}

type RecommendationApiPayload =
  | RecommendationListResponse
  | Array<RecommendationResultRow | RecommendationItemPayload>;

function toNumber(value?: number | string | null): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeBrandName(
  brand?: RecommendationBrand | string | null,
): string | undefined {
  if (typeof brand === "string") {
    return brand;
  }

  return brand?.name;
}

function normalizeRecommendationScore(
  value?: number | string | null,
): number | undefined {
  const numeric = toNumber(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }

  if (numeric > 1 && numeric <= 100) {
    return Math.min(1, numeric / 100);
  }

  return Math.min(1, numeric);
}

function normalizeMatchReasons(value?: string[] | null): string[] | undefined {
  const reasons =
    value
      ?.map((reason) => reason.trim())
      .filter((reason) => reason.length > 0) ?? [];

  return reasons.length > 0 ? reasons : undefined;
}

function isRecommendationResultRow(
  value: RecommendationResultRow | RecommendationItemPayload,
): value is RecommendationResultRow {
  return "item" in value;
}

function normalizeRecommendedItem(
  payload: RecommendationResultRow | RecommendationItemPayload,
): RecommendedItem {
  const item = isRecommendationResultRow(payload)
    ? payload.item ?? {}
    : payload;

  return {
    id: item.id ?? "",
    name: item.name ?? "",
    brand: normalizeBrandName(item.brand),
    price: toNumber(item.price),
    mainImage: item.mainImage ?? item.images?.[0] ?? "",
    category: item.category ?? "",
    score: normalizeRecommendationScore(
      isRecommendationResultRow(payload) ? payload.score : payload.score,
    ),
    matchReasons: normalizeMatchReasons(
      isRecommendationResultRow(payload)
        ? payload.matchReasons ?? payload.item?.matchReasons
        : payload.matchReasons,
    ),
    externalUrl: item.externalUrl ?? undefined,
  };
}

function normalizeRecommendationList(
  payload?: RecommendationApiPayload,
): RecommendedItem[] {
  const rows = Array.isArray(payload) ? payload : payload?.items ?? [];

  return rows
    .map(normalizeRecommendedItem)
    .filter((item) => item.id.length > 0);
}

async function getNormalizedRecommendations(
  path: string,
  params: Record<string, unknown> | undefined,
  fallbackCode: string,
  fallbackMessage: string,
): Promise<ApiResponse<RecommendedItem[]>> {
  const response = await apiClient.get<RecommendationApiPayload>(path, params);

  if (!response.success || !response.data) {
    return {
      success: false,
      error:
        response.error ?? {
          code: fallbackCode,
          message: fallbackMessage,
        },
    };
  }

  return {
    success: true,
    data: normalizeRecommendationList(response.data),
  };
}

export const recommendationsApi = {
  async getPersonalized(params?: {
    category?: string;
    occasion?: string;
    season?: string;
    limit?: number;
  }): Promise<ApiResponse<RecommendedItem[]>> {
    return getNormalizedRecommendations(
      "/recommendations",
      params,
      "RECOMMENDATIONS_UNAVAILABLE",
      "Failed to load recommendations",
    );
  },

  async getAdvanced(params?: {
    occasion?: string;
    season?: string;
    limit?: number;
  }): Promise<ApiResponse<RecommendedItem[]>> {
    return getNormalizedRecommendations(
      "/recommendations/advanced",
      params,
      "ADVANCED_RECOMMENDATIONS_UNAVAILABLE",
      "Failed to load advanced recommendations",
    );
  },

  async getDailyOutfit(): Promise<
    ApiResponse<{
      items: RecommendedItem[];
      outfitName: string;
      description: string;
    }>
  > {
    const response = await apiClient.get<{
      items?: Array<RecommendationResultRow | RecommendationItemPayload>;
      outfitName?: string;
      description?: string;
    }>("/recommendations/daily");

    if (!response.success || !response.data) {
      return {
        success: false,
        error:
          response.error ?? {
            code: "DAILY_OUTFIT_UNAVAILABLE",
            message: "Failed to load daily outfit",
          },
      };
    }

    return {
      success: true,
      data: {
        items: normalizeRecommendationList(response.data.items ?? []),
        outfitName: response.data.outfitName ?? "",
        description: response.data.description ?? "",
      },
    };
  },

  async getOccasion(
    occasion: string,
    limit?: number,
  ): Promise<ApiResponse<RecommendedItem[]>> {
    return getNormalizedRecommendations(
      "/recommendations/occasion",
      { type: occasion, limit },
      "OCCASION_RECOMMENDATIONS_UNAVAILABLE",
      "Failed to load occasion recommendations",
    );
  },

  async getTrending(limit?: number): Promise<ApiResponse<RecommendedItem[]>> {
    return getNormalizedRecommendations(
      "/recommendations/trending",
      { limit },
      "TRENDING_RECOMMENDATIONS_UNAVAILABLE",
      "Failed to load trending recommendations",
    );
  },

  async getDiscover(limit?: number): Promise<ApiResponse<RecommendedItem[]>> {
    return getNormalizedRecommendations(
      "/recommendations/discover",
      { limit },
      "DISCOVER_RECOMMENDATIONS_UNAVAILABLE",
      "Failed to load discover recommendations",
    );
  },

  async getStyleGuide(): Promise<
    ApiResponse<{
      bodyType: string | null;
      skinTone: string | null;
      colorSeason: string | null;
      faceShape: string | null;
      recommendations: string[];
    }>
  > {
    return apiClient.get("/recommendations/style-guide");
  },

  async getCompleteTheLook(
    clothingId: string,
  ): Promise<
    ApiResponse<{
      anchor: {
        id: string;
        name: string;
        category: string;
        imageUrl: string;
        price?: number;
      };
      suggestions: {
        top: Array<{
          id: string;
          name: string;
          imageUrl: string;
          price?: number;
          brand?: string;
          matchScore: number;
          reason: string;
        }>;
        bottom: Array<{
          id: string;
          name: string;
          imageUrl: string;
          price?: number;
          brand?: string;
          matchScore: number;
          reason: string;
        }>;
        shoes: Array<{
          id: string;
          name: string;
          imageUrl: string;
          price?: number;
          brand?: string;
          matchScore: number;
          reason: string;
        }>;
        accessories: Array<{
          id: string;
          name: string;
          imageUrl: string;
          price?: number;
          brand?: string;
          matchScore: number;
          reason: string;
        }>;
      };
      harmonyScore: number;
      harmonyRule: string;
      harmonyDescription: string;
    }>
  > {
    return apiClient.get(`/recommendations/complete-the-look/${clothingId}`);
  },

  async submitFeedback(params: {
    clothingId: string;
    action: "like" | "dislike" | "ignore";
    recommendationId?: string;
    reason?: string;
  }): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.post("/recommendations/feedback", params);
  },

  async submitBatchFeedback(
    items: Array<{
      clothingId: string;
      action: "like" | "dislike" | "ignore";
      recommendationId?: string;
    }>,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.post("/recommendations/feedback/batch", { items });
  },

  async getColdStartRecommendations(
    limit?: number,
  ): Promise<ApiResponse<RecommendedItem[]>> {
    return getNormalizedRecommendations(
      "/recommendations/cold-start",
      { limit },
      "COLD_START_UNAVAILABLE",
      "Failed to load cold start recommendations",
    );
  },
};

export default { tryOnApi, recommendationsApi };
