import apiClient from "../../../services/api/client";

export interface LimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  unlimited: boolean;
}

export const usageLimitService = {
  /**
   * Get current usage limit status from backend.
   * Backend also sends X-Usage-* headers on every response -- this is an explicit check.
   */
  async getStatus(): Promise<LimitInfo> {
    const response = await apiClient.get<LimitInfo>("/usage-limit/status");
    if (response.success && response.data) {
      return response.data;
    }
    return { limit: 0, remaining: 0, reset: 0, unlimited: false };
  },
} as const;
