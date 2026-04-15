import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ClothingCategory } from "@prisma/client";
import axios from "axios";

import { allowUnverifiedAiFallbacks } from "../../common/config/runtime-flags";
import { PrismaService } from "../../common/prisma/prisma.service";
import { QdrantService } from "../recommendations/services/qdrant.service";

import {
  type ClothingItemWhereInput,
  type ClothingItemOrderByWithRelationInput,
  type MLSimilarItemResult,
  type MLAnalysisResponse,
  type ClothingAttributes,
  type ScoredSearchResult,
  type PaginatedSearchResult,
  type ClothingItemWithBrand,
  type SearchSuggestionsResult,
  buildSearchWhereClause,
  buildOrderByClause,
  getClothingAttributes,
} from "./types/search.types";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly mlServiceUrl: string;
  private readonly allowFallbacks: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private qdrantService: QdrantService,
  ) {
    this.allowFallbacks = allowUnverifiedAiFallbacks(this.configService);
    this.mlServiceUrl = this.configService.get<string>(
      "ML_SERVICE_URL",
      "http://localhost:8001",
    );
  }

  /**
   * Hybrid search using Reciprocal Rank Fusion (RRF).
   * Combines text search (Prisma), vector search (Qdrant), and popularity signals.
   * RRF formula: score = sum(1 / (k + rank_i)) for each ranking, k=60.
   */
  async hybridSearch(
    query: string,
    options: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PaginatedSearchResult<ScoredSearchResult>> {
    const {
      category,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = options;

    const candidateLimit = limit * 3; // Fetch more candidates for RRF fusion
    const rrfK = 60; // Standard RRF constant

    // Step 1: Text search via Prisma (ranking 1)
    const textWhere: ClothingItemWhereInput = buildSearchWhereClause({
      query,
      category,
      minPrice,
      maxPrice,
    });
    const textItems = await this.prisma.clothingItem.findMany({
      where: textWhere,
      include: { brand: { select: { id: true, name: true, logo: true } } },
      take: candidateLimit,
    });
    const textRanks = new Map<string, number>();
    textItems.forEach((item, idx) => {
      textRanks.set(item.id, idx + 1);
    });

    // Step 2: Vector search via Qdrant (ranking 2)
    const vectorRanks = new Map<string, number>();
    try {
      // Get query embedding from ML service
      const embedResponse = await axios.post<{ embedding: number[] }>(
        `${this.mlServiceUrl}/embed/text`,
        { text: query },
        { timeout: 10000 },
      );
      const queryVector = embedResponse.data.embedding;
      if (queryVector && queryVector.length > 0) {
        const vectorResults = await this.qdrantService.searchSimilar(
          queryVector,
          { topK: candidateLimit, minScore: 0.3 },
        );
        vectorResults.forEach((result, idx) => {
          vectorRanks.set(result.id, idx + 1);
        });
      }
    } catch (error: unknown) {
      this.logger.warn(
        `Vector search unavailable for hybrid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Step 3: Collect all candidate IDs
    const allIds = new Set([...textRanks.keys(), ...vectorRanks.keys()]);
    if (allIds.size === 0) {
      return {
        items: [],
        page,
        limit,
        total: 0,
        totalPages: 0,
        query,
      };
    }

    // Step 4: Fetch popularity data for all candidates
    const candidates = await this.prisma.clothingItem.findMany({
      where: {
        id: { in: Array.from(allIds) },
        isActive: true,
      },
      include: { brand: { select: { id: true, name: true, logo: true } } },
    });

    // Step 5: Compute RRF scores
    // Weight: text 40%, vector 40%, popularity 20%
    const scored = candidates.map((item) => {
      let rrfScore = 0;

      // Text contribution (40% weight)
      const textRank = textRanks.get(item.id);
      if (textRank !== undefined) {
        rrfScore += 0.4 / (rrfK + textRank);
      }

      // Vector contribution (40% weight)
      const vectorRank = vectorRanks.get(item.id);
      if (vectorRank !== undefined) {
        rrfScore += 0.4 / (rrfK + vectorRank);
      }

      // Popularity contribution (20% weight, normalized)
      const popularityScore = Math.min(
        1,
        (item.viewCount * 0.5 + item.likeCount) / 1000,
      );
      rrfScore += 0.2 * popularityScore;

      return {
        ...item,
        similarityScore: rrfScore,
        matchReasons: this.generateHybridReasons(
          textRank !== undefined,
          vectorRank !== undefined,
          item.viewCount,
        ),
      };
    });

    // Sort by RRF score descending
    scored.sort((a, b) => b.similarityScore - a.similarityScore);

    const total = scored.length;
    const paginated = scored.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      query,
    };
  }

  private generateHybridReasons(
    hasTextMatch: boolean,
    hasVectorMatch: boolean,
    viewCount: number,
  ): string[] {
    const reasons: string[] = [];
    if (hasTextMatch) {
      reasons.push("关键词匹配");
    }
    if (hasVectorMatch) {
      reasons.push("语义相似");
    }
    if (viewCount > 100) {
      reasons.push("热门商品");
    }
    return reasons.length > 0 ? reasons : ["综合推荐"];
  }

  async searchItems(
    query: string,
    options: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: "relevance" | "price_asc" | "price_desc" | "popular";
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PaginatedSearchResult<ClothingItemWithBrand>> {
    const {
      category,
      minPrice,
      maxPrice,
      sortBy = "relevance",
      page = 1,
      limit = 20,
    } = options;

    // 使用类型安全的 where 条件构建函数
    const where: ClothingItemWhereInput = buildSearchWhereClause({
      query,
      category,
      minPrice,
      maxPrice,
    });

    // 使用类型安全的排序构建函数
    const orderBy: ClothingItemOrderByWithRelationInput =
      buildOrderByClause(sortBy);

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, logo: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      query,
    };
  }

  async searchByImage(
    imageUrl: string,
    limit: number = 20,
  ): Promise<ScoredSearchResult[]> {
    try {
      const mlResponse = await axios.post<{
        results: MLSimilarItemResult[];
      }>(
        `${this.mlServiceUrl}/search/similar`,
        {
          image_url: imageUrl,
          top_k: limit * 2,
        },
        { timeout: 30000 },
      );

      const similarItems = mlResponse.data.results || [];

      if (similarItems.length === 0) {
        if (!this.allowFallbacks) {
          throw new ServiceUnavailableException("图像搜索服务未返回结果");
        }
        return this.fallbackSearch(limit);
      }

      const itemIds = similarItems.map((item) => item.id);
      const items = await this.prisma.clothingItem.findMany({
        where: {
          id: { in: itemIds },
          isActive: true,
        },
        include: {
          brand: { select: { id: true, name: true, logo: true } },
        },
      });

      const itemMap = new Map(items.map((item) => [item.id, item]));

      return similarItems
        .filter((sim) => itemMap.has(sim.id))
        .map((sim) => {
          const item = itemMap.get(sim.id);
          if (!item) {
            throw new Error(`Item ${sim.id} not found in map`);
          }
          return {
            ...item,
            similarityScore: sim.similarity,
            matchReasons: sim.reasons || [],
          };
        })
        .slice(0, limit);
    } catch (error: unknown) {
      this.logger.error(
        `ML service error: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (!this.allowFallbacks) {
        throw new ServiceUnavailableException("图像搜索服务不可用");
      }
      return this.attributeBasedSearch(imageUrl, limit);
    }
  }

  private async fallbackSearch(
    limit: number,
  ): Promise<ScoredSearchResult[]> {
    const items = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { viewCount: "desc" },
      take: limit,
    });

    return items.map((item) => ({
      ...item,
      similarityScore: 0,
      matchReasons: ["热门推荐"],
    }));
  }

  private async attributeBasedSearch(
    imageUrl: string,
    limit: number,
  ): Promise<ScoredSearchResult[]> {
    try {
      const analysisResponse = await axios.post<MLAnalysisResponse>(
        `${this.mlServiceUrl}/analyze`,
        { image_url: imageUrl },
        { timeout: 30000 },
      );

      const analysis = analysisResponse.data;
      const { category, style, colors } = analysis.clothing || {};

      const where: ClothingItemWhereInput = { isActive: true };

      if (category) {
        where.category = category as ClothingCategory;
      }

      const candidates = await this.prisma.clothingItem.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, logo: true } },
        },
        take: limit * 3,
      });

      const scoredItems = candidates.map((item) => {
        let score = 30;

        const attrs = getClothingAttributes(item.attributes);
        if (style && attrs?.style) {
          const styleMatch = attrs.style.filter((s) =>
            style.some((qs) => s.toLowerCase() === qs.toLowerCase()),
          );
          score += styleMatch.length * 15;
        }

        if (colors && item.colors) {
          const colorMatch = item.colors.filter((c) =>
            colors.some(
              (qc) =>
                c.toLowerCase().includes(qc.toLowerCase()) ||
                qc.toLowerCase().includes(c.toLowerCase()),
            ),
          );
          score += colorMatch.length * 10;
        }

        score += Math.min(item.viewCount / 100, 10);
        score += Math.min(item.likeCount / 50, 10);

        return {
          ...item,
          similarityScore: Math.min(score, 100),
          matchReasons: this.generateMatchReasons(attrs, colors, item.colors),
        };
      });

      scoredItems.sort((a, b) => b.similarityScore - a.similarityScore);

      return scoredItems.slice(0, limit);
    } catch (error: unknown) {
      this.logger.error(
        `Attribute search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (!this.allowFallbacks) {
        throw new ServiceUnavailableException("图像属性搜索服务不可用");
      }
      return this.fallbackSearch(limit);
    }
  }

  private generateMatchReasons(
    attrs: ClothingAttributes | null,
    queryColors: string[] | undefined,
    itemColors: string[],
  ): string[] {
    const reasons: string[] = [];

    if (attrs?.style && attrs.style.length > 0) {
      reasons.push(`${attrs.style[0]}风格`);
    }

    if (queryColors && itemColors.length > 0) {
      const matchedColor = itemColors.find((ic) =>
        queryColors.some(
          (qc) =>
            ic.toLowerCase().includes(qc.toLowerCase()) ||
            qc.toLowerCase().includes(ic.toLowerCase()),
        ),
      );
      if (matchedColor) {
        reasons.push(`包含${matchedColor}色调`);
      }
    }

    return reasons.length > 0 ? reasons : ["相似推荐"];
  }

  async getSearchSuggestions(
    query: string,
    limit: number = 10,
  ): Promise<SearchSuggestionsResult> {
    // Escape special ILIKE pattern characters to prevent pattern injection
    const escapedQuery = query.replace(/[%_\\]/g, "\\$&");
    const pattern = `%${escapedQuery}%`;

    const items = await this.prisma.clothingItem.findMany({
      where: {
        isActive: true,
        name: { contains: query, mode: "insensitive" },
      },
      select: { name: true },
      take: limit,
    });

    const tags = await this.prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) as tag
      FROM "ClothingItem"
      WHERE "isActive" = true
        AND unnest(tags) ILIKE ${pattern}
      LIMIT ${limit}
    `;

    return {
      itemNames: items.map((i) => i.name),
      tags: tags.map((t) => t.tag),
    };
  }

  /**
   * Enhanced search with multi-dimension filters + sales sort.
   */
  async searchWithFilters(
    query: string,
    options: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: "relevance" | "price_asc" | "price_desc" | "popular" | "sales";
      page?: number;
      limit?: number;
      brandIds?: string[];
      colors?: string[];
      sizes?: string[];
      styleTags?: string[];
    } = {},
  ): Promise<PaginatedSearchResult<ClothingItemWithBrand>> {
    const {
      category,
      minPrice,
      maxPrice,
      sortBy = "relevance",
      page = 1,
      limit = 20,
      brandIds,
      colors,
      sizes,
      styleTags,
    } = options;

    const where: ClothingItemWhereInput = buildSearchWhereClause({
      query,
      category,
      minPrice,
      maxPrice,
    });

    // Add multi-dimension filters
    if (brandIds && brandIds.length > 0) {
      (where as Record<string, unknown>).brandId = { in: brandIds };
    }
    if (colors && colors.length > 0) {
      (where as Record<string, unknown>).colors = { hasSome: colors };
    }
    if (sizes && sizes.length > 0) {
      (where as Record<string, unknown>).sizes = { hasSome: sizes };
    }
    if (styleTags && styleTags.length > 0) {
      (where as Record<string, unknown>).tags = { hasSome: styleTags };
    }

    let orderBy: ClothingItemOrderByWithRelationInput | undefined;

    if (sortBy === "sales") {
      // For sales sort, fetch items and join with ProductSalesStats
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        this.prisma.clothingItem.findMany({
          where,
          include: {
            brand: { select: { id: true, name: true, logo: true } },
            salesStats: {
              where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
              select: { purchases: true },
            },
          },
          skip,
          take: limit,
        }),
        this.prisma.clothingItem.count({ where }),
      ]);

      // Sort by total purchases descending
      const sorted = items
        .map((item) => ({
          ...item,
          totalPurchases: (item as Record<string, unknown>).salesStats
            ? ((item as Record<string, unknown>).salesStats as Array<{ purchases: number }>)
                .reduce((sum: number, s: { purchases: number }) => sum + s.purchases, 0)
            : 0,
        }))
        .sort((a, b) => b.totalPurchases - a.totalPurchases);

      return { items: sorted, page, limit, total, totalPages: Math.ceil(total / limit), query };
    }

    // eslint-disable-next-line prefer-const
    orderBy = buildOrderByClause("popular");
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, logo: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    return { items, page, limit, total, totalPages: Math.ceil(total / limit), query };
  }

  /**
   * Get available filter options for search context.
   */
  async getFilterOptions(category?: string) {
    const where: Record<string, unknown> = { isActive: true, isDeleted: false };
    if (category) {
      where.category = category;
    }

    const [brands, priceAgg] = await Promise.all([
      this.prisma.brand.findMany({
        where: { products: { some: where as never } },
        select: { id: true, name: true, _count: { select: { products: { where: where as never } } } },
        orderBy: { name: "asc" },
      }),
      this.prisma.clothingItem.aggregate({
        where: where as never,
        _min: { price: true },
        _max: { price: true },
      }),
    ]);

    // Get distinct colors and sizes
    const colorItems = await this.prisma.clothingItem.findMany({
      where: where as never,
      select: { colors: true },
    });
    const sizeItems = await this.prisma.clothingItem.findMany({
      where: where as never,
      select: { sizes: true },
    });

    const colorCounts: Record<string, number> = {};
    for (const item of colorItems) {
      for (const c of item.colors) {
        colorCounts[c] = (colorCounts[c] || 0) + 1;
      }
    }

    const sizeCounts: Record<string, number> = {};
    for (const item of sizeItems) {
      for (const s of item.sizes) {
        sizeCounts[s] = (sizeCounts[s] || 0) + 1;
      }
    }

    return {
      brands: brands.map((b) => ({ id: b.id, name: b.name, count: b._count.products })),
      colors: Object.entries(colorCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      sizes: Object.entries(sizeCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      priceRange: {
        min: priceAgg._min.price ? Number(priceAgg._min.price) : 0,
        max: priceAgg._max.price ? Number(priceAgg._max.price) : 0,
      },
    };
  }
}
