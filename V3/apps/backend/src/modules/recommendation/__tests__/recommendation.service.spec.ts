import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationService } from '../recommendation.service';
import { ContentBasedChannel } from '../channels/content-based.channel';
import { CollaborativeChannel } from '../channels/collaborative.channel';
import { TrendingChannel } from '../channels/trending.channel';
import { PrismaService } from '../../prisma/prisma.service';
import { RecommendationRedisProvider } from '../redis.provider';

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
        {
          clothing: mockClothingItem('item-1', { styleTags: ['minimalist'], colors: ['black'] }),
          score: 0.8,
          reason: '与您偏好的简约风格匹配',
        },
      ]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([]);

      const result = await service.getPersonalizedRecommendations('user-1', {
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].clothing.id).toBe('item-1');
      expect(result.items[0].reason).toBeTruthy();
      expect(result.channel).toBe('content');
    });

    it('should return fused recommendations for users with interactions', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(5);
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([
        {
          clothing: mockClothingItem('item-1', { styleTags: ['minimalist'] }),
          score: 0.8,
          reason: '与您偏好的简约风格匹配',
        },
      ]);
      jest.spyOn(collaborativeChannel, 'recommend').mockResolvedValue([
        {
          clothing: mockClothingItem('item-2', { styleTags: ['streetwear'] }),
          score: 0.6,
          reason: '5位品味相似的用户也喜欢',
        },
      ]);
      jest.spyOn(trendingChannel, 'recommend').mockResolvedValue([
        {
          clothing: mockClothingItem('item-3', { styleTags: ['casual'] }),
          score: 0.7,
          reason: '近期热门推荐',
        },
      ]);

      const result = await service.getPersonalizedRecommendations('user-1', {
        limit: 10,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.channel).toBeDefined();
    });

    it('should deduplicate items across channels', async () => {
      jest.spyOn(prisma.userInteraction, 'count').mockResolvedValue(5);
      const sharedItem = mockClothingItem('item-shared');
      jest.spyOn(contentBasedChannel, 'recommend').mockResolvedValue([
        { clothing: sharedItem, score: 0.8, reason: '风格匹配' },
      ]);
      jest.spyOn(collaborativeChannel, 'recommend').mockResolvedValue([
        { clothing: sharedItem, score: 0.6, reason: '相似用户喜欢' },
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
        Array.from({ length: 15 }, (_, i) => ({
          clothing: mockClothingItem(`item-${i}`),
          score: 0.5 - i * 0.01,
          reason: '推荐',
        })),
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
      ]);

      const result = await service.getTrendingRecommendations({
        limit: 10,
        timeRange: 'week',
      });

      expect(result.items).toHaveLength(2);
    });

    it('should return empty array when no trending data', async () => {
      jest.spyOn(trendingChannel, 'getTrending').mockResolvedValue([]);

      const result = await service.getTrendingRecommendations({
        limit: 10,
        timeRange: 'day',
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
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(sourceItem);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('similar-1', { styleTags: ['minimalist', 'casual'] }),
        mockClothingItem('similar-2', { styleTags: ['minimalist'] }),
        mockClothingItem('similar-3', { styleTags: ['streetwear'] }),
      ]);

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
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(sourceItem);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('s1', { styleTags: ['a'] }),
        mockClothingItem('s2', { styleTags: ['a', 'b', 'c'] }),
        mockClothingItem('s3', { styleTags: ['a', 'b'] }),
      ]);

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
      });
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(
        mockClothingItem('item-1', { categoryId: 'cat-1' }),
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
      });
      jest.spyOn(prisma.clothingItem, 'findUnique').mockResolvedValue(
        mockClothingItem('item-1'),
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
  });
});
