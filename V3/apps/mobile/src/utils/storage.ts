import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageItem<T> {
  value: T;
  expiry: number | null;
}

class StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage write failure — caller should handle if critical
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // removal failure is non-critical
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch {
      // clear failure is non-critical
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys() as string[];
    } catch {
      return [] as string[];
    }
  }

  async setWithExpiry<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      const item: StorageItem<T> = {
        value,
        expiry: Date.now() + ttlMs,
      };
      await AsyncStorage.setItem(key, JSON.stringify(item));
    } catch {
      // storage write failure
    }
  }

  async getWithExpiry<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return null;

      const item = JSON.parse(raw) as StorageItem<T>;

      if (item.expiry !== null && Date.now() > item.expiry) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return item.value;
    } catch {
      return null;
    }
  }

  async multiGet(keys: string[]): Promise<Record<string, unknown>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, unknown> = {};
      for (const [k, v] of pairs) {
        if (v !== null) {
          try {
            result[k] = JSON.parse(v);
          } catch {
            result[k] = v;
          }
        }
      }
      return result;
    } catch {
      return {};
    }
  }

  async multiSet(items: Record<string, unknown>): Promise<void> {
    try {
      const pairs: [string, string][] = Object.entries(items).map(
        ([k, v]) => [k, JSON.stringify(v)],
      );
      await AsyncStorage.multiSet(pairs);
    } catch {
      // batch write failure
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch {
      // batch removal failure
    }
  }
}

export const storage = new StorageService();

export const StorageKeys = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PROFILE: 'user_profile',
  USER_PREFERENCES: 'user_preferences',
  SEARCH_HISTORY: 'search_history',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SELECTED_AVATAR: 'selected_avatar_params',
  RECENTLY_VIEWED: 'recently_viewed',
  THEME_MODE: 'theme_mode',
  APP_LOCALE: 'app_locale',
  LAST_FEED_CURSOR: 'last_feed_cursor',
} as const;

export type StorageKeyType = (typeof StorageKeys)[keyof typeof StorageKeys];
