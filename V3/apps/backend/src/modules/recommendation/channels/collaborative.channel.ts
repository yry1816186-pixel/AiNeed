import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  IRecommendationChannel,
  ChannelCandidate,
  RecommendationFilters,
} from './channel.interface';

@Injectable()
export class CollaborativeChannel implements IRecommendationChannel {
  readonly channelType = 'collaborative' as const;
  private readonly logger = new Logger(CollaborativeChannel.name);

  constructor(private readonly prisma: PrismaService) {}

  async recommend(
    userId: string,
    limit: number,
    filters?: RecommendationFilters,
  ): Promise<ChannelCandidate[]> {
    const similarUserIds = await this.findSimilarUsers(userId);
    if (similarUserIds.length === 0) {
      this.logger.warn(`No similar users found for user ${userId}`);
      return [];
    }

    const interactedIds = await this.getUserInteractedItemIds(userId);

    const whereClause: Record<string, unknown> = {
      isActive: true,
      id: { notIn: [...interactedIds, ...(filters?.excludeIds ?? [])] },
    };

    if (filters?.occasion) {
      whereClause.occasions = { has: filters.occasion };
    }
    if (filters?.style) {
      whereClause.styleTags = { has: filters.style };
    }
    if (filters?.budgetRange) {
      const priceFilter = this.parseBudgetRange(filters.budgetRange);
      if (priceFilter) {
        whereClause.price = priceFilter;
      }
    }

    const candidateItems = await this.prisma.clothingItem.findMany({
      where: whereClause,
      take: limit * 4,
    });

    const interactionCounts = await this.prisma.userInteraction.groupBy({
      by: ['clothingId'],
      where: {
        userId: { in: similarUserIds },
        clothingId: { in: candidateItems.map((item: { id: string }) => item.id) },
        interactionType: { in: ['like', 'favorite', 'purchase'] },
      },
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    for (const row of interactionCounts) {
      countMap.set(row.clothingId, row._count.id);
    }

    const scoredItems: ChannelCandidate[] = candidateItems.map((item: ChannelCandidate['clothing']) => {
      const interactionCount = countMap.get(item.id) ?? 0;
      const score = Math.min(interactionCount / (similarUserIds.length * 2), 1);
      const reason = this.generateReason(interactionCount, similarUserIds.length);
      return { clothing: item, score, reason };
    });

    scoredItems.sort((a: ChannelCandidate, b: ChannelCandidate) => b.score - a.score);
    return scoredItems.slice(0, limit);
  }

  private async findSimilarUsers(userId: string): Promise<string[]> {
    const userFavorites = await this.prisma.favorite.findMany({
      where: {
        userId,
        targetType: 'clothing',
      },
      select: { targetId: true },
    });

    if (userFavorites.length === 0) {
      return [];
    }

    const userFavoriteIds = userFavorites.map((f: { targetId: string }) => f.targetId);

    const sharedFavoriters = await this.prisma.favorite.findMany({
      where: {
        targetType: 'clothing',
        targetId: { in: userFavoriteIds },
        userId: { not: userId },
      },
      select: { userId: true, targetId: true },
      take: 5000,
    });

    const userItemMap = new Map<string, Set<string>>();
    for (const fav of sharedFavoriters) {
      const favUserId: string = fav.userId;
      const favTargetId: string = fav.targetId;
      if (!userItemMap.has(favUserId)) {
        userItemMap.set(favUserId, new Set<string>());
      }
      const userItems = userItemMap.get(favUserId);
      if (userItems) {
        userItems.add(favTargetId);
      }
    }

    const userFavoriteIdSet = new Set<string>(userFavoriteIds);

    const similarities: Array<{ userId: string; similarity: number }> = [];
    for (const [otherUserId, otherItems] of userItemMap) {
      const similarity = this.jaccardSimilarity(userFavoriteIdSet, otherItems);
      if (similarity > 0.1) {
        similarities.push({ userId: otherUserId, similarity });
      }
    }

    similarities.sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity);
    return similarities.slice(0, 20).map((s: { userId: string }) => s.userId);
  }

  private jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private async getUserInteractedItemIds(userId: string): Promise<string[]> {
    const interactions = await this.prisma.userInteraction.findMany({
      where: { userId },
      select: { clothingId: true },
      distinct: ['clothingId'],
    });
    return interactions.map((i: { clothingId: string }) => i.clothingId);
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

  private generateReason(
    interactionCount: number,
    similarUserCount: number,
  ): string {
    if (interactionCount >= 3) {
      return `${similarUserCount}位品味相似的用户强烈推荐`;
    }
    if (interactionCount >= 1) {
      return `${similarUserCount}位品味相似的用户也喜欢`;
    }
    return '基于相似用户的偏好推荐';
  }
}
