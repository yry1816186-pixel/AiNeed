import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FavoritesService } from '../favorites.service';
import { PrismaService } from '../../../prisma/prisma.service';

const USER_ID = 'user-001';
const TARGET_ID = 'target-001';
const FAVORITE_ID = 'fav-001';

const mockFavorite = {
  id: FAVORITE_ID,
  userId: USER_ID,
  targetType: 'clothing',
  targetId: TARGET_ID,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const mockClothingItem = {
  id: TARGET_ID,
  name: 'Test Clothing',
  price: 99.99,
  imageUrls: ['https://example.com/img.jpg'],
  gender: 'male',
  colors: ['black'],
};

const prismaMockFactory = () => ({
  favorite: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  clothingItem: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  outfit: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  communityPost: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  customDesign: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
});

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prisma: ReturnType<typeof prismaMockFactory>;

  beforeEach(async () => {
    prisma = prismaMockFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  describe('create', () => {
    it('should create a favorite successfully', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.clothingItem.findUnique.mockResolvedValue(mockClothingItem);
      prisma.favorite.create.mockResolvedValue(mockFavorite);

      const result = await service.create(USER_ID, {
        targetType: 'clothing',
        targetId: TARGET_ID,
      });

      expect(result).toEqual({
        id: FAVORITE_ID,
        targetType: 'clothing',
        targetId: TARGET_ID,
        createdAt: mockFavorite.createdAt.toISOString(),
      });

      expect(prisma.favorite.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          targetType: 'clothing',
          targetId: TARGET_ID,
        },
      });
    });

    it('should throw ConflictException if already favorited', async () => {
      prisma.favorite.findUnique.mockResolvedValue(mockFavorite);

      await expect(
        service.create(USER_ID, {
          targetType: 'clothing',
          targetId: TARGET_ID,
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.favorite.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if target does not exist', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.clothingItem.findUnique.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, {
          targetType: 'clothing',
          targetId: TARGET_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate outfit target type', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.outfit.findUnique.mockResolvedValue({ id: TARGET_ID });

      const outfitFavorite = { ...mockFavorite, targetType: 'outfit' };
      prisma.favorite.create.mockResolvedValue(outfitFavorite);

      const result = await service.create(USER_ID, {
        targetType: 'outfit',
        targetId: TARGET_ID,
      });

      expect(result.targetType).toBe('outfit');
    });

    it('should validate post target type', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.communityPost.findUnique.mockResolvedValue({ id: TARGET_ID });

      const postFavorite = { ...mockFavorite, targetType: 'post' };
      prisma.favorite.create.mockResolvedValue(postFavorite);

      const result = await service.create(USER_ID, {
        targetType: 'post',
        targetId: TARGET_ID,
      });

      expect(result.targetType).toBe('post');
    });

    it('should validate design target type', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.customDesign.findUnique.mockResolvedValue({ id: TARGET_ID });

      const designFavorite = { ...mockFavorite, targetType: 'design' };
      prisma.favorite.create.mockResolvedValue(designFavorite);

      const result = await service.create(USER_ID, {
        targetType: 'design',
        targetId: TARGET_ID,
      });

      expect(result.targetType).toBe('design');
    });
  });

  describe('remove', () => {
    it('should remove a favorite successfully', async () => {
      prisma.favorite.findUnique.mockResolvedValue(mockFavorite);
      prisma.favorite.delete.mockResolvedValue(mockFavorite);

      const result = await service.remove(USER_ID, 'clothing', TARGET_ID);

      expect(result).toEqual({ deleted: true });
      expect(prisma.favorite.delete).toHaveBeenCalledWith({
        where: { id: FAVORITE_ID },
      });
    });

    it('should throw NotFoundException if favorite does not exist', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(USER_ID, 'clothing', TARGET_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated favorites with targets', async () => {
      prisma.favorite.findMany.mockResolvedValue([mockFavorite]);
      prisma.favorite.count.mockResolvedValue(1);
      prisma.clothingItem.findMany.mockResolvedValue([mockClothingItem]);

      const result = await service.findAll(USER_ID, undefined, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].target).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by targetType', async () => {
      prisma.favorite.findMany.mockResolvedValue([mockFavorite]);
      prisma.favorite.count.mockResolvedValue(1);
      prisma.clothingItem.findMany.mockResolvedValue([mockClothingItem]);

      await service.findAll(USER_ID, 'clothing', 1, 20);

      expect(prisma.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetType: 'clothing' }),
        }),
      );
    });

    it('should enforce minimum page of 1', async () => {
      prisma.favorite.findMany.mockResolvedValue([]);
      prisma.favorite.count.mockResolvedValue(0);

      const result = await service.findAll(USER_ID, undefined, -1, 20);

      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit of 100', async () => {
      prisma.favorite.findMany.mockResolvedValue([]);
      prisma.favorite.count.mockResolvedValue(0);

      const result = await service.findAll(USER_ID, undefined, 1, 200);

      expect(result.limit).toBe(100);
    });

    it('should handle null target gracefully', async () => {
      prisma.favorite.findMany.mockResolvedValue([mockFavorite]);
      prisma.favorite.count.mockResolvedValue(1);
      prisma.clothingItem.findMany.mockResolvedValue([]);

      const result = await service.findAll(USER_ID, undefined, 1, 20);

      expect(result.items[0].target).toBeNull();
    });
  });

  describe('check', () => {
    it('should return correct favorite status for multiple targets', async () => {
      const targetIds = ['id-1', 'id-2', 'id-3'];
      prisma.favorite.findMany.mockResolvedValue([
        { targetId: 'id-1' },
        { targetId: 'id-3' },
      ]);

      const result = await service.check(USER_ID, 'clothing', targetIds);

      expect(result.results).toEqual([
        { targetId: 'id-1', isFavorited: true },
        { targetId: 'id-2', isFavorited: false },
        { targetId: 'id-3', isFavorited: true },
      ]);
    });

    it('should return all false when no favorites exist', async () => {
      const targetIds = ['id-1', 'id-2'];
      prisma.favorite.findMany.mockResolvedValue([]);

      const result = await service.check(USER_ID, 'clothing', targetIds);

      expect(result.results).toEqual([
        { targetId: 'id-1', isFavorited: false },
        { targetId: 'id-2', isFavorited: false },
      ]);
    });

    it('should handle empty target_ids array', async () => {
      const result = await service.check(USER_ID, 'clothing', []);

      expect(result.results).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return total count without targetType filter', async () => {
      prisma.favorite.count.mockResolvedValue(42);

      const result = await service.count(USER_ID);

      expect(result).toEqual({ count: 42 });
      expect(prisma.favorite.count).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
    });

    it('should return filtered count with targetType', async () => {
      prisma.favorite.count.mockResolvedValue(10);

      const result = await service.count(USER_ID, 'clothing');

      expect(result).toEqual({ count: 10 });
      expect(prisma.favorite.count).toHaveBeenCalledWith({
        where: { userId: USER_ID, targetType: 'clothing' },
      });
    });
  });
});
