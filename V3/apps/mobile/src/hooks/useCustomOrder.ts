import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customOrderService,
  type CreateCustomOrderPayload,
  type CustomOrder,
  type CustomOrderListResponse,
  type CustomOrderDetail,
  type CustomOrderStatus,
} from '../services/custom-order.service';

export function useCustomOrders(status?: CustomOrderStatus) {
  return useQuery<CustomOrderListResponse>({
    queryKey: ['custom-orders', 'list', status],
    queryFn: () => customOrderService.getList(status),
  });
}

export function useCustomOrder(id: string) {
  return useQuery<CustomOrderDetail>({
    queryKey: ['custom-orders', 'detail', id],
    queryFn: () => customOrderService.getDetail(id),
    enabled: id.length > 0,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation<CustomOrder, Error, CreateCustomOrderPayload>({
    mutationFn: customOrderService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
    },
  });
}
