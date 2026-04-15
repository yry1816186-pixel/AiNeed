/**
 * Tests for auth-related token management and error utilities
 * Tests pure logic from the auth module that has minimal RN dependencies
 */

// Mock React Native dependencies before imports
import { tokenManager } from "../../services/auth/token";

jest.mock(
  "@react-native-async-storage/async-storage",
  () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(undefined),
    multiRemove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
  }),
  { virtual: true }
);

jest.mock(
  "react-native-encrypted-storage",
  () => ({
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true }
);

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("../../config/runtime", () => ({
  mobileRuntimeConfig: {
    apiUrl: "http://localhost:3001/api/v1",
    aiServiceUrl: "http://localhost:8001",
    enableUnverifiedMobileDemos: true,
  },
  requireMobileUrl: (url: string) => url,
}));

describe("tokenManager", () => {
  describe("decodePayload", () => {
    it("should decode a valid JWT payload", () => {
      // Create a minimal JWT: header.payload.signature
      // Base64url encode: {"sub":"user-1","exp":2000000000}
      const payload = JSON.stringify({ sub: "user-1", exp: 2000000000 });
      const encoded = Buffer.from(payload)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

      const token = `eyJhbGciOiJIUzI1NiJ9.${encoded}.signature`;

      const result = tokenManager.decodePayload(token);
      expect(result).not.toBeNull();
      expect(result?.sub).toBe("user-1");
      expect(result?.exp).toBe(2000000000);
    });

    it("should return null for invalid JWT format", () => {
      expect(tokenManager.decodePayload("not-a-jwt")).toBeNull();
      expect(tokenManager.decodePayload("only.two")).toBeNull();
    });

    it("should return null for malformed base64", () => {
      const token = "header.!!!invalid!!!signature";
      expect(tokenManager.decodePayload(token)).toBeNull();
    });

    it("should handle payload with extra fields", () => {
      const payload = JSON.stringify({
        sub: "user-2",
        exp: 2000000000,
        iat: 1000000000,
        role: "admin",
        custom: "field",
      });
      const encoded = Buffer.from(payload)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

      const token = `eyJhbGciOiJIUzI1NiJ9.${encoded}.signature`;

      const result = tokenManager.decodePayload(token);
      expect(result?.role).toBe("admin");
      expect(result?.custom).toBe("field");
    });
  });

  describe("isAccessTokenExpired", () => {
    it("should report expired for null token", async () => {
      // secureStorage.getItem returns null by default in our mock
      const isExpired = await tokenManager.isAccessTokenExpired();
      expect(isExpired).toBe(true);
    });
  });

  describe("getTimeUntilExpiry", () => {
    it("should return 0 for null token", async () => {
      const time = await tokenManager.getTimeUntilExpiry();
      expect(time).toBe(0);
    });
  });

  describe("hasValidRefreshToken", () => {
    it("should return false when no refresh token exists", async () => {
      const isValid = await tokenManager.hasValidRefreshToken();
      expect(isValid).toBe(false);
    });
  });
});
