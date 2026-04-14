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
    return apiClient.put<User>("/profile", data);
  },

  async updatePreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<ApiResponse<UserPreferences>> {
    return apiClient.put<UserPreferences>("/profile/preferences", preferences);
  },

  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<void>> {
    return apiClient.put<void>("/users/me/password", {
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
    const response = await apiClient.put<void>("/users/me/deactivate");
    await apiClient.clearAuth();
    return response;
  },
};

export const userApi = {
  async getStats(): Promise<ApiResponse<UserStats>> {
    return apiClient.get<UserStats>("/users/me/stats");
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

    return apiClient.upload<BodyAnalysis>("/profile/body-analysis/upload", formData);
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

    return apiClient.upload<ColorAnalysis>("/profile/color-analysis/upload", formData);
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

    return apiClient.upload<{ avatar: string }>("/users/me/avatar/upload", formData);
  },
};

export default { authApi, userApi };
