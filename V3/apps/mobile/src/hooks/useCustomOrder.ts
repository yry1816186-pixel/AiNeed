import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customOrderService,
  type CreateOrderPayload,
  type CustomOrder,
  type ProductTemplate,
  type OrderListResponse,
} from '../services/custom-order.service';

export function useProductTemplates() {
  return useQuery<ProductTemplate[]>({
    queryKey: ['custom-orders', 'product-templates'],
    queryFn: customOrderService.getProductTemplates,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCustomOrders() {
  return useQuery<OrderListResponse>({
    queryKey: ['custom-orders', 'list'],
    queryFn: customOrderService.getOrders,
  });
}

export function useCustomOrder(id: string) {
  return useQuery<CustomOrder>({
    queryKey: ['custom-orders', 'detail', id],
    queryFn: () => customOrderService.getOrder(id),
    enabled: id.length > 0,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation<CustomOrder, Error, CreateOrderPayload>({
    mutationFn: customOrderService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
    },
  });
}
