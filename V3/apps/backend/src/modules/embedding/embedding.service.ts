import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QdrantService, QdrantPayload } from './qdrant.service';
import { EMBEDDING_PROVIDER_TOKEN } from './providers/embedding-provider.interface';
import type { IEmbeddingProvider } from './providers/embedding-provider.interface';
import {
  EmbeddingResponseDto,
  BatchEmbeddingResponseDto,
  SearchSimilarResponseDto,
  SearchResultItem,
  IndexResponseDto,
  BatchIndexResponseDto,
} from './dto/embedding-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly prisma: PrismaService;

  constructor(
    @Inject(EMBEDDING_PROVIDER_TOKEN)
    private readonly embeddingProvider: IEmbeddingProvider,
    private readonly qdrantService: QdrantService,
    prisma: PrismaService,
  ) {
    this.prisma = prisma;
  }

  async embedText(text: string): Promise<EmbeddingResponseDto> {
    const vector = await this.embeddingProvider.embed(text);
    return {
      vector,
      dimensions: this.embeddingProvider.getDimensions(),
      model: this.embeddingProvider.getModelName(),
    };
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResponseDto> {
    const vectors = await this.embeddingProvider.embedBatch(texts);
    return {
      vectors,
      count: vectors.length,
      model: this.embeddingProvider.getModelName(),
    };
  }

  async searchSimilar(
    query: string,
    limit: number,
    threshold: number,
    filters?: Record<string, unknown>,
  ): Promise<SearchSimilarResponseDto> {
    const vector = await this.embeddingProvider.embed(query);

    let items: SearchResultItem[] = [];
    let total = 0;

    try {
      const qdrantResults = await this.qdrantService.search(
        vector,
        limit,
        threshold,
        filters,
      );

      if (qdrantResults.length > 0) {
        const clothingIds = qdrantResults.map((r) => r.payload.clothingId);
        const clothingItems = await this.prisma.clothingItem.findMany({
          where: { id: { in: clothingIds }, isActive: true },
          select: {
            id: true,
            name: true,
            category: { select: { name: true } },
            styleTags: true,
            colors: true,
            price: true,
            imageUrls: true,
          },
        });

        const clothingMap = new Map(
          clothingItems.map((item) => [item.id, item]),
        );

        items = qdrantResults
          .filter((r) => clothingMap.has(r.payload.clothingId))
          .map((r) => {
            const clothing = clothingMap.get(r.payload.clothingId)!;
            return {
              clothingId: r.payload.clothingId,
              score: r.score,
              clothing: {
                id: clothing.id,
                name: clothing.name,
                category: clothing.category?.name ?? null,
                styleTags: clothing.styleTags,
                colors: clothing.colors,
                price: clothing.price ? Number(clothing.price) : null,
                imageUrls: clothing.imageUrls,
              },
            };
          });

        total = items.length;
      }
    } catch (error) {
      this.logger.warn(
        `Qdrant search failed, falling back to pgvector: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      const fallbackResult = await this.searchPgvector(
        vector,
        limit,
        threshold,
      );
      items = fallbackResult.items;
      total = fallbackResult.total;
    }

    return { items, total };
  }

  async indexClothing(clothingId: string): Promise<IndexResponseDto> {
    const clothing = await this.prisma.clothingItem.findUnique({
      where: { id: clothingId },
      select: {
        id: true,
        name: true,
        description: true,
        styleTags: true,
        colors: true,
        materials: true,
        category: { select: { name: true } },
      },
    });

    if (!clothing) {
      throw new Error(`Clothing item not found: ${clothingId}`);
    }

    const text = this.buildClothingText(clothing);
    const vector = await this.embeddingProvider.embed(text);

    const payload: QdrantPayload = {
      clothingId: clothing.id,
      name: clothing.name,
      category: clothing.category?.name ?? '',
      styleTags: clothing.styleTags,
      colors: clothing.colors,
    };

    await this.qdrantService.upsert(clothingId, vector, payload);

    await this.writeEmbeddingToPg(clothingId, vector);

    return { clothingId, indexed: true };
  }

  async batchIndexClothing(
    clothingIds: string[],
  ): Promise<BatchIndexResponseDto> {
    const taskId = uuidv4();

    setImmediate(async () => {
      for (const clothingId of clothingIds) {
        try {
          await this.indexClothing(clothingId);
        } catch (error) {
          this.logger.error(
            `Failed to index clothing ${clothingId}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        }
      }
      this.logger.log(
        `Batch indexing task ${taskId} completed for ${clothingIds.length} items`,
      );
    });

    return { taskId, total: clothingIds.length };
  }

  private buildClothingText(clothing: {
    name: string;
    description: string | null;
    styleTags: string[];
    colors: string[];
    materials: string[];
    category: { name: string } | null;
  }): string {
    const parts: string[] = [clothing.name];

    if (clothing.description) {
      parts.push(clothing.description);
    }

    if (clothing.category?.name) {
      parts.push(`分类: ${clothing.category.name}`);
    }

    if (clothing.styleTags.length > 0) {
      parts.push(`风格: ${clothing.styleTags.join(', ')}`);
    }

    if (clothing.colors.length > 0) {
      parts.push(`颜色: ${clothing.colors.join(', ')}`);
    }

    if (clothing.materials.length > 0) {
      parts.push(`材质: ${clothing.materials.join(', ')}`);
    }

    return parts.join(' ');
  }

  private async writeEmbeddingToPg(
    clothingId: string,
    vector: number[],
  ): Promise<void> {
    const vectorStr = `[${vector.join(',')}]`;
    await this.prisma.$executeRaw`
      UPDATE clothing_items
      SET embedding = ${vectorStr}::vector
      WHERE id = ${clothingId}::uuid
    `;
  }

  private async searchPgvector(
    vector: number[],
    limit: number,
    threshold: number,
  ): Promise<{ items: SearchResultItem[]; total: number }> {
    const vectorStr = `[${vector.join(',')}]`;

    interface PgvectorRow {
      id: string;
      name: string;
      category_name: string | null;
      style_tags: string[];
      colors: string[];
      price: number | null;
      image_urls: string[];
      similarity: number;
    }

    const results = await this.prisma.$queryRaw<PgvectorRow[]>`
      SELECT
        ci.id,
        ci.name,
        c.name as category_name,
        ci.style_tags,
        ci.colors,
        ci.price,
        ci.image_urls,
        1 - (ci.embedding <=> ${vectorStr}::vector) as similarity
      FROM clothing_items ci
      LEFT JOIN categories c ON ci.category_id = c.id
      WHERE ci.is_active = true
        AND ci.embedding IS NOT NULL
        AND 1 - (ci.embedding <=> ${vectorStr}::vector) >= ${threshold}
      ORDER BY ci.embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;

    const items: SearchResultItem[] = results.map((row: PgvectorRow) => ({
      clothingId: row.id,
      score: row.similarity,
      clothing: {
        id: row.id,
        name: row.name,
        category: row.category_name,
        styleTags: row.style_tags,
        colors: row.colors,
        price: row.price,
        imageUrls: row.image_urls,
      },
    }));

    return { items, total: items.length };
  }
}
