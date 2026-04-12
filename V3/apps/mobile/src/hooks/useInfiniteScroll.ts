import { useState, useCallback, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

interface InfiniteScrollState<T> {
  data: T[];
  isLoadingMore: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

interface InfinitePageResult<T> {
  data: T[];
  page: number;
  totalPages: number;
}

const TRIGGER_THRESHOLD = 200;
const DEFAULT_PAGE_SIZE = 20;

/**
 * useInfiniteScroll - 无限滚动 Hook
 * 用于长列表无限加载场景，距底部 200px 时自动触发加载下一页
 *
 * @param fetchFn  分页请求函数，接收 page 参数返回分页结果
 * @param pageSize 每页条数，默认 20
 * @returns        无限滚动状态、刷新方法和 onScroll 处理函数
 */
export function useInfiniteScroll<T>(
  fetchFn: (page: number, pageSize: number) => Promise<InfinitePageResult<T>>,
  pageSize: number = DEFAULT_PAGE_SIZE,
): InfiniteScrollState<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const isFetchingRef = useRef(false);
  const isInitializedRef = useRef(false);

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoadingMore(true);

      try {
        const result = await fetchFn(targetPage, pageSize);
        pageRef.current = targetPage;
        totalPagesRef.current = result.totalPages;

        setData((prev) =>
          append ? [...prev, ...result.data] : result.data,
        );
      } finally {
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [fetchFn, pageSize],
  );

  if (!isInitializedRef.current) {
    isInitializedRef.current = true;
    fetchPage(1, false);
  }

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;

      if (
        distanceFromBottom < TRIGGER_THRESHOLD &&
        pageRef.current < totalPagesRef.current &&
        !isFetchingRef.current
      ) {
        fetchPage(pageRef.current + 1, true);
      }
    },
    [fetchPage],
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    pageRef.current = 1;
    totalPagesRef.current = 1;

    try {
      await fetchPage(1, false);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPage]);

  return {
    data,
    isLoadingMore,
    isRefreshing,
    refresh,
    onScroll,
  };
}

export type { InfiniteScrollState, InfinitePageResult };
