/**
 * 离线缓存服务 - 用于比赛演示的离线模式支持
 *
 * 功能：
 * 1. 缓存关键数据到本地（服装、推荐、用户信息等）
 * 2. 网络不可用时自动切换到离线数据
 * 3. 支持手动触发 Demo 数据加载
 * 4. 提供缓存状态查询
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== 常量定义 ====================

const OFFLINE_CACHE_PREFIX = 'demo_offline_';
const CACHE_KEYS = {
  FULL_DEMO_DATA: `${OFFLINE_CACHE_PREFIX}full_demo`,
  CLOTHING: `${OFFLINE_CACHE_PREFIX}clothing`,
  USERS: `${OFFLINE_CACHE_PREFIX}users`,
  RECOMMENDATIONS: `${OFFLINE_CACHE_PREFIX}recommendations`,
  CONVERSATIONS: `${OFFLINE_CACHE_PREFIX}conversations`,
  LAST_SYNC_TIME: `${OFFLINE_CACHE_PREFIX}last_sync`,
  DEMO_MODE_ENABLED: `${OFFLINE_CACHE_PREFIX}mode_enabled`,
};

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24小时过期

// ==================== 类型定义 ====================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

export interface OfflineStatus {
  isDemoModeEnabled: boolean;
  lastSyncTime: Date | null;
  cachedDataTypes: string[];
  totalCacheSize: number;
  isExpired: boolean;
}

export interface DemoDataPackage {
  users: any[];
  clothing: any[];
  recommendations: any[];
  conversations: any[];
  brands: any[];
  stats: any;
}

// ==================== 主服务类 ====================

class OfflineCacheService {
  private static instance: OfflineCacheService | null = null;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private currentVersion = '1.0.0';

  static getInstance(): OfflineCacheService {
    if (!OfflineCacheService.instance) {
      OfflineCacheService.instance = new OfflineCacheService();
    }
    return OfflineCacheService.instance;
  }

  /**
   * 初始化：从 AsyncStorage 加载缓存到内存
   */
  async initialize(): Promise<void> {
    try {
      console.log('[OfflineCache] 正在初始化离线缓存...');
      const keys = await AsyncStorage.getAllKeys();
      const demoKeys = keys.filter((key) => key.startsWith(OFFLINE_CACHE_PREFIX));

      if (demoKeys.length > 0) {
        console.log(`[OfflineCache] 发现 ${demoKeys.length} 个缓存项`);
        // 预加载关键数据到内存
        await this.loadKeyToMemory(CACHE_KEYS.FULL_DEMO_DATA);
      }
      console.log('[OfflineCache] 初始化完成');
    } catch (error) {
      console.error('[OfflineCache] 初始化失败:', error);
    }
  }

  /**
   * 保存完整的 Demo 数据包
   */
  async saveFullDemoData(data: DemoDataPackage): Promise<void> {
    const entry: CacheEntry<DemoDataPackage> = {
      data,
      timestamp: Date.now(),
      version: this.currentVersion,
    };

    // 保存完整数据
    await AsyncStorage.setItem(CACHE_KEYS.FULL_DEMO_DATA, JSON.stringify(entry));
    this.memoryCache.set(CACHE_KEYS.FULL_DEMO_DATA, entry);

    // 分别保存各子集（便于快速访问）
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEYS.CLOTHING, JSON.stringify({ data: data.clothing, timestamp: Date.now() })),
      AsyncStorage.setItem(CACHE_KEYS.USERS, JSON.stringify({ data: data.users, timestamp: Date.now() })),
      AsyncStorage.setItem(CACHE_KEYS.RECOMMENDATIONS, JSON.stringify({ data: data.recommendations, timestamp: Date.now() })),
      AsyncStorage.setItem(CACHE_KEYS.CONVERSATIONS, JSON.stringify({ data: data.conversations, timestamp: Date.now() })),
      AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC_TIME, new Date().toISOString()),
    ]);

    console.log(`[OfflineCache] Demo 数据已保存 (${JSON.stringify(data).length / 1024} KB)`);
  }

  /**
   * 获取完整的 Demo 数据
   */
  async getFullDemoData(): Promise<DemoDataPackage | null> {
    // 先从内存获取
    let entry = this.memoryCache.get(CACHE_KEYS.FULL_DEMO_DATA);

    // 内存没有则从磁盘读取
    if (!entry) {
      entry = await this.loadKeyToMemory(CACHE_KEYS.FULL_DEMO_DATA);
    }

    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      console.warn('[OfflineCache] Demo 数据已过期');
      return null; // 返回 null 让调用方决定是否使用
    }

    return entry.data;
  }

  /**
   * 获取特定类型的数据
   */
  async getCachedData<T>(type: 'clothing' | 'users' | 'recommendations' | 'conversations'): Promise<T[] | null> {
    const keyMap = {
      clothing: CACHE_KEYS.CLOTHING,
      users: CACHE_KEYS.USERS,
      recommendations: CACHE_KEYS.RECOMMENDATIONS,
      conversations: CACHE_KEYS.CONVERSATIONS,
    };

    const raw = await AsyncStorage.getItem(keyMap[type]);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // 检查过期
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
      return null;
    }

    return parsed.data as T[];
  }

  /**
   * 启用/禁用 Demo 模式
   */
  async setDemoMode(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEYS.DEMO_MODE_ENABLED, JSON.stringify(enabled));
    console.log(`[OfflineCache] Demo 模式已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 检查 Demo 模式是否启用
   */
  async isDemoModeEnabled(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.DEMMO_MODE_ENABLED);
    return raw === 'true';
  }

  /**
   * 获取离线缓存状态
   */
  async getStatus(): Promise<OfflineStatus> {
    const [isEnabled, lastSyncRaw, keys] = await Promise.all([
      this.isDemoModeEnabled(),
      AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC_TIME),
      AsyncStorage.getAllKeys(),
    ]);

    const demoKeys = keys.filter((k) => k.startsWith(OFFLINE_CACHE_PREFIX) && k !== CACHE_KEYS.DEMMO_MODE_ENABLED);

    // 计算总缓存大小
    let totalSize = 0;
    const cachedTypes: string[] = [];

    for (const key of demoKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        totalSize += raw.length; // 字符数近似
        cachedTypes.push(key.replace(OFFLINE_CACHE_PREFIX, ''));
      }
    }

    const lastSync = lastSyncRaw ? new Date(lastSyncRaw) : null;
    const isExpired = lastSync ? Date.now() - lastSync.getTime() > CACHE_EXPIRY_MS : true;

    return {
      isDemoModeEnabled: isEnabled,
      lastSyncTime: lastSync,
      cachedDataTypes: [...new Set(cachedTypes)],
      totalCacheSize: Math.round(totalSize / 1024), // KB
      isExpired,
    };
  }

  /**
   * 清除所有离线缓存
   */
  async clearCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const demoKeys = keys.filter((k) => k.startsWith(OFFLINE_CACHE_PREFIX));

    await AsyncStorage.multiRemove(demoKeys);
    this.memoryCache.clear();

    console.log(`[OfflineCache] 已清除 ${demoKeys.length} 个缓存项`);
  }

  /**
   * 预加载指定 key 到内存
   */
  private async loadKeyToMemory(key: string): Promise<CacheEntry<any> | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      const entry = JSON.parse(raw) as CacheEntry<any>;
      this.memoryCache.set(key, entry);
      return entry;
    } catch (error) {
      console.error(`[OfflineCache] 加载 ${key} 失败:`, error);
      return null;
    }
  }
}

// ==================== 导出单例 ====================

export const offlineCache = OfflineCacheService.getInstance();

// ==================== 便捷 Hook（可选） ====================

/**
 * 使用离线数据的 React Hook
 * 用法：
 * ```tsx
 * const { data, loading, error } = useOfflineData('clothing');
 * ```
 */
export async function useOfflineData(type: 'clothing' | 'users' | 'recommendations' | 'conversations') {
  const isEnabled = await offlineCache.isDemoModeEnabled();

  if (!isEnabled) {
    return { data: null, source: 'online', enabled: false };
  }

  const data = await offlineCache.getCachedData(type);
  return { data, source: 'offline', enabled: true };
}
