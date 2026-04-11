import apiClient from "./client";
import type { ApiResponse, PaginatedResponse } from "../../types/api";
import type { FormDataValue } from "../../types";

export type CustomizationType =
  | "tailored"
  | "bespoke"
  | "alteration"
  | "design";

export type CustomizationStatus =
  | "draft"
  | "submitted"
  | "quoting"
  | "confirmed"
  | "in_progress"
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
};

export default customizationApi;
