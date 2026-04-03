import { useState, useCallback, useRef } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
  totalItems?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  reset: () => void;
}

export function usePagination(
  options: UsePaginationOptions = {},
): UsePaginationReturn {
  const { initialPage = 1, pageSize = 10, totalItems = 0 } = options;
  const [page, setPage] = useState(initialPage);
  const [size, setSize] = useState(pageSize);
  const [total, setTotal] = useState(totalItems);
  const initialPageRef = useRef(initialPage);

  const totalPages = Math.ceil(total / size);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const nextPage = useCallback(() => {
    if (hasNext) {
      setPage((p) => p + 1);
    }
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) {
      setPage((p) => p - 1);
    }
  }, [hasPrev]);

  const goToPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages || 1));
      setPage(validPage);
    },
    [totalPages],
  );

  const setPageSize = useCallback((newSize: number) => {
    setSize(newSize);
    setPage(1);
  }, []);

  const setTotalItems = useCallback((newTotal: number) => {
    setTotal(newTotal);
  }, []);

  const reset = useCallback(() => {
    setPage(initialPageRef.current);
  }, []);

  return {
    page,
    pageSize: size,
    totalPages,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
    setTotalItems,
    reset,
  };
}

export default usePagination;
