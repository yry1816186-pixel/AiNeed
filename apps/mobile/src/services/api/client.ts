import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { mobileRuntimeConfig, requireMobileUrl } from "../../config/runtime";
import { secureStorage, SECURE_STORAGE_KEYS } from "../../utils/secureStorage";
import {
  ApiError,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from "../../types";
import { AuthTokens } from "../../types/user";
import { AppError, AppErrorCode, classifyAxiosError } from "./error";

const API_URL = requireMobileUrl(mobileRuntimeConfig.apiUrl, "API_URL");
const USER_KEY = "user_data";
const CACHE_PREFIX = "api_cache_";
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY = 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private order: string[] = [];

  constructor(maxSize: number = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.delete(key);
      return null;
    }

    this.moveToFront(key);
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.cache.has(key)) {
      this.cache.set(key, { data, timestamp: Date.now(), key });
      this.moveToFront(key);
      return;
    }

    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, { data, timestamp: Date.now(), key });
    this.order.unshift(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
    const index = this.order.indexOf(key);
    if (index > -1) {
      this.order.splice(index, 1);
    }
  }

  clear(): void {
    this.cache.clear();
    this.order = [];
  }

  get size(): number {
    return this.cache.size;
  }

  private moveToFront(key: string): void {
    const index = this.order.indexOf(key);
    if (index > -1) {
      this.order.splice(index, 1);
      this.order.unshift(key);
    }
  }

  private evictLRU(): void {
    if (this.order.length === 0) return;
    const lruKey = this.order.pop();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
}

type AuthExpiredCallback = () => void;

interface PendingRequest {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private cache = new LRUCache<unknown>();
  private isRefreshing = false;
  private pendingRequests: PendingRequest[] = [];
  private onAuthExpiredCallback: AuthExpiredCallback | null = null;
  private inFlightRequests = new Map<string, Promise<ApiResponse<unknown>>>();

  onAuthExpired(callback: AuthExpiredCallback): void {
    this.onAuthExpiredCallback = callback;
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
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
          console.log(
            `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
          );
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.headers["x-request-id"];
        if (requestId && typeof requestId === "string") {
          (
            response as unknown as Record<string, unknown>
          ).__requestId = requestId;
        }
        if (__DEV__) {
          console.log(
            `[API] ${response.status} ${response.config.url}`,
          );
        }
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status !== 401) {
          return Promise.reject(error);
        }

        if (
          originalRequest?.url === "/auth/refresh" ||
          originalRequest?._retry
        ) {
          await this.clearAuth();
          return Promise.reject(
            classifyAxiosError(error),
          );
        }

        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.pendingRequests.push({
              resolve: (newToken: string) => {
                if (originalRequest) {
                  originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                resolve(this.client(originalRequest));
              },
              reject,
            });
          });
        }

        this.isRefreshing = true;
        originalRequest._retry = true;

        try {
          const newToken = await this.attemptTokenRefresh();
          this.isRefreshing = false;

          this.pendingRequests.forEach(({ resolve }) => resolve(newToken));
          this.pendingRequests = [];

          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return this.client(originalRequest);
        } catch (refreshError) {
          this.isRefreshing = false;
          this.pendingRequests.forEach(({ reject }) => reject(refreshError));
          this.pendingRequests = [];
          await this.clearAuth();
          return Promise.reject(
            new AppError(AppErrorCode.TOKEN_REFRESH_FAILED, undefined, {
              originalError: refreshError,
            }),
          );
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
    await AsyncStorage.removeItem(USER_KEY);
    this.cache.clear();
    this.inFlightRequests.clear();
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

  private getCacheKey(url: string, params?: Record<string, unknown>): string {
    return `${CACHE_PREFIX}${url}${params ? JSON.stringify(params) : ""}`;
  }

  private getFromCache<T>(key: string): T | null {
    return this.cache.get(key) as T | null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, data);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<ApiResponse<T>>,
    maxRetries: number = MAX_RETRY_ATTEMPTS,
    delay: number = RETRY_BASE_DELAY,
  ): Promise<ApiResponse<T>> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, attempt)),
        );
      }
    }
    return {
      success: false,
      error: { code: "RETRY_EXHAUSTED", message: "Max retries exceeded" },
    };
  }

  private deduplicate<T>(
    key: string,
    fetcher: () => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T>> {
    const existing = this.inFlightRequests.get(key);
    if (existing) {
      return existing as Promise<ApiResponse<T>>;
    }

    const promise = fetcher().finally(() => {
      this.inFlightRequests.delete(key);
    });

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  async get<T>(
    url: string,
    params?: Record<string, unknown>,
    options?: { useCache?: boolean; retry?: number; deduplicate?: boolean },
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.getCacheKey(url, params);

    if (options?.useCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    const fetcher = async (): Promise<ApiResponse<T>> => {
      try {
        const response = await this.client.get(url, { params });
        const result = { success: true, data: response.data as T };

        if (options?.useCache) {
          this.setCache(cacheKey, response.data);
        }

        return result;
      } catch (error) {
        return this.handleError(error as AxiosError<ApiError>);
      }
    };

    if (options?.deduplicate) {
      return this.deduplicate(cacheKey, fetcher);
    }

    if (options?.retry && options.retry > 1) {
      return this.retryWithBackoff(fetcher, options.retry);
    }

    return fetcher();
  }

  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data);
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error as AxiosError<ApiError>);
    }
  }

  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data);
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error as AxiosError<ApiError>);
    }
  }

  async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch(url, data);
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error as AxiosError<ApiError>);
    }
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url);
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error as AxiosError<ApiError>);
    }
  }

  async upload<T>(url: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error as AxiosError<ApiError>);
    }
  }

  async getPaginated<T>(
    url: string,
    params?: PaginationParams & Record<string, unknown>,
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    return this.get<PaginatedResponse<T>>(url, params);
  }

  async getWithRetry<T>(
    url: string,
    params?: Record<string, unknown>,
    maxRetries: number = MAX_RETRY_ATTEMPTS,
  ): Promise<ApiResponse<T>> {
    return this.retryWithBackoff(() => this.get<T>(url, params), maxRetries);
  }

  private handleError<T>(error: AxiosError<ApiError>): ApiResponse<T> {
    const apiError: ApiError = {
      code: error.response?.data?.code || "UNKNOWN_ERROR",
      message:
        error.response?.data?.message || error.message || "An error occurred",
      details: error.response?.data?.details,
    };
    return { success: false, error: apiError };
  }
}

export const apiClient = new ApiClient();
export default apiClient;
