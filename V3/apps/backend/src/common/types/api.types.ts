export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: ErrorDetail;
  meta?: ResponseMeta;
}

export interface ErrorDetail {
  code: string;
  message: string;
}

export interface ResponseMeta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  success: true;
  data: T[];
  meta: Required<ResponseMeta>;
}

export type ErrorType = {
  code: string;
  message: string;
};
