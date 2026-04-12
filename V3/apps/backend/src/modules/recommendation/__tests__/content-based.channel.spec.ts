import { Test, TestingModule } from '@nestjs/testing';
import { ContentBasedChannel } from '../channels/content-based.channel';
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

const mockPreference = (overrides: Record<string, unknown> = {}) => ({
  id: 'pref-1',
  userId: 'user-1',
  styleTags: ['minimalist', 'casual'],
  occasionTags: ['work'],
  colorPreferences: ['black', 'white'],
  budgetRange: null,
  createdAt: new Date(),
  ...overrides,
});

describe('ContentBasedChannel', () => {
  let channel: ContentBasedChannel;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentBasedChannel,
        {
          provide: PrismaService,
          useValue: {
            userStylePreference: {
              findFirst: jest.fn(),
            },
            clothingItem: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    channel = module.get<ContentBasedChannel>(ContentBasedChannel);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should have correct channel type', () => {
    expect(channel.channelType).toBe('content');
  });

  describe('recommend', () => {
    it('should return candidates based on user style preferences', async () => {
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(
        mockPreference() as never,
      );

      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-1', {
          styleTags: ['minimalist', 'casual'],
          colors: ['black'],
          occasions: ['work'],
        }),
        mockClothingItem('item-2', {
          styleTags: ['streetwear'],
          colors: ['red'],
          occasions: ['party'],
        }),
      ] as never);

      const result = await channel.recommend('user-1', 10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].score).toBeGreaterThan(0);
      expect(result[0].reason).toBeTruthy();
    });

    it('should handle users without preferences gracefully', async () => {
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-1'),
      ] as never);

      const result = await channel.recommend('user-1', 10);

      expect(result).toBeDefined();
    });

    it('should sort candidates by score descending', async () => {
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(
        mockPreference({ styleTags: ['minimalist'], colorPreferences: ['black'], occasionTags: [] }) as never,
      );

      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('low-match', {
          styleTags: ['streetwear'],
          colors: ['red'],
          occasions: [],
        }),
        mockClothingItem('high-match', {
          styleTags: ['minimalist'],
          colors: ['black'],
          occasions: [],
        }),
      ] as never);

      const result = await channel.recommend('user-1', 10);

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
      }
    });

    it('should apply occasion filter', async () => {
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(
        mockPreference({ styleTags: ['minimalist'], occasionTags: [], colorPreferences: [] }) as never,
      );

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

    it('should apply style filter', async () => {
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(
        mockPreference({ styleTags: ['minimalist'], occasionTags: [], colorPreferences: [] }) as never,
      );

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

    it('should exclude specified IDs', async () => {
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(
        mockPreference({ styleTags: [], occasionTags: [], colorPreferences: [] }) as never,
      );

      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([]);

      await channel.recommend('user-1', 10, { excludeIds: ['ex-1', 'ex-2'] });

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['ex-1', 'ex-2'] },
          }),
        }),
      );
    });

    it('should apply budget range filter', async () => {
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(
        mockPreference({ styleTags: [], occasionTags: [], colorPreferences: [], budgetRange: '100-500' }) as never,
      );

      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([]);

      await channel.recommend('user-1', 10);

      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 100, lte: 500 },
          }),
        }),
      );
    });

    it('should generate meaningful reason text', async () => {
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(
        mockPreference({ styleTags: ['minimalist'], occasionTags: ['work'], colorPreferences: ['black'] }) as never,
      );

      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue([
        mockClothingItem('item-1', {
          styleTags: ['minimalist'],
          colors: ['black'],
          occasions: ['work'],
        }),
      ] as never);

      const result = await channel.recommend('user-1', 10);

      expect(result[0].reason).toContain('简约');
      expect(result[0].reason).toContain('黑色');
    });

    it('should respect limit parameter', async () => {
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(
        mockPreference({ styleTags: [], occasionTags: [], colorPreferences: [] }) as never,
      );

      jest.spyOn(prisma.clothingItem, 'findMany').mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => mockClothingItem(`item-${i}`)) as never,
      );

      const result = await channel.recommend('user-1', 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });
});
