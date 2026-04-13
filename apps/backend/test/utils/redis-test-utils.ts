/**
 * Redis Test Utilities
 * @description Redis 测试工具集
 *
 * 提供完整的 Redis 服务模拟、键操作追踪和断言支持。
 * 所有 ioredis 方法均被模拟，确保测试无需真实 Redis 连接。
 *
 * 主要功能：
 * - createMockRedisClient: 创建完整的 ioredis 客户端模拟
 * - createMockRedisService: 创建 RedisService 模拟
 * - createRedisKeyTracker: 追踪所有 Redis 键操作，支持断言
 * - flushTestKeys: 清理测试键（需要真实 Redis 连接时使用）
 *
 * @example
 * ```typescript
 * const tracker = createRedisKeyTracker();
 * const mockClient = createMockRedisClient(tracker);
 *
 * await mockClient.set('xuno:user:123', '{"name":"test"}');
 * expect(tracker.getOperations('xuno:user:123')).toHaveLength(1);
 * expect(tracker.hasKey('xuno:user:123')).toBe(true);
 * ```
 */

import { RedisService, REDIS_KEY_PREFIX, REDIS_KEY_SEPARATOR } from "../../src/common/redis/redis.service";

// ============================================================================
// Redis 键操作追踪器
// ============================================================================

/**
 * Redis 操作记录
 */
export interface RedisOperation {
  /** 操作类型 */
  type: string;
  /** 操作的键 */
  key: string;
  /** 操作参数 */
  args: unknown[];
  /** 操作时间戳 */
  timestamp: number;
}

/**
 * Redis 键操作追踪器
 *
 * 记录所有通过 mock Redis 客户端执行的操作，
 * 支持按键、按操作类型查询和断言。
 */
export class RedisKeyTracker {
  /** 所有操作记录 */
  private readonly operations: RedisOperation[] = [];

  /** 当前存储的键值对（模拟 Redis 数据存储） */
  private readonly store: Map<string, unknown> = new Map();

  /** 键的 TTL 记录（秒） */
  private readonly ttlMap: Map<string, number> = new Map();

  /** 键的过期时间戳记录 */
  private readonly expireMap: Map<string, number> = new Map();

  /**
   * 记录一次操作
   */
  record(type: string, key: string, args: unknown[] = []): void {
    this.operations.push({
      type,
      key,
      args,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取指定键的所有操作
   */
  getOperations(key: string): RedisOperation[] {
    return this.operations.filter((op) => op.key === key);
  }

  /**
   * 获取指定操作类型的所有操作
   */
  getOperationsByType(type: string): RedisOperation[] {
    return this.operations.filter((op) => op.type === type);
  }

  /**
   * 获取所有操作
   */
  getAllOperations(): RedisOperation[] {
    return [...this.operations];
  }

  /**
   * 检查键是否存在（在模拟存储中）
   */
  hasKey(key: string): boolean {
    // 检查是否已过期
    const expireAt = this.expireMap.get(key);
    if (expireAt && Date.now() > expireAt) {
      this.store.delete(key);
      this.ttlMap.delete(key);
      this.expireMap.delete(key);
      return false;
    }
    return this.store.has(key);
  }

  /**
   * 获取键的值
   */
  getValue(key: string): unknown {
    if (!this.hasKey(key)) {
      return null;
    }
    return this.store.get(key);
  }

  /**
   * 设置键值
   */
  setValue(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  /**
   * 删除键
   */
  deleteKey(key: string): boolean {
    const existed = this.store.has(key);
    this.store.delete(key);
    this.ttlMap.delete(key);
    this.expireMap.delete(key);
    return existed;
  }

  /**
   * 设置键的 TTL
   */
  setTtl(key: string, seconds: number): void {
    this.ttlMap.set(key, seconds);
    this.expireMap.set(key, Date.now() + seconds * 1000);
  }

  /**
   * 获取键的剩余 TTL
   */
  getTtl(key: string): number {
    const expireAt = this.expireMap.get(key);
    if (!expireAt) {
      return -1; // 键不存在或没有设置过期时间
    }
    const remaining = Math.max(0, Math.ceil((expireAt - Date.now()) / 1000));
    return remaining;
  }

  /**
   * 获取所有匹配模式的键
   */
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );
    return Array.from(this.store.keys()).filter((key) => regex.test(key));
  }

  /**
   * 获取存储中的所有键
   */
  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * 获取存储中的键数量
   */
  get keyCount(): number {
    return this.store.size;
  }

  /**
   * 获取操作总数
   */
  get operationCount(): number {
    return this.operations.length;
  }

  /**
   * 清空所有记录和存储
   */
  reset(): void {
    this.operations.length = 0;
    this.store.clear();
    this.ttlMap.clear();
    this.expireMap.clear();
  }

  /**
   * 仅清空操作记录（保留存储数据）
   */
  clearOperations(): void {
    this.operations.length = 0;
  }
}

// ============================================================================
// Mock Redis Client
// ============================================================================

/**
 * 创建完整的 ioredis 客户端模拟
 *
 * 模拟所有项目中使用的 ioredis 方法，支持可选的键追踪器。
 *
 * @param tracker - 可选的键追踪器，用于记录和查询操作
 * @returns 模拟的 ioredis 客户端
 */
export function createMockRedisClient(
  tracker?: RedisKeyTracker,
): Record<string, unknown> {
  const internalTracker = tracker || new RedisKeyTracker();

  // 内部数据存储
  const stringStore = internalTracker as unknown as {
    setValue: (k: string, v: unknown) => void;
    getValue: (k: string) => unknown;
    hasKey: (k: string) => boolean;
    deleteKey: (k: string) => boolean;
    setTtl: (k: string, s: number) => void;
    getTtl: (k: string) => number;
    getKeysByPattern: (p: string) => string[];
    getAllKeys: () => string[];
    record: (t: string, k: string, a?: unknown[]) => void;
  };

  // Hash 存储
  const hashStore = new Map<string, Map<string, string>>();

  // Set 存储
  const setStore = new Map<string, Set<string>>();

  // Sorted Set 存储
  const sortedSetStore = new Map<string, Map<string, number>>();

  // List 存储
  const listStore = new Map<string, string[]>();

  return {
    // ========== 字符串操作 ==========
    get: jest.fn((key: string) => {
      stringStore.record("get", key);
      const value = stringStore.getValue(key);
      return Promise.resolve(value as string | null ?? null);
    }),

    set: jest.fn((key: string, value: string, ...args: unknown[]) => {
      stringStore.record("set", key, [value, ...args]);
      stringStore.setValue(key, value);

      // 处理 SET key value PX ttl NX 等组合参数
      let result: string | null = "OK";
      for (let i = 0; i < args.length; i++) {
        const arg = String(args[i]).toUpperCase();
        if (arg === "PX" && args[i + 1]) {
          stringStore.setTtl(key, Number(args[i + 1]) / 1000);
          i++;
        } else if (arg === "EX" && args[i + 1]) {
          stringStore.setTtl(key, Number(args[i + 1]));
          i++;
        } else if (arg === "NX") {
          if (stringStore.hasKey(key)) {
            result = null;
          }
        }
      }

      return Promise.resolve(result);
    }),

    setex: jest.fn((key: string, seconds: number, value: string) => {
      stringStore.record("setex", key, [seconds, value]);
      stringStore.setValue(key, value);
      stringStore.setTtl(key, seconds);
      return Promise.resolve("OK");
    }),

    del: jest.fn((...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        stringStore.record("del", key);
        if (stringStore.deleteKey(key)) {
          count++;
        }
        hashStore.delete(key);
        setStore.delete(key);
        sortedSetStore.delete(key);
        listStore.delete(key);
      }
      return Promise.resolve(count);
    }),

    exists: jest.fn((...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        stringStore.record("exists", key);
        if (stringStore.hasKey(key)) {
          count++;
        }
      }
      return Promise.resolve(count);
    }),

    ttl: jest.fn((key: string) => {
      stringStore.record("ttl", key);
      return Promise.resolve(stringStore.getTtl(key));
    }),

    expire: jest.fn((key: string, seconds: number) => {
      stringStore.record("expire", key, [seconds]);
      if (stringStore.hasKey(key)) {
        stringStore.setTtl(key, seconds);
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    }),

    pexpire: jest.fn((key: string, ms: number) => {
      stringStore.record("pexpire", key, [ms]);
      if (stringStore.hasKey(key)) {
        stringStore.setTtl(key, ms / 1000);
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    }),

    incr: jest.fn((key: string) => {
      stringStore.record("incr", key);
      const current = Number(stringStore.getValue(key) || 0);
      const newValue = current + 1;
      stringStore.setValue(key, String(newValue));
      return Promise.resolve(newValue);
    }),

    decr: jest.fn((key: string) => {
      stringStore.record("decr", key);
      const current = Number(stringStore.getValue(key) || 0);
      const newValue = current - 1;
      stringStore.setValue(key, String(newValue));
      return Promise.resolve(newValue);
    }),

    incrby: jest.fn((key: string, increment: number) => {
      stringStore.record("incrby", key, [increment]);
      const current = Number(stringStore.getValue(key) || 0);
      const newValue = current + increment;
      stringStore.setValue(key, String(newValue));
      return Promise.resolve(newValue);
    }),

    // ========== Hash 操作 ==========
    hset: jest.fn((key: string, ...args: unknown[]) => {
      stringStore.record("hset", key, args);
      if (!hashStore.has(key)) {
        hashStore.set(key, new Map());
      }
      const hash = hashStore.get(key)!;
      let fieldsAdded = 0;
      for (let i = 0; i < args.length; i += 2) {
        const field = String(args[i]);
        const value = String(args[i + 1]);
        if (!hash.has(field)) {
          fieldsAdded++;
        }
        hash.set(field, value);
      }
      stringStore.setValue(key, Object.fromEntries(hash));
      return Promise.resolve(fieldsAdded);
    }),

    hget: jest.fn((key: string, field: string) => {
      stringStore.record("hget", key, [field]);
      const hash = hashStore.get(key);
      if (!hash) {
        return Promise.resolve(null);
      }
      return Promise.resolve(hash.get(field) ?? null);
    }),

    hgetall: jest.fn((key: string) => {
      stringStore.record("hgetall", key);
      const hash = hashStore.get(key);
      if (!hash) {
        return Promise.resolve({});
      }
      return Promise.resolve(Object.fromEntries(hash));
    }),

    hdel: jest.fn((key: string, ...fields: string[]) => {
      stringStore.record("hdel", key, fields);
      const hash = hashStore.get(key);
      if (!hash) {
        return Promise.resolve(0);
      }
      let count = 0;
      for (const field of fields) {
        if (hash.delete(field)) {
          count++;
        }
      }
      if (hash.size === 0) {
        hashStore.delete(key);
        stringStore.deleteKey(key);
      } else {
        stringStore.setValue(key, Object.fromEntries(hash));
      }
      return Promise.resolve(count);
    }),

    hexists: jest.fn((key: string, field: string) => {
      stringStore.record("hexists", key, [field]);
      const hash = hashStore.get(key);
      return Promise.resolve(hash?.has(field) ? 1 : 0);
    }),

    // ========== Set 操作 ==========
    sadd: jest.fn((key: string, ...members: string[]) => {
      stringStore.record("sadd", key, members);
      if (!setStore.has(key)) {
        setStore.set(key, new Set());
      }
      const set = setStore.get(key)!;
      let added = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          added++;
        }
      }
      stringStore.setValue(key, Array.from(set));
      return Promise.resolve(added);
    }),

    srem: jest.fn((key: string, ...members: string[]) => {
      stringStore.record("srem", key, members);
      const set = setStore.get(key);
      if (!set) {
        return Promise.resolve(0);
      }
      let removed = 0;
      for (const member of members) {
        if (set.delete(member)) {
          removed++;
        }
      }
      if (set.size === 0) {
        setStore.delete(key);
        stringStore.deleteKey(key);
      } else {
        stringStore.setValue(key, Array.from(set));
      }
      return Promise.resolve(removed);
    }),

    smembers: jest.fn((key: string) => {
      stringStore.record("smembers", key);
      const set = setStore.get(key);
      return Promise.resolve(set ? Array.from(set) : []);
    }),

    sismember: jest.fn((key: string, member: string) => {
      stringStore.record("sismember", key, [member]);
      const set = setStore.get(key);
      return Promise.resolve(set?.has(member) ? 1 : 0);
    }),

    scard: jest.fn((key: string) => {
      stringStore.record("scard", key);
      const set = setStore.get(key);
      return Promise.resolve(set?.size ?? 0);
    }),

    // ========== Sorted Set 操作 ==========
    zadd: jest.fn((key: string, ...args: unknown[]) => {
      stringStore.record("zadd", key, args);
      if (!sortedSetStore.has(key)) {
        sortedSetStore.set(key, new Map());
      }
      const zset = sortedSetStore.get(key)!;
      let added = 0;
      for (let i = 0; i < args.length; i += 2) {
        const score = Number(args[i]);
        const member = String(args[i + 1]);
        if (!zset.has(member)) {
          added++;
        }
        zset.set(member, score);
      }
      stringStore.setValue(key, Object.fromEntries(zset));
      return Promise.resolve(added);
    }),

    zrange: jest.fn((key: string, start: number, stop: number) => {
      stringStore.record("zrange", key, [start, stop]);
      const zset = sortedSetStore.get(key);
      if (!zset) {
        return Promise.resolve([]);
      }
      const sorted = Array.from(zset.entries())
        .sort(([, a], [, b]) => a - b)
        .map(([member]) => member);
      return Promise.resolve(sorted.slice(start, stop === -1 ? undefined : stop + 1));
    }),

    zrangebyscore: jest.fn((key: string, min: number | string, max: number | string) => {
      stringStore.record("zrangebyscore", key, [min, max]);
      const zset = sortedSetStore.get(key);
      if (!zset) {
        return Promise.resolve([]);
      }
      const minScore = min === "-inf" ? -Infinity : Number(min);
      const maxScore = max === "+inf" ? Infinity : Number(max);
      const filtered = Array.from(zset.entries())
        .filter(([, score]) => score >= minScore && score <= maxScore)
        .sort(([, a], [, b]) => a - b)
        .map(([member]) => member);
      return Promise.resolve(filtered);
    }),

    zrem: jest.fn((key: string, ...members: string[]) => {
      stringStore.record("zrem", key, members);
      const zset = sortedSetStore.get(key);
      if (!zset) {
        return Promise.resolve(0);
      }
      let removed = 0;
      for (const member of members) {
        if (zset.delete(member)) {
          removed++;
        }
      }
      return Promise.resolve(removed);
    }),

    zcard: jest.fn((key: string) => {
      stringStore.record("zcard", key);
      const zset = sortedSetStore.get(key);
      return Promise.resolve(zset?.size ?? 0);
    }),

    // ========== List 操作 ==========
    lpush: jest.fn((key: string, ...values: string[]) => {
      stringStore.record("lpush", key, values);
      if (!listStore.has(key)) {
        listStore.set(key, []);
      }
      const list = listStore.get(key)!;
      list.unshift(...values);
      stringStore.setValue(key, list);
      return Promise.resolve(list.length);
    }),

    rpush: jest.fn((key: string, ...values: string[]) => {
      stringStore.record("rpush", key, values);
      if (!listStore.has(key)) {
        listStore.set(key, []);
      }
      const list = listStore.get(key)!;
      list.push(...values);
      stringStore.setValue(key, list);
      return Promise.resolve(list.length);
    }),

    lpop: jest.fn((key: string) => {
      stringStore.record("lpop", key);
      const list = listStore.get(key);
      if (!list || list.length === 0) {
        return Promise.resolve(null);
      }
      const value = list.shift()!;
      if (list.length === 0) {
        listStore.delete(key);
        stringStore.deleteKey(key);
      } else {
        stringStore.setValue(key, list);
      }
      return Promise.resolve(value);
    }),

    rpop: jest.fn((key: string) => {
      stringStore.record("rpop", key);
      const list = listStore.get(key);
      if (!list || list.length === 0) {
        return Promise.resolve(null);
      }
      const value = list.pop()!;
      if (list.length === 0) {
        listStore.delete(key);
        stringStore.deleteKey(key);
      } else {
        stringStore.setValue(key, list);
      }
      return Promise.resolve(value);
    }),

    lrange: jest.fn((key: string, start: number, stop: number) => {
      stringStore.record("lrange", key, [start, stop]);
      const list = listStore.get(key);
      if (!list) {
        return Promise.resolve([]);
      }
      return Promise.resolve(list.slice(start, stop === -1 ? undefined : stop + 1));
    }),

    llen: jest.fn((key: string) => {
      stringStore.record("llen", key);
      const list = listStore.get(key);
      return Promise.resolve(list?.length ?? 0);
    }),

    // ========== Pub/Sub 操作 ==========
    publish: jest.fn((channel: string, message: string) => {
      stringStore.record("publish", channel, [message]);
      return Promise.resolve(0); // 模拟没有订阅者
    }),

    subscribe: jest.fn((...channels: string[]) => {
      for (const channel of channels) {
        stringStore.record("subscribe", channel);
      }
      return Promise.resolve(channels.length);
    }),

    unsubscribe: jest.fn((...channels: string[]) => {
      for (const channel of channels) {
        stringStore.record("unsubscribe", channel);
      }
      return Promise.resolve(channels.length);
    }),

    psubscribe: jest.fn((...patterns: string[]) => {
      for (const pattern of patterns) {
        stringStore.record("psubscribe", pattern);
      }
      return Promise.resolve(patterns.length);
    }),

    // ========== 通用操作 ==========
    ping: jest.fn(() => Promise.resolve("PONG")),

    echo: jest.fn((message: string) => Promise.resolve(message)),

    select: jest.fn((_db: number) => Promise.resolve("OK")),

    flushdb: jest.fn(() => {
      stringStore.getAllKeys().forEach((key) => stringStore.deleteKey(key));
      hashStore.clear();
      setStore.clear();
      sortedSetStore.clear();
      listStore.clear();
      return Promise.resolve("OK");
    }),

    flushall: jest.fn(() => {
      stringStore.getAllKeys().forEach((key) => stringStore.deleteKey(key));
      hashStore.clear();
      setStore.clear();
      sortedSetStore.clear();
      listStore.clear();
      return Promise.resolve("OK");
    }),

    dbsize: jest.fn(() => {
      return Promise.resolve(stringStore.getAllKeys().length);
    }),

    keys: jest.fn((pattern: string) => {
      return Promise.resolve(stringStore.getKeysByPattern(pattern));
    }),

    scan: jest.fn((cursor: number, ..._args: unknown[]) => {
      return Promise.resolve(["0", stringStore.getAllKeys()]);
    }),

    type: jest.fn((key: string) => {
      if (hashStore.has(key)) return Promise.resolve("hash");
      if (setStore.has(key)) return Promise.resolve("set");
      if (sortedSetStore.has(key)) return Promise.resolve("zset");
      if (listStore.has(key)) return Promise.resolve("list");
      if (stringStore.hasKey(key)) return Promise.resolve("string");
      return Promise.resolve("none");
    }),

    // ========== 脚本执行 ==========
    eval: jest.fn((_script: string, _numKeys: number, ..._args: unknown[]) => {
      stringStore.record("eval", "__eval__", [_script]);
      return Promise.resolve(0);
    }),

    evalsha: jest.fn((_sha: string, _numKeys: number, ..._args: unknown[]) => {
      stringStore.record("evalsha", "__evalsha__", [_sha]);
      return Promise.resolve(0);
    }),

    // ========== 连接管理 ==========
    duplicate: jest.fn(() => createMockRedisClient(internalTracker as unknown as RedisKeyTracker)),

    quit: jest.fn(() => Promise.resolve("OK")),

    disconnect: jest.fn(() => {
      // no-op
    }),

    // ========== 事件监听 ==========
    on: jest.fn(() => createMockRedisClient(internalTracker as unknown as RedisKeyTracker)),

    once: jest.fn(() => createMockRedisClient(internalTracker as unknown as RedisKeyTracker)),

    off: jest.fn(() => createMockRedisClient(internalTracker as unknown as RedisKeyTracker)),

    // ========== 状态属性 ==========
    status: "ready",
    connected: true,
    ready: true,

    // ========== Pipeline / Multi ==========
    pipeline: jest.fn(() => {
      const commands: Array<{ command: string; args: unknown[] }> = [];
      const mockPipeline: Record<string, unknown> = {
        get: jest.fn((...args: unknown[]) => {
          commands.push({ command: "get", args });
          return mockPipeline;
        }),
        set: jest.fn((...args: unknown[]) => {
          commands.push({ command: "set", args });
          return mockPipeline;
        }),
        del: jest.fn((...args: unknown[]) => {
          commands.push({ command: "del", args });
          return mockPipeline;
        }),
        hset: jest.fn((...args: unknown[]) => {
          commands.push({ command: "hset", args });
          return mockPipeline;
        }),
        hget: jest.fn((...args: unknown[]) => {
          commands.push({ command: "hget", args });
          return mockPipeline;
        }),
        exec: jest.fn(() => {
          return Promise.resolve(
            commands.map((cmd) => [null, `mock-result-${cmd.command}`]),
          );
        }),
      };
      return mockPipeline;
    }),

    multi: jest.fn(() => {
      const commands: Array<{ command: string; args: unknown[] }> = [];
      const mockMulti: Record<string, unknown> = {
        get: jest.fn((...args: unknown[]) => {
          commands.push({ command: "get", args });
          return mockMulti;
        }),
        set: jest.fn((...args: unknown[]) => {
          commands.push({ command: "set", args });
          return mockMulti;
        }),
        del: jest.fn((...args: unknown[]) => {
          commands.push({ command: "del", args });
          return mockMulti;
        }),
        exec: jest.fn(() => {
          return Promise.resolve(
            commands.map((cmd) => [null, `mock-result-${cmd.command}`]),
          );
        }),
      };
      return mockMulti;
    }),
  };
}

// ============================================================================
// Mock RedisService
// ============================================================================

/**
 * 创建 RedisService 的完整模拟
 *
 * 包含 RedisService 所有方法，每个方法都是 jest.fn()，
 * 可以在测试中灵活配置返回值和行为。
 *
 * @param tracker - 可选的键追踪器
 * @returns 模拟的 RedisService
 */
export function createMockRedisService(
  tracker?: RedisKeyTracker,
): Partial<RedisService> {
  const mockClient = createMockRedisClient(tracker);

  return {
    getClient: jest.fn().mockReturnValue(mockClient),
    get: jest.fn().mockImplementation(async (key: string) => {
      return (mockClient.get as jest.Mock)(key);
    }),
    set: jest.fn().mockImplementation(async (key: string, value: string) => {
      return (mockClient.set as jest.Mock)(key, value);
    }),
    setWithTtl: jest
      .fn()
      .mockImplementation(async (key: string, value: string, ttlMs: number) => {
        return (mockClient.set as jest.Mock)(key, value, "PX", ttlMs);
      }),
    setex: jest
      .fn()
      .mockImplementation(async (key: string, seconds: number, value: string) => {
        return (mockClient.setex as jest.Mock)(key, seconds, value);
      }),
    del: jest.fn().mockImplementation(async (key: string) => {
      return (mockClient.del as jest.Mock)(key);
    }),
    expire: jest
      .fn()
      .mockImplementation(async (key: string, seconds: number) => {
        return (mockClient.expire as jest.Mock)(key, seconds);
      }),
    ttl: jest.fn().mockImplementation(async (key: string) => {
      return (mockClient.ttl as jest.Mock)(key);
    }),
    exists: jest.fn().mockImplementation(async (key: string) => {
      const result = await (mockClient.exists as jest.Mock)(key);
      return result === 1;
    }),
    incr: jest.fn().mockImplementation(async (key: string) => {
      return (mockClient.incr as jest.Mock)(key);
    }),
    decr: jest.fn().mockImplementation(async (key: string) => {
      return (mockClient.decr as jest.Mock)(key);
    }),
    hset: jest
      .fn()
      .mockImplementation(async (key: string, field: string, value: string) => {
        return (mockClient.hset as jest.Mock)(key, field, value);
      }),
    hget: jest
      .fn()
      .mockImplementation(async (key: string, field: string) => {
        return (mockClient.hget as jest.Mock)(key, field);
      }),
    hgetall: jest.fn().mockImplementation(async (key: string) => {
      return (mockClient.hgetall as jest.Mock)(key);
    }),
    hdel: jest
      .fn()
      .mockImplementation(async (key: string, field: string) => {
        return (mockClient.hdel as jest.Mock)(key, field);
      }),
    lpush: jest
      .fn()
      .mockImplementation(async (key: string, value: string) => {
        return (mockClient.lpush as jest.Mock)(key, value);
      }),
    rpush: jest
      .fn()
      .mockImplementation(async (key: string, value: string) => {
        return (mockClient.rpush as jest.Mock)(key, value);
      }),
    lpop: jest.fn().mockImplementation(async (key: string) => {
      return (mockClient.lpop as jest.Mock)(key);
    }),
    rpop: jest.fn().mockImplementation(async (key: string) => {
      return (mockClient.rpop as jest.Mock)(key);
    }),
    lrange: jest
      .fn()
      .mockImplementation(async (key: string, start: number, stop: number) => {
        return (mockClient.lrange as jest.Mock)(key, start, stop);
      }),
    publish: jest
      .fn()
      .mockImplementation(async (channel: string, message: string) => {
        return (mockClient.publish as jest.Mock)(channel, message);
      }),
    subscribe: jest
      .fn()
      .mockImplementation(
        async (channel: string, _callback: (message: string) => void) => {
          return (mockClient.subscribe as jest.Mock)(channel);
        },
      ),
    acquireLock: jest.fn().mockResolvedValue("mock-lock-token"),
    releaseLock: jest.fn().mockResolvedValue(true),
  };
}

// ============================================================================
// 测试键清理
// ============================================================================

/**
 * 清理匹配模式的测试键
 *
 * 仅在连接到真实 Redis 的集成测试中使用。
 * 单元测试使用 mock，无需清理。
 *
 * @param redisClient - 真实的 ioredis 客户端
 * @param pattern - 键匹配模式，默认为 aneed:* 前缀
 */
export async function flushTestKeys(
  redisClient: { keys: (pattern: string) => Promise<string[]>; del: (...keys: string[]) => Promise<number> },
  pattern: string = `${REDIS_KEY_PREFIX}${REDIS_KEY_SEPARATOR}*`,
): Promise<number> {
  const keys = await redisClient.keys(pattern);
  if (keys.length === 0) {
    return 0;
  }
  return redisClient.del(...keys);
}

// ============================================================================
// 便捷导出
// ============================================================================

/**
 * 创建 Redis 键追踪器
 *
 * @returns 新的 RedisKeyTracker 实例
 */
export function createRedisKeyTracker(): RedisKeyTracker {
  return new RedisKeyTracker();
}

/**
 * 获取模拟 Redis 客户端
 *
 * createMockRedisClient 的别名，提供更语义化的 API。
 *
 * @param tracker - 可选的键追踪器
 * @returns 模拟的 Redis 客户端
 */
export function getMockRedisClient(
  tracker?: RedisKeyTracker,
): Record<string, unknown> {
  return createMockRedisClient(tracker);
}
