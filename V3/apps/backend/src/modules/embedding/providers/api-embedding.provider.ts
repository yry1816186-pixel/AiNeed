import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { IEmbeddingProvider } from './embedding-provider.interface';

const EMBEDDING_DIMENSIONS = 1024;
const BATCH_SIZE = 32;
const CACHE_TTL_SECONDS = 86400;
const CACHE_KEY_PREFIX = 'embed:';

@Injectable()
export class ApiEmbeddingProvider implements IEmbeddingProvider {
  private readonly logger = new Logger(ApiEmbeddingProvider.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly modelName: string;
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl =
      this.configService.get<string>('EMBEDDING_SERVICE_URL') ??
      'http://localhost:8003';
    this.apiKey =
      this.configService.get<string>('ZHIPU_API_KEY') ?? '';
    this.modelName =
      this.configService.get<string>('EMBEDDING_MODEL') ?? 'bge-m3';
  }

  private async getRedis(): Promise<Redis | null> {
    if (this.redis) {
      return this.redis;
    }
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (!redisUrl) {
        return null;
      }
      this.redis = new Redis(redisUrl);
      return this.redis;
    } catch {
      this.logger.warn('Redis connection failed, caching disabled');
      return null;
    }
  }

  async embed(text: string): Promise<number[]> {
    const cached = await this.getFromCache(text);
    if (cached) {
      return cached;
    }

    const vector = await this.callApi([text]);
    const result = vector[0];

    await this.setToCache(text, result);
    return result;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = new Array(texts.length);
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    for (let i = 0; i < texts.length; i++) {
      const cached = await this.getFromCache(texts[i]);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    if (uncachedTexts.length === 0) {
      return results;
    }

    const batchResults: number[][] = [];
    for (let i = 0; i < uncachedTexts.length; i += BATCH_SIZE) {
      const chunk = uncachedTexts.slice(i, i + BATCH_SIZE);
      const chunkResults = await this.callApi(chunk);
      batchResults.push(...chunkResults);
    }

    for (let i = 0; i < uncachedIndices.length; i++) {
      const idx = uncachedIndices[i];
      results[idx] = batchResults[i];
      await this.setToCache(uncachedTexts[i], batchResults[i]);
    }

    return results;
  }

  getDimensions(): number {
    return EMBEDDING_DIMENSIONS;
  }

  getModelName(): string {
    return this.modelName;
  }

  private async callApi(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(`${this.apiUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          input: texts,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Embedding API error: ${response.status} - ${body}`,
        );
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };

      if (!data.data || data.data.length !== texts.length) {
        throw new Error(
          `Embedding API returned unexpected response length: expected ${texts.length}, got ${data.data?.length ?? 0}`,
        );
      }

      for (const item of data.data) {
        this.validateVector(item.embedding);
      }

      return data.data.map((item) => item.embedding);
    } catch (error) {
      this.logger.error(
        `Embedding API call failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  private validateVector(vector: number[]): void {
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${vector.length}`,
      );
    }
  }

  private hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  private async getFromCache(text: string): Promise<number[] | null> {
    const redis = await this.getRedis();
    if (!redis) {
      return null;
    }
    try {
      const key = `${CACHE_KEY_PREFIX}${this.hashText(text)}`;
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as number[];
      }
    } catch {
      this.logger.warn('Redis cache read failed');
    }
    return null;
  }

  private async setToCache(text: string, vector: number[]): Promise<void> {
    const redis = await this.getRedis();
    if (!redis) {
      return;
    }
    try {
      const key = `${CACHE_KEY_PREFIX}${this.hashText(text)}`;
      await redis.set(key, JSON.stringify(vector), 'EX', CACHE_TTL_SECONDS);
    } catch {
      this.logger.warn('Redis cache write failed');
    }
  }
}
