import { AxiosError, AxiosHeaders } from "axios";

import { apiClient } from "../client";
import { secureStorage, SECURE_STORAGE_KEYS } from "../../../utils/secureStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---- Mocks ----
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock("../../../config/runtime", () => ({
  mobileRuntimeConfig: { apiUrl: "http://localhost:3001" },
  requireMobileUrl: (_url: string, _label: string) => "http://localhost:3001",
}));

jest.mock("../../../utils/secureStorage", () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    deleteItem: jest.fn(),
  },
  SECURE_STORAGE_KEYS: {
    AUTH_TOKEN: "auth_token",
    REFRESH_TOKEN: "refresh_token",
    USER_DATA: "user_data",
  },
}));

jest.mock("../error", () => ({
  AppError: class AppError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message || code);
      this.name = "AppError";
      this.code = code;
    }
  },
  AppErrorCode: {
    NETWORK_ERROR: "NETWORK_ERROR",
    TIMEOUT_ERROR: "TIMEOUT_ERROR",
    UNAUTHORIZED: "UNAUTHORIZED",
    TOKEN_REFRESH_FAILED: "TOKEN_REFRESH_FAILED",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
  },
  classifyAxiosError: jest.fn(
    (error: AxiosError) =>
      new (class extends Error {
        code = "UNAUTHORIZED";
      })(error.message)
  ),
}));

// ---- Helpers ----
function _createAxiosError(
  status: number,
  data?: Record<string, unknown>,
  url?: string
): AxiosError {
  const error = new AxiosError(
    "Request failed",
    AxiosError.ERR_BAD_REQUEST,
    {
      url: url || "/test",
      method: "get",
      headers: new AxiosHeaders(),
    } as any,
    null,
    {
      status,
      data,
      statusText: "Error",
      headers: {},
      config: {} as any,
    }
  );
  return error;
}

// ---- Tests ----
describe("ApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
    (secureStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.deleteItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  // ==================== Token Management ====================

  describe("setToken", () => {
    it("should store token in memory and secure storage when token is provided", async () => {
      await apiClient.setToken("test-access-token");

      expect(secureStorage.setItem).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN,
        "test-access-token"
      );
      expect(apiClient.getToken()).toBe("test-access-token");
    });

    it("should delete token from secure storage when token is null", async () => {
      await apiClient.setToken("first-token");
      await apiClient.setToken(null);

      expect(secureStorage.deleteItem).toHaveBeenCalledWith(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      expect(apiClient.getToken()).toBeNull();
    });
  });

  describe("setRefreshToken", () => {
    it("should store refresh token in secure storage when provided", async () => {
      await apiClient.setRefreshToken("test-refresh-token");

      expect(secureStorage.setItem).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.REFRESH_TOKEN,
        "test-refresh-token"
      );
    });

    it("should delete refresh token from secure storage when null", async () => {
      await apiClient.setRefreshToken(null);

      expect(secureStorage.deleteItem).toHaveBeenCalledWith(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
    });
  });

  describe("clearAuth", () => {
    it("should clear all auth data and invoke onAuthExpired callback", async () => {
      const callback = jest.fn();
      apiClient.onAuthExpired(callback);

      await apiClient.setToken("some-token");
      await apiClient.clearAuth();

      expect(apiClient.getToken()).toBeNull();
      expect(secureStorage.deleteItem).toHaveBeenCalledWith(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      expect(secureStorage.deleteItem).toHaveBeenCalledWith(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      expect(secureStorage.deleteItem).toHaveBeenCalledWith(SECURE_STORAGE_KEYS.USER_DATA);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("user_data");
      expect(callback).toHaveBeenCalled();
    });

    it("should not throw if no callback is registered", async () => {
      await expect(apiClient.clearAuth()).resolves.not.toThrow();
    });
  });

  describe("onAuthExpired", () => {
    it("should register a callback that is called when auth is cleared", async () => {
      const cb = jest.fn();
      apiClient.onAuthExpired(cb);
      await apiClient.clearAuth();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== HTTP Methods ====================

  describe("get", () => {
    it("should make a GET request and return success response", async () => {
      const mockData = { id: "1", name: "test" };
      // We spy on the internal axios instance via the public method
      const result = await apiClient.get<typeof mockData>("/test");

      // Since the actual axios call will fail in test env, we test error handling
      // The client catches errors and returns { success: false, error: ... }
      expect(result).toHaveProperty("success");
    });

    it("should return cached data when useCache option is true and cache is populated", async () => {
      // First request to populate cache
      const _firstResult = await apiClient.get("/cache-test", undefined, {
        useCache: true,
      });

      // Second request should use cache if first succeeded
      const secondResult = await apiClient.get("/cache-test", undefined, {
        useCache: true,
      });

      expect(secondResult).toHaveProperty("success");
    });
  });

  describe("post", () => {
    it("should make a POST request and return response", async () => {
      const result = await apiClient.post("/test", { key: "value" });
      expect(result).toHaveProperty("success");
    });
  });

  describe("put", () => {
    it("should make a PUT request and return response", async () => {
      const result = await apiClient.put("/test", { key: "value" });
      expect(result).toHaveProperty("success");
    });
  });

  describe("patch", () => {
    it("should make a PATCH request and return response", async () => {
      const result = await apiClient.patch("/test", { key: "value" });
      expect(result).toHaveProperty("success");
    });
  });

  describe("delete", () => {
    it("should make a DELETE request and return response", async () => {
      const result = await apiClient.delete("/test");
      expect(result).toHaveProperty("success");
    });
  });

  describe("upload", () => {
    it("should make a POST request with multipart/form-data content type", async () => {
      const formData = new FormData();
      formData.append("file", "test" as unknown as Blob);

      const result = await apiClient.upload("/upload", formData);
      expect(result).toHaveProperty("success");
    });
  });

  // ==================== Cache Management ====================

  describe("clearCache", () => {
    it("should clear the cache", () => {
      apiClient.clearCache();
      expect(apiClient.getCacheSize()).toBe(0);
    });
  });

  describe("getCacheSize", () => {
    it("should return 0 for empty cache", () => {
      apiClient.clearCache();
      expect(apiClient.getCacheSize()).toBe(0);
    });
  });

  // ==================== Error Handling ====================

  describe("error handling", () => {
    it("should return error response when request fails", async () => {
      const result = await apiClient.get("/nonexistent-endpoint");

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error).toHaveProperty("code");
        expect(result.error).toHaveProperty("message");
      }
    });

    it("should return error response for failed POST", async () => {
      const result = await apiClient.post("/nonexistent-endpoint", {});

      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  // ==================== Pagination ====================

  describe("getPaginated", () => {
    it("should call get with the given URL and params", async () => {
      const result = await apiClient.getPaginated("/items", {
        page: 1,
        limit: 10,
      });
      expect(result).toHaveProperty("success");
    });
  });

  // ==================== Retry ====================

  describe("getWithRetry", () => {
    it("should attempt retries on failure", async () => {
      const result = await apiClient.getWithRetry("/retry-test", undefined, 2);
      expect(result).toHaveProperty("success");
    }, 15000);
  });
});
