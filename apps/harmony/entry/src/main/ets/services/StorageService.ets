import preferences from '@ohos.data.preferences';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PROFILE: 'user_profile',
  WARDROBE_CACHE: 'wardrobe_cache'
};

export class StorageService {
  private static instance: StorageService;
  private preferences: preferences.Preferences | null = null;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async init(context: Context): Promise<void> {
    try {
      this.preferences = await preferences.getPreferences(context, 'aineed_storage');
    } catch (error) {
      console.error('Storage init failed:', error);
    }
  }

  async set(key: string, value: string): Promise<boolean> {
    if (!this.preferences) return false;
    try {
      await this.preferences.put(key, value);
      await this.preferences.flush();
      return true;
    } catch (error) {
      console.error('Storage set failed:', error);
      return false;
    }
  }

  async get(key: string, defaultValue: string = ''): Promise<string> {
    if (!this.preferences) return defaultValue;
    try {
      const value = await this.preferences.get(key, defaultValue);
      return value as string;
    } catch (error) {
      console.error('Storage get failed:', error);
      return defaultValue;
    }
  }

  async remove(key: string): Promise<boolean> {
    if (!this.preferences) return false;
    try {
      await this.preferences.delete(key);
      await this.preferences.flush();
      return true;
    } catch (error) {
      console.error('Storage remove failed:', error);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    if (!this.preferences) return false;
    try {
      await this.preferences.clear();
      await this.preferences.flush();
      return true;
    } catch (error) {
      console.error('Storage clear failed:', error);
      return false;
    }
  }
}

export const storageService = StorageService.getInstance();
