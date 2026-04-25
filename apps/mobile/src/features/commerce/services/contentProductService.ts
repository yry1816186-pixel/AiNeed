import apiClient from "../../../services/api/client";
import type { ApiResponse } from "../../../types";

export interface ContentProductInfo {
  productType: string;
  name: string;
  description: string;
  price: number;
  currency: string;
}

export interface ContentPurchaseRecord {
  id: string;
  productType: string;
  amount: number;
  status: string;
  unlockedAt: string;
}

export interface PurchaseResponse {
  orderId: string;
  qrCode?: string;
  expireAt: string;
}

export interface CheckPurchaseResponse {
  purchased: boolean;
}

export const contentProductService = {
  /**
   * Get all available content products.
   */
  async getProducts(): Promise<ApiResponse<ContentProductInfo[]>> {
    return apiClient.get<ContentProductInfo[]>("/content-products");
  },

  /**
   * Check if a specific product type has been purchased by the current user.
   */
  async checkPurchased(productType: string): Promise<ApiResponse<CheckPurchaseResponse>> {
    return apiClient.get<CheckPurchaseResponse>(`/content-products/${productType}/check`);
  },

  /**
   * Purchase a content product (triggers payment flow).
   */
  async purchase(
    productType: string,
    provider: "alipay" | "wechat"
  ): Promise<ApiResponse<PurchaseResponse>> {
    return apiClient.post<PurchaseResponse>(`/content-products/${productType}/purchase`, {
      provider,
    });
  },

  /**
   * Get all purchased content products for the current user.
   */
  async getPurchased(): Promise<ApiResponse<ContentPurchaseRecord[]>> {
    return apiClient.get<ContentPurchaseRecord[]>("/content-products/purchased");
  },
} as const;
