import { api } from './api';
import type { ApiResponse } from '../types';

export type ProductCategory = 'tshirt' | 'hoodie' | 'hat' | 'bag' | 'phone_case';

export type OrderStatus = 'pending_payment' | 'producing' | 'shipped' | 'delivered';

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProductColor {
  name: string;
  hex: string;
  image: string;
}

export interface ProductTemplate {
  id: string;
  name: string;
  category: ProductCategory;
  baseImage: string;
  printArea: PrintArea;
  colors: ProductColor[];
  sizes: string[];
  price: number;
  costPrice: number;
  shippingFee: number;
  description: string;
}

export interface DesignData {
  id: string;
  imageUrl: string;
  name: string;
  category: ProductCategory;
  templateId: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
}

export interface ShippingAddress {
  id?: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

export interface CreateOrderPayload {
  designId: string;
  templateId: string;
  color: string;
  size: string;
  quantity: number;
  shippingAddress: ShippingAddress;
}

export interface CustomOrder {
  id: string;
  orderNo: string;
  designId: string;
  designImageUrl: string;
  templateId: string;
  productName: string;
  productCategory: ProductCategory;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  shippingFee: number;
  totalPrice: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  trackingCompany?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  orders: CustomOrder[];
  total: number;
}

export const PRODUCT_PRICE_MAP: Record<ProductCategory, { min: number; max: number; cost: number; shipping: number }> = {
  tshirt: { min: 89, max: 149, cost: 30, shipping: 10 },
  hoodie: { min: 159, max: 249, cost: 60, shipping: 15 },
  hat: { min: 59, max: 89, cost: 20, shipping: 8 },
  bag: { min: 99, max: 179, cost: 35, shipping: 12 },
  phone_case: { min: 39, max: 69, cost: 10, shipping: 8 },
};

export const PRODUCT_LABEL_MAP: Record<ProductCategory, string> = {
  tshirt: 'T恤',
  hoodie: '卫衣',
  hat: '帽子',
  bag: '包包',
  phone_case: '手机壳',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: '待付款',
  producing: '生产中',
  shipped: '已发货',
  delivered: '已送达',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: '#FF9800',
  producing: '#2196F3',
  shipped: '#4CAF50',
  delivered: '#1A1A2E',
};

export const customOrderService = {
  createOrder: async (payload: CreateOrderPayload): Promise<CustomOrder> => {
    const { data } = await api.post<ApiResponse<CustomOrder>>(
      '/custom-orders',
      payload,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '创建订单失败');
    }
    return data.data;
  },

  getOrders: async (): Promise<OrderListResponse> => {
    const { data } = await api.get<ApiResponse<OrderListResponse>>(
      '/custom-orders',
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取订单列表失败');
    }
    return data.data;
  },

  getOrder: async (id: string): Promise<CustomOrder> => {
    const { data } = await api.get<ApiResponse<CustomOrder>>(
      `/custom-orders/${id}`,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取订单详情失败');
    }
    return data.data;
  },

  getProductTemplates: async (): Promise<ProductTemplate[]> => {
    const { data } = await api.get<ApiResponse<ProductTemplate[]>>(
      '/customize/product-templates',
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '获取产品模板失败');
    }
    return data.data;
  },
};
