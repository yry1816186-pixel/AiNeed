/**
 * TanStack Query 统一数据获取 hooks
 *
 * 替代分散在各 Store 中的手写 loading/error/cache 逻辑，
 * 利用 TanStack Query 的缓存、自动失效、后台刷新等能力。
 */
import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";

import { clothingApi } from '../services/api/clothing.api';
import { cartApi, searchApi } from '../services/api/commerce.api';
import { profileApi } from '../services/api/profile.api';
import { tryOnApi, recommendationsApi } from '../services/api/tryon.api';
import { aiStylistApi } from '../services/api/ai-stylist.api';
import { recommendationFeedApi } from '../services/api/recommendation-feed.api';

import type { ApiResponse, PaginatedResponse, SearchFilters } from "../types";
import type { ClothingItem, ClothingFilter, ClothingSortOptions } from "../types/clothing";
import type { CartItem } from "../types/api";
import type {
  UserProfile,
  BodyAnalysisReport,
  ColorAnalysisReport,
} from "../services/api/profile.api";
import type { TryOnResult, RecommendedItem } from "../services/api/tryon.api";
import type {
  AiStylistSessionResponse,
  AiStylistSuggestionResponse,
} from "../services/api/ai-stylist.api";
import type { FeedResult, FeedParams } from "../services/api/recommendation-feed.api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 从 ApiResponse<T> 中提取 data，失败时抛出 Error 供 TanStack Query 捕获 */
function unwrap<T>(response: ApiResponse<T>): T {
  if (response.success && response.data !== undefined) {
    return response.data;
  }
  throw new Error(response.error?.message ?? "请求失败");
}

// ---------------------------------------------------------------------------
// Query Key 工厂
// ---------------------------------------------------------------------------

export const queryKeys = {
  clothing: {
    all: ["clothing"] as const,
    list: (params?: ClothingListParams) => ["clothing", "list", params] as const,
    detail: (id: string) => ["clothing", "detail", id] as const,
  },
  recommendations: {
    all: ["recommendations"] as const,
    personalized: (params?: { category?: string; occasion?: string; season?: string; limit?: number }) =>
      ["recommendations", "personalized", params] as const,
    feed: (params?: FeedParams) => ["recommendations", "feed", params] as const,
    daily: () => ["recommendations", "daily"] as const,
    trending: (limit?: number) => ["recommendations", "trending", limit] as const,
  },
  cart: {
    all: ["cart"] as const,
    items: () => ["cart", "items"] as const,
    total: () => ["cart", "total"] as const,
  },
  profile: {
    all: ["profile"] as const,
    user: () => ["profile", "user"] as const,
    bodyAnalysis: () => ["profile", "bodyAnalysis"] as const,
    colorAnalysis: () => ["profile", "colorAnalysis"] as const,
    styleRecommendations: () => ["profile", "styleRecommendations"] as const,
    bodyMetrics: () => ["profile", "bodyMetrics"] as const,
  },
  tryOn: {
    all: ["tryOn"] as const,
    history: (page?: number, limit?: number) => ["tryOn", "history", page, limit] as const,
    status: (id: string) => ["tryOn", "status", id] as const,
    dailyQuota: () => ["tryOn", "dailyQuota"] as const,
  },
  aiStylist: {
    all: ["aiStylist"] as const,
    session: (id: string) => ["aiStylist", "session", id] as const,
    suggestions: () => ["aiStylist", "suggestions"] as const,
  },
  search: {
    all: ["search"] as const,
    clothing: (filters: SearchFilters) => ["search", "clothing", filters] as const,
  },
  favorites: {
    all: ["favorites"] as const,
    list: (params?: { page?: number; limit?: number }) => ["favorites", "list", params] as const,
  },
} as const;

// ---------------------------------------------------------------------------
// 参数类型
// ---------------------------------------------------------------------------

export interface ClothingListParams {
  filter?: ClothingFilter;
  sort?: ClothingSortOptions;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  brandId?: string;
  sizes?: string[];
}

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

/**
 * 服装列表查询
 *
 * - staleTime 5 分钟（与全局一致）
 * - gcTime 30 分钟
 * - 参数变化自动重新请求
 */
export function useClothingList(params?: ClothingListParams, options?: Partial<UseQueryOptions<PaginatedResponse<ClothingItem>>>) {
  return useQuery({
    queryKey: queryKeys.clothing.list(params),
    queryFn: () => clothingApi.getAll(params).then(unwrap),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 服装详情查询
 *
 * - id 为 falsy 时自动禁用（enabled: false）
 * - staleTime 5 分钟
 */
export function useClothingDetail(id: string | undefined | null, options?: Partial<UseQueryOptions<ClothingItem>>) {
  return useQuery({
    queryKey: queryKeys.clothing.detail(id ?? ""),
    queryFn: () => clothingApi.getById(id!).then(unwrap),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 推荐列表 - 无限滚动
 *
 * 使用 useInfiniteQuery 实现分页加载，
 * 每次 getNextPageParam 基于 page 递增。
 */
export function useRecommendations(
  params?: { category?: string; occasion?: string; season?: string; limit?: number },
  options?: Partial<UseInfiniteQueryOptions<RecommendedItem[], Error>>,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.recommendations.personalized(params),
    queryFn: async ({ pageParam }) => {
      const _page = pageParam as number;
      const response = await recommendationsApi.getPersonalized({
        ...params,
        limit: params?.limit ?? 20,
      });
      return unwrap(response);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      // 推荐接口返回数组，若数量不足 limit 则无更多
      const limit = params?.limit ?? 20;
      if (lastPage.length < limit) { return undefined; }
      return (lastPageParam as number) + 1;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 推荐 Feed - 无限滚动
 *
 * 基于 recommendationFeedApi，支持 daily / occasion / trending / explore 分类。
 */
export function useRecommendationFeed(
  params?: FeedParams,
  options?: Partial<UseInfiniteQueryOptions<FeedResult, Error>>,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.recommendations.feed(params),
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      return recommendationFeedApi.getFeed({ ...params, page, pageSize: params?.pageSize ?? 10 });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.items.length > 0 ? undefined : undefined) : undefined),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 购物车查询
 *
 * - staleTime 较短（1 分钟），保证加购后刷新及时
 */
export function useCart(options?: Partial<UseQueryOptions<CartItem[]>>) {
  return useQuery({
    queryKey: queryKeys.cart.items(),
    queryFn: () => cartApi.get().then(unwrap),
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * 用户画像查询
 */
export function useUserProfile(options?: Partial<UseQueryOptions<UserProfile>>) {
  return useQuery({
    queryKey: queryKeys.profile.user(),
    queryFn: () => profileApi.getProfile().then(unwrap),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 体型分析报告
 */
export function useBodyAnalysis(options?: Partial<UseQueryOptions<BodyAnalysisReport>>) {
  return useQuery({
    queryKey: queryKeys.profile.bodyAnalysis(),
    queryFn: () => profileApi.getBodyAnalysis().then(unwrap),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 色彩分析报告
 */
export function useColorAnalysis(options?: Partial<UseQueryOptions<ColorAnalysisReport>>) {
  return useQuery({
    queryKey: queryKeys.profile.colorAnalysis(),
    queryFn: () => profileApi.getColorAnalysis().then(unwrap),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 试衣历史查询
 */
export function useTryOnHistory(
  page?: number,
  limit?: number,
  options?: Partial<UseQueryOptions<{ items: TryOnResult[]; total: number }>>,
) {
  return useQuery({
    queryKey: queryKeys.tryOn.history(page, limit),
    queryFn: () => tryOnApi.getHistory(page, limit).then(unwrap),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 试衣状态查询（可用于轮询）
 */
export function useTryOnStatus(
  id: string | undefined | null,
  options?: Partial<UseQueryOptions<TryOnResult>>,
) {
  return useQuery({
    queryKey: queryKeys.tryOn.status(id ?? ""),
    queryFn: () => tryOnApi.getStatus(id!).then(unwrap),
    enabled: !!id,
    staleTime: 30 * 1000, // 短 staleTime，适合轮询
    gcTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      // 状态为 pending/processing 时每 3 秒轮询
      const status = query.state.data?.status;
      if (status === "pending" || status === "processing") {
        return 3000;
      }
      return false;
    },
    ...options,
  });
}

/**
 * AI 造型师会话查询
 */
export function useAiStylistSession(
  id: string | undefined | null,
  options?: Partial<UseQueryOptions<AiStylistSessionResponse>>,
) {
  return useQuery({
    queryKey: queryKeys.aiStylist.session(id ?? ""),
    queryFn: () => aiStylistApi.getSessionStatus(id!).then(unwrap),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}

/**
 * AI 造型师建议查询
 */
export function useAiStylistSuggestions(options?: Partial<UseQueryOptions<AiStylistSuggestionResponse>>) {
  return useQuery({
    queryKey: queryKeys.aiStylist.suggestions(),
    queryFn: () => aiStylistApi.getSuggestions().then(unwrap),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 搜索 - 无限滚动
 *
 * query 为空时自动禁用
 */
export function useSearch(
  filters: SearchFilters,
  options?: Partial<UseInfiniteQueryOptions<ClothingItem[], Error>>,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.search.clothing(filters),
    queryFn: async ({ pageParam: pageParam }) => {
      const response = await searchApi.searchClothing(filters);
      return unwrap(response);
    },
    initialPageParam: 1,
    getNextPageParam: () => undefined, // 搜索接口当前不支持分页
    enabled: !!filters.query,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * 每日穿搭推荐
 */
export function useDailyOutfit(
  options?: Partial<UseQueryOptions<{ items: RecommendedItem[]; outfitName: string; description: string }>>,
) {
  return useQuery({
    queryKey: queryKeys.recommendations.daily(),
    queryFn: () => recommendationsApi.getDailyOutfit().then(unwrap),
    staleTime: 30 * 60 * 1000, // 每日推荐缓存 30 分钟
    gcTime: 60 * 60 * 1000,
    ...options,
  });
}

/**
 * 趋势推荐
 */
export function useTrendingRecommendations(
  limit?: number,
  options?: Partial<UseQueryOptions<RecommendedItem[]>>,
) {
  return useQuery({
    queryKey: queryKeys.recommendations.trending(limit),
    queryFn: () => recommendationsApi.getTrending(limit).then(unwrap),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * 试衣每日配额
 */
export function useTryOnDailyQuota(
  options?: Partial<UseQueryOptions<{ used: number; limit: number; remaining: number }>>,
) {
  return useQuery({
    queryKey: queryKeys.tryOn.dailyQuota(),
    queryFn: () => tryOnApi.getDailyQuota().then(unwrap),
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}
