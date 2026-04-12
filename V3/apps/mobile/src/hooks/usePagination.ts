import { useState, useCallback, useRef } from 'react';

interface PaginationState<T> {
  data: T[];
  page: number;
  totalPages: number;
  isLoading: boolean;
  hasNext: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * usePagination - 分页状态管理 Hook
 * 用于列表分页加载场景，自动管理页码递增和数据追加
 *
 * @param fetchFn  分页请求函数，接收 page 参数返回分页结果
 * @param pageSize 每页条数，默认 20
 * @returns        分页状态和操作方法
 */
export function usePagination<T>(
  fetchFn: (page: number, pageSize: number) => Promise<PageResult<T>>,
  pageSize: number = 20,
): PaginationState<T> {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(
    async (targetPage: number, append: boolean) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);

      try {
        const result = await fetchFn(targetPage, pageSize);

        setData((prev) =>
          append ? [...prev, ...result.data] : result.data,
        );
        setPage(targetPage);
        setTotalPages(result.totalPages);
        setHasNext(targetPage < result.totalPages);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [fetchFn, pageSize],
  );

  const loadMore = useCallback(() => {
    if (!hasNext || isFetchingRef.current) return;
    fetchData(page + 1, true);
  }, [hasNext, page, fetchData]);

  const refresh = useCallback(async () => {
    setData([]);
    setHasNext(true);
    await fetchData(1, false);
  }, [fetchData]);

  return {
    data,
    page,
    totalPages,
    isLoading,
    hasNext,
    loadMore,
    refresh,
  };
}

export type { PageResult, PaginationState };
