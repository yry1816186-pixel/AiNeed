import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { mobileRuntimeConfig, requireMobileUrl } from "../config/runtime";
import { secureStorage, SECURE_STORAGE_KEYS } from "../utils/secureStorage";
import type { ApiResponse, ApiError } from "../types";
import type { AuthTokens } from "../types/user";

const API_URL = requireMobileUrl(mobileRuntimeConfig.apiUrl, "API_URL");

interface JsonApiResource {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

interface JsonApiResponse {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  meta?: Record<string, unknown>;
  links?: Record<string, unknown>;
}

type AuthExpiredCallback = () => void;

function parseJsonApiResource(resource: JsonApiResource): Record<string, unknown> {
  const { id, type, attributes, relationships } = resource;
  const result: Record<string, unknown> = { id, type, ...attributes };
  if (relationships) {
    Object.entries(relationships).forEach(([key, value]) => {
      result[key] = value;
    });
  }
  return result;
}

function parseJsonApiResponse(responseData: unknown): unknown {
  if (!responseData || typeof responseData !== "object") return responseData;
  const data = responseData as Record<string, unknown>;

  if (data.data && typeof data.data === "object") {
    const isJsonApi = "type" in (data.data as object) || "id" in (data.data as object) || Array.isArray(data.data);

    if (isJsonApi) {
      const jsonApi = data as unknown as JsonApiResponse;
      if (Array.isArray(jsonApi.data)) {
        const items = jsonApi.data.map(parseJsonApiResource);
        return {
          items,
          meta: jsonApi.meta,
          links: jsonApi.links,
          total: jsonApi.meta?.total as number | undefined,
          hasMore: jsonApi.meta?.hasMore as boolean | undefined,
        };
      }
      return parseJsonApiResource(jsonApi.data);
    }
  }

  return responseData;
}

class UnifiedApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private onAuthExpiredCallback: AuthExpiredCallback | null = null;

  onAuthExpired(callback: AuthExpiredCallback): void {
    this.onAuthExpiredCallback = callback;
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });

    this.setupInterceptors();
    this.loadToken();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        if (__DEV__) {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response) => {
        if (__DEV__) {
          console.log(`[API] ${response.status} ${response.config.url}`);
        }
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status !== 401) {
          return Promise.reject(error);
        }

        if (originalRequest?.url === "/auth/refresh" || originalRequest?._retry) {
          await this.clearAuth();
          return Promise.reject(error);
        }

        if (this.isRefreshing) {
          return new Promise((resolve) => {
            this.refreshSubscribers.push((newToken: string) => {
              if (originalRequest) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              resolve(this.client(originalRequest));
            });
          });
        }

        this.isRefreshing = true;
        originalRequest._retry = true;

        try {
          const newToken = await this.attemptTokenRefresh();
          this.isRefreshing = false;
          this.refreshSubscribers.forEach((cb) => cb(newToken));
          this.refreshSubscribers = [];

          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return this.client(originalRequest);
        } catch {
          this.isRefreshing = false;
          this.refreshSubscribers = [];
          await this.clearAuth();
          return Promise.reject(error);
        }
      },
    );
  }

  private async loadToken() {
    try {
      this.token = await secureStorage.getItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
    } catch (e) {
      console.error("Failed to load token:", e);
    }
  }

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await secureStorage.setItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      await secureStorage.deleteItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
    }
  }

  async setRefreshToken(token: string | null) {
    if (token) {
      await secureStorage.setItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, token);
    } else {
      await secureStorage.deleteItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
    }
  }

  async getRefreshToken(): Promise<string | null> {
    return secureStorage.getItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
  }

  async clearAuth() {
    this.token = null;
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.USER_DATA);
    this.onAuthExpiredCallback?.();
  }

  private async attemptTokenRefresh(): Promise<string> {
    const storedRefreshToken = await this.getRefreshToken();
    if (!storedRefreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await this.client.post<AuthTokens>("/auth/refresh", {
      refreshToken: storedRefreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    if (!accessToken) {
      throw new Error("Token refresh returned no access token");
    }

    await this.setToken(accessToken);
    if (newRefreshToken) {
      await this.setRefreshToken(newRefreshToken);
    }

    return accessToken;
  }

  getToken() {
    return this.token;
  }

  private parseResponse<T>(responseData: unknown): T {
    const parsed = parseJsonApiResponse(responseData);
    return parsed as T;
  }

  private handleError<T>(error: unknown): ApiResponse<T> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiError>;
      const apiError: ApiError = {
        code: axiosError.response?.data?.code || "UNKNOWN_ERROR",
        message: axiosError.response?.data?.message || axiosError.message || "An error occurred",
        details: axiosError.response?.data?.details,
      };
      return { success: false, error: apiError };
    }

    const apiError: ApiError = {
      code: "UNKNOWN_ERROR",
      message: error instanceof Error ? error.message : "An error occurred",
    };
    return { success: false, error: apiError };
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, { params });
      return { success: true, data: this.parseResponse<T>(response.data) };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data);
      return { success: true, data: this.parseResponse<T>(response.data) };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data);
      return { success: true, data: this.parseResponse<T>(response.data) };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch(url, data);
      return { success: true, data: this.parseResponse<T>(response.data) };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url);
      return { success: true, data: this.parseResponse<T>(response.data) };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  async upload<T>(url: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { success: true, data: this.parseResponse<T>(response.data) };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }
}

export const unifiedApiClient = new UnifiedApiClient();
export default unifiedApiClient;
