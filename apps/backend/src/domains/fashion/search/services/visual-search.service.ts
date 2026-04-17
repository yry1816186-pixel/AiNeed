import { Injectable } from "@nestjs/common";
import type { ClothingCategory } from '../../../../types/prisma-enums';

import { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  type ClothingItemWhereInput,
  type ClothingAttributes,
  type ClothingItemWithBrand,
  getClothingAttributes,
} from "../types/search.types";

import { AIAnalysisResult, AIImageService } from "./ai-image.service";

export interface VisualSearchResult {
  id: string;
  name: string;
  images: string[];
  price: number;
  currency: string;
  category: string;
  subcategory?: string | null;
  colors: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  brand?: {
    id: string;
    name: string;
    logo?: string | null;
  } | null;
  similarityScore: number;
  matchReasons: string[];
}

export interface ImageFeatures {
  colorHistogram: number[];
  dominantColors: string[];
  textureFeatures: number[];
  embedding?: number[];
  labels?: string[];
  style?: string;
  category?: string;
}

/**
 * 带品牌信息的服装商品（用于内部计算）
 */
interface ClothingItemCandidate extends ClothingItemWithBrand {
  viewCount: number;
  likeCount: number;
  brandId: string | null;
}

@Injectable()
export class VisualSearchService {
  constructor(
    private prisma: PrismaService,
    private aiImageService: AIImageService,
  ) {}

  async searchByImage(
    imageBuffer: Buffer,
    options: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
    } = {},
  ): Promise<VisualSearchResult[]> {
    const { category, minPrice, maxPrice, limit = 20 } = options;

    // 提取图像特征
    const features = await this.extractFeatures(imageBuffer);

    // 获取候选商品
    const candidates = await this.getCandidateItems(
      category || features.category,
      minPrice,
      maxPrice,
      limit * 3,
    );

    // 计算相似度并排序
    const scoredItems = await Promise.all(
      candidates.map(async (item) => {
        const similarity = await this.calculateSimilarity(features, item);
        const matchReasons = this.generateMatchReasons(
          features,
          item,
          similarity,
        );
        return {
          ...item,
          similarityScore: similarity,
          matchReasons,
        };
      }),
    );

    // 按相似度排序并返回 top N
    scoredItems.sort((a: ClothingItemCandidate & { similarityScore: number; matchReasons: string[] }, b: ClothingItemCandidate & { similarityScore: number; matchReasons: string[] }) => b.similarityScore - a.similarityScore);

    return scoredItems.slice(0, limit).map((item) => ({
      id: item.id,
      name: item.name,
      images: item.images,
      price: Number(item.price),
      currency: item.currency,
      category: item.category,
      subcategory: item.subcategory,
      colors: item.colors ?? [],
      tags: item.tags ?? [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      brand: item.brand,
      similarityScore: item.similarityScore,
      matchReasons: item.matchReasons,
    }));
  }

  async extractFeatures(imageBuffer: Buffer): Promise<ImageFeatures> {
    const analysis = await this.aiImageService.analyzeImage(imageBuffer);
    return this.mapAnalysisToFeatures(analysis);
  }

  private async getCandidateItems(
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    limit?: number,
  ): Promise<ClothingItemCandidate[]> {
    const where: ClothingItemWhereInput = { isActive: true };

    if (category) {
      where.category = category as ClothingCategory;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        (where.price as { gte?: number }).gte = minPrice;
      }
      if (maxPrice !== undefined) {
        (where.price as { lte?: number }).lte = maxPrice;
      }
    }

    return this.prisma.clothingItem.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      take: limit,
    }) as Promise<ClothingItemCandidate[]>;
  }

  private async calculateSimilarity(
    queryFeatures: ImageFeatures,
    item: ClothingItemCandidate,
  ): Promise<number> {
    let score = 50; // 基础分

    // 颜色相似度
    if (item.colors && item.colors.length > 0) {
      const colorMatch = this.calculateColorMatch(
        queryFeatures.dominantColors,
        item.colors,
      );
      score += colorMatch * 20;
    }

    // 基于商品属性的相似度
    const attrs = getClothingAttributes(item.attributes);
    if (attrs) {
      // 风格匹配
      if (attrs.style) {
        score += 5;
      }

      // 图案匹配
      if (attrs.patterns && attrs.patterns.length > 0) {
        score += 5;
      }

      if (
        queryFeatures.style &&
        Array.isArray(attrs.style) &&
        attrs.style.some(
          (style) =>
            style.toLowerCase() === queryFeatures.style?.toLowerCase(),
        )
      ) {
        score += 10;
      }
    }

    // 热度加成
    score += Math.min(item.viewCount / 200, 5);
    score += Math.min(item.likeCount / 100, 5);

    return Math.min(score, 100);
  }

  private calculateColorMatch(
    queryColors: string[],
    itemColors: string[],
  ): number {
    if (!queryColors.length || !itemColors.length) {return 0;}

    let matchCount = 0;
    const colorMappings: Record<string, string[]> = {
      red: ["red", "crimson", "scarlet", "maroon", "burgundy", "wine"],
      orange: ["orange", "coral", "peach", "rust", "terracotta"],
      yellow: ["yellow", "gold", "mustard", "amber", "cream"],
      green: ["green", "olive", "emerald", "mint", "forest", "sage"],
      blue: ["blue", "navy", "azure", "teal", "cyan", "indigo"],
      purple: ["purple", "violet", "lavender", "plum", "magenta"],
      pink: ["pink", "rose", "blush", "fuchsia"],
      brown: ["brown", "tan", "beige", "camel", "chocolate", "coffee"],
      black: ["black", "charcoal", "ebony", "jet"],
      white: ["white", "ivory", "cream", "snow"],
      gray: ["gray", "grey", "silver", "slate", "ash"],
    };

    for (const qc of queryColors) {
      const qcLower = qc.toLowerCase();
      for (const ic of itemColors) {
        const icLower = ic.toLowerCase();

        // 直接匹配
        if (
          qcLower === icLower ||
          icLower.includes(qcLower) ||
          qcLower.includes(icLower)
        ) {
          matchCount++;
          break;
        }

        // 通过映射匹配
        for (const [, variants] of Object.entries(colorMappings)) {
          if (
            variants.some((v) => qcLower.includes(v)) &&
            variants.some((v) => icLower.includes(v))
          ) {
            matchCount += 0.8;
            break;
          }
        }
      }
    }

    return Math.min(matchCount / queryColors.length, 1);
  }

  private generateMatchReasons(
    features: ImageFeatures,
    item: ClothingItemCandidate,
    similarity: number,
  ): string[] {
    const reasons: string[] = [];

    if (similarity > 80) {
      reasons.push("高度相似的款式");
    } else if (similarity > 60) {
      reasons.push("风格相近");
    }

    // 颜色匹配原因
    if (
      item.colors &&
      item.colors.length > 0 &&
      features.dominantColors.length > 0
    ) {
      const matchedColor = this.findMatchedColor(
        features.dominantColors,
        item.colors,
      );
      if (matchedColor) {
        reasons.push(`包含${matchedColor}色调`);
      }
    }

    // 属性匹配
    const attrs = getClothingAttributes(item.attributes);
    if (attrs) {
      if (attrs.style && attrs.style.length > 0) {
        reasons.push(`${attrs.style[0] ?? ""}风格`);
      }
      if (attrs.occasions && attrs.occasions.length > 0) {
        reasons.push(`适合${attrs.occasions[0] ?? ""}`);
      }
    }

    // 品牌推荐
    if (item.brand) {
      reasons.push(`${item.brand.name}品牌商品`);
    }

    return reasons.slice(0, 3);
  }

  private findMatchedColor(
    queryColors: string[],
    itemColors: string[],
  ): string | null {
    for (const qc of queryColors) {
      const qcLower = qc.toLowerCase();
      for (const ic of itemColors) {
        const icLower = ic.toLowerCase();
        if (icLower.includes(qcLower) || qcLower.includes(icLower)) {
          return ic;
        }
      }
    }
    return itemColors[0] ?? null;
  }

  private mapAnalysisToFeatures(analysis: AIAnalysisResult): ImageFeatures {
    return {
      colorHistogram: [],
      dominantColors: analysis.colors || [],
      textureFeatures: [],
      embedding: analysis.embedding,
      labels: analysis.labels,
      style: analysis.style,
      category: analysis.category,
    };
  }

  async findSimilarItems(
    itemId: string,
    limit: number = 10,
  ): Promise<VisualSearchResult[]> {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    if (!item) {
      return [];
    }

    // 基于商品属性查找相似商品
    const similarItems = await this.prisma.clothingItem.findMany({
      where: {
        isActive: true,
        id: { not: itemId },
        category: item.category,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      take: limit * 2,
    });

    // 计算相似度
    const scoredItems = similarItems.map((similar: ClothingItemCandidate) => {
      let score = 50;

      // 同品牌加成
      if (similar.brandId === item.brandId) {
        score += 10;
      }

      // 颜色匹配
      if (item.colors && similar.colors) {
        const commonColors = item.colors.filter((c: string) =>
          similar.colors.some((sc: string) =>
            sc.toLowerCase().includes(c.toLowerCase()),
          ),
        );
        score += commonColors.length * 10;
      }

      // 属性匹配
      const itemAttrs = getClothingAttributes(item.attributes);
      const similarAttrs = getClothingAttributes(similar.attributes);

      if (itemAttrs?.style && similarAttrs?.style) {
        const similarStyles = similarAttrs.style;
        const commonStyles = itemAttrs.style.filter((s) =>
          similarStyles.includes(s),
        );
        score += commonStyles.length * 5;
      }

      return {
        id: similar.id,
        name: similar.name,
        images: similar.images,
        price: Number(similar.price),
        currency: similar.currency,
        category: similar.category,
        subcategory: similar.subcategory,
        colors: similar.colors ?? [],
        tags: similar.tags ?? [],
        createdAt: similar.createdAt,
        updatedAt: similar.updatedAt,
        brand: similar.brand,
        similarityScore: Math.min(score, 100),
        matchReasons: this.generateSimilarItemReasons(item, similar),
      };
    });

    scoredItems.sort((a: ClothingItemCandidate & { similarityScore: number; matchReasons: string[] }, b: ClothingItemCandidate & { similarityScore: number; matchReasons: string[] }) => b.similarityScore - a.similarityScore);

    return scoredItems.slice(0, limit);
  }

  private generateSimilarItemReasons(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    original: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    similar: any,
  ): string[] {
    const reasons: string[] = ["相似款式"];

    if (original.brandId === similar.brandId && similar.brand) {
      reasons.push(`同品牌 ${similar.brand.name}`);
    }

    if (original.colors && similar.colors) {
      const commonColors = original.colors.filter((c: string) =>
        similar.colors.some((sc: string) =>
          sc.toLowerCase().includes(c.toLowerCase()),
        ),
      );
      if (commonColors.length > 0) {
        reasons.push(`相同${commonColors[0] ?? ""}色系`);
      }
    }

    return reasons;
  }
}
