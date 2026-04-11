import { Global, Module, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import { RedisService, REDIS_CLIENT } from "./redis.service";

const logger = new Logger("RedisModule");

export interface RedisPoolOptions {
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  maxRedirections: number;
  retryStrategy: (times: number) => number | null;
  reconnectOnError: (err: Error) => boolean;
  connectionPoolSize: number;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

const DEFAULT_POOL_OPTIONS: Partial<RedisPoolOptions> = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  maxRedirections: 16,
  keepAlive: 10000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  connectionPoolSize: 10,
};

function createRetryStrategy(times: number): number | null {
  if (times > 10) {
    logger.error(`Redis connection failed after ${times} retries`);
    return null;
  }
  const delay = Math.min(times * 100, 3000);
  logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
  return delay;
}

function createReconnectOnError(err: Error): boolean {
  const targetErrors = ["READONLY", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"];
  const shouldReconnect = targetErrors.some((e) => err.message.includes(e));
  if (shouldReconnect) {
    logger.warn(`Redis reconnecting due to error: ${err.message}`);
  }
  return shouldReconnect;
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>("REDIS_URL");
        
        const poolOptions: RedisPoolOptions = {
          ...DEFAULT_POOL_OPTIONS,
          enableReadyCheck: DEFAULT_POOL_OPTIONS.enableReadyCheck ?? false,
          maxRedirections: DEFAULT_POOL_OPTIONS.maxRedirections ?? 16,
          maxRetriesPerRequest: configService.get<number>("REDIS_MAX_RETRIES", 3),
          connectionPoolSize: configService.get<number>("REDIS_POOL_SIZE", 10),
          keepAlive: configService.get<number>("REDIS_KEEP_ALIVE", 10000),
          connectTimeout: configService.get<number>("REDIS_CONNECT_TIMEOUT", 10000),
          commandTimeout: configService.get<number>("REDIS_COMMAND_TIMEOUT", 5000),
          retryStrategy: createRetryStrategy,
          reconnectOnError: createReconnectOnError,
        };

        const redis = redisUrl
          ? new Redis(redisUrl, poolOptions)
          : new Redis({
              host: configService.get<string>("REDIS_HOST", "localhost"),
              port: configService.get<number>("REDIS_PORT", 6379),
              password: configService.get<string>("REDIS_PASSWORD"),
              db: configService.get<number>("REDIS_DB", 0),
              ...poolOptions,
            });

        redis.on("ready", () => {
          logger.log("Redis client ready");
        });

        redis.on("error", (error) => {
          logger.error(`Redis client error: ${error.message}`);
        });

        redis.on("close", () => {
          logger.warn("Redis client connection closed");
        });

        redis.on("reconnecting", () => {
          logger.log("Redis client reconnecting");
        });

        redis.on("connect", () => {
          logger.log("Redis client connected");
        });

        return redis;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
