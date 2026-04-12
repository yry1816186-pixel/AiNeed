import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RecommendationRedisProvider } from '../redis.provider';
import {
  IRecommendationChannel,
  ChannelCandidate,
  RecommendationFilters,
  REDIS_TRENDING_PREFIX,
  REDIS_TRENDING_TTL_SECONDS,
  INTERACTION_TYPE_WEIGHTS,
} from './channel.interface';

@Injectable()
export class TrendingChannel implements IRecommendationChannel {
  readonly channelType = 'trending' as const;
  private readonly logger = new Logger(TrendingChannel.name);
  private readonly redis: RecommendationRedisProvider['client'];

  constructor(
    private readonly prisma: PrismaService,
    redisProvider: RecommendationRedisProvider,
  ) {
    this.redis = redisProvider.client;
  }

  async recommend(
    _userId: string,
    limit: number,
    filters?: RecommendationFilters,
  ): Promise<ChannelCandidate[]> {
    const category = filters?.occasion ?? 'all';
    const key = `${REDIS_TRENDING_PREFIX}:${category}`;

    const exists = await this.redis.exists(key);
    if (!exists) {
      await this.refreshTrendingData(category);
    }

    const results = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    if (results.length === 0) {
      return [];
    }

    const itemScores = this.parseZrangeResults(results);
    const clothingIds = itemScores.map((r) => r.id);

    const filteredIds = filters?.excludeIds
      ? clothingIds.filter((cid: string) => !filters.excludeIds?.includes(cid))
      : clothingIds;

    const items = await this.prisma.clothingItem.findMany({
      where: {
        id: { in: filteredIds },
        isActive: true,
      },
    });

    const itemMap = new Map<string, ChannelCandidate['clothing']>(items.map((item: ChannelCandidate['clothing']) => [item.id, item]));

    const candidates: ChannelCandidate[] = [];
    for (const { id, score } of itemScores) {
      const clothing = itemMap.get(id);
      if (clothing) {
        const normalizedScore = this.normalizeScore(score);
        candidates.push({
          clothing,
          score: normalizedScore,
          reason: this.generateReason(category, score),
        });
      }
    }

    return candidates.slice(0, limit);
  }

  async getTrending(
    category: string | undefined,
    limit: number,
    _timeRange: string,
  ): Promise<Array<{ clothingId: string; score: number }>> {
    const key = `${REDIS_TRENDING_PREFIX}:${category ?? 'all'}`;

    const exists = await this.redis.exists(key);
    if (!exists) {
      await this.refreshTrendingData(category ?? 'all');
    }

    const results = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    return this.parseZrangeResults(results).map((r) => ({
      clothingId: r.id,
      score: r.score,
    }));
  }

  async trackInteraction(
    clothingId: string,
    interactionType: string,
    category?: string,
  ): Promise<void> {
    const weight = INTERACTION_TYPE_WEIGHTS[interactionType] ?? 1;
    if (weight <= 0) return;

    const categories = category ? [category, 'all'] : ['all'];

    for (const cat of categories) {
      const key = `${REDIS_TRENDING_PREFIX}:${cat}`;
      await this.redis.zincrby(key, weight, clothingId);
      await this.redis.expire(key, REDIS_TRENDING_TTL_SECONDS);
    }
  }

  private async refreshTrendingData(category: string): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const interactions = await this.prisma.userInteraction.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        interactionType: { in: ['view', 'like', 'favorite', 'purchase'] },
      },
      select: {
        clothingId: true,
        interactionType: true,
      },
    });

    const scoreMap = new Map<string, number>();
    for (const interaction of interactions) {
      const weight = INTERACTION_TYPE_WEIGHTS[interaction.interactionType] ?? 1;
      const current = scoreMap.get(interaction.clothingId) ?? 0;
      scoreMap.set(interaction.clothingId, current + weight);
    }

    if (scoreMap.size === 0) return;

    const key = `${REDIS_TRENDING_PREFIX}:${category}`;
    const pipeline = this.redis.pipeline();
    for (const [clothingId, score] of scoreMap) {
      pipeline.zadd(key, score, clothingId);
    }
    pipeline.expire(key, REDIS_TRENDING_TTL_SECONDS);
    await pipeline.exec();

    this.logger.log(`Refreshed trending data for category: ${category}, items: ${scoreMap.size}`);
  }

  private parseZrangeResults(
    results: string[],
  ): Array<{ id: string; score: number }> {
    const parsed: Array<{ id: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      const id = results[i];
      const score = parseFloat(results[i + 1]);
      if (id && !isNaN(score)) {
        parsed.push({ id, score });
      }
    }
    return parsed;
  }

  private normalizeScore(rawScore: number): number {
    return Math.min(rawScore / 50, 1);
  }

  private generateReason(category: string, score: number): string {
    if (category === 'all') {
      return score >= 20
        ? '近期超热门单品'
        : '近期热门推荐';
    }
    return score >= 20
      ? `${category}场合近期超热门单品`
      : `${category}场合近期热门推荐`;
  }
}
