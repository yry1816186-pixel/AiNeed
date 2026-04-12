import { api } from './api';
import type { ApiResponse } from '../types';
import { colors } from '../theme';

export type CustomOrderStatus = 'pending' | 'paid' | 'producing' | 'shipped' | 'completed' | 'cancelled';

export type ProductType = 'tshirt' | 'hoodie' | 'hat' | 'bag' | 'phone_case';

export interface ShippingAddress {
  id?: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  detail?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface CustomOrder {
  id: string;
  userId: string;
  designId: string;
  productType: ProductType;
  material: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: CustomOrderStatus;
  podOrderId?: string;
  trackingNumber?: string;
  shippingAddress: ShippingAddress;
  createdAt: string;
  updatedAt: string;
}

export interface OrderTimeline {
  submittedAt: string;
  paidAt?: string;
  producingAt?: string;
  shippedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface CustomOrderDetail extends CustomOrder {
  timeline: OrderTimeline;
  designName?: string;
  designThumbnail?: string;
}

export interface TrackingNode {
  time: string;
  description: string;
  location: string;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  nodes: TrackingNode[];
}

export interface TrackingResponse {
  orderId: string;
  status: CustomOrderStatus;
  tracking: TrackingInfo;
}

export interface CreateCustomOrderPayload {
  design_id: string;
  product_type: ProductType;
  material: string;
  size: string;
  quantity?: number;
  shipping_address: ShippingAddress;
}

export interface CustomOrderListResponse {
  items: CustomOrder[];
  total: number;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  tshirt: 'T恤',
  hoodie: '卫衣',
  hat: '帽子',
  bag: '包包',
  phone_case: '手机壳',
};

export const ORDER_STATUS_LABELS: Record<CustomOrderStatus, string> = {
  pending: '待付款',
  paid: '已付款',
  producing: '生产中',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
};

export const ORDER_STATUS_VARIANT: Record<CustomOrderStatus, 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  paid: 'info',
  producing: 'default',
  shipped: 'info',
  completed: 'success',
  cancelled: 'error',
};

export function formatPrice(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

export type ProductCategory = ProductType;

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProductColor {
  name: string;
  hex: string;
  image?: string;
}

export interface ProductTemplate {
  id: string;
  name: string;
  category: ProductCategory;
  baseImage: string;
  printArea: { x: number; y: number; width: number; height: number };
  colors: ProductColor[];
  sizes: string[];
  price: number;
  costPrice: number;
  shippingFee: number;
  description: string;
}

export type CreateOrderPayload = CreateCustomOrderPayload;

export const PRODUCT_PRICE_MAP: Record<ProductType, { cost: number; price: number }> = {
  tshirt: { cost: 30, price: 129 },
  hoodie: { cost: 60, price: 199 },
  hat: { cost: 20, price: 69 },
  bag: { cost: 35, price: 129 },
  phone_case: { cost: 10, price: 49 },
};

export const PRODUCT_LABEL_MAP: Record<ProductType, string> = PRODUCT_TYPE_LABELS;

export const ORDER_STATUS_LABEL = ORDER_STATUS_LABELS;

export const ORDER_STATUS_COLOR: Record<CustomOrderStatus, string> = {
  pending: colors.warning,
  paid: colors.info,
  producing: colors.textSecondary,
  shipped: colors.info,
  completed: colors.success,
  cancelled: colors.error,
};

export const customOrderService = {
  create(payload: CreateCustomOrderPayload): Promise<CustomOrder> {
    return api
      .post<ApiResponse<CustomOrder>>('/custom-orders', payload)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '创建订单失败');
        }
        return data.data;
      });
  },

  getList(status?: CustomOrderStatus): Promise<CustomOrderListResponse> {
    const params = status ? { status } : {};
    return api
      .get<ApiResponse<CustomOrderListResponse>>('/custom-orders', { params })
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取订单列表失败');
        }
        return data.data;
      });
  },

  getDetail(orderId: string): Promise<CustomOrderDetail> {
    return api
      .get<ApiResponse<CustomOrderDetail>>(`/custom-orders/${orderId}`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取订单详情失败');
        }
        return data.data;
      });
  },

  cancel(orderId: string): Promise<CustomOrder> {
    return api
      .patch<ApiResponse<CustomOrder>>(`/custom-orders/${orderId}/cancel`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '取消订单失败');
        }
        return data.data;
      });
  },

  pay(orderId: string): Promise<CustomOrder> {
    return api
      .post<ApiResponse<CustomOrder>>(`/custom-orders/${orderId}/pay`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '支付失败');
        }
        return data.data;
      });
  },

  track(orderId: string): Promise<TrackingResponse> {
    return api
      .get<ApiResponse<TrackingResponse>>(`/custom-orders/${orderId}/track`)
      .then(({ data }) => {
        if (!data.success || !data.data) {
          throw new Error(data.error?.message ?? '获取物流信息失败');
        }
        return data.data;
      });
  },
};
