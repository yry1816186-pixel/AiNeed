import apiClient from "./client";
import {
  ApiResponse,
  PaginatedResponse,
  SimilarItemResult,
  OutfitRecommendationResult,
} from '../../../types';
import { Outfit, OutfitInput, OutfitItem } from '../types/outfit';

export const outfitApi = {
  async getAll(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Outfit>>> {
    return apiClient.getPaginated<Outfit>("/outfits", params);
  },

  async getById(id: string): Promise<ApiResponse<Outfit>> {
    return apiClient.get<Outfit>(`/outfits/${id}`);
  },

  async create(data: OutfitInput): Promise<ApiResponse<Outfit>> {
    return apiClient.post<Outfit>("/outfits", data);
  },

  async update(id: string, data: Partial<OutfitInput>): Promise<ApiResponse<Outfit>> {
    return apiClient.put<Outfit>(`/outfits/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/outfits/${id}`);
  },

  async addItem(outfitId: string, item: OutfitItem): Promise<ApiResponse<Outfit>> {
    return apiClient.post<Outfit>(`/outfits/${outfitId}/items`, item);
  },

  async removeItem(outfitId: string, clothingId: string): Promise<ApiResponse<Outfit>> {
    return apiClient.delete<Outfit>(`/outfits/${outfitId}/items/${clothingId}`);
  },

  async updateItemPosition(
    outfitId: string,
    clothingId: string,
    position: { x: number; y: number; rotation?: number; zIndex?: number }
  ): Promise<ApiResponse<Outfit>> {
    return apiClient.put<Outfit>(`/outfits/${outfitId}/items/${clothingId}/position`, position);
  },

  async toggleFavorite(id: string): Promise<ApiResponse<Outfit>> {
    return apiClient.post<Outfit>(`/outfits/${id}/favorite`);
  },

  async getRecommendations(params?: {
    baseItemId?: string;
    occasion?: string;
    style?: string;
    limit?: number;
  }): Promise<ApiResponse<OutfitRecommendationResult[]>> {
    return apiClient.post<OutfitRecommendationResult[]>("/outfits/recommendations", params);
  },

  async generateOutfit(params: {
    occasion?: string;
    style?: string;
    season?: string;
    baseItemId?: string;
  }): Promise<ApiResponse<Outfit>> {
    return apiClient.post<Outfit>("/outfits/generate", params);
  },

  async getSimilar(id: string, limit: number = 5): Promise<ApiResponse<SimilarItemResult[]>> {
    return apiClient.get<SimilarItemResult[]>(`/outfits/${id}/similar`, {
      limit,
    });
  },

  async getStats(): Promise<
    ApiResponse<{
      total: number;
      byOccasion: Record<string, number>;
      bySeason: Record<string, number>;
      mostWorn: Outfit[];
    }>
  > {
    return apiClient.get("/outfits/stats");
  },
};

export default outfitApi;
