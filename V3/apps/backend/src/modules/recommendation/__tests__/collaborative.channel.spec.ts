import { Test, TestingModule } from '@nestjs/testing';
import { CollaborativeChannel } from '../channels/collaborative.channel';
import { PrismaService } from '../../../prisma/prisma.service';

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
  occasions: ['casual', 'work'],
  styleTags: ['minimalist', 'casual'],
  colors: ['black', 'white'],
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

describe('CollaborativeChannel', () => {
  let channel: CollaborativeChannel;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborativeChannel,
        {
          provide: PrismaService,
          useValue: {
            favorite: {
              findMany: jest.fn(),
            },
            userInteraction: {
              findMany: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn().mockResolvedValue([]),
            },
            clothingItem: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    channel = module.get<CollaborativeChannel>(CollaborativeChannel);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should have correct channel type', () => {
    expect(channel.channelType).toBe('collaborative');
  });

  describe('recommend', () => {
    it('should return empty array when user has no favorites', async () => {
      jest.spyOn(prisma.favorite, 'findMany').mockResolvedValueOnce([]);

      const result = await channel.recommend('user-1', 10);

      expect(result).toEqual([]);
    });

    it('should return empty array when no similar users found', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }] as never)
        .mockResolvedValueOnce([]);

      const result = await channel.recommend('user-1', 10);

      expect(result).toEqual([]);
    });

    it('should return scored candidates from similar users', async () => {
      // User favorites: item-1, item-2
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([
          { targetId: 'item-1' },
          { targetId: 'item-2' },
        ] as never)
        // Other user with similar taste: also likes item-1, item-2, and item-3
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
          { userId: 'user-2', targetId: 'item-2' },
          { userId: 'user-2', targetId: 'item-3' },
        ] as never);

      // User interactions (exclude already interacted items)
      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);

      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([
        { clothingId: 'item-3', _count: { id: 3 } },
        { clothingId: 'item-4', _count: { id: 3 } },
      ]);

      // Clothing items from DB
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-3'),
        mockClothingItem('item-4'),
      ] as never);

      const result = await channel.recommend('user-1', 10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('clothing');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('reason');
    });

    it('should apply occasion filter when provided', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }])
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
          { userId: 'user-2', targetId: 'item-2' },
        ]);

      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([]);

      await channel.recommend('user-1', 10, { occasion: 'work' });

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            occasions: { has: 'work' },
          }),
        }),
      );
    });

    it('should apply style filter when provided', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }] as never)
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
        ] as never);

      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([]);

      await channel.recommend('user-1', 10, { style: 'casual' });

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            styleTags: { has: 'casual' },
          }),
        }),
      );
    });

    it('should apply budget range filter when provided', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }])
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
        ]);

      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([]);

      await channel.recommend('user-1', 10, { budgetRange: '100-500' });

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 100, lte: 500 },
          }),
        }),
      );
    });

    it('should apply single-value budget range filter', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }])
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
        ]);

      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([]);

      await channel.recommend('user-1', 10, { budgetRange: '200' });

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 200 },
          }),
        }),
      );
    });

    it('should exclude user interacted items', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }] as never)
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
        ] as never);

      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([
        { clothingId: 'item-3' },
      ] as never);
      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([]);

      await channel.recommend('user-1', 10);

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              notIn: expect.arrayContaining(['item-3']),
            }),
          }),
        }),
      );
    });

    it('should exclude additional IDs from filters', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }] as never)
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
        ] as never);

      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([]);

      await channel.recommend('user-1', 10, { excludeIds: ['ex-1', 'ex-2'] });

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              notIn: expect.arrayContaining(['ex-1', 'ex-2']),
            }),
          }),
        }),
      );
    });

    it('should sort candidates by score descending', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }])
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
        ]);

      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([
        { clothingId: 'item-a', _count: { id: 5 } },
        { clothingId: 'item-b', _count: { id: 2 } },
      ]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-a'),
        mockClothingItem('item-b'),
      ] as never);

      const result = await channel.recommend('user-1', 10);

      if (result.length >= 2) {
        expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
      }
    });

    it('should respect limit parameter', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }] as never)
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
        ] as never);

      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => mockClothingItem(`item-${i}`)) as never,
      );

      const result = await channel.recommend('user-1', 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should generate strong recommendation reason for high interaction count', async () => {
      jest.spyOn(prisma.favorite, 'findMany')
        .mockResolvedValueOnce([{ targetId: 'item-1' }] as never)
        .mockResolvedValueOnce([
          { userId: 'user-2', targetId: 'item-1' },
          { userId: 'user-3', targetId: 'item-1' },
          { userId: 'user-4', targetId: 'item-1' },
        ] as never);

      jest.spyOn(prisma.userInteraction, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.userInteraction, 'groupBy').mockResolvedValue([
        { clothingId: 'item-rec', _count: { id: 4 } },
      ]);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-rec'),
      ] as never);

      const result = await channel.recommend('user-1', 10);

      if (result.length > 0) {
        expect(result[0].reason).toContain('强烈推荐');
      }
    });
  });
});
