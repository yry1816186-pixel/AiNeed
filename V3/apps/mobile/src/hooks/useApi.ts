import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { ApiResponse } from '../types';

interface UseApiOptions {
  enabled?: boolean;
}

export function useApiQuery<T>(
  key: string[],
  url: string,
  options?: UseApiOptions,
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<T>>(url);
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? '请求失败');
      }
      return data.data;
    },
    enabled: options?.enabled,
  });
}

export function useApiMutation<TPayload, TResponse>(
  method: 'post' | 'patch' | 'delete',
  url: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TPayload) => {
      if (method === 'post') {
        const { data } = await api.post<ApiResponse<TResponse>>(url, payload);
        if (!data.success) {
          throw new Error(data.error?.message ?? '操作失败');
        }
        return data.data;
      }
      if (method === 'patch') {
        const { data } = await api.patch<ApiResponse<TResponse>>(url, payload);
        if (!data.success) {
          throw new Error(data.error?.message ?? '操作失败');
        }
        return data.data;
      }
      const { data } = await api.delete<ApiResponse<TResponse>>(url, { data: payload });
      if (!data.success) {
        throw new Error(data.error?.message ?? '操作失败');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
