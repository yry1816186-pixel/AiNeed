import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationService } from '../recommendation.service';
import { ContentBasedChannel } from '../channels/content-based.channel';
import { CollaborativeChannel } from '../channels/collaborative.channel';
import { TrendingChannel } from '../channels/trending.channel';
import { PrismaService } from '../../../prisma/prisma.service';
import { RecommendationRedisProvider } from '../redis.provider';
import { TimeRange } from '../dto/recommendation-query.dto';
import type { ChannelCandidate } from '../channels/channel.interface';

const mockClothingItem = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  brandId: null,
  categoryId: 'cat-1',
  name: `Item ${id}`,
  description: 'Test item',
  price: 199,
  originalPrice: 299,
  currency: 'CNY',
  gender: 'female',
  seasons: ['spring'],
  occasions: ['casual'],
  styleTags: ['minimalist'],
  colors: ['black'],
  materials: ['cotton'],
  fitType: 'regular',
  imageUrls: ['https://example.com/img.jpg'],
  sourceUrl: null,
  purchaseUrl: null,
  sourceName: 'test',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockCandidate = (id: string, score: number, reason: string, overrides: Record<string, unknown> = {}): ChannelCandidate => ({
  clothing: mockClothingItem(id, overrides) as unknown as ChannelCandidate['clothing'],
  score,
  reason,
});

describe('RecommendationService', () => {
  let service: RecommendationService;
  let prisma: PrismaService;
  let contentBasedChannel: ContentBasedChannel;
  let collaborativeChannel: CollaborativeChannel;
  let trendingChannel: TrendingChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        ContentBasedChannel,
        CollaborativeChannel,
        TrendingChannel,
        {
          provide: PrismaService,
          useValue: {
            userInteraction: {
              count: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
            },
            clothingItem: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            userStylePreference: {
              findFirst: jest.fn(),
            },
            favorite: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: RecommendationRedisProvider,
          useValue: {
            client: {
              exists: jest.fn().mockResolvedValue(1),
              zrevrange: jest.fn().mockResolvedValue([]),
              zincrby: jest.fn().mockResolvedValue('1'),
              expire: jest.fn().mockResolvedValue(1),
              pipeline: jest.fn().mockReturnValue({
                zadd: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
              }),
              on: jest.fn(),
              quit: jest.fn().mockResolvedValue('OK'),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    prisma = module.get<PrismaService>(PrismaService);
    contentBasedChannel = module.get<ContentBasedChannel>(ContentBasedChannel);
    collaborativeChannel = module.get<CollaborativeChannel>(CollaborativeChannel);
    trendingChannel = module.get<TrendingChannel>(TrendingChannel);
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return cold start recommendations for users without interactions', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(0);
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-1', 0.8, '与您偏好的简约风格匹配', { styleTags: ['minimalist'], colors: ['black'] }),
      ]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([]);

      const result = await service.getPersonalizedRecommendations('user-1', {
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.clothing.id).toBe('item-1');
      expect(result.items[0].reason).toBeTruthy();
      expect(result.channel).toBe('content');
    });

    it('should return fused recommendations for users with interactions', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(5);
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-1', 0.8, '与您偏好的简约风格匹配', { styleTags: ['minimalist'] }),
      ]);
      jest.spyOn(collaborativeChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-2', 0.6, '5位品味相似的用户也喜欢', { styleTags: ['streetwear'] }),
      ]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-3', 0.7, '近期热门推荐', { styleTags: ['casual'] }),
      ]);

      const result = await service.getPersonalizedRecommendations('user-1', {
        limit: 10,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.channel).toBeDefined();
    });

    it('should deduplicate items across channels', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(5);
      const sharedCandidate = mockCandidate('item-shared', 0.8, '风格匹配');
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([sharedCandidate]);
      jest.spyOn(collaborativeChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-shared', 0.6, '相似用户喜欢'),
      ]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([]);

      const result = await service.getPersonalizedRecommendations('user-1', {
        limit: 10,
      });

      const sharedCount = result.items.filter(
        (i) => i.clothing.id === 'item-shared',
      ).length;
      expect(sharedCount).toBe(1);
    });

    it('should respect limit parameter', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(5);
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue(
        Array.from({ length: 15 }, (_, i) =>
          mockCandidate(`item-${i}`, 0.5 - i * 0.01, '推荐'),
        ),
      );
      jest.spyOn(collaborativeChannel, 'recommend').mockResolvedValue([]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([]);

      const result = await service.getPersonalizedRecommendations('user-1', {
        limit: 5,
      });

      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getTrendingRecommendations', () => {
    it('should return trending items', async () => {
      jest.spyOn(trendingChannel, 'getTrending').mockResolvedValue([
        { clothingId: 'item-1', score: 50 },
        { clothingId: 'item-2', score: 30 },
      ]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-1'),
        mockClothingItem('item-2'),
      ] as never);

      const result = await service.getTrendingRecommendations({
        limit: 10,
        timeRange: TimeRange.WEEK,
      });

      expect(result.items).toHaveLength(2);
    });

    it('should return empty array when no trending data', async () => {
      jest.spyOn(trendingChannel, 'getTrending').mockResolvedValue([]);

      const result = await service.getTrendingRecommendations({
        limit: 10,
        timeRange: TimeRange.DAY,
      });

      expect(result.items).toHaveLength(0);
    });
  });

  describe('getSimilarRecommendations', () => {
    it('should return similar items based on style tags', async () => {
      const sourceItem = mockClothingItem('source', {
        categoryId: 'cat-1',
        styleTags: ['minimalist', 'casual'],
      });
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(sourceItem as never);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('similar-1', { styleTags: ['minimalist', 'casual'] }),
        mockClothingItem('similar-2', { styleTags: ['minimalist'] }),
        mockClothingItem('similar-3', { styleTags: ['streetwear'] }),
      ] as never);

      const result = await service.getSimilarRecommendations('source');

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].similarity).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for non-existent clothing', async () => {
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getSimilarRecommendations('non-existent'),
      ).rejects.toThrow();
    });

    it('should sort by similarity descending', async () => {
      const sourceItem = mockClothingItem('source', {
        categoryId: 'cat-1',
        styleTags: ['a', 'b', 'c'],
      });
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(sourceItem as never);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('s1', { styleTags: ['a'] }),
        mockClothingItem('s2', { styleTags: ['a', 'b', 'c'] }),
        mockClothingItem('s3', { styleTags: ['a', 'b'] }),
      ] as never);

      const result = await service.getSimilarRecommendations('source');

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].similarity).toBeGreaterThanOrEqual(
          result.items[i].similarity,
        );
      }
    });
  });

  describe('trackInteraction', () => {
    it('should create interaction record and update trending', async () => {
      jest.spyOn(prisma.userInteraction, 'create').mockResolvedValue({
        id: 'interaction-1',
        userId: 'user-1',
        clothingId: 'item-1',
        interactionType: 'like',
        durationMs: null,
        context: null,
        createdAt: new Date(),
      } as never);
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(
        mockClothingItem('item-1', { categoryId: 'cat-1' }) as never,
      );
      jest.spyOn(trendingChannel, 'trackInteraction').mockResolvedValue();

      const result = await service.trackInteraction('user-1', {
        clothingId: 'item-1',
        interactionType: 'like',
      });

      expect(result.recorded).toBe(true);
      expect(prisma.userInteraction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            clothingId: 'item-1',
            interactionType: 'like',
          }),
        }),
      );
      expect(trendingChannel.trackInteraction).toHaveBeenCalled();
    });

    it('should record duration_ms when provided', async () => {
      jest.spyOn(prisma.userInteraction, 'create').mockResolvedValue({
        id: 'interaction-2',
        userId: 'user-1',
        clothingId: 'item-1',
        interactionType: 'view',
        durationMs: 5000,
        context: null,
        createdAt: new Date(),
      } as never);
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(
        mockClothingItem('item-1') as never,
      );
      jest.spyOn(trendingChannel, 'trackInteraction').mockResolvedValue();

      await service.trackInteraction('user-1', {
        clothingId: 'item-1',
        interactionType: 'view',
        durationMs: 5000,
      });

      expect(prisma.userInteraction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationMs: 5000,
          }),
        }),
      );
    });

    it('should handle clothing not found for interaction tracking', async () => {
      jest.spyOn(prisma.userInteraction, 'create').mockResolvedValue({
        id: 'interaction-3',
        userId: 'user-1',
        clothingId: 'item-1',
        interactionType: 'like',
        durationMs: null,
        context: null,
        createdAt: new Date(),
      } as never);
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(null);
      jest.spyOn(trendingChannel, 'trackInteraction').mockResolvedValue();

      const result = await service.trackInteraction('user-1', {
        clothingId: 'item-1',
        interactionType: 'like',
      });

      expect(result.recorded).toBe(true);
      expect(trendingChannel.trackInteraction).toHaveBeenCalledWith(
        'item-1',
        'like',
        undefined,
      );
    });
  });

  describe('cold start path', () => {
    it('should merge trending candidates that already exist in content candidates', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(0);

      mockClothingItem('item-shared');
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-shared', 0.8, 'Style match'),
      ]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-shared', 0.6, 'Trending item', { styleTags: ['minimalist'] }),
      ]);

      const result = await service.getPersonalizedRecommendations('user-1', { limit: 10 });

      // Should deduplicate
      const sharedItems = result.items.filter((i) => i.clothing.id === 'item-shared');
      expect(sharedItems).toHaveLength(1);
      // Reason should contain both reasons
      expect(sharedItems[0].reason).toContain('Style match');
    });

    it('should return empty items when no cold start candidates found', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(0);
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([]);

      const result = await service.getPersonalizedRecommendations('user-1', { limit: 10 });

      expect(result.items).toHaveLength(0);
    });
  });

  describe('fused recommendations', () => {
    it('should correctly infer collaborative channel from reason', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(5);
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([]);
      jest.spyOn(collaborativeChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-1', 0.9, '5位品味相似的用户强烈推荐'),
      ]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([]);

      const result = await service.getPersonalizedRecommendations('user-1', { limit: 10 });

      expect(result.channel).toBe('collaborative');
    });

    it('should correctly infer trending channel from reason', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(5);
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([]);
      jest.spyOn(collaborativeChannel, 'recommend').mockResolvedValue([]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-1', 0.9, '近期超热门单品'),
      ]);

      const result = await service.getPersonalizedRecommendations('user-1', { limit: 10 });

      expect(result.channel).toBe('trending');
    });

    it('should update dominantChannel when new channel weight is high', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(5);
      // Content has low score
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-1', 0.1, 'Style match'),
      ]);
      // Collaborative has high score
      jest.spyOn(collaborativeChannel, 'recommend').mockResolvedValue([
        mockCandidate('item-1', 0.9, '5位品味相似的用户强烈推荐'),
      ]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([]);

      const result = await service.getPersonalizedRecommendations('user-1', { limit: 10 });

      // Should prefer collaborative due to higher score
      expect(result.channel).toBe('collaborative');
    });
  });

  describe('getSimilarRecommendations', () => {
    it('should handle source item with null categoryId', async () => {
      const sourceItem = mockClothingItem('source', {
        categoryId: null,
        styleTags: ['minimalist'],
      });
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(sourceItem as never);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('similar-1', { styleTags: ['minimalist'] }),
      ] as never);

      const result = await service.getSimilarRecommendations('source');

      expect(result.items).toBeDefined();
      // Should not filter by categoryId when null
      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ categoryId: expect.anything() }),
        }),
      );
    });

    it('should filter out items with zero similarity', async () => {
      const sourceItem = mockClothingItem('source', {
        categoryId: 'cat-1',
        styleTags: ['a', 'b', 'c'],
      });
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(sourceItem as never);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('similar-1', { styleTags: ['a', 'b', 'c'] }),
        mockClothingItem('no-match', { styleTags: ['x', 'y', 'z'] }),
      ] as never);

      const result = await service.getSimilarRecommendations('source');

      // Only the similar item should be returned (similarity > 0)
      expect(result.items.every((i) => i.similarity > 0)).toBe(true);
    });

    it('should limit results to 10 items', async () => {
      const sourceItem = mockClothingItem('source', {
        categoryId: 'cat-1',
        styleTags: ['a'],
      });
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(sourceItem as never);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue(
        Array.from({ length: 50 }, (_, i) =>
          mockClothingItem(`item-${i}`, { styleTags: ['a'] })
        ) as never,
      );

      const result = await service.getSimilarRecommendations('source');

      expect(result.items.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getTrendingRecommendations', () => {
    it('should filter out items not found in database', async () => {
      jest.spyOn(trendingChannel, 'getTrending').mockResolvedValue([
        { clothingId: 'item-1', score: 50 },
        { clothingId: 'item-deleted', score: 30 },
      ]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-1'),
      ] as never);

      const result = await service.getTrendingRecommendations({
        limit: 10,
        timeRange: TimeRange.WEEK,
      });

      // item-deleted should be filtered out since it is not in DB
      expect(result.items).toHaveLength(1);
      expect(result.items[0].clothing.id).toBe('item-1');
    });
  });
});
