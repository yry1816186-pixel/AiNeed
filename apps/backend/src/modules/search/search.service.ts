import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

import { allowUnverifiedAiFallbacks } from "../../common/config/runtime-flags";
import { PrismaService } from "../../common/prisma/prisma.service";
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
import type { ClothingCategory } from "@prisma/client";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly mlServiceUrl: string;
  private readonly allowFallbacks: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.allowFallbacks = allowUnverifiedAiFallbacks(this.configService);
    this.mlServiceUrl = this.configService.get<string>(
      "ML_SERVICE_URL",
      "http://localhost:8001",
    );
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
}
