import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

const COLLECTION_NAME = 'aineed_fashion';
const VECTOR_SIZE = 1024;
const DISTANCE_METRIC = 'Cosine' as const;

export interface QdrantPayload {
  clothingId: string;
  name: string;
  category: string | null;
  styleTags: string[];
  colors: string[];
}

export interface QdrantSearchResult {
  id: string;
  score: number;
  payload: QdrantPayload;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    const qdrantUrl =
      this.configService.get<string>('QDRANT_URL') ??
      'http://localhost:6333';

    this.client = new QdrantClient({ url: qdrantUrl });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureCollection();
      this.logger.log('Qdrant service initialized');
    } catch (error) {
      this.logger.error(
        `Qdrant initialization failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === COLLECTION_NAME,
      );

      if (!exists) {
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: VECTOR_SIZE,
            distance: DISTANCE_METRIC,
          },
        });
        this.logger.log(`Created Qdrant collection: ${COLLECTION_NAME}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure Qdrant collection: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  async upsert(
    clothingId: string,
    vector: number[],
    payload: QdrantPayload,
  ): Promise<void> {
    try {
      await this.client.upsert(COLLECTION_NAME, {
        points: [
          {
            id: clothingId,
            vector,
            payload: payload as unknown as Record<string, unknown>,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        `Qdrant upsert failed for ${clothingId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  async batchUpsert(
    points: Array<{
      clothingId: string;
      vector: number[];
      payload: QdrantPayload;
    }>,
  ): Promise<void> {
    if (points.length === 0) {
      return;
    }

    try {
      await this.client.upsert(COLLECTION_NAME, {
        points: points.map((p) => ({
          id: p.clothingId,
          vector: p.vector,
          payload: p.payload as unknown as Record<string, unknown>,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Qdrant batch upsert failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  async search(
    vector: number[],
    limit: number,
    threshold: number,
    filters?: Record<string, unknown>,
  ): Promise<QdrantSearchResult[]> {
    try {
      const filter = filters ? this.buildFilter(filters) : undefined;

      const results = await this.client.search(COLLECTION_NAME, {
        vector,
        limit,
        score_threshold: threshold,
        filter,
        with_payload: true,
      });

      return results.map((r) => ({
        id: String(r.id),
        score: r.score,
        payload: r.payload as unknown as QdrantPayload,
      }));
    } catch (error) {
      this.logger.error(
        `Qdrant search failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  async delete(clothingId: string): Promise<void> {
    try {
      await this.client.delete(COLLECTION_NAME, {
        points: [clothingId],
      });
    } catch (error) {
      this.logger.error(
        `Qdrant delete failed for ${clothingId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(COLLECTION_NAME);
      this.logger.log(`Deleted Qdrant collection: ${COLLECTION_NAME}`);
    } catch (error) {
      this.logger.error(
        `Qdrant delete collection failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }

  private buildFilter(
    filters: Record<string, unknown>,
  ): Record<string, unknown> {
    const conditions: Array<Record<string, unknown>> = [];

    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        conditions.push({
          key,
          match: { any: value },
        });
      } else {
        conditions.push({
          key,
          match: { value },
        });
      }
    }

    return {
      must: conditions,
    };
  }
}
