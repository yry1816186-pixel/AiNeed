import { useState, useCallback } from 'react';

interface RefreshState {
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * useRefresh - 下拉刷新 Hook
 * 用于 FlatList/ScrollView 的 RefreshControl 场景，自动管理刷新状态
 *
 * @param asyncFn  异步刷新函数
 * @returns        刷新状态和 onRefresh 回调（可直接传给 RefreshControl）
 */
export function useRefresh(asyncFn: () => Promise<void>): RefreshState {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    asyncFn().finally(() => {
      setIsRefreshing(false);
    });
  }, [asyncFn, isRefreshing]);

  return { isRefreshing, onRefresh };
}
