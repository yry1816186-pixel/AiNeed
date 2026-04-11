import { Test, TestingModule } from '@nestjs/testing';
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

describe('TrendingChannel', () => {
  let channel: TrendingChannel;
  let prisma: PrismaService;
  let redisClient: Record<string, jest.Mock>;

  beforeEach(async () => {
    redisClient = {
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendingChannel,
        {
          provide: PrismaService,
          useValue: {
            clothingItem: {
              findMany: jest.fn(),
            },
            userInteraction: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: RecommendationRedisProvider,
          useValue: {
            client: redisClient,
          },
        },
      ],
    }).compile();

    channel = module.get<TrendingChannel>(TrendingChannel);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should have correct channel type', () => {
    expect(channel.channelType).toBe('trending');
  });

  describe('recommend', () => {
    it('should return candidates from Redis sorted set', async () => {
      redisClient.zrevrange.mockResolvedValue(['item-1', '50', 'item-2', '30']);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-1'),
        mockClothingItem('item-2'),
      ]);

      const result = await channel.recommend('user-1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].clothing.id).toBe('item-1');
      expect(result[0].score).toBeGreaterThan(0);
      expect(result[0].reason).toBeTruthy();
    });

    it('should refresh trending data when key does not exist', async () => {
      redisClient.exists.mockResolvedValue(0);
      redisClient.zrevrange.mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);

      const result = await channel.recommend('user-1', 10);

      expect(prisma.userInteraction.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return empty array when no trending data', async () => {
      redisClient.zrevrange.mockResolvedValue([]);

      const result = await channel.recommend('user-1', 10);

      expect(result).toEqual([]);
    });

    it('should filter out inactive items', async () => {
      redisClient.zrevrange.mockResolvedValue(['item-1', '50']);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-1'),
      ]);

      const result = await channel.recommend('user-1', 10);

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should exclude specified IDs', async () => {
      redisClient.zrevrange.mockResolvedValue(['item-1', '50']);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([]);

      await channel.recommend('user-1', 10, { excludeIds: ['ex-1'] });

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['ex-1'] },
          }),
        }),
      );
    });
  });

  describe('trackInteraction', () => {
    it('should increment score in Redis for positive interactions', async () => {
      await channel.trackInteraction('item-1', 'like', 'cat-1');

      expect(redisClient.zincrby).toHaveBeenCalledTimes(2);
      expect(redisClient.zincrby).toHaveBeenCalledWith(
        'aineed:trending:cat-1',
        3,
        'item-1',
      );
      expect(redisClient.zincrby).toHaveBeenCalledWith(
        'aineed:trending:all',
        3,
        'item-1',
      );
    });

    it('should not track skip interactions', async () => {
      await channel.trackInteraction('item-1', 'skip');

      expect(redisClient.zincrby).not.toHaveBeenCalled();
    });

    it('should track to "all" category when no category provided', async () => {
      await channel.trackInteraction('item-1', 'view');

      expect(redisClient.zincrby).toHaveBeenCalledTimes(1);
      expect(redisClient.zincrby).toHaveBeenCalledWith(
        'aineed:trending:all',
        1,
        'item-1',
      );
    });

    it('should set TTL on keys after increment', async () => {
      await channel.trackInteraction('item-1', 'favorite', 'cat-1');

      expect(redisClient.expire).toHaveBeenCalled();
    });
  });

  describe('getTrending', () => {
    it('should return trending items with scores', async () => {
      redisClient.zrevrange.mockResolvedValue(['item-1', '50', 'item-2', '30']);

      const result = await channel.getTrending('all', 10, 'week');

      expect(result).toEqual([
        { clothingId: 'item-1', score: 50 },
        { clothingId: 'item-2', score: 30 },
      ]);
    });

    it('should refresh data when key does not exist', async () => {
      redisClient.exists.mockResolvedValue(0);
      redisClient.zrevrange.mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);

      const result = await channel.getTrending('all', 10, 'week');

      expect(prisma.userInteraction.findMany).toHaveBeenCalled();
    });
  });

  describe('refreshTrendingData', () => {
    it('should aggregate interaction weights and write to Redis', async () => {
      redisClient.exists.mockResolvedValue(0);
      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([
        { clothingId: 'item-1', interactionType: 'view' },
        { clothingId: 'item-1', interactionType: 'like' },
        { clothingId: 'item-2', interactionType: 'purchase' },
      ]);

      await channel.recommend('user-1', 10);

      expect(redisClient.pipeline).toHaveBeenCalled();
    });

    it('should not write to Redis when no interactions exist', async () => {
      redisClient.exists.mockResolvedValue(0);
      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);
      redisClient.zrevrange.mockResolvedValue([]);

      const result = await channel.recommend('user-1', 10);

      expect(result).toEqual([]);
    });
  });
});
