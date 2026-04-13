import { secureStorage, SECURE_STORAGE_KEYS } from "../../utils/secureStorage";

const TOKEN_EXPIRY_BUFFER_MS = 30_000;

interface TokenPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded) as TokenPayload;
  } catch {
    return null;
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const tokenManager = {
  async getAccessToken(): Promise<string | null> {
    return secureStorage.getItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
  },

  async setAccessToken(token: string | null): Promise<void> {
    if (token) {
      await secureStorage.setItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      await secureStorage.deleteItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    return secureStorage.getItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setRefreshToken(token: string | null): Promise<void> {
    if (token) {
      await secureStorage.setItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, token);
    } else {
      await secureStorage.deleteItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
    }
  },

  async setTokens(tokens: TokenPair): Promise<void> {
    await this.setAccessToken(tokens.accessToken);
    await this.setRefreshToken(tokens.refreshToken);
  },

  async clearTokens(): Promise<void> {
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.USER_DATA);
  },

  async isAccessTokenExpired(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return true;
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true;
    const expiresAt = payload.exp * 1000;
    return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
  },

  async getTimeUntilExpiry(): Promise<number> {
    const token = await this.getAccessToken();
    if (!token) return 0;
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return 0;
    const expiresAt = payload.exp * 1000;
    return Math.max(0, expiresAt - Date.now());
  },

  async hasValidRefreshToken(): Promise<boolean> {
    const token = await this.getRefreshToken();
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true;
    return Date.now() < payload.exp * 1000;
  },

  decodePayload(token: string): TokenPayload | null {
    return decodeJwtPayload(token);
  },
};
