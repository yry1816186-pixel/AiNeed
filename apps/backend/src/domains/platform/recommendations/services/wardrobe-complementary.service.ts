import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { PreferenceLearningService } from "./preference-learning.service";

const STYLE_UNIVERSE: readonly string[] = [
  "minimalist",
  "classic",
  "romantic",
  "edgy",
  "casual",
  "sporty",
  "streetwear",
  "elegant",
  "trendy",
  "bohemian",
];

const CATEGORY_UNIVERSE: readonly string[] = [
  "tops",
  "bottoms",
  "outerwear",
  "accessories",
  "footwear",
  "dresses",
];

const MIN_CATEGORY_ITEMS = 2;
const UNEXPLORED_THRESHOLD = 0.1;

export interface StyleGap {
  style: string;
  representation: number;
  isUnexplored: boolean;
}

export interface CategoryGap {
  category: string;
  count: number;
  isGap: boolean;
}

export interface BridgeRecommendation {
  itemId: string;
  dominantStyle: string;
  newStyle: string;
  bridgeType: "bridge" | "explore";
  reason: string;
}

function safeIncrement(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

@Injectable()
export class WardrobeComplementaryService {
  private readonly logger = new Logger(WardrobeComplementaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly preferenceLearning: PreferenceLearningService
  ) {}

  async getUnexploredStyles(userId: string): Promise<StyleGap[]> {
    const wardrobeItems = await this.prisma.userClothing.findMany({
      where: { userId },
      select: { style: true },
    });

    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        item: {
          select: { tags: true, attributes: true },
        },
      },
    });

    const styleCounts = new Map<string, number>();
    for (const style of STYLE_UNIVERSE) {
      styleCounts.set(style, 0);
    }

    for (const item of wardrobeItems) {
      for (const style of item.style) {
        const normalized = style.toLowerCase();
        if (styleCounts.has(normalized)) {
          safeIncrement(styleCounts, normalized);
        }
      }
    }

    for (const fav of favorites) {
      if (!fav.item) {continue;}
      const tags = (fav.item.tags as string[]) || [];
      const attrs = fav.item.attributes as Record<string, unknown> | null;
      if (attrs?.style) {
        const normalized = String(attrs.style).toLowerCase();
        if (styleCounts.has(normalized)) {
          safeIncrement(styleCounts, normalized);
        }
      }
      for (const tag of tags) {
        const normalized = tag.toLowerCase();
        if (styleCounts.has(normalized)) {
          safeIncrement(styleCounts, normalized);
        }
      }
    }

    let total = 0;
    for (const count of styleCounts.values()) {
      total += count;
    }
    if (total === 0) {total = 1;}

    return STYLE_UNIVERSE.map((style) => {
      const count = styleCounts.get(style) ?? 0;
      return {
        style,
        representation: count / total,
        isUnexplored: count / total < UNEXPLORED_THRESHOLD,
      };
    });
  }

  async getComplementaryRecommendations(
    userId: string,
    context?: { occasion?: string; season?: string }
  ): Promise<BridgeRecommendation[]> {
    const [unexplored, topPreferences] = await Promise.all([
      this.getUnexploredStyles(userId),
      this.preferenceLearning.getTopPreferences(userId, "style_keyword", 3),
    ]);

    const dominantStyles = topPreferences.length > 0 ? topPreferences : ["casual"];
    const unexploredStyles = unexplored.filter((s) => s.isUnexplored).map((s) => s.style);

    if (unexploredStyles.length === 0) {
      return [];
    }

    const recommendations: BridgeRecommendation[] = [];

    for (const dominant of dominantStyles) {
      for (const newStyle of unexploredStyles.slice(0, 2)) {
        const bridgeItems = await this.findBridgeItems(dominant, newStyle, context);
        for (const itemId of bridgeItems) {
          recommendations.push({
            itemId,
            dominantStyle: dominant,
            newStyle,
            bridgeType: "bridge",
            reason: `这件单品可以搭配你现有的${dominant}风格，同时探索${newStyle}方向`,
          });
        }
      }
    }

    if (recommendations.length < 2) {
      const firstDominant = dominantStyles[0] ?? "casual";
      for (const newStyle of unexploredStyles) {
        const exploreItems = await this.findExploreItems(newStyle, context);
        for (const itemId of exploreItems) {
          recommendations.push({
            itemId,
            dominantStyle: firstDominant,
            newStyle,
            bridgeType: "explore",
            reason: `探索${newStyle}风格的新方向`,
          });
        }
        if (recommendations.length >= 4) {break;}
      }
    }

    return recommendations.slice(0, 3);
  }

  async getStyleGaps(userId: string): Promise<CategoryGap[]> {
    const wardrobeItems = await this.prisma.userClothing.findMany({
      where: { userId },
      select: { category: true },
    });

    const categoryCounts = new Map<string, number>();
    for (const cat of CATEGORY_UNIVERSE) {
      categoryCounts.set(cat, 0);
    }

    for (const item of wardrobeItems) {
      const normalized = item.category?.toLowerCase();
      if (normalized && categoryCounts.has(normalized)) {
        safeIncrement(categoryCounts, normalized);
      }
    }

    return CATEGORY_UNIVERSE.map((category) => {
      const count = categoryCounts.get(category) ?? 0;
      return {
        category,
        count,
        isGap: count < MIN_CATEGORY_ITEMS,
      };
    });
  }

  private async findBridgeItems(
    dominantStyle: string,
    newStyle: string,
    context?: { occasion?: string; season?: string }
  ): Promise<string[]> {
    const tagsToMatch = [dominantStyle, newStyle];

    const where: Record<string, unknown> = {
      isActive: true,
      isDeleted: false,
      tags: { hasSome: tagsToMatch },
    };

    if (context?.season) {
      where.seasons = { has: context.season };
    }

    const items = await this.prisma.clothingItem.findMany({
      where,
      select: { id: true },
      take: 2,
      orderBy: { viewCount: "desc" },
    });

    return items.map((i) => i.id);
  }

  private async findExploreItems(
    style: string,
    context?: { occasion?: string; season?: string }
  ): Promise<string[]> {
    const where: Record<string, unknown> = {
      isActive: true,
      isDeleted: false,
      tags: { has: style },
    };

    if (context?.season) {
      where.seasons = { has: context.season };
    }

    const items = await this.prisma.clothingItem.findMany({
      where,
      select: { id: true },
      take: 1,
      orderBy: { viewCount: "desc" },
    });

    return items.map((i) => i.id);
  }
}
