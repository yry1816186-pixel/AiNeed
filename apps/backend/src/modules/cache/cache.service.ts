import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { RedisService } from "../../common/redis/redis.service";

/**
 * Cache Service
 * 提供高级缓存功能，包括缓存穿透保护和缓存击穿保护
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly nullPlaceholder = "__NULL__";
  private readonly lockPrefix = "lock:";
  private readonly defaultLockTtl = 10;
  private readonly defaultNullTtl = 60;
  private readonly bloomFilterSize = 1000;
  private readonly bloomFilterName = "bloom_filter";

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redisService.get(key);

    if (value === null) {
      return null;
    }

    // 处理空值占位符（缓存穿透保护）
    if (value === this.nullPlaceholder) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to parse cached value for key '${key}': ${errorMessage}. Cached value may be corrupted or in unexpected format. Raw value (truncated): '${value.substring(0, 100)}...'`,
      );
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒）
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);

    if (ttl) {
      await this.redisService.setex(key, ttl, serialized);
    } else {
      await this.redisService.set(key, serialized);
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  /**
   * 根据模式批量删除缓存
   * 使用 SCAN 命令安全遍历，避免阻塞 Redis
   */
  async delPattern(pattern: string): Promise<number> {
    const client = this.redisService.getClient();
    let deletedCount = 0;
    let cursor = "0";

    do {
      const result = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await client.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== "0");

    this.logger.log(`Deleted ${deletedCount} keys matching pattern: ${pattern}`);
    return deletedCount;
  }

  /**
   * 缓存穿透保护的获取或设置方法
   * 如果缓存不存在，调用 fetcher 获取数据并缓存
   *
   * @deprecated 推荐使用 getWithLock 方法，提供分布式锁保护防止缓存击穿。
   * getOrSet 在高并发场景下可能导致多个请求同时穿透到数据库（缓存击穿问题）。
   *
   * @param key 缓存键
   * @param fetcher 数据获取函数
   * @param ttl 过期时间（秒）
   * @param nullTtl 空值的缓存时间（秒），用于防止缓存穿透，默认 60 秒
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    ttl: number = 3600,
    nullTtl: number = 60,
  ): Promise<T | null> {
    // 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 检查是否是空值占位符（防止缓存穿透）
    const rawValue = await this.redisService.get(key);
    if (rawValue === this.nullPlaceholder) {
      return null;
    }

    // 调用 fetcher 获取数据
    const data = await fetcher();

    if (data === null || data === undefined) {
      // 缓存空值以防止缓存穿透
      await this.redisService.setex(key, nullTtl, this.nullPlaceholder);
      this.logger.debug(`Cached null placeholder for key: ${key}`);
      return null;
    }

    // 缓存实际数据
    await this.set(key, data, ttl);
    return data;
  }

  // FIX: 添加最大重试次数常量，防止无限递归
  private static readonly MAX_LOCK_RETRIES = 10;

  /**
   * 使用分布式锁的获取或设置方法（缓存击穿保护）
   * 防止多个请求同时穿透到数据库
   */
  async getWithLock<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    ttl: number = 3600,
    retries: number = CacheService.MAX_LOCK_RETRIES,
  ): Promise<T | null> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const lockKey = `${this.lockPrefix}${key}`;
    const lockToken = await this.acquireLock(lockKey);

    if (!lockToken) {
      // FIX: 添加重试次数检查，防止无限递归
      if (retries <= 0) {
        this.logger.warn(`Cache lock acquisition failed after max retries: ${key}`);
        // 降级策略：直接查询数据库，不使用锁保护
        // 这种情况下可能会发生缓存击穿，但比完全失败好
        return fetcher();
      }

      // 等待一段时间后重试，使用指数退避
      const waitTime = Math.random() * 50 + 50 + (CacheService.MAX_LOCK_RETRIES - retries) * 20;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.getWithLock(key, fetcher, ttl, retries - 1);
    }

    try {
      const data = await fetcher();

      if (data === null || data === undefined) {
        await this.redisService.setex(key, this.defaultNullTtl, this.nullPlaceholder);
        return null;
      }

      await this.set(key, data, ttl);
      return data;
    } finally {
      await this.releaseLock(lockKey, lockToken);
    }
  }

  /**
   * 获取分布式锁
   */
  private async acquireLock(lockKey: string): Promise<string | null> {
    return this.redisService.acquireLock(
      lockKey,
      this.defaultLockTtl * 1000,
      1,
    );
  }

  /**
   * 释放分布式锁
   */
  private async releaseLock(lockKey: string, token: string): Promise<void> {
    await this.redisService.releaseLock(lockKey, token);
  }

  /**
   * 检查布隆过滤器是否包含键
   *
   * 注意：当前实现不是真正的布隆过滤器（概率型数据结构），而是使用 Redis SET 命令
   * 存储键的存在性标记。这仅用于缓存空值防穿透场景——当数据库查询返回空结果时，
   * 将对应键标记为"已查询过"，避免重复穿透到数据库。
   *
   * 与真正布隆过滤器的区别：
   * - 不存在误判（false positive），但也不支持空间效率优化
   * - 每个键独立存储，内存开销与键数量成正比
   * - 如需支持大规模数据集的布隆过滤，应考虑使用 RedisBF 模块或自实现位图布隆过滤器
   */
  async isBloomFilterContains(key: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const exists = await client.exists(`${this.bloomFilterName}:${key}`);
    return exists === 1;
  }

  /**
   * 添加键到布隆过滤器
   *
   * 注意：当前实现不是真正的布隆过滤器，而是简单的键值标记（SET + EXPIRE）。
   * 仅用于缓存空值防穿透场景，将已查询过的空结果键标记为存在。
   * 详见 isBloomFilterContains 方法的注释说明。
   */
  async addToBloomFilter(key: string): Promise<void> {
    const client = this.redisService.getClient();
    await client
      .multi()
      .set(`${this.bloomFilterName}:${key}`, "1")
      .expire(`${this.bloomFilterName}:${key}`, this.defaultNullTtl)
      .exec();
  }

  /**
   * 获取缓存剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    return this.redisService.ttl(key);
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    return this.redisService.exists(key);
  }

  /**
   * 刷新缓存过期时间
   */
  async refresh(key: string, ttl: number): Promise<void> {
    await this.redisService.expire(key, ttl);
  }
}
