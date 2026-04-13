import { useState, useCallback, useRef } from "react";

interface UseRefreshOptions {
  onRefresh: () => Promise<void>;
  minRefreshTime?: number;
}

interface UseRefreshReturn {
  refreshing: boolean;
  onRefresh: () => void;
  lastRefreshed: Date | null;
  error: Error | null;
  retry: () => void;
}

export function useRefresh(options: UseRefreshOptions): UseRefreshReturn {
  const { onRefresh: refreshFn, minRefreshTime = 500 } = options;
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const refreshingRef = useRef(false);

  const doRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
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
      refreshingRef.current = false;
    }
  }, [refreshFn, minRefreshTime]);

  const retry = useCallback(() => {
    setError(null);
    doRefresh();
  }, [doRefresh]);

  return { refreshing, onRefresh: doRefresh, lastRefreshed, error, retry };
}

export default useRefresh;
