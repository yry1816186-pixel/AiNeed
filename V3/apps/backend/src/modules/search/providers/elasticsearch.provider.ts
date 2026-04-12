import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import {
  ISearchProvider,
  IndexableDocument,
  SEARCH_PROVIDER,
} from './search-provider.interface';
import {
  SearchResult,
  SearchFilters,
  SearchPagination,
  SuggestionItem,
  ClothingSearchResult,
  PostSearchResult,
} from '../dto/search-response.dto';
import { SearchType } from '../dto/search-query.dto';

const CLOTHING_INDEX = 'aineed_clothing';
const POSTS_INDEX = 'aineed_posts';

interface EsClothingSource {
  id: string;
  name: string;
  description?: string;
  price?: number;
  original_price?: number;
  currency?: string;
  image_urls?: string[];
  colors?: string[];
  style_tags?: string[];
  brand_name?: string;
  purchase_url?: string;
}

interface EsPostSource {
  id: string;
  title?: string;
  content: string;
  image_urls?: string[];
  tags?: string[];
  likes_count?: number;
  comments_count?: number;
  user_id?: string;
  user_nickname?: string;
  user_avatar_url?: string;
}

type EsSearchResponse = {
  hits: {
    total?: number | { value: number };
    hits: Array<{
      _id: string;
      _score?: number;
      _source?: EsClothingSource | EsPostSource;
    }>;
  };
};

@Injectable()
export class ElasticsearchProvider implements ISearchProvider, OnModuleInit {
  private readonly logger = new Logger(ElasticsearchProvider.name);
  private client: Client;
  private available = false;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      node: this.configService.get<string>('ELASTICSEARCH_URL', 'http://localhost:9200'),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      await this.client.ping();
      this.available = true;
      this.logger.log('Elasticsearch connection established');
      await this.ensureIndices();
    } catch {
      this.available = false;
      this.logger.warn('Elasticsearch unavailable, will use database fallback');
    }
  }

  private async ensureIndices(): Promise<void> {
    try {
      const clothingExists = await this.client.indices.exists({ index: CLOTHING_INDEX });
      if (!clothingExists) {
        await this.client.indices.create(
          {
            index: CLOTHING_INDEX,
            settings: {
              analysis: {
                analyzer: {
                  ik_smart_analyzer: {
                    type: 'custom',
                    tokenizer: 'ik_max_word',
                  },
                },
              },
            },
            mappings: {
              properties: {
                name: { type: 'text', analyzer: 'ik_max_word', search_analyzer: 'ik_smart' },
                description: { type: 'text', analyzer: 'ik_max_word', search_analyzer: 'ik_smart' },
                style_tags: { type: 'text', analyzer: 'ik_max_word' },
                colors: { type: 'keyword' },
                price: { type: 'float' },
                brand_name: { type: 'keyword' },
              },
            },
          },
          { ignore: [400] },
        );
        this.logger.log(`Created index: ${CLOTHING_INDEX}`);
      }

      const postsExists = await this.client.indices.exists({ index: POSTS_INDEX });
      if (!postsExists) {
        await this.client.indices.create(
          {
            index: POSTS_INDEX,
            settings: {
              analysis: {
                analyzer: {
                  ik_smart_analyzer: {
                    type: 'custom',
                    tokenizer: 'ik_max_word',
                  },
                },
              },
            },
            mappings: {
              properties: {
                title: { type: 'text', analyzer: 'ik_max_word', search_analyzer: 'ik_smart' },
                content: { type: 'text', analyzer: 'ik_max_word', search_analyzer: 'ik_smart' },
                tags: { type: 'text', analyzer: 'ik_max_word' },
              },
            },
          },
          { ignore: [400] },
        );
        this.logger.log(`Created index: ${POSTS_INDEX}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to ensure indices: ${String(error)}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.available) {
      try {
        await this.client.ping();
        this.available = true;
      } catch {
        this.available = false;
      }
    }
    return this.available;
  }

  async search(
    query: string,
    type: SearchType,
    filters: SearchFilters,
    pagination: SearchPagination,
  ): Promise<SearchResult> {
    const result: SearchResult = { clothing: [], posts: [], users: [], total: 0 };

    if (type === SearchType.ALL || type === SearchType.CLOTHING) {
      const clothingResult = await this.searchClothing(query, filters, pagination);
      result.clothing = clothingResult.items;
      result.total += clothingResult.total;
    }

    if (type === SearchType.ALL || type === SearchType.POSTS) {
      const postsResult = await this.searchPosts(query, pagination);
      result.posts = postsResult.items;
      result.total += postsResult.total;
    }

    return result;
  }

  private buildClothingFilters(filters: SearchFilters): Record<string, unknown>[] {
    const must: Record<string, unknown>[] = [];

    if (filters.colors.length > 0) {
      must.push({ terms: { colors: filters.colors } });
    }
    if (filters.styles.length > 0) {
      must.push({ terms: { style_tags: filters.styles } });
    }
    if (filters.brands.length > 0) {
      must.push({ terms: { brand_name: filters.brands } });
    }
    if (filters.priceRange) {
      const range = this.parsePriceRange(filters.priceRange);
      if (range) {
        must.push({ range: { price: range } });
      }
    }

    return must;
  }

  private parsePriceRange(priceRange: string): Record<string, number> | null {
    const parts = priceRange.split('-');
    if (parts.length !== 2) return null;

    const min = parseFloat(parts[0]);
    const max = parseFloat(parts[1]);

    if (Number.isNaN(min) || Number.isNaN(max)) return null;

    return { gte: min, lte: max };
  }

  private extractTotal(hitsTotal: unknown): number {
    if (typeof hitsTotal === 'number') return hitsTotal;
    if (hitsTotal && typeof hitsTotal === 'object' && 'value' in (hitsTotal as Record<string, unknown>)) {
      return (hitsTotal as { value: number }).value;
    }
    return 0;
  }

  private async searchClothing(
    query: string,
    filters: SearchFilters,
    pagination: SearchPagination,
  ): Promise<{ items: ClothingSearchResult[]; total: number }> {
    try {
      const filterClauses = this.buildClothingFilters(filters);
      const from = (pagination.page - 1) * pagination.limit;

      const response = await this.client.search({
        index: CLOTHING_INDEX,
        from,
        size: pagination.limit,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ['name^3', 'description^2', 'style_tags'],
                  analyzer: 'ik_smart',
                  type: 'best_fields',
                },
              },
            ],
            ...(filterClauses.length > 0 ? { filter: filterClauses } : {}),
          },
        },
        aggregations: {
          colors: { terms: { field: 'colors', size: 20 } },
          styles: { terms: { field: 'style_tags', size: 20 } },
          price_ranges: {
            range: {
              field: 'price',
              ranges: [
                { key: '0-100', to: 100 },
                { key: '100-500', from: 100, to: 500 },
                { key: '500-1000', from: 500, to: 1000 },
                { key: '1000+', from: 1000 },
              ],
            },
          },
        },
      }) as unknown as EsSearchResponse;

      const hits = response.hits?.hits ?? [];
      const total = this.extractTotal(response.hits?.total);

      const items: ClothingSearchResult[] = hits.map((hit) => {
        const src = hit._source as EsClothingSource | undefined;
        return {
          id: src?.id ?? hit._id,
          name: src?.name ?? '',
          description: src?.description ?? null,
          price: src?.price ?? null,
          originalPrice: src?.original_price ?? null,
          currency: src?.currency ?? 'CNY',
          imageUrls: src?.image_urls ?? [],
          colors: src?.colors ?? [],
          styleTags: src?.style_tags ?? [],
          brandName: src?.brand_name ?? null,
          purchaseUrl: src?.purchase_url ?? null,
        };
      });

      return { items, total };
    } catch (error) {
      this.logger.warn(`Elasticsearch clothing search failed: ${String(error)}`);
      return { items: [], total: 0 };
    }
  }

  private async searchPosts(
    query: string,
    pagination: SearchPagination,
  ): Promise<{ items: PostSearchResult[]; total: number }> {
    try {
      const from = (pagination.page - 1) * pagination.limit;

      const response = await this.client.search({
        index: POSTS_INDEX,
        from,
        size: pagination.limit,
        query: {
          multi_match: {
            query,
            fields: ['title^3', 'content^2', 'tags'],
            analyzer: 'ik_smart',
            type: 'best_fields',
          },
        },
      }) as unknown as EsSearchResponse;

      const hits = response.hits?.hits ?? [];
      const total = this.extractTotal(response.hits?.total);

      const items: PostSearchResult[] = hits.map((hit) => {
        const src = hit._source as EsPostSource | undefined;
        return {
          id: src?.id ?? hit._id,
          title: src?.title ?? null,
          content: src?.content ?? '',
          imageUrls: src?.image_urls ?? [],
          tags: src?.tags ?? [],
          likesCount: src?.likes_count ?? 0,
          commentsCount: src?.comments_count ?? 0,
          userId: src?.user_id ?? '',
          userNickname: src?.user_nickname ?? null,
          userAvatarUrl: src?.user_avatar_url ?? null,
        };
      });

      return { items, total };
    } catch (error) {
      this.logger.warn(`Elasticsearch posts search failed: ${String(error)}`);
      return { items: [], total: 0 };
    }
  }

  async suggest(prefix: string, limit: number): Promise<SuggestionItem[]> {
    try {
      const response = await this.client.search({
        index: CLOTHING_INDEX,
        size: limit,
        query: {
          prefix: {
            name: { value: prefix },
          },
        },
        _source: ['name'],
      }) as unknown as EsSearchResponse;

      const hits = response.hits?.hits ?? [];
      const suggestions: SuggestionItem[] = hits.map((hit) => {
        const src = hit._source as EsClothingSource | undefined;
        return {
          text: src?.name ?? '',
          type: 'clothing',
          count: hit._score ?? 0,
        };
      });

      return suggestions.filter((s) => s.text.length > 0);
    } catch (error) {
      this.logger.warn(`Elasticsearch suggest failed: ${String(error)}`);
      return [];
    }
  }

  async index(document: IndexableDocument): Promise<void> {
    try {
      const indexName = document.type === 'clothing' ? CLOTHING_INDEX : POSTS_INDEX;
      await this.client.index({
        index: indexName,
        id: document.id,
        body: document.data,
        refresh: 'wait_for',
      });
    } catch (error) {
      this.logger.warn(`Elasticsearch index failed for ${document.id}: ${String(error)}`);
    }
  }

  async removeFromIndex(id: string, type: 'clothing' | 'posts'): Promise<void> {
    try {
      const indexName = type === 'clothing' ? CLOTHING_INDEX : POSTS_INDEX;
      await this.client.delete({
        index: indexName,
        id,
        refresh: 'wait_for',
      });
    } catch (error) {
      this.logger.warn(`Elasticsearch remove failed for ${id}: ${String(error)}`);
    }
  }
}

export const ELASTICSEARCH_PROVIDER = {
  provide: SEARCH_PROVIDER,
  useClass: ElasticsearchProvider,
};
