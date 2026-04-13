import { Injectable, Inject } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

export const REDIS_KEY_PREFIX = "xuno";
export const REDIS_KEY_SEPARATOR = ":";

export class RedisKeyBuilder {
  private static buildKey(...parts: string[]): string {
    return [REDIS_KEY_PREFIX, ...parts].join(REDIS_KEY_SEPARATOR);
  }

  static user(userId: string): string {
    return this.buildKey("user", userId);
  }

  static userSession(userId: string): string {
    return this.buildKey("session", userId);
  }

  static userToken(userId: string): string {
    return this.buildKey("token", userId);
  }

  static cache(module: string, identifier: string): string {
    return this.buildKey("cache", module, identifier);
  }

  static recommendation(userId: string, type: string): string {
    return this.buildKey("recommendation", userId, type);
  }

  static rateLimit(identifier: string, action: string): string {
    return this.buildKey("ratelimit", identifier, action);
  }

  static lock(resource: string, id: string): string {
    return this.buildKey("lock", resource, id);
  }

  static queue(queueName: string): string {
    return this.buildKey("queue", queueName);
  }

  static temp(identifier: string): string {
    return this.buildKey("temp", identifier);
  }

  static analytics(metric: string, date?: string): string {
    return date 
      ? this.buildKey("analytics", metric, date)
      : this.buildKey("analytics", metric);
  }
}

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  getClient(): Redis {
    return this.redis;
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value);
  }

  async setWithTtl(key: string, value: string, ttlMs: number): Promise<void> {
    await this.redis.set(key, value, "PX", ttlMs);
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.redis.setex(key, seconds, value);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.redis.decr(key);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.redis.hdel(key, field);
  }

  async lpush(key: string, value: string): Promise<number> {
    return this.redis.lpush(key, value);
  }

  async rpush(key: string, value: string): Promise<number> {
    return this.redis.rpush(key, value);
  }

  async lpop(key: string): Promise<string | null> {
    return this.redis.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return this.redis.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redis.lrange(key, start, stop);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message);
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on("message", (_channel, message) => {
      callback(message);
    });
  }

  async acquireLock(
    key: string,
    ttlMs: number,
    retries: number = 3,
  ): Promise<string | null> {
    const token = `${Date.now()}-${Math.random()}`;
    for (let i = 0; i < retries; i++) {
      const result = await this.redis.set(key, token, "PX", ttlMs, "NX");
      if (result === "OK") {
        return token;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(script, 1, key, token);
    return result === 1;
  }
}
