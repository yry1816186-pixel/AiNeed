import { useState, useCallback, useRef } from "react";
import apiClient from "../services/api/client";
import type { ApiResponse } from "../types";

interface UseUploadProgressOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: <T>(response: ApiResponse<T>) => void;
  onError?: (error: Error) => void;
}

interface UseUploadProgressReturn {
  progress: number;
  isUploading: boolean;
  error: Error | null;
  upload: <T>(url: string, formData: FormData) => Promise<ApiResponse<T> | null>;
  cancel: () => void;
  retry: () => void;
  reset: () => void;
}

export function useUploadProgress(options: UseUploadProgressOptions = {}): UseUploadProgressReturn {
  const { onProgress, onSuccess, onError } = options;
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const lastUploadRef = useRef<{ url: string; formData: FormData } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const upload = useCallback(
    async <T>(url: string, formData: FormData): Promise<ApiResponse<T> | null> => {
      lastUploadRef.current = { url, formData };
      setIsUploading(true);
      setProgress(0);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        setProgress(10);
        const response = await apiClient.upload<T>(url, formData);
        if (abortControllerRef.current.signal.aborted) {
          return null;
        }
        setProgress(100);
        if (isMountedRef.current) {
          setIsUploading(false);
          if (response.success) {
            onSuccess?.(response);
          }
        }
        return response;
      } catch (err) {
        if (abortControllerRef.current.signal.aborted) {
          return null;
        }
        if (isMountedRef.current) {
          setError(err as Error);
          setIsUploading(false);
          onError?.(err as Error);
        }
        return null;
      }
    },
    [onProgress, onSuccess, onError],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    if (isMountedRef.current) {
      setIsUploading(false);
      setProgress(0);
    }
  }, []);

  const retry = useCallback(() => {
    if (lastUploadRef.current) {
      upload(lastUploadRef.current.url, lastUploadRef.current.formData);
    }
  }, [upload]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setProgress(0);
    setIsUploading(false);
    setError(null);
    lastUploadRef.current = null;
  }, []);

  return { progress, isUploading, error, upload, cancel, retry, reset };
}

export default useUploadProgress;
