import apiClient from "./client";
import type { ApiResponse, PaginatedResponse } from "../../types/api";
import type { FormDataValue } from "../../types";

export type CustomizationType =
  | "tailored"
  | "bespoke"
  | "alteration"
  | "design"
  | "pod";

export type CustomizationStatus =
  | "draft"
  | "submitted"
  | "quoting"
  | "confirmed"
  | "in_progress"
  | "shipped"
  | "completed"
  | "cancelled";

export interface CustomizationQuote {
  id: string;
  providerId: string;
  providerName: string;
  price: number;
  currency: string;
  estimatedDays: number;
  description: string;
  createdAt: string;
}

export interface CustomizationRequest {
  id: string;
  userId: string;
  type: CustomizationType;
  description: string;
  referenceImages: string[];
  preferences: Record<string, unknown>;
  status: CustomizationStatus;
  quotes?: CustomizationQuote[];
  selectedQuoteId?: string;
  designId?: string;
  templateId?: string;
  previewImageUrl?: string;
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomizationDto {
  type: CustomizationType;
  description: string;
  referenceImages?: string[];
  preferences?: Record<string, unknown>;
}

export interface UpdateCustomizationDto {
  type?: CustomizationType;
  description?: string;
  referenceImages?: string[];
  preferences?: Record<string, unknown>;
  status?: CustomizationStatus;
}

export const customizationApi = {
  // ==================== Templates ====================

  getTemplates: async (
    type?: string,
  ): Promise<ApiResponse<any[]>> => {
    const params: Record<string, string> = {};
    if (type) {params.type = type;}
    return apiClient.get<any[]>("/customization/templates", params);
  },

  // ==================== Designs ====================

  createDesign: async (
    templateId: string,
    canvasData: Record<string, unknown>,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post<any>("/customization/designs", {
      templateId,
      canvasData,
    });
  },

  updateDesign: async (
    id: string,
    data: {
      canvasData: Record<string, unknown>;
      layers?: any[];
    },
  ): Promise<ApiResponse<any>> => {
    return apiClient.put<any>(`/customization/designs/${id}`, data);
  },

  getDesign: async (
    id: string,
  ): Promise<ApiResponse<any>> => {
    return apiClient.get<any>(`/customization/designs/${id}`);
  },

  calculateQuote: async (
    designId: string,
    printSide: "front" | "back" | "both" = "front",
  ): Promise<ApiResponse<any>> => {
    return apiClient.post<any>(
      `/customization/designs/${designId}/calculate-quote`,
      { printSide },
    );
  },

  generatePreview: async (
    designId: string,
  ): Promise<ApiResponse<{ previewUrl: string; designId: string }>> => {
    return apiClient.post<{ previewUrl: string; designId: string }>(
      `/customization/designs/${designId}/generate-preview`,
    );
  },

  createFromDesign: async (
    designId: string,
    quoteId: string,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post<any>("/customization/from-design", {
      designId,
      quoteId,
    });
  },

  // ==================== Original CRUD ====================

  getAll: async (
    params?: {
      status?: CustomizationStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponse<PaginatedResponse<CustomizationRequest>>> => {
    return apiClient.getPaginated<CustomizationRequest>(
      "/customization",
      params,
    );
  },

  getById: async (
    id: string,
  ): Promise<ApiResponse<CustomizationRequest>> => {
    return apiClient.get<CustomizationRequest>(`/customization/${id}`);
  },

  create: async (
    data: CreateCustomizationDto,
  ): Promise<ApiResponse<CustomizationRequest>> => {
    return apiClient.post<CustomizationRequest>("/customization", data);
  },

  update: async (
    id: string,
    data: UpdateCustomizationDto,
  ): Promise<ApiResponse<CustomizationRequest>> => {
    return apiClient.put<CustomizationRequest>(`/customization/${id}`, data);
  },

  cancel: async (
    id: string,
  ): Promise<ApiResponse<CustomizationRequest>> => {
    return apiClient.post<CustomizationRequest>(
      `/customization/${id}/cancel`,
    );
  },

  selectQuote: async (
    id: string,
    quoteId: string,
  ): Promise<ApiResponse<CustomizationRequest>> => {
    return apiClient.post<CustomizationRequest>(
      `/customization/${id}/select-quote`,
      { quoteId },
    );
  },

  uploadReferenceImage: async (
    id: string,
    imageUri: string,
  ): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type,
    } satisfies FormDataValue);

    return apiClient.upload<{ url: string }>(
      `/customization/${id}/images`,
      formData,
    );
  },

  // ==================== Payment + Production ====================

  payForCustomization: async (
    requestId: string,
    paymentMethod: string,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post<any>(
      `/customization/${requestId}/pay`,
      { paymentMethod },
    );
  },

  getProductionStatus: async (
    requestId: string,
  ): Promise<ApiResponse<any>> => {
    return apiClient.get<any>(
      `/customization/${requestId}/production-status`,
    );
  },

  confirmDelivery: async (
    requestId: string,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post<any>(
      `/customization/${requestId}/confirm-delivery`,
    );
  },
};

export default customizationApi;
