import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import { REDIS_CLIENT } from "../../../common/redis/redis.service";

import {
  TryOnProvider,
  TryOnRequest,
  TryOnResponse,
  generateTryOnCacheKey,
} from "./ai-tryon-provider.interface";
import { CatVTONProvider } from "./catvton.provider";
import { IDMVTONProvider } from "./idm-vton.provider";
import { KolorsProvider } from "./kolors.provider";
import { LocalPreviewTryOnProvider } from "./local-preview.provider";

@Injectable()
export class TryOnOrchestratorService {
  private readonly logger = new Logger(TryOnOrchestratorService.name);
  private readonly providers: TryOnProvider[];
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL: number;

  constructor(
    private configService: ConfigService,
    private catvtonProvider: CatVTONProvider,
    private kolorsProvider: KolorsProvider,
    private idmVtonProvider: IDMVTONProvider,
    private localPreviewProvider: LocalPreviewTryOnProvider,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    this.providers = [
      this.catvtonProvider,
      this.idmVtonProvider,
      this.kolorsProvider,
      this.localPreviewProvider,
    ].sort((a, b) => a.priority - b.priority);

    this.cacheEnabled = this.configService.get<boolean>(
      "TRYON_CACHE_ENABLED",
      true,
    );
    this.cacheTTL = this.configService.get<number>("TRYON_CACHE_TTL", 86400);
  }

  /**
   * 执行虚拟试衣，支持自动 fallback 和缓存
   */
  async executeTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    const cacheKey = generateTryOnCacheKey(
      request.personImageUrl,
      request.garmentImageUrl,
      request.category,
    );

    // 尝试从缓存获取
    if (this.cacheEnabled) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for try-on: ${cacheKey}`);
        return cached;
      }
    }

    // 按优先级尝试各个提供商
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          this.logger.debug(
            `Provider ${provider.name} not available, skipping`,
          );
          continue;
        }

        this.logger.log(`Executing try-on with provider: ${provider.name}`);
        const result = await provider.virtualTryOn(request);

        // 缓存成功结果
        if (this.cacheEnabled && result.resultImageUrl) {
          await this.saveToCache(cacheKey, result);
        }

        return result;
      } catch (error) {
        const providerError =
          error instanceof Error ? error : new Error("Unknown provider error");
        this.logger.warn(
          `Provider ${provider.name} failed: ${providerError.message}`,
        );
        lastError = providerError;
        // 继续尝试下一个提供商
      }
    }

    // 所有提供商都失败
    throw lastError || new Error("No try-on providers available");
  }

  /**
   * 从缓存获取试衣结果
   */
  private async getFromCache(cacheKey: string): Promise<TryOnResponse | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as TryOnResponse;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Failed to get from cache: ${message}`);
    }
    return null;
  }

  /**
   * 保存试衣结果到缓存
   */
  private async saveToCache(
    cacheKey: string,
    result: TryOnResponse,
  ): Promise<void> {
    try {
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(result));
      this.logger.debug(`Cached try-on result: ${cacheKey}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Failed to save to cache: ${message}`);
    }
  }

  /**
   * 清除试衣缓存
   */
  async clearCache(
    personImageUrl?: string,
    garmentImageUrl?: string,
  ): Promise<void> {
    try {
      if (personImageUrl && garmentImageUrl) {
        const cacheKey = generateTryOnCacheKey(personImageUrl, garmentImageUrl);
        await this.redis.del(cacheKey);
      } else {
        // 使用 scan 替代 keys 避免阻塞 Redis
        let cursor = "0";
        let deletedCount = 0;

        do {
          const result = await this.redis.scan(
            cursor,
            "MATCH",
            "tryon:*",
            "COUNT",
            100,
          );
          cursor = result[0];
          const keys = result[1];

          if (keys.length > 0) {
            await this.redis.del(...keys);
            deletedCount += keys.length;
          }
        } while (cursor !== "0");

        this.logger.log(`Cleared ${deletedCount} try-on cache entries`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Failed to clear cache: ${message}`);
    }
  }

  /**
   * 获取可用的提供商列表
   */
  getAvailableProviders(): string[] {
    return this.providers.map((p) => p.name);
  }
}
