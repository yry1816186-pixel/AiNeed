import EncryptedStorage from "react-native-encrypted-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

let SecureStore: typeof EncryptedStorage | null = null;

/** True when encrypted storage is unavailable and sensitive data is stored in plaintext via AsyncStorage. */
export let isInsecureFallback = false;

const initSecureStore = (): void => {
  if (Platform.OS !== "web") {
    try {
      SecureStore = require("react-native-encrypted-storage").default;
    } catch (e) {
      isInsecureFallback = true;
      console.error(
        "[SECURITY] react-native-encrypted-storage not available. " +
          "Falling back to AsyncStorage (plaintext). Sensitive data will NOT be encrypted. " +
          "Ensure react-native-encrypted-storage is properly linked before shipping this build."
      );
    }
  }
};

initSecureStore();

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (SecureStore) {
      return SecureStore.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (SecureStore) {
      await SecureStore.setItem(key, value);
      return;
    }
    if (!__DEV__) {
      throw new Error(
        `[SECURITY] Cannot store sensitive data "${key}" in plaintext in production. ` +
          "Ensure react-native-encrypted-storage is properly linked before building for release."
      );
    }
    console.error(
      `[SECURITY] Storing sensitive data "${key}" in plaintext via AsyncStorage. ` +
        "Install react-native-encrypted-storage for encrypted storage."
    );
    return AsyncStorage.setItem(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (SecureStore) {
      await SecureStore.removeItem(key);
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

export const SECURE_STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token_secure",
  REFRESH_TOKEN: "refresh_token_secure",
  USER_DATA: "user_data_secure",
} as const;

export const OFFLINE_QUEUE_KEY = "offline_request_queue";
export const OFFLINE_DATA_PREFIX = "offline_data_";

export interface OfflineRequest {
  id: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  data?: unknown;
  timestamp: number;
  retries: number;
}

export const offlineStorage = {
  async queueRequest(
    request: Omit<OfflineRequest, "id" | "timestamp" | "retries">
  ): Promise<string> {
    const queue = await this.getQueue();
    const newRequest: OfflineRequest = {
      ...request,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };
    queue.push(newRequest);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return newRequest.id;
  },

  async getQueue(): Promise<OfflineRequest[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async removeRequest(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((r) => r.id !== id);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  },

  async incrementRetries(id: string): Promise<number> {
    const queue = await this.getQueue();
    const request = queue.find((r) => r.id === id);
    if (request) {
      request.retries += 1;
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return request.retries;
    }
    return 0;
  },

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  },

  async cacheData<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    await AsyncStorage.setItem(`${OFFLINE_DATA_PREFIX}${key}`, JSON.stringify(cacheEntry));
  },

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(`${OFFLINE_DATA_PREFIX}${key}`);
      if (!data) {
        return null;
      }

      const entry = JSON.parse(data);
      if (Date.now() - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(`${OFFLINE_DATA_PREFIX}${key}`);
        return null;
      }
      return entry.data as T;
    } catch {
      return null;
    }
  },

  async clearCachedData(key: string): Promise<void> {
    await AsyncStorage.removeItem(`${OFFLINE_DATA_PREFIX}${key}`);
  },
};
