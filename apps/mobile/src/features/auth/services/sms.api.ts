import apiClient from "./client";
import type { ApiResponse } from "../../types";

interface AuthResponse {
  user: {
    id: string;
    email?: string;
    phone?: string;
    nickname?: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const smsApi = {
  async sendCode(phone: string): Promise<ApiResponse<{ sent: boolean }>> {
    return apiClient.post<{ sent: boolean }>("/auth/send-code", { phone });
  },

  async loginWithPhone(phone: string, code: string): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>("/auth/phone-login", { phone, code });
  },

  async registerWithPhone(
    phone: string,
    code: string,
    nickname?: string
  ): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>("/auth/phone-register", {
      phone,
      code,
      nickname,
    });
  },
};

export default smsApi;
