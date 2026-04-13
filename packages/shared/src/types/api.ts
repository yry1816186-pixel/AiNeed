export interface JsonApiError {
  status: string;
  code: string;
  title: string;
  detail: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CursorPagination {
  cursor?: string;
  limit: number;
  hasNext: boolean;
  nextCursor?: string;
}

export interface JsonApiResponse<T> {
  data: T;
  included?: unknown[];
  meta?: PaginationMeta | CursorPagination | Record<string, unknown>;
  errors?: JsonApiError[];
  links?: {
    self?: string;
    next?: string;
    prev?: string;
    first?: string;
    last?: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore?: boolean;
}
