import apiClient from "../../../services/api/client";
import type { ApiResponse } from '../../../types/api';

export interface QRScanResult {
  brand: {
    id: string;
    name: string;
    logo: string | null;
    slug: string;
  };
  product: {
    brandId: string;
    brandName: string;
    productId: string;
    productName: string;
    sku: string;
    color: string;
    size: string;
    material: string;
    price: number;
  };
  qrCodeId: string;
}

export interface QRImportResult {
  success: boolean;
  imported: boolean;
  product: QRScanResult["product"];
}

export const brandQRApi = {
  scanQRCode: async (code: string): Promise<ApiResponse<QRScanResult>> => {
    return apiClient.get<QRScanResult>(`/brands/qr-codes/${code}`);
  },

  importScannedProduct: async (
    code: string,
    userId?: string,
    platform?: string
  ): Promise<ApiResponse<QRImportResult>> => {
    return apiClient.post<QRImportResult>(`/brands/qr-codes/${code}/scan`, {
      userId,
      platform,
    });
  },
};

export default brandQRApi;
