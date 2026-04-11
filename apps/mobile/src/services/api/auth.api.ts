import apiClient from "./client";
import { ApiResponse } from "../../types";
import {
  User,
  UserPreferences,
  UserStats,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  BodyAnalysis,
  ColorAnalysis,
} from "../../types/user";

interface AuthResponsePayload {
  user: User;
  token: string;
  accessToken?: string;
  refreshToken?: string;
}

export const authApi = {
  async login(
    credentials: LoginCredentials,
  ): Promise<ApiResponse<AuthResponsePayload>> {
    const response = await apiClient.post<AuthResponsePayload>(
      "/auth/login",
      credentials,
    );
    if (response.success && response.data?.token) {
      await apiClient.setToken(response.data.token);
      if (response.data.refreshToken) {
        await apiClient.setRefreshToken(response.data.refreshToken);
      }
    }
    return response;
  },

  async register(
    data: RegisterData,
  ): Promise<ApiResponse<AuthResponsePayload>> {
    const response = await apiClient.post<AuthResponsePayload>(
      "/auth/register",
      data,
    );
    if (response.success && response.data?.token) {
      await apiClient.setToken(response.data.token);
      if (response.data.refreshToken) {
        await apiClient.setRefreshToken(response.data.refreshToken);
      }
    }
    return response;
  },

  async logout(): Promise<void> {
    await apiClient.clearAuth();
  },

  async getMe(): Promise<ApiResponse<User>> {
    return apiClient.get<User>("/auth/me");
  },

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put<User>("/auth/profile", data);
  },

  async updatePreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<ApiResponse<UserPreferences>> {
    return apiClient.put<UserPreferences>("/auth/preferences", preferences);
  },

  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<void>> {
    return apiClient.post<void>("/auth/change-password", {
      oldPassword,
      newPassword,
    });
  },

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>("/auth/forgot-password", { email });
  },

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<ApiResponse<void>> {
    return apiClient.post<void>("/auth/reset-password", { token, newPassword });
  },

  async refreshToken(): Promise<ApiResponse<AuthTokens>> {
    return apiClient.post<AuthTokens>("/auth/refresh");
  },

  async deleteAccount(): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<void>("/auth/account");
    await apiClient.clearAuth();
    return response;
  },
};

export const userApi = {
  async getStats(): Promise<ApiResponse<UserStats>> {
    return apiClient.get<UserStats>("/user/stats");
  },

  async analyzeBody(imageUri: string): Promise<ApiResponse<BodyAnalysis>> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type,
    } as unknown as Blob);

    return apiClient.upload<BodyAnalysis>("/user/analyze-body", formData);
  },

  async analyzeColor(imageUri: string): Promise<ApiResponse<ColorAnalysis>> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type,
    } as unknown as Blob);

    return apiClient.upload<ColorAnalysis>("/user/analyze-color", formData);
  },

  async uploadAvatar(
    imageUri: string,
  ): Promise<ApiResponse<{ avatar: string }>> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "avatar.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type,
    } as unknown as Blob);

    return apiClient.upload<{ avatar: string }>("/user/avatar", formData);
  },
};

export default { authApi, userApi };
