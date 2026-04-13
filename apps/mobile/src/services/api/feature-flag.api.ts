import apiClient from "./client";
import { ApiResponse } from "../../types";

interface FeatureFlagClientDto {
  key: string;
  type: string;
  value: Record<string, any>;
  enabled: boolean;
}

interface EvaluateFlagRequest {
  key: string;
  attributes?: Record<string, any>;
}

interface EvaluateFlagResponse {
  enabled: boolean;
  variant?: string;
  value?: Record<string, any>;
}

export const featureFlagApi = {
  async getClientFlags(): Promise<ApiResponse<FeatureFlagClientDto[]>> {
    return apiClient.get<FeatureFlagClientDto[]>("/feature-flags/client");
  },

  async evaluateFlag(data: EvaluateFlagRequest): Promise<ApiResponse<EvaluateFlagResponse>> {
    return apiClient.post<EvaluateFlagResponse>("/feature-flags/evaluate", data);
  },
};
