import { useState, useCallback, useRef, useEffect } from "react";
import apiClient from "../services/api/client";
import { toAppError, AppError } from "../services/api/error";
import type { ApiResponse } from "../types";

interface UseApiOptions {
  immediate?: boolean;
  cache?: boolean;
  deduplicate?: boolean;
  retry?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: AppError) => void;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
}

interface UseApiReturn<T, Args extends unknown[]> extends UseApiState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
  refetch: () => Promise<T | null>;
}

export function useApi<T, Args extends unknown[] = unknown[]>(
  apiFn: (...args: Args) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
): UseApiReturn<T, Args> {
  const { immediate = false, onSuccess, onError } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const isMountedRef = useRef(true);
  const lastArgsRef = useRef<Args | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      abortRef.current = false;
      lastArgsRef.current = args;

      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const response = await apiFn(...args);

        if (abortRef.current) {
          return null;
        }

        if (response.success && response.data !== undefined) {
          if (isMountedRef.current) {
            setState({ data: response.data, loading: false, error: null });
          }
          onSuccess?.(response.data);
          return response.data;
        }

        const appError = new AppError(
          (response.error?.code as AppError["code"]) || "BUSINESS_ERROR",
          response.error?.message,
          { details: response.error?.details }
        );

        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, loading: false, error: appError }));
        }
        onError?.(appError);
        return null;
      } catch (err) {
        if (abortRef.current) {
          return null;
        }

        const appError = toAppError(err);
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, loading: false, error: appError }));
        }
        onError?.(appError);
        return null;
      }
    },
    [apiFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    setState({ data: null, loading: false, error: null });
  }, []);

  const refetch = useCallback(async (): Promise<T | null> => {
    if (lastArgsRef.current) {
      return execute(...lastArgsRef.current);
    }
    return null;
  }, [execute]);

  return { ...state, execute, reset, refetch };
}

interface UseApiGetOptions extends UseApiOptions {
  params?: Record<string, unknown>;
}

export function useApiGet<T>(url: string | null, options: UseApiGetOptions = {}) {
  const { params, cache, deduplicate, retry, ...apiOptions } = options;

  const fetcher = useCallback(async (): Promise<ApiResponse<T>> => {
    if (!url) {
      return { success: false, error: { code: "NO_URL", message: "No URL provided" } };
    }
    return apiClient.get<T>(url, params, {
      useCache: cache,
      deduplicate,
      retry,
    });
  }, [url, params, cache, deduplicate, retry]);

  return useApi<T>(fetcher, {
    ...apiOptions,
    immediate: apiOptions.immediate ?? !!url,
  });
}
