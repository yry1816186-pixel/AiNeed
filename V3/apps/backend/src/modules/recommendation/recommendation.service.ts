import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentBasedChannel } from './channels/content-based.channel';
import { CollaborativeChannel } from './channels/collaborative.channel';
import { TrendingChannel } from './channels/trending.channel';
import {
  IRecommendationChannel,
  ChannelCandidate,
  RecommendationFilters,
  RecommendationChannelType,
  CHANNEL_WEIGHTS,
  SimilarItemResult,
} from './channels/channel.interface';
import { RecommendationQueryDto, TrendingQueryDto, TrackInteractionDto } from './dto/recommendation-query.dto';

interface FusedCandidate {
  clothingId: string;
  clothing: ChannelCandidate['clothing'];
  weightedScore: number;
  reasons: string[];
  dominantChannel: RecommendationChannelType;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly channels: IRecommendationChannel[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentBasedChannel: ContentBasedChannel,
    private readonly collaborativeChannel: CollaborativeChannel,
    private readonly trendingChannel: TrendingChannel,
  ) {
    this.channels = [contentBasedChannel, collaborativeChannel, trendingChannel];
  }

  async getPersonalizedRecommendations(
    userId: string,
    query: RecommendationQueryDto,
  ) {
    const limit = query.limit ?? 10;
    const filters: RecommendationFilters = {
      occasion: query.occasion,
      style: query.style,
      budgetRange: query.budgetRange,
      excludeIds: query.excludeIds,
    };

    const hasInteractions = await this.userHasInteractions(userId);

    let candidates: FusedCandidate[];

    if (!hasInteractions) {
      candidates = await this.coldStartRecommend(userId, limit, filters);
    } else {
      candidates = await this.fusedRecommend(userId, limit, filters);
    }

    const items = candidates.slice(0, limit).map((c) => ({
      clothing: c.clothing,
      score: Math.round(c.weightedScore * 100) / 100,
      reason: c.reasons.join('；'),
    }));

    const dominantChannel = items.length > 0
      ? candidates[0].dominantChannel
      : 'content' as const;

    return { items, channel: dominantChannel };
  }

  async getTrendingRecommendations(query: TrendingQueryDto) {
    const limit = query.limit ?? 10;
    const trendingResults = await this.trendingChannel.getTrending(
      query.category,
      limit,
      query.timeRange,
    );

    if (trendingResults.length === 0) {
      return { items: [] };
    }

    const clothingIds = trendingResults.map((r) => r.clothingId);
    const items = await this.prisma.clothingItem.findMany({
      where: {
        id: { in: clothingIds },
        isActive: true,
      },
    });

    const itemMap = new Map(items.map((item) => [item.id, item]));
    const scoreMap = new Map(trendingResults.map((r) => [r.clothingId, r.score]));

    const result = clothingIds
      .map((id) => {
        const clothing = itemMap.get(id);
        const score = scoreMap.get(id) ?? 0;
        return clothing ? { clothing, score: Math.round(score * 100) / 100 } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return { items: result };
  }

  async getSimilarRecommendations(clothingId: string) {
    const sourceItem = await this.prisma.clothingItem.findUnique({
      where: { id: clothingId },
    });

    if (!sourceItem) {
      throw new NotFoundException({
        code: 'CLOTHING_NOT_FOUND',
        message: '服装不存在',
      });
    }

    const similarItems = await this.findSimilarItems(sourceItem);
    return { items: similarItems };
  }

  async trackInteraction(userId: string, dto: TrackInteractionDto) {
    await this.prisma.userInteraction.create({
      data: {
        userId,
        clothingId: dto.clothingId,
        interactionType: dto.interactionType,
        durationMs: dto.durationMs,
      },
    });

    const clothing = await this.prisma.clothingItem.findUnique({
      where: { id: dto.clothingId },
      select: { categoryId: true },
    });

    const categorySlug = clothing?.categoryId ?? undefined;
    await this.trendingChannel.trackInteraction(
      dto.clothingId,
      dto.interactionType,
      categorySlug,
    );

    this.logger.log(`Tracked interaction: user=${userId}, clothing=${dto.clothingId}, type=${dto.interactionType}`);
    return { recorded: true };
  }

  private async coldStartRecommend(
    userId: string,
    limit: number,
    filters: RecommendationFilters,
  ): Promise<FusedCandidate[]> {
    const contentCandidates = await this.contentBasedChannel.recommend(
      userId,
      limit,
      filters,
    );

    const trendingCandidates = await this.trendingChannel.recommend(
      userId,
      Math.ceil(limit * 0.3),
      filters,
    );

    const candidateMap = new Map<string, FusedCandidate>();

    for (const c of contentCandidates) {
      candidateMap.set(c.clothing.id, {
        clothingId: c.clothing.id,
        clothing: c.clothing,
        weightedScore: c.score * CHANNEL_WEIGHTS.content,
        reasons: [c.reason],
        dominantChannel: 'content',
      });
    }

    for (const c of trendingCandidates) {
      const existing = candidateMap.get(c.clothing.id);
      if (existing) {
        existing.weightedScore += c.score * CHANNEL_WEIGHTS.trending;
        existing.reasons.push(c.reason);
      } else {
        candidateMap.set(c.clothing.id, {
          clothingId: c.clothing.id,
          clothing: c.clothing,
          weightedScore: c.score * CHANNEL_WEIGHTS.trending,
          reasons: [c.reason],
          dominantChannel: 'trending',
        });
      }
    }

    return this.sortAndDeduplicate(candidateMap);
  }

  private async fusedRecommend(
    userId: string,
    limit: number,
    filters: RecommendationFilters,
  ): Promise<FusedCandidate[]> {
    const candidateLimit = Math.ceil(limit * 1.5);

    const [contentCandidates, collaborativeCandidates, trendingCandidates] =
      await Promise.all([
        this.contentBasedChannel.recommend(userId, candidateLimit, filters),
        this.collaborativeChannel.recommend(userId, candidateLimit, filters),
        this.trendingChannel.recommend(userId, candidateLimit, filters),
      ]);

    const candidateMap = new Map<string, FusedCandidate>();

    this.mergeCandidates(candidateMap, contentCandidates, CHANNEL_WEIGHTS.content);
    this.mergeCandidates(candidateMap, collaborativeCandidates, CHANNEL_WEIGHTS.collaborative);
    this.mergeCandidates(candidateMap, trendingCandidates, CHANNEL_WEIGHTS.trending);

    return this.sortAndDeduplicate(candidateMap);
  }

  private mergeCandidates(
    candidateMap: Map<string, FusedCandidate>,
    candidates: ChannelCandidate[],
    weight: number,
  ): void {
    for (const c of candidates) {
      const existing = candidateMap.get(c.clothing.id);
      if (existing) {
        existing.weightedScore += c.score * weight;
        existing.reasons.push(c.reason);
        if (c.score * weight > existing.weightedScore * 0.5) {
          existing.dominantChannel = c.reason.includes('品味相似')
            ? 'collaborative'
            : c.reason.includes('热门')
              ? 'trending'
              : 'content';
        }
      } else {
        candidateMap.set(c.clothing.id, {
          clothingId: c.clothing.id,
          clothing: c.clothing,
          weightedScore: c.score * weight,
          reasons: [c.reason],
          dominantChannel: c.reason.includes('品味相似')
            ? 'collaborative'
            : c.reason.includes('热门')
              ? 'trending'
              : 'content',
        });
      }
    }
  }

  private sortAndDeduplicate(
    candidateMap: Map<string, FusedCandidate>,
  ): FusedCandidate[] {
    const candidates = Array.from(candidateMap.values());
    candidates.sort((a, b) => b.weightedScore - a.weightedScore);
    return candidates;
  }

  private async userHasInteractions(userId: string): Promise<boolean> {
    const count = await this.prisma.userInteraction.count({
      where: { userId },
      take: 1,
    });
    return count > 0;
  }

  private async findSimilarItems(
    sourceItem: {
      id: string;
      categoryId: string | null;
      styleTags: string[];
    },
  ): Promise<SimilarItemResult[]> {
    const whereClause: Record<string, unknown> = {
      isActive: true,
      id: { not: sourceItem.id },
    };

    if (sourceItem.categoryId) {
      whereClause.categoryId = sourceItem.categoryId;
    }

    const candidates = await this.prisma.clothingItem.findMany({
      where: whereClause,
      take: 50,
    });

    const sourceStyleSet = new Set(sourceItem.styleTags);

    const scored = candidates.map((item) => {
      const itemStyleSet = new Set(item.styleTags);
      const similarity = this.computeJaccard(sourceStyleSet, itemStyleSet);
      return { clothing: item, similarity };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.filter((s) => s.similarity > 0).slice(0, 10);
  }

  private computeJaccard(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }
}
