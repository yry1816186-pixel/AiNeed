import { api } from './api';
import type { AuthTokens, User, ApiResponse } from '../types';

interface SendCodeResponse {
  success: boolean;
  message?: string;
}

interface VerifyCodeResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async sendCode(phone: string): Promise<SendCodeResponse> {
    const { data } = await api.post<ApiResponse<null>>('/auth/send-code', { phone });
    return { success: data.success, message: data.error?.message };
  },

  async verifyCode(phone: string, code: string): Promise<VerifyCodeResponse> {
    const { data } = await api.post<ApiResponse<VerifyCodeResponse>>('/auth/verify-code', { phone, code });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '验证失败');
    }
    return data.data;
  },

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const { data } = await api.post<ApiResponse<RefreshTokenResponse>>('/auth/refresh', { refreshToken });
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? '刷新令牌失败');
    }
    return data.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // 即使请求失败也清除本地状态
    }
  },
};
