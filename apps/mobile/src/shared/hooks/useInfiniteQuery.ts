import {
  useInfiniteQuery as useTanStackInfiniteQuery,
} from "@tanstack/react-query";
import { useCallback } from "react";
import apiClient from "../../services/api/client";
import type { PaginatedResponse } from "../types";

interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UseInfiniteQueryOptions_<_T> {
  queryKey: (string | number)[];
  url: string;
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
}

export function useInfiniteQuery<T>(options: UseInfiniteQueryOptions_<T>) {
  const { queryKey, url, pageSize = 20, enabled = true, staleTime = 60000 } = options;

  const query = useTanStackInfiniteQuery<CursorPage<T>, Error>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      const params: Record<string, unknown> = { pageSize };
      if (cursor) {
        params.cursor = cursor;
      }

      const response = await apiClient.get<PaginatedResponse<T>>(url, params);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "Failed to fetch data");
      }

      const lastItem = response.data.items[response.data.items.length - 1];
      const nextCursor = lastItem
        ? String((lastItem as Record<string, unknown>)["id"] ?? null)
        : null;
      return {
        items: response.data.items,
        nextCursor: nextCursor === "null" ? null : nextCursor,
        hasMore: response.data.hasMore ?? response.data.items.length >= pageSize,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled,
    staleTime,
  });

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const hasMore = query.hasNextPage;
  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  return {
    items,
    hasMore,
    loadMore,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    isRefreshing: query.isRefetching,
    refresh: query.refetch,
    error: query.error,
  };
}

export default useInfiniteQuery;
