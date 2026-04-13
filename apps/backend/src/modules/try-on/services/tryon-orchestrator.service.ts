import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import { REDIS_CLIENT } from "../../../common/redis/redis.service";

import {
  TryOnProvider,
  TryOnRequest,
  TryOnResponse,
  generateStableCacheKey,
} from "./ai-tryon-provider.interface";
import { DoubaoSeedreamProvider } from "./doubao-seedream.provider";
import { GlmTryOnProvider } from "./glm-tryon.provider";
import { LocalPreviewTryOnProvider } from "./local-preview.provider";

@Injectable()
export class TryOnOrchestratorService {
  private readonly logger = new Logger(TryOnOrchestratorService.name);
  private readonly providers: TryOnProvider[];
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL: number;

  constructor(
    private configService: ConfigService,
    private doubaoSeedreamProvider: DoubaoSeedreamProvider,
    private glmTryOnProvider: GlmTryOnProvider,
    private localPreviewProvider: LocalPreviewTryOnProvider,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    this.providers = [
      this.doubaoSeedreamProvider,
      this.glmTryOnProvider,
      this.localPreviewProvider,
    ].sort((a, b) => a.priority - b.priority);

    this.cacheEnabled = this.configService.get<boolean>(
      "TRYON_CACHE_ENABLED",
      true,
    );
    this.cacheTTL = this.configService.get<number>("TRYON_CACHE_TTL", 86400);
  }

  async executeTryOn(
    request: TryOnRequest,
    cacheKeyOverride?: string,
  ): Promise<TryOnResponse> {
    if (this.cacheEnabled && cacheKeyOverride) {
      const cached = await this.getFromCache(cacheKeyOverride);
      if (cached) {
        this.logger.debug(`Cache hit for try-on: ${cacheKeyOverride}`);
        return cached;
      }
    }

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

        if (this.cacheEnabled && result.resultImageUrl && cacheKeyOverride) {
          await this.saveToCache(cacheKeyOverride, result);
        }

        return result;
      } catch (error) {
        const providerError =
          error instanceof Error ? error : new Error("Unknown provider error");
        this.logger.warn(
          `Provider ${provider.name} failed: ${providerError.message}`,
        );
        lastError = providerError;
      }
    }

    throw lastError || new Error("No try-on providers available");
  }

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

  async clearCache(
    photoId?: string,
    itemId?: string,
  ): Promise<void> {
    try {
      if (photoId && itemId) {
        const cacheKey = generateStableCacheKey(photoId, itemId);
        await this.redis.del(cacheKey);
      } else {
        let cursor = "0";
        let deletedCount = 0;

        do {
          const result = await this.redis.scan(
            cursor,
            "MATCH",
            "tryon:stable:*",
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

  getAvailableProviders(): string[] {
    return this.providers.map((p) => p.name);
  }
}
