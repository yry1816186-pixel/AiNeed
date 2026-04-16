import apiClient from "./client";
import type { ApiResponse } from '../../../types/api';

export interface StyleProfile {
  id: string;
  name: string;
  occasion: string;
  description: string;
  keywords: string[];
  palette: string[];
  confidence: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStyleProfileDto {
  name: string;
  occasion: string;
  description: string;
  keywords: string[];
  palette: string[];
  confidence?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateStyleProfileDto {
  name?: string;
  occasion?: string;
  description?: string;
  keywords?: string[];
  palette?: string[];
  confidence?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export const styleProfilesApi = {
  getAll: (): Promise<ApiResponse<StyleProfile[]>> =>
    apiClient.get<StyleProfile[]>("/style-profiles"),

  getById: (id: string): Promise<ApiResponse<StyleProfile>> =>
    apiClient.get<StyleProfile>(`/style-profiles/${id}`),

  create: (data: CreateStyleProfileDto): Promise<ApiResponse<StyleProfile>> =>
    apiClient.post<StyleProfile>("/style-profiles", data),

  update: (id: string, data: UpdateStyleProfileDto): Promise<ApiResponse<StyleProfile>> =>
    apiClient.put<StyleProfile>(`/style-profiles/${id}`, data),

  delete: (id: string): Promise<ApiResponse<{ success: boolean }>> =>
    apiClient.delete<{ success: boolean }>(`/style-profiles/${id}`),

  setDefault: (id: string): Promise<ApiResponse<StyleProfile>> =>
    apiClient.put<StyleProfile>(`/style-profiles/${id}/default`, {}),

  toggleActive: (id: string): Promise<ApiResponse<StyleProfile>> =>
    apiClient.put<StyleProfile>(`/style-profiles/${id}/toggle-active`, {}),
};

export default styleProfilesApi;
