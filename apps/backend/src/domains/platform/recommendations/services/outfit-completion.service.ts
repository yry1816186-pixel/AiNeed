/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClothingCategory } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";

import { QdrantService } from "./qdrant.service";

type ClothingItemWithBrand = {
  id: string;
  name: string;
  category: string;
  colors: string[];
  tags: string[];
  images: string[];
  price: { toNumber(): number } | null;
  brand: { name: string } | null;
};

export interface OutfitCompletionResult {
  anchor: {
    id: string;
    name: string;
    category: string;
    imageUrl: string;
    price?: number;
  };
  suggestions: {
    top: OutfitSuggestionItem[];
    bottom: OutfitSuggestionItem[];
    shoes: OutfitSuggestionItem[];
    accessories: OutfitSuggestionItem[];
  };
  harmonyScore: number;
  harmonyRule: string;
  harmonyDescription: string;
}

export interface OutfitSuggestionItem {
  id: string;
  name: string;
  imageUrl: string;
  price?: number;
  brand?: string;
  matchScore: number;
  reason: string;
}

@Injectable()
export class OutfitCompletionService {
  private readonly logger = new Logger(OutfitCompletionService.name);

  private readonly categoryMap: Record<string, string[]> = {
    tops: ["bottoms", "footwear", "accessories"],
    bottoms: ["tops", "footwear", "accessories"],
    dresses: ["footwear", "accessories"],
    outerwear: ["tops", "bottoms", "footwear"],
    footwear: ["tops", "bottoms", "accessories"],
    accessories: ["tops", "bottoms", "footwear"],
  };

  private readonly complementaryColors: Record<string, string[]> = {
    black: ["white", "gray", "red", "gold", "navy"],
    white: ["black", "navy", "red", "blue", "brown"],
    navy: ["white", "beige", "brown", "light_blue", "gold"],
    blue: ["white", "beige", "brown", "orange"],
    red: ["black", "white", "navy", "gray"],
    gray: ["white", "black", "navy", "burgundy"],
    beige: ["navy", "brown", "black", "white"],
    brown: ["beige", "white", "blue", "olive"],
    green: ["white", "beige", "brown", "navy"],
    pink: ["white", "navy", "gray", "black"],
  };

  private readonly categoryKeyMap: Record<string, string> = {
    tops: "top",
    bottoms: "bottom",
    footwear: "shoes",
    accessories: "accessories",
    dresses: "top",
    outerwear: "top",
  };

  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private configService: ConfigService,
  ) {}

  async getCompleteTheLook(
    clothingId: string,
    userId?: string,
  ): Promise<OutfitCompletionResult> {
    const anchor = await this.prisma.clothingItem.findUnique({
      where: { id: clothingId },
      include: { brand: true },
    });

    if (!anchor) {
      throw new Error(`Clothing item not found: ${clothingId}`);
    }

    const anchorCategory = anchor.category as string;
    const targetCategories = this.categoryMap[anchorCategory] || [
      "tops",
      "bottoms",
      "footwear",
      "accessories",
    ];

    const anchorColors = anchor.colors || [];
    const anchorStyles = anchor.tags || [];
    const anchorOccasions = anchor.tags?.filter((t) =>
      ["daily", "work", "date", "party", "sport", "travel", "interview", "dinner", "formal", "casual"].includes(t.toLowerCase()),
    ) || [];

    const suggestions: Record<string, OutfitSuggestionItem[]> = {};

    for (const targetCat of targetCategories) {
      const candidates = await this.findComplementaryItems(
        anchor,
        targetCat,
        anchorColors,
        anchorStyles,
        anchorOccasions,
        userId,
      );
      const key = this.categoryKeyMap[targetCat] || targetCat;
      suggestions[key] = candidates.slice(0, 3);
    }

    const allSuggestedItems = Object.values(suggestions).flat();
    const harmony = this.calculateOutfitHarmony(anchorColors, allSuggestedItems);

    return {
      anchor: {
        id: anchor.id,
        name: anchor.name,
        category: anchorCategory,
        imageUrl: anchor.images?.[0] || "",
        price: anchor.price?.toNumber(),
      },
      suggestions: {
        top: suggestions.top || [],
        bottom: suggestions.bottom || [],
        shoes: suggestions.shoes || [],
        accessories: suggestions.accessories || [],
      },
      harmonyScore: harmony.score,
      harmonyRule: harmony.rule,
      harmonyDescription: harmony.description,
    };
  }

  private async findComplementaryItems(
    anchor: ClothingItemWithBrand,
    targetCategory: string,
    anchorColors: string[],
    anchorStyles: string[],
    anchorOccasions: string[],
    userId?: string,
  ): Promise<OutfitSuggestionItem[]> {
    const vectorResults = await this.searchByVector(anchor.id, targetCategory);

    const dbItems = await this.prisma.clothingItem.findMany({
      where: {
        category: targetCategory as ClothingCategory,
        id: { not: anchor.id },
        ...(userId
          ? {
              favorites: { none: { userId } },
            }
          : {}),
      },
      include: { brand: true },
      take: 30,
      orderBy: { createdAt: "desc" },
    });

    const scored = dbItems.map((item) => {
      let score = 0;
      const itemColors = item.colors || [];
      const itemStyles = item.tags || [];

      const colorMatch = this.calculateColorMatch(anchorColors, itemColors);
      score += colorMatch * 40;

      const styleOverlap = this.calculateSetOverlap(anchorStyles, itemStyles);
      score += styleOverlap * 30;

      const occasionOverlap = this.calculateSetOverlap(anchorOccasions, itemStyles);
      score += occasionOverlap * 20;

      const vectorMatch = vectorResults.find((v) => v.id === item.id);
      if (vectorMatch) {
        score += vectorMatch.score * 10;
      }

      const priceDiff = Math.abs(
        (anchor.price?.toNumber() || 100) - (item.price?.toNumber() || 100),
      );
      if (priceDiff < 50) {score += 5;}
      else if (priceDiff < 150) {score += 2;}

      let reason = "";
      if (colorMatch > 0.5) {reason = "色彩搭配和谐";}
      else if (styleOverlap > 0.5) {reason = "风格一致";}
      else if (occasionOverlap > 0.5) {reason = "场合适配";}
      else {reason = "推荐搭配";}

      return {
        id: item.id,
        name: item.name,
        imageUrl: (item.images)?.[0] || "",
        price: item.price?.toNumber(),
        brand: item.brand?.name,
        matchScore: Math.round(score),
        reason,
      };
    });

    return scored.sort((a: OutfitSuggestionItem, b: OutfitSuggestionItem) => b.matchScore - a.matchScore);
  }

  private async searchByVector(
    anchorId: string,
    targetCategory: string,
  ): Promise<{ id: string; score: number }[]> {
    try {
      const anchorVector = await this.qdrantService.getVector(anchorId);
      if (!anchorVector) {return [];}

      const results = await this.qdrantService.searchSimilar(anchorVector.vector, {
        topK: 10,
        filter: {
          must: [
            { key: "category", match: { value: targetCategory } },
          ],
        },
        minScore: 0.5,
      });

      return results.map((r) => ({ id: r.id, score: r.score }));
    } catch {
      return [];
    }
  }

  calculateOutfitHarmony(
    anchorColors: string[],
    items: OutfitSuggestionItem[],
  ): { score: number; rule: string; description: string } {
    if (items.length === 0) {
      return {
        score: 50,
        rule: "single",
        description: "单品推荐，暂无搭配数据",
      };
    }

    const allColors = [...anchorColors];
    const uniqueColors = [...new Set(allColors.map((c) => c.toLowerCase()))];
    return this.analyzeColorHarmony(uniqueColors);
  }

  private analyzeColorHarmony(colors: string[]): {
    score: number;
    rule: string;
    description: string;
  } {
    if (colors.length <= 1) {
      return {
        score: 80,
        rule: "monochromatic",
        description: "单色系搭配，简约统一",
      };
    }

    const neutralColors = ["black", "white", "gray", "beige", "navy", "brown"];
    const nonNeutral = colors.filter((c) => !neutralColors.includes(c));

    if (nonNeutral.length === 0) {
      return {
        score: 85,
        rule: "neutral",
        description: "中性色搭配，百搭经典",
      };
    }

    if (nonNeutral.length === 1) {
      return {
        score: 90,
        rule: "accent",
        description: "中性色+点缀色，时尚有层次",
      };
    }

    for (const color of nonNeutral) {
      const compColors = this.complementaryColors[color] || [];
      const hasComp = nonNeutral.some((c) => compColors.includes(c));
      if (hasComp) {
        return {
          score: 82,
          rule: "complementary",
          description: "互补色搭配，鲜明对比",
        };
      }
    }

    if (nonNeutral.length === 2) {
      return {
        score: 75,
        rule: "analogous",
        description: "类似色搭配，和谐自然",
      };
    }

    return {
      score: 65,
      rule: "multicolor",
      description: "多色搭配，建议减少颜色数量",
    };
  }

  private calculateColorMatch(colors1: string[], colors2: string[]): number {
    if (colors1.length === 0 || colors2.length === 0) {return 0.3;}

    let matchCount = 0;
    for (const c1 of colors1) {
      const compColors = this.complementaryColors[c1.toLowerCase()] || [];
      for (const c2 of colors2) {
        if (c1.toLowerCase() === c2.toLowerCase() || compColors.includes(c2.toLowerCase())) {
          matchCount++;
        }
      }
    }

    return Math.min(matchCount / Math.max(colors1.length, 1), 1);
  }

  private calculateSetOverlap(set1: string[], set2: string[]): number {
    if (set1.length === 0 || set2.length === 0) {return 0;}
    const s2Lower = set2.map((s) => s.toLowerCase());
    const overlap = set1.filter((s) => s2Lower.includes(s.toLowerCase())).length;
    return overlap / Math.max(set1.length, set2.length);
  }
}
