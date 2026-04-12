import { ApiResponse, ResponseMeta } from '../types/api.types';

export function success<T>(data: T, meta?: ResponseMeta): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
}

export function error(code: string, message: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: { code, message },
  };
}
