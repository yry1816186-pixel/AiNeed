import { api } from './api';
import type {
  ApiResponse,
  BespokeOrder,
  BespokeMessage,
  BespokeQuote,
  BespokeReview,
  CreateBespokeOrderPayload,
  SendBespokeMessagePayload,
  CreateBespokeQuotePayload,
  CreateBespokeReviewPayload,
} from '../types';

const BASE = '/bespoke';

export const bespokeApi = {
  async createOrder(
    payload: CreateBespokeOrderPayload,
  ): Promise<BespokeOrder> {
    const { data } = await api.post<ApiResponse<BespokeOrder>>(
      `${BASE}/orders`,
      payload,
    );
    if (!data.data) throw new Error(data.error?.message ?? '创建订单失败');
    return data.data;
  },

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ items: BespokeOrder[]; total: number; page: number; limit: number }> {
    const { data } = await api.get<
      ApiResponse<{ items: BespokeOrder[]; total: number; page: number; limit: number }>
    >(`${BASE}/orders`, { params });
    if (!data.data) throw new Error(data.error?.message ?? '获取订单失败');
    return data.data;
  },

  async getOrderById(orderId: string): Promise<BespokeOrder> {
    const { data } = await api.get<ApiResponse<BespokeOrder>>(
      `${BASE}/orders/${orderId}`,
    );
    if (!data.data) throw new Error(data.error?.message ?? '获取订单详情失败');
    return data.data;
  },

  async cancelOrder(
    orderId: string,
    cancelReason?: string,
  ): Promise<BespokeOrder> {
    const { data } = await api.patch<ApiResponse<BespokeOrder>>(
      `${BASE}/orders/${orderId}/cancel`,
      { cancelReason },
    );
    if (!data.data) throw new Error(data.error?.message ?? '取消订单失败');
    return data.data;
  },

  async getMessages(
    orderId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ items: BespokeMessage[]; total: number; page: number; limit: number }> {
    const { data } = await api.get<
      ApiResponse<{ items: BespokeMessage[]; total: number; page: number; limit: number }>
    >(`${BASE}/orders/${orderId}/messages`, { params });
    if (!data.data) throw new Error(data.error?.message ?? '获取消息失败');
    return data.data;
  },

  async sendMessage(
    orderId: string,
    payload: SendBespokeMessagePayload,
  ): Promise<BespokeMessage> {
    const { data } = await api.post<ApiResponse<BespokeMessage>>(
      `${BASE}/orders/${orderId}/messages`,
      payload,
    );
    if (!data.data) throw new Error(data.error?.message ?? '发送消息失败');
    return data.data;
  },

  async createQuote(
    orderId: string,
    payload: CreateBespokeQuotePayload,
  ): Promise<BespokeQuote> {
    const { data } = await api.post<ApiResponse<BespokeQuote>>(
      `${BASE}/orders/${orderId}/quotes`,
      payload,
    );
    if (!data.data) throw new Error(data.error?.message ?? '发送报价失败');
    return data.data;
  },

  async getQuotes(orderId: string): Promise<BespokeQuote[]> {
    const { data } = await api.get<ApiResponse<BespokeQuote[]>>(
      `${BASE}/orders/${orderId}/quotes`,
    );
    if (!data.data) throw new Error(data.error?.message ?? '获取报价失败');
    return data.data;
  },

  async acceptQuote(quoteId: string): Promise<BespokeQuote> {
    const { data } = await api.patch<ApiResponse<BespokeQuote>>(
      `${BASE}/quotes/${quoteId}/accept`,
    );
    if (!data.data) throw new Error(data.error?.message ?? '接受报价失败');
    return data.data;
  },

  async rejectQuote(quoteId: string): Promise<BespokeQuote> {
    const { data } = await api.patch<ApiResponse<BespokeQuote>>(
      `${BASE}/quotes/${quoteId}/reject`,
    );
    if (!data.data) throw new Error(data.error?.message ?? '拒绝报价失败');
    return data.data;
  },

  async createReview(
    orderId: string,
    payload: CreateBespokeReviewPayload,
  ): Promise<BespokeReview> {
    const { data } = await api.post<ApiResponse<BespokeReview>>(
      `${BASE}/orders/${orderId}/review`,
      payload,
    );
    if (!data.data) throw new Error(data.error?.message ?? '提交评价失败');
    return data.data;
  },
};
