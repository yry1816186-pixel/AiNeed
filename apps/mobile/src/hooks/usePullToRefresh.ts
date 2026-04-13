import { useState, useCallback, useRef } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  minRefreshTime?: number;
}

interface UsePullToRefreshReturn {
  refreshing: boolean;
  onRefresh: () => void;
  lastRefreshed: Date | null;
  error: Error | null;
  retry: () => void;
}

export function usePullToRefresh(options: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const { onRefresh: refreshFn, minRefreshTime = 500 } = options;
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const doRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    const startTime = Date.now();

    try {
      await refreshFn();
      const elapsed = Date.now() - startTime;
      const remaining = minRefreshTime - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      if (isMountedRef.current) {
        setLastRefreshed(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshFn, minRefreshTime, refreshing]);

  const retry = useCallback(() => {
    setError(null);
    doRefresh();
  }, [doRefresh]);

  return { refreshing, onRefresh: doRefresh, lastRefreshed, error, retry };
}

export default usePullToRefresh;
