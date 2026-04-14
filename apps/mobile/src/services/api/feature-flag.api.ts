import apiClient from "./client";
import { ApiResponse } from "../../types";

interface FeatureFlagClientDto {
  key: string;
  type: string;
  value: Record<string, unknown>;
  enabled: boolean;
}

interface EvaluateFlagRequest {
  key: string;
  attributes?: Record<string, unknown>;
}

interface EvaluateFlagResponse {
  enabled: boolean;
  variant?: string;
  value?: Record<string, unknown>;
}

export const featureFlagApi = {
  async getClientFlags(): Promise<ApiResponse<FeatureFlagClientDto[]>> {
    return apiClient.get<FeatureFlagClientDto[]>("/feature-flags/client");
  },

  async evaluateFlag(data: EvaluateFlagRequest): Promise<ApiResponse<EvaluateFlagResponse>> {
    return apiClient.post<EvaluateFlagResponse>("/feature-flags/evaluate", data);
  },
};
