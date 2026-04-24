import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import axios from "axios";

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
    match: { value: string | number | boolean } | { values: (string | number | boolean)[] };
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
  private readonly mlServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.collectionName =
      this.configService.get<string>("QDRANT_COLLECTION_CLOTHING") || "clothing_items";
    this.mlServiceUrl = this.configService.get<string>("ML_SERVICE_URL", "http://localhost:8001");
  }

  async onModuleInit() {
    const qdrantUrl = this.configService.get<string>("QDRANT_URL");
    const qdrantApiKey = this.configService.get<string>("QDRANT_API_KEY");

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
        this.logger.error(
          `Qdrant connection failed: ${error}. Vector operations will be unavailable.`
        );
        this.isConnected = false;
      }
    } else {
      this.logger.error(
        "QDRANT_URL not configured. Vector operations will be unavailable. " +
          "Please set QDRANT_URL environment variable."
      );
    }
  }

  async onModuleDestroy() {
    this.client = null;
    this.isConnected = false;
  }

  private async initializeCollection(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);

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

  async getTextEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post<{ embedding: number[] }>(
        `${this.mlServiceUrl}/api/vector/embed/text`,
        { text },
        { timeout: 10000 }
      );
      return response.data.embedding;
    } catch (error) {
      this.logger.error(
        `Failed to get text embedding from ML service: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw new Error("Text embedding service unavailable. Please check ML service status.");
    }
  }

  async searchByText(
    query: string,
    options: {
      topK?: number;
      filter?: VectorFilter;
      minScore?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const embedding = await this.getTextEmbedding(query);
    return this.searchSimilar(embedding, options);
  }

  async upsertVector(point: VectorPoint): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error("Qdrant is not connected. Cannot upsert vector.");
    }
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
  }

  async upsertBatch(points: VectorPoint[]): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error("Qdrant is not connected. Cannot upsert batch.");
    }
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
  }

  async searchSimilar(
    vector: number[],
    options: {
      topK?: number;
      filter?: VectorFilter;
      minScore?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const { topK = 10, filter, minScore = 0 } = options;

    if (!this.isConnected || !this.client) {
      throw new Error(
        "Qdrant connection is not available. Vector search requires a healthy Qdrant instance. " +
          "Please check Qdrant service status and configuration."
      );
    }

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
  }

  private convertFilter(
    filter: VectorFilter
  ): { must?: unknown[]; should?: unknown[] } | undefined {
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
    if (!this.isConnected || !this.client) {
      throw new Error("Qdrant is not connected. Cannot delete vector.");
    }
    await this.client.delete(this.collectionName, {
      wait: true,
      points: [id],
    });
  }

  async deleteByFilter(filter: VectorFilter): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error("Qdrant is not connected. Cannot delete by filter.");
    }
    const qdFilter = this.convertFilter(filter);
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: qdFilter as Record<string, unknown>,
    } as Parameters<typeof this.client.delete>[1]);
  }

  async getVector(
    id: string
  ): Promise<{ vector: number[]; payload: Record<string, unknown> } | null> {
    if (!this.isConnected || !this.client) {
      throw new Error("Qdrant is not connected. Cannot get vector.");
    }
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
  }

  async getCollectionStats(): Promise<{
    vectorCount: number;
    indexedVectorCount: number;
    status: string;
  }> {
    if (!this.isConnected || !this.client) {
      return {
        vectorCount: 0,
        indexedVectorCount: 0,
        status: "disconnected",
      };
    }
    const info = await this.client.getCollection(this.collectionName);
    return {
      vectorCount: info.points_count || 0,
      indexedVectorCount: info.indexed_vectors_count || 0,
      status: info.status || "unknown",
    };
  }

  isReady(): boolean {
    return this.isConnected;
  }

  async ensureCollection(name: string, vectorSize: number = 512): Promise<void> {
    if (!this.client) {
      return;
    }

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
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.upsertVector({
      id: itemId,
      vector,
      payload: metadata,
    });
  }
}
