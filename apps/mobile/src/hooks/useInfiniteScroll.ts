import { useState, useCallback, useRef } from "react";
import apiClient from "../services/api/client";
import { toAppError } from "../services/api/error";
import type { ApiResponse, PaginatedResponse } from "../types";

interface UseInfiniteScrollOptions<T> {
  url: string;
  pageSize?: number;
  getItems?: (page: PaginatedResponse<T>) => T[];
  getHasMore?: (page: PaginatedResponse<T>) => boolean;
  enabled?: boolean;
  params?: Record<string, unknown>;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export function useInfiniteScroll<T>(
  options: UseInfiniteScrollOptions<T>,
): UseInfiniteScrollReturn<T> {
  const {
    url,
    pageSize = 20,
    getItems = (page) => page.items,
    getHasMore = (page) => page.hasMore ?? page.items.length >= pageSize,
    enabled = true,
    params,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(1);
  const isMountedRef = useRef(true);

  const loadMore = useCallback(async () => {
    if (!enabled || loadingMore || !hasMore || loading) return;

    setLoadingMore(true);
    setError(null);

    try {
      const page = pageRef.current;
      const response: ApiResponse<PaginatedResponse<T>> =
        await apiClient.get<PaginatedResponse<T>>(url, {
          page,
          pageSize,
          ...params,
        });

      if (!isMountedRef.current) return;

      if (response.success && response.data) {
        const newItems = getItems(response.data);
        const more = getHasMore(response.data);

        setItems((prev) => (page === 1 ? newItems : [...prev, ...newItems]));
        setHasMore(more);
        pageRef.current = page + 1;
      } else {
        setError(response.error?.message || "加载失败");
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(toAppError(err).userMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [url, pageSize, params, enabled, loadingMore, hasMore, loading, getItems, getHasMore]);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setRefreshing(true);
    setError(null);
    pageRef.current = 1;

    try {
      const response: ApiResponse<PaginatedResponse<T>> =
        await apiClient.get<PaginatedResponse<T>>(url, {
          page: 1,
          pageSize,
          ...params,
        });

      if (!isMountedRef.current) return;

      if (response.success && response.data) {
        const newItems = getItems(response.data);
        const more = getHasMore(response.data);

        setItems(newItems);
        setHasMore(more);
        pageRef.current = 2;
      } else {
        setError(response.error?.message || "刷新失败");
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(toAppError(err).userMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [url, pageSize, params, enabled, getItems, getHasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setError(null);
    pageRef.current = 1;
  }, []);

  return {
    items,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    reset,
  };
}

export default useInfiniteScroll;
