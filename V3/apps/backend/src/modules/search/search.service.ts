import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ISearchProvider, SEARCH_PROVIDER, IndexableDocument } from './providers/search-provider.interface';
import { DatabaseProvider } from './providers/database.provider.js';
import {
  SearchResult,
  SearchFilters,
  SearchPagination,
  SuggestionItem,
  HotKeywordItem,
  SearchHistoryItem,
} from './dto/search-response.dto';
import { SearchType } from './dto/search-query.dto';

const HOT_KEYWORDS_KEY = 'search:hot_keywords';
const MAX_HISTORY_PER_USER = 50;

interface RedisClient {
  zrevrange(key: string, start: number, stop: number, ...args: string[]): Promise<string[]>;
  zincrby(key: string, increment: number, member: string): Promise<string>;
  expire(key: string, seconds: number): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  lpush(key: string, ...elements: string[]): Promise<number>;
  lrem(key: string, count: number, element: string): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<string>;
  pipeline(): {
    lrem(key: string, count: number, element: string): PipelineCommand;
    lpush(key: string, ...elements: string[]): PipelineCommand;
    ltrim(key: string, start: number, stop: number): PipelineCommand;
    expire(key: string, seconds: number): PipelineCommand;
    exec(): Promise<Array<[Error | null, unknown]>>;
  };
}

interface PipelineCommand {
  lpush(key: string, ...elements: string[]): PipelineCommand;
  ltrim(key: string, start: number, stop: number): PipelineCommand;
  expire(key: string, seconds: number): PipelineCommand;
  exec(): Promise<Array<[Error | null, unknown]>>;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    private readonly databaseProvider: DatabaseProvider,
    private readonly prisma: PrismaService,
  ) {}

  async search(
    query: string,
    type: SearchType,
    filters: SearchFilters,
    pagination: SearchPagination,
    userId?: string,
  ): Promise<SearchResult> {
    const result = await this.executeWithFallback((provider) =>
      provider.search(query, type, filters, pagination),
    );

    if (userId) {
      await this.recordSearchHistory(userId, query).catch((err: unknown) => {
        this.logger.warn(`Failed to record search history: ${String(err)}`);
      });
    }

    await this.incrementHotKeyword(query).catch((err: unknown) => {
      this.logger.warn(`Failed to increment hot keyword: ${String(err)}`);
    });

    return result;
  }

  async suggest(prefix: string, limit: number): Promise<SuggestionItem[]> {
    return this.executeWithFallback((provider) => provider.suggest(prefix, limit));
  }

  async getHotKeywords(limit: number = 10): Promise<HotKeywordItem[]> {
    const redis = this.getRedisClient();
    if (redis) {
      try {
        const results = await redis.zrevrange(HOT_KEYWORDS_KEY, 0, limit - 1, 'WITHSCORES');
        const keywords: HotKeywordItem[] = [];
        for (let i = 0; i < results.length; i += 2) {
          keywords.push({
            text: results[i],
            heat: parseInt(results[i + 1], 10) || 0,
          });
        }
        return keywords;
      } catch (error) {
        this.logger.warn(`Redis hot keywords failed: ${String(error)}`);
      }
    }

    return this.getFallbackHotKeywords(limit);
  }

  async getSearchHistory(userId: string): Promise<SearchHistoryItem[]> {
    const redis = this.getRedisClient();
    if (redis) {
      try {
        const key = `search:history:${userId}`;
        const items = await redis.lrange(key, 0, MAX_HISTORY_PER_USER - 1);
        return items.map((item: string, index: number) => {
          const parsed = JSON.parse(item) as { keyword: string; searchedAt: string };
          return {
            id: `${userId}-${index}`,
            keyword: parsed.keyword,
            searchedAt: new Date(parsed.searchedAt),
          };
        });
      } catch (error) {
        this.logger.warn(`Get search history failed: ${String(error)}`);
      }
    }

    return [];
  }

  async deleteSearchHistory(userId: string, historyId: string): Promise<boolean> {
    const redis = this.getRedisClient();
    if (redis) {
      try {
        const key = `search:history:${userId}`;
        const index = parseInt(historyId.split('-').pop() ?? '', 10);
        if (Number.isNaN(index)) return false;

        const items = await redis.lrange(key, index, index);
        if (items.length === 0) return false;

        await redis.lrem(key, 1, items[0]);
        return true;
      } catch (error) {
        this.logger.warn(`Delete search history failed: ${String(error)}`);
      }
    }

    return false;
  }

  async indexDocument(document: IndexableDocument): Promise<void> {
    await this.searchProvider.index(document);
  }

  async removeFromIndex(id: string, type: 'clothing' | 'posts'): Promise<void> {
    await this.searchProvider.removeFromIndex(id, type);
  }

  private async executeWithFallback<T>(
    operation: (provider: ISearchProvider) => Promise<T>,
  ): Promise<T> {
    const isEsAvailable = await this.searchProvider.isAvailable();
    if (isEsAvailable) {
      try {
        return await operation(this.searchProvider);
      } catch (error) {
        this.logger.warn(`Primary search provider failed, falling back: ${String(error)}`);
      }
    }

    return operation(this.databaseProvider);
  }

  private async recordSearchHistory(userId: string, keyword: string): Promise<void> {
    const redis = this.getRedisClient();
    if (!redis) return;

    const key = `search:history:${userId}`;
    const entry = JSON.stringify({ keyword, searchedAt: new Date().toISOString() });

    const pipeline = redis.pipeline();
    pipeline.lrem(key, 0, entry);
    pipeline.lpush(key, entry);
    pipeline.ltrim(key, 0, MAX_HISTORY_PER_USER - 1);
    pipeline.expire(key, 30 * 24 * 60 * 60);
    await pipeline.exec();
  }

  private async incrementHotKeyword(keyword: string): Promise<void> {
    const redis = this.getRedisClient();
    if (!redis) return;

    await redis.zincrby(HOT_KEYWORDS_KEY, 1, keyword);
    await redis.expire(HOT_KEYWORDS_KEY, 7 * 24 * 60 * 60);
  }

  private getRedisClient(): RedisClient | null {
    const globalWithRedis = globalThis as Record<string, unknown>;
    const client = globalWithRedis.__redisClient;
    if (client && typeof client === 'object') {
      return client as RedisClient;
    }
    return null;
  }

  private async getFallbackHotKeywords(limit: number): Promise<HotKeywordItem[]> {
    try {
      const topClothing = await this.prisma.clothingItem.findMany({
        where: { isActive: true },
        select: { styleTags: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      const tagCount = new Map<string, number>();
      for (const item of topClothing) {
        for (const tag of item.styleTags) {
          tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
        }
      }

      return Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([text, heat]) => ({ text, heat }));
    } catch (error) {
      this.logger.warn(`Fallback hot keywords failed: ${String(error)}`);
      return [];
    }
  }
}
