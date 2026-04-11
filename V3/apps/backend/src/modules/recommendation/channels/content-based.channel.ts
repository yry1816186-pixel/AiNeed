import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IRecommendationChannel,
  ChannelCandidate,
  RecommendationFilters,
} from './channel.interface';

@Injectable()
export class ContentBasedChannel implements IRecommendationChannel {
  readonly channelType = 'content' as const;
  private readonly logger = new Logger(ContentBasedChannel.name);

  constructor(private readonly prisma: PrismaService) {}

  async recommend(
    userId: string,
    limit: number,
    filters?: RecommendationFilters,
  ): Promise<ChannelCandidate[]> {
    const preferences = await this.prisma.userStylePreference.findFirst({
      where: { userId },
    });

    if (!preferences) {
      this.logger.warn(`No style preferences found for user ${userId}, using empty defaults`);
    }

    const styleTags = preferences?.styleTags ?? [];
    const colorPreferences = preferences?.colorPreferences ?? [];
    const occasionTags = preferences?.occasionTags ?? [];
    const budgetRange = filters?.budgetRange ?? preferences?.budgetRange;

    const whereClause = this.buildWhereClause(
      styleTags,
      colorPreferences,
      occasionTags,
      budgetRange,
      filters,
    );

    const items = await this.prisma.clothingItem.findMany({
      where: whereClause,
      take: limit * 3,
      orderBy: { createdAt: 'desc' },
    });

    const candidates = items.map((item) => {
      const score = this.calculateScore(
        item,
        styleTags,
        colorPreferences,
        occasionTags,
      );
      const reason = this.generateReason(
        item,
        styleTags,
        colorPreferences,
        occasionTags,
      );
      return { clothing: item, score, reason };
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit);
  }

  private buildWhereClause(
    styleTags: string[],
    colorPreferences: string[],
    occasionTags: string[],
    budgetRange?: string | null,
    filters?: RecommendationFilters,
  ) {
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (filters?.excludeIds && filters.excludeIds.length > 0) {
      where.id = { notIn: filters.excludeIds };
    }

    if (filters?.occasion) {
      where.occasions = { has: filters.occasion };
    } else if (occasionTags.length > 0) {
      where.occasions = { hasSome: occasionTags };
    }

    if (filters?.style) {
      where.styleTags = { has: filters.style };
    } else if (styleTags.length > 0) {
      where.styleTags = { hasSome: styleTags };
    }

    if (colorPreferences.length > 0) {
      where.colors = { hasSome: colorPreferences };
    }

    if (budgetRange) {
      const priceFilter = this.parseBudgetRange(budgetRange);
      if (priceFilter) {
        where.price = priceFilter;
      }
    }

    return where;
  }

  private parseBudgetRange(
    budgetRange: string,
  ): { gte?: number; lte?: number } | null {
    const parts = budgetRange.split('-').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { gte: parts[0], lte: parts[1] };
    }
    if (parts.length === 1 && !isNaN(parts[0])) {
      return { gte: parts[0] };
    }
    return null;
  }

  private calculateScore(
    item: { styleTags: string[]; colors: string[]; occasions: string[] },
    styleTags: string[],
    colorPreferences: string[],
    occasionTags: string[],
  ): number {
    let score = 0;
    let totalWeight = 0;

    const styleOverlap = this.computeOverlap(item.styleTags, styleTags);
    score += styleOverlap * 0.4;
    totalWeight += 0.4;

    const colorOverlap = this.computeOverlap(item.colors, colorPreferences);
    score += colorOverlap * 0.3;
    totalWeight += 0.3;

    const occasionOverlap = this.computeOverlap(item.occasions, occasionTags);
    score += occasionOverlap * 0.3;
    totalWeight += 0.3;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private computeOverlap(itemTags: string[], userTags: string[]): number {
    if (userTags.length === 0) return 0;
    const userSet = new Set(userTags);
    const matchCount = itemTags.filter((tag) => userSet.has(tag)).length;
    return matchCount / userSet.size;
  }

  private generateReason(
    item: { styleTags: string[]; colors: string[]; occasions: string[] },
    styleTags: string[],
    colorPreferences: string[],
    occasionTags: string[],
  ): string {
    const reasons: string[] = [];

    const matchedStyles = item.styleTags.filter((t) =>
      styleTags.includes(t),
    );
    if (matchedStyles.length > 0) {
      reasons.push(`与您偏好的${matchedStyles.join('、')}风格匹配`);
    }

    const matchedColors = item.colors.filter((c) =>
      colorPreferences.includes(c),
    );
    if (matchedColors.length > 0) {
      reasons.push(`包含您喜欢的${matchedColors.join('、')}色系`);
    }

    const matchedOccasions = item.occasions.filter((o) =>
      occasionTags.includes(o),
    );
    if (matchedOccasions.length > 0) {
      reasons.push(`适合${matchedOccasions.join('、')}场合`);
    }

    return reasons.length > 0 ? reasons.join('，') : '基于您的风格偏好推荐';
  }
}
