import apiClient from "./client";
import type { ApiResponse, PaginatedResponse } from "../../types/api";
import type { FormDataValue } from "../../types";
import type {
  CustomizationTemplate,
  CustomizationDesign,
  CustomizationDesignLayer,
  QuoteCalculationResponse,
  PreviewResponse,
  CreateFromDesignResponse,
  PaymentResponse,
  ProductionStatusResponse,
  CustomizationRequest,
  CustomizationQuote,
  CreateCustomizationDto,
  UpdateCustomizationDto,
  CustomizationStatus,
} from "../../types/customization";

export const customizationApi = {
  // ==================== Templates ====================

  getTemplates: async (
    type?: string,
  ): Promise<ApiResponse<CustomizationTemplate[]>> => {
    const params: Record<string, string> = {};
    if (type) { params.type = type; }
    return apiClient.get<CustomizationTemplate[]>("/customization/templates", params);
  },

  // ==================== Designs ====================

  createDesign: async (
    templateId: string,
    canvasData: Record<string, unknown>,
  ): Promise<ApiResponse<CustomizationDesign>> => {
    return apiClient.post<CustomizationDesign>("/customization/designs", {
      templateId,
      canvasData,
    });
  },

  updateDesign: async (
    id: string,
    data: {
      canvasData: Record<string, unknown>;
      layers?: CustomizationDesignLayer[];
    },
  ): Promise<ApiResponse<CustomizationDesign>> => {
    return apiClient.put<CustomizationDesign>(`/customization/designs/${id}`, data);
  },

  getDesign: async (
    id: string,
  ): Promise<ApiResponse<CustomizationDesign>> => {
    return apiClient.get<CustomizationDesign>(`/customization/designs/${id}`);
  },

  calculateQuote: async (
    designId: string,
    printSide: "front" | "back" | "both" = "front",
  ): Promise<ApiResponse<QuoteCalculationResponse>> => {
    return apiClient.post<QuoteCalculationResponse>(
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
  ): Promise<ApiResponse<CreateFromDesignResponse>> => {
    return apiClient.post<CreateFromDesignResponse>("/customization/from-design", {
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
  ): Promise<ApiResponse<PaymentResponse>> => {
    return apiClient.post<PaymentResponse>(
      `/customization/${requestId}/pay`,
      { paymentMethod },
    );
  },

  getProductionStatus: async (
    requestId: string,
  ): Promise<ApiResponse<ProductionStatusResponse>> => {
    return apiClient.get<ProductionStatusResponse>(
      `/customization/${requestId}/production-status`,
    );
  },

  confirmDelivery: async (
    requestId: string,
  ): Promise<ApiResponse<CustomizationRequest>> => {
    return apiClient.post<CustomizationRequest>(
      `/customization/${requestId}/confirm-delivery`,
    );
  },
};

export default customizationApi;
