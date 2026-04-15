import { useState, useCallback, useRef } from "react";

interface UseRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  onRetry?: (attempt: number) => void;
}

interface UseRetryReturn<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  retry: () => void;
  reset: () => void;
}

export function useRetry<T>(options: UseRetryOptions = {}): UseRetryReturn<T> {
  const { maxRetries = 2, baseDelay = 1000, onRetry } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastFnRef = useRef<(() => Promise<T>) | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | null> => {
      lastFnRef.current = fn;
      setIsLoading(true);
      setError(null);
      setRetryCount(0);
      setIsRetrying(false);

      abortControllerRef.current = new AbortController();

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (abortControllerRef.current.signal.aborted) {
          if (isMountedRef.current) {
            setIsLoading(false);
          }
          return null;
        }

        try {
          const result = await fn();
          if (isMountedRef.current) {
            setData(result);
            setIsLoading(false);
            setIsRetrying(false);
          }
          return result;
        } catch (err) {
          if (attempt < maxRetries) {
            if (isMountedRef.current) {
              setRetryCount(attempt + 1);
              setIsRetrying(true);
            }
            onRetry?.(attempt + 1);
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            if (isMountedRef.current) {
              setError(err as Error);
              setIsLoading(false);
              setIsRetrying(false);
            }
            return null;
          }
        }
      }
      return null;
    },
    [maxRetries, baseDelay, onRetry]
  );

  const retry = useCallback(() => {
    if (lastFnRef.current) {
      void execute(lastFnRef.current);
    }
  }, [execute]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  return { data, error, isLoading, isRetrying, retryCount, execute, retry, reset };
}

export default useRetry;
