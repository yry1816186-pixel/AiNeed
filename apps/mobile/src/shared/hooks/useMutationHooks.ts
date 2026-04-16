/**
 * TanStack Query 统一变更 hooks
 *
 * 所有 mutation 在成功后自动 invalidate 相关查询，
 * 并对关键操作实现乐观更新（optimistic update）。
 */
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { cartApi, favoriteApi } from "../../services/api/commerce.api";
import { profileApi } from "../../services/api/profile.api";
import { tryOnApi, recommendationsApi } from "../../services/api/tryon.api";
import { aiStylistApi } from "../../services/api/ai-stylist.api";

import { queryKeys } from "./useQueryHooks";

import type { ApiResponse } from "../types";
import type { CartItem } from "../../types/api";
import type { ClothingItem } from "../../types/clothing";
import type {
  UserProfile,
  UpdateProfileDto,
} from "../../services/api/profile.api";
import type { AiStylistSessionResponse } from "../../services/api/ai-stylist.api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 从 ApiResponse<T> 中提取 data，失败时抛出 Error */
function unwrap<T>(response: ApiResponse<T>): T {
  if (response.success && response.data !== undefined) {
    return response.data;
  }
  throw new Error(response.error?.message ?? "请求失败");
}

// ---------------------------------------------------------------------------
// Cart Mutations
// ---------------------------------------------------------------------------

/**
 * 加购 mutation
 *
 * 乐观更新：在 onMutate 中直接将新商品追加到购物车缓存，
 * 失败时回滚。
 */
export function useAddToCart(
  options?: Partial<UseMutationOptions<
    CartItem,
    Error,
    { productId?: string; itemId?: string; color: string; size: string; quantity: number },
    { previousCart: CartItem[] | undefined }
  >>,
) {
  const queryClient = useQueryClient();

  return useMutation<
    CartItem,
    Error,
    { productId?: string; itemId?: string; color: string; size: string; quantity: number },
    { previousCart: CartItem[] | undefined }
  >({
    mutationFn: (params) => cartApi.add(params).then(unwrap),

    // 乐观更新：先更新缓存
    onMutate: async (params) => {
      // 取消进行中的查询，避免覆盖乐观更新
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.items() });

      // 保存当前快照用于回滚
      const previousCart = queryClient.getQueryData<CartItem[]>(queryKeys.cart.items());

      // 乐观追加
      if (previousCart) {
        const optimisticItem: CartItem = {
          id: `temp-${Date.now()}`,
          productId: params.productId ?? params.itemId ?? "",
          name: "",
          imageUri: "",
          color: params.color,
          size: params.size,
          quantity: params.quantity,
          price: 0,
        };
        queryClient.setQueryData<CartItem[]>(queryKeys.cart.items(), [
          ...previousCart,
          optimisticItem,
        ]);
      }

      return { previousCart };
    },

    // 失败时回滚
    onError: (_err, params, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.items(), context.previousCart);
      }
    },

    // 无论成功失败都重新获取最新数据
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.items() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.total() });
    },

    ...options,
  });
}

/**
 * 移除购物车项 mutation
 *
 * 乐观更新：立即从缓存中移除对应项
 */
export function useRemoveFromCart(
  options?: Partial<UseMutationOptions<void, Error, string, { previousCart: CartItem[] | undefined }>>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { previousCart: CartItem[] | undefined }>({
    mutationFn: (itemId: string) => cartApi.remove(itemId).then(() => undefined),

    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.items() });

      const previousCart = queryClient.getQueryData<CartItem[]>(queryKeys.cart.items());

      if (previousCart) {
        queryClient.setQueryData<CartItem[]>(
          queryKeys.cart.items(),
          previousCart.filter((item) => item.id !== itemId),
        );
      }

      return { previousCart };
    },

    onError: (_err, itemId, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.items(), context.previousCart);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.items() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.total() });
    },

    ...options,
  });
}

/**
 * 更新购物车项（数量、选中状态等）
 */
export function useUpdateCartItem(
  options?: Partial<UseMutationOptions<
    CartItem,
    Error,
    { itemId: string; data: { quantity?: number; color?: string; size?: string; selected?: boolean } },
    { previousCart: CartItem[] | undefined }
  >>,
) {
  const queryClient = useQueryClient();

  return useMutation<
    CartItem,
    Error,
    { itemId: string; data: { quantity?: number; color?: string; size?: string; selected?: boolean } },
    { previousCart: CartItem[] | undefined }
  >({
    mutationFn: ({ itemId, data }) => cartApi.update(itemId, data).then(unwrap),

    onMutate: async ({ itemId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.items() });

      const previousCart = queryClient.getQueryData<CartItem[]>(queryKeys.cart.items());

      if (previousCart) {
        queryClient.setQueryData<CartItem[]>(
          queryKeys.cart.items(),
          previousCart.map((item) =>
            item.id === itemId ? { ...item, ...data } : item,
          ),
        );
      }

      return { previousCart };
    },

    onError: (_err, params, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.items(), context.previousCart);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.items() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.total() });
    },

    ...options,
  });
}

// ---------------------------------------------------------------------------
// Favorite Mutations
// ---------------------------------------------------------------------------

/**
 * 收藏 / 取消收藏 toggle
 *
 * 乐观更新：在缓存中切换 isFavorite 状态
 * 由于 favoriteApi.add / remove 返回 void，这里用 boolean 标识方向
 */
export function useToggleFavorite(
  options?: Partial<UseMutationOptions<void, Error, { itemId: string; isFavorite: boolean }, { previousFavorites: ClothingItem[] | undefined }>>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { itemId: string; isFavorite: boolean }, { previousFavorites: ClothingItem[] | undefined }>({
    mutationFn: async ({ itemId, isFavorite }) => {
      if (isFavorite) {
        // 当前已收藏 -> 取消
        const res = await favoriteApi.remove(itemId);
        if (!res.success) { throw new Error(res.error?.message ?? "取消收藏失败"); }
      } else {
        // 当前未收藏 -> 添加
        const res = await favoriteApi.add(itemId);
        if (!res.success) { throw new Error(res.error?.message ?? "收藏失败"); }
      }
    },

    onMutate: async ({ itemId, isFavorite }) => {
      // 取消相关查询
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all });

      const previousFavorites = queryClient.getQueryData<ClothingItem[]>(
        queryKeys.favorites.list(),
      );

      // 乐观更新收藏列表
      if (previousFavorites) {
        if (isFavorite) {
          // 取消收藏 -> 从列表移除
          queryClient.setQueryData<ClothingItem[]>(
            queryKeys.favorites.list(),
            previousFavorites.filter((item) => item.id !== itemId),
          );
        } else {
          // 添加收藏 -> 暂不追加（缺少完整 ClothingItem 信息）
        }
      }

      return { previousFavorites };
    },

    onError: (_err, params, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(queryKeys.favorites.list(), context.previousFavorites);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
      // 收藏变化可能影响推荐
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all });
    },

    ...options,
  });
}

// ---------------------------------------------------------------------------
// Profile Mutations
// ---------------------------------------------------------------------------

/**
 * 更新用户画像
 *
 * 乐观更新：直接更新 profile 缓存
 */
export function useUpdateProfile(
  options?: Partial<UseMutationOptions<UserProfile, Error, UpdateProfileDto, { previousProfile: UserProfile | undefined }>>,
) {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, UpdateProfileDto, { previousProfile: UserProfile | undefined }>({
    mutationFn: (data: UpdateProfileDto) => profileApi.updateProfile(data).then(unwrap),

    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.user() });

      const previousProfile = queryClient.getQueryData<UserProfile>(queryKeys.profile.user());

      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(queryKeys.profile.user(), {
          ...previousProfile,
          ...data,
        });
      }

      return { previousProfile };
    },

    onError: (_err, data, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.profile.user(), context.previousProfile);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.user() });
      // 画像更新后推荐也应刷新
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all });
    },

    ...options,
  });
}

// ---------------------------------------------------------------------------
// TryOn Mutations
// ---------------------------------------------------------------------------

/**
 * 创建试衣任务
 */
export function useCreateTryOn(
  options?: Partial<UseMutationOptions<
    { id: string; status: string },
    Error,
    { photoId: string; itemId: string }
  >>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ photoId, itemId }) => tryOnApi.create(photoId, itemId).then(unwrap),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tryOn.all });
    },

    ...options,
  });
}

/**
 * 删除试衣记录
 */
export function useDeleteTryOn(
  options?: Partial<UseMutationOptions<void, Error, string>>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tryOnApi.deleteTryOn(id).then(() => undefined),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tryOn.history() });
    },

    ...options,
  });
}

// ---------------------------------------------------------------------------
// AI Stylist Mutations
// ---------------------------------------------------------------------------

/**
 * 创建 AI 造型师会话
 */
export function useCreateAiStylistSession(
  options?: Partial<UseMutationOptions<
    AiStylistSessionResponse,
    Error,
    { entry?: string; goal?: string; context?: Record<string, unknown> }
  >>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => aiStylistApi.createSession(payload).then(unwrap),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiStylist.all });
    },

    ...options,
  });
}

/**
 * 发送 AI 造型师消息
 *
 * 乐观更新：将用户消息追加到会话缓存
 */
export function useSendAiStylistMessage(
  options?: Partial<UseMutationOptions<
    AiStylistSessionResponse,
    Error,
    { sessionId: string; message: string; latitude?: number; longitude?: number }
  >>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, message, latitude, longitude }) =>
      aiStylistApi.sendMessage(sessionId, message, latitude, longitude).then(unwrap),

    onSettled: (_data, err, { sessionId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.aiStylist.session(sessionId),
      });
    },

    ...options,
  });
}

// ---------------------------------------------------------------------------
// Recommendation Feedback Mutations
// ---------------------------------------------------------------------------

/**
 * 提交推荐反馈
 *
 * 成功后刷新推荐列表
 */
export function useSubmitFeedback(
  options?: Partial<UseMutationOptions<
    { success: boolean; message: string },
    Error,
    { clothingId: string; action: "like" | "dislike" | "ignore"; recommendationId?: string; reason?: string }
  >>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => recommendationsApi.submitFeedback(params).then(unwrap),

    onSettled: () => {
      // 反馈后刷新推荐
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all });
    },

    ...options,
  });
}

/**
 * 批量提交推荐反馈
 */
export function useSubmitBatchFeedback(
  options?: Partial<UseMutationOptions<
    { success: boolean; message: string },
    Error,
    Array<{ clothingId: string; action: "like" | "dislike" | "ignore"; recommendationId?: string }>
  >>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items) => recommendationsApi.submitBatchFeedback(items).then(unwrap),

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all });
    },

    ...options,
  });
}
