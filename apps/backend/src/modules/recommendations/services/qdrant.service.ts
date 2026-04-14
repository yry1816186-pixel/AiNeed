import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";

export interface VectorPoint {
  id: string;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload?: Record<string, unknown>;
}

export interface VectorFilter {
  must?: Array<{
    key: string;
    match:
      | { value: string | number | boolean }
      | { values: (string | number | boolean)[] };
  }>;
  should?: Array<{
    key: string;
    match: { value: string | number | boolean };
  }>;
}

@Injectable()
export class QdrantService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient | null = null;
  private readonly collectionName: string;
  private readonly vectorDimension = 512;
  private isConnected = false;
  private memoryStore: Map<
    string,
    { vector: number[]; payload: Record<string, unknown> }
  > = new Map();

  constructor(private configService: ConfigService) {
    this.collectionName =
      this.configService.get<string>("QDRANT_COLLECTION_CLOTHING") ||
      "clothing_items";
  }

  async onModuleInit() {
    const qdrantUrl = this.configService.get<string>("QDRANT_URL");
    const qdrantApiKey = this.configService.get<string>("QDRANT_API_KEY");
    const enableFallback = this.configService.get<string>(
      "QDRANT_ENABLE_FALLBACK",
      "true",
    );

    if (qdrantUrl) {
      try {
        this.client = new QdrantClient({
          url: qdrantUrl,
          apiKey: qdrantApiKey,
        });

        await this.initializeCollection();
        this.isConnected = true;
        this.logger.log(`Qdrant connected: ${qdrantUrl}`);
      } catch (error) {
        this.logger.warn(
          `Qdrant connection failed, using memory fallback: ${error}`,
        );
        this.isConnected = false;
        if (enableFallback !== "true") {
          this.logger.error(
            "Qdrant fallback is disabled, vector operations may fail",
          );
        }
      }
    } else {
      this.logger.warn(
        "QDRANT_URL not configured, using in-memory vector store",
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.memoryStore.clear();
    }
  }

  private async initializeCollection(): Promise<void> {
    if (!this.client) {return;}

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorDimension,
            distance: "Cosine",
          },
          optimizers_config: {
            indexing_threshold: 10000,
          },
          hnsw_config: {
            m: 16,
            ef_construct: 100,
          },
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "category",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "brandId",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "isActive",
          field_schema: "bool",
        });

        this.logger.log(`Created Qdrant collection: ${this.collectionName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize collection: ${error}`);
      throw error;
    }
  }

  async upsertVector(point: VectorPoint): Promise<void> {
    if (this.isConnected && this.client) {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: point.id,
            vector: point.vector,
            payload: point.payload || {},
          },
        ],
      });
    } else {
      this.memoryStore.set(point.id, {
        vector: point.vector,
        payload: point.payload || {},
      });
    }
  }

  async upsertBatch(points: VectorPoint[]): Promise<void> {
    if (this.isConnected && this.client) {
      const batchSize = 100;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        await this.client.upsert(this.collectionName, {
          wait: true,
          points: batch.map((p) => ({
            id: p.id,
            vector: p.vector,
            payload: p.payload || {},
          })),
        });
      }
    } else {
      for (const point of points) {
        this.memoryStore.set(point.id, {
          vector: point.vector,
          payload: point.payload || {},
        });
      }
    }
  }

  async searchSimilar(
    vector: number[],
    options: {
      topK?: number;
      filter?: VectorFilter;
      minScore?: number;
      enableFallback?: boolean;
    } = {},
  ): Promise<SearchResult[]> {
    const { topK = 10, filter, minScore = 0, enableFallback = true } = options;

    // Primary: Use Qdrant if connected
    if (this.isConnected && this.client) {
      try {
        const searchResult = await this.client.search(this.collectionName, {
          vector,
          limit: topK,
          score_threshold: minScore,
          filter: filter ? this.convertFilter(filter) : undefined,
        });

        return searchResult.map((r) => ({
          id: r.id as string,
          score: r.score,
          payload: r.payload as Record<string, unknown> | undefined,
        }));
      } catch (error) {
        this.logger.error(`Qdrant search failed: ${error}`);
        if (!enableFallback) {
          throw new Error(
            "Qdrant search failed and fallback is disabled. " +
              "Please check Qdrant service status.",
          );
        }
        // Fall through to memory fallback
        this.logger.warn("Falling back to in-memory vector search");
      }
    }

    // Fallback: Use in-memory search if enabled
    if (enableFallback) {
      return this.memorySearch(vector, topK, minScore);
    }

    throw new Error(
      "Qdrant connection is not available. Vector search requires a healthy Qdrant instance. " +
        "Please check Qdrant service status and configuration.",
    );
  }

  private memorySearch(
    vector: number[],
    topK: number,
    minScore: number,
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [id, data] of this.memoryStore) {
      const score = this.cosineSimilarity(vector, data.vector);
      if (score >= minScore) {
        results.push({
          id,
          score,
          payload: data.payload,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {return 0;}

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      const value1 = vec1[i] ?? 0;
      const value2 = vec2[i] ?? 0;
      dotProduct += value1 * value2;
      norm1 += value1 * value1;
      norm2 += value2 * value2;
    }

    if (norm1 === 0 || norm2 === 0) {return 0;}
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private convertFilter(filter: VectorFilter): { must?: unknown[]; should?: unknown[] } | undefined {
    const qdrantFilter: { must?: unknown[]; should?: unknown[] } = {};

    if (filter.must && filter.must.length > 0) {
      qdrantFilter.must = filter.must.map((f) => ({
        key: f.key,
        match: f.match,
      }));
    }

    if (filter.should && filter.should.length > 0) {
      qdrantFilter.should = filter.should.map((f) => ({
        key: f.key,
        match: f.match,
      }));
    }

    return Object.keys(qdrantFilter).length > 0 ? qdrantFilter : undefined;
  }

  async deleteVector(id: string): Promise<void> {
    if (this.isConnected && this.client) {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [id],
      });
    } else {
      this.memoryStore.delete(id);
    }
  }

  async deleteByFilter(filter: VectorFilter): Promise<void> {
    if (this.isConnected && this.client) {
      const qdFilter = this.convertFilter(filter);
      await this.client.delete(this.collectionName, {
        wait: true,
        filter: qdFilter as Record<string, unknown>,
      } as Parameters<typeof this.client.delete>[1]);
    }
  }

  async getVector(
    id: string,
  ): Promise<{ vector: number[]; payload: Record<string, unknown> } | null> {
    if (this.isConnected && this.client) {
      const points = await this.client.retrieve(this.collectionName, {
        ids: [id],
        with_vector: true,
        with_payload: true,
      });

      const point = points[0];
      if (point) {
        return {
          vector: point.vector as number[],
          payload: point.payload as Record<string, unknown>,
        };
      }
      return null;
    } else {
      const data = this.memoryStore.get(id);
      return data || null;
    }
  }

  async getCollectionStats(): Promise<{
    vectorCount: number;
    indexedVectorCount: number;
    status: string;
  }> {
    if (this.isConnected && this.client) {
      const info = await this.client.getCollection(this.collectionName);
      return {
        vectorCount: info.points_count || 0,
        indexedVectorCount: info.indexed_vectors_count || 0,
        status: info.status || "unknown",
      };
    } else {
      return {
        vectorCount: this.memoryStore.size,
        indexedVectorCount: this.memoryStore.size,
        status: "memory",
      };
    }
  }

  isReady(): boolean {
    return this.isConnected || this.memoryStore.size > 0;
  }

  async ensureCollection(
    name: string,
    vectorSize: number = 512,
  ): Promise<void> {
    if (!this.client) return;

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === name);
      if (!exists) {
        await this.client.createCollection(name, {
          vectors: { size: vectorSize, distance: "Cosine" },
          optimizers_config: { indexing_threshold: 10000 },
        });
        this.logger.log(`Created Qdrant collection: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure collection: ${error}`);
    }
  }

  async upsertClothingItem(
    itemId: string,
    vector: number[],
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.upsertVector({
      id: itemId,
      vector,
      payload: metadata,
    });
  }
}
