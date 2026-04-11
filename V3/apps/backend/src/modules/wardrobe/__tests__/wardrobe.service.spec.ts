import { Test } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { WardrobeService } from '../wardrobe.service';
import { PrismaService } from '../../../prisma/prisma.service';

const mockDb = {
  wardrobeItem: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  clothingItem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('WardrobeService', () => {
  let service: WardrobeService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        WardrobeService,
        { provide: PrismaService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<WardrobeService>(WardrobeService);
  });

  const userId = 'user-001';
  const clothingId = 'clothing-001';

  const mockWardrobeItem = {
    id: 'wardrobe-001',
    userId,
    clothingId,
    customName: null,
    imageUrl: null,
    category: '上装',
    color: '黑色',
    brand: 'Nike',
    notes: null,
    addedAt: new Date(),
  };

  describe('findAll', () => {
    it('should return paginated wardrobe items with stats', async () => {
      mockDb.wardrobeItem.findMany
        .mockResolvedValueOnce([mockWardrobeItem])
        .mockResolvedValueOnce([
          { category: '上装', color: '黑色' },
          { category: '下装', color: '白色' },
        ]);
      mockDb.wardrobeItem.count.mockResolvedValueOnce(1);

      const result = await service.findAll({ userId, page: 1, limit: 20 });

      expect(result.items).toEqual([mockWardrobeItem]);
      expect(result.total).toBe(1);
      expect(result.stats.totalCount).toBe(2);
      expect(result.stats.byCategory).toEqual({ 上装: 1, 下装: 1 });
      expect(result.stats.byColor).toEqual({ 黑色: 1, 白色: 1 });
    });

    it('should apply category filter', async () => {
      mockDb.wardrobeItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockDb.wardrobeItem.count.mockResolvedValueOnce(0);

      await service.findAll({ userId, category: '上装' });

      expect(mockDb.wardrobeItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: '上装' }),
        }),
      );
    });

    it('should apply color and brand filters', async () => {
      mockDb.wardrobeItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockDb.wardrobeItem.count.mockResolvedValueOnce(0);

      await service.findAll({ userId, color: '黑色', brand: 'Nike' });

      expect(mockDb.wardrobeItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ color: '黑色', brand: 'Nike' }),
        }),
      );
    });

    it('should sort by added_at_asc', async () => {
      mockDb.wardrobeItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockDb.wardrobeItem.count.mockResolvedValueOnce(0);

      await service.findAll({ userId, sort: 'added_at_asc' });

      expect(mockDb.wardrobeItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { addedAt: 'asc' } }),
      );
    });

    it('should sort by category', async () => {
      mockDb.wardrobeItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockDb.wardrobeItem.count.mockResolvedValueOnce(0);

      await service.findAll({ userId, sort: 'category' });

      expect(mockDb.wardrobeItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { category: 'asc' } }),
      );
    });

    it('should sort by color', async () => {
      mockDb.wardrobeItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockDb.wardrobeItem.count.mockResolvedValueOnce(0);

      await service.findAll({ userId, sort: 'color' });

      expect(mockDb.wardrobeItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { color: 'asc' } }),
      );
    });

    it('should default to added_at_desc sort', async () => {
      mockDb.wardrobeItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockDb.wardrobeItem.count.mockResolvedValueOnce(0);

      await service.findAll({ userId });

      expect(mockDb.wardrobeItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { addedAt: 'desc' } }),
      );
    });

    it('should handle empty stats gracefully', async () => {
      mockDb.wardrobeItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockDb.wardrobeItem.count.mockResolvedValueOnce(0);

      const result = await service.findAll({ userId });

      expect(result.stats.byCategory).toEqual({});
      expect(result.stats.byColor).toEqual({});
      expect(result.stats.totalCount).toBe(0);
    });
  });

  describe('add', () => {
    const dto = { clothing_id: clothingId };

    it('should add clothing to wardrobe with snapshot data', async () => {
      mockDb.wardrobeItem.findFirst.mockResolvedValueOnce(null);
      mockDb.clothingItem.findUnique.mockResolvedValueOnce({
        id: clothingId,
        colors: ['黑色', '白色'],
        category: { name: '上装' },
        brand: { name: 'Nike' },
      });
      mockDb.wardrobeItem.create.mockResolvedValueOnce(mockWardrobeItem);

      const result = await service.add(userId, dto);

      expect(result).toEqual(mockWardrobeItem);
      expect(mockDb.wardrobeItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          clothingId,
          category: '上装',
          color: '黑色',
          brand: 'Nike',
        }),
      });
    });

    it('should throw ConflictException if clothing already in wardrobe', async () => {
      mockDb.wardrobeItem.findFirst.mockResolvedValueOnce(mockWardrobeItem);

      await expect(service.add(userId, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if clothing does not exist', async () => {
      mockDb.wardrobeItem.findFirst.mockResolvedValueOnce(null);
      mockDb.clothingItem.findUnique.mockResolvedValueOnce(null);

      await expect(service.add(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should handle clothing without category or brand', async () => {
      mockDb.wardrobeItem.findFirst.mockResolvedValueOnce(null);
      mockDb.clothingItem.findUnique.mockResolvedValueOnce({
        id: clothingId,
        colors: [],
        category: null,
        brand: null,
      });
      mockDb.wardrobeItem.create.mockResolvedValueOnce({
        ...mockWardrobeItem,
        category: null,
        color: null,
        brand: null,
      });

      await service.add(userId, dto);

      expect(mockDb.wardrobeItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: null,
          color: null,
          brand: null,
        }),
      });
    });

    it('should pass optional fields from dto', async () => {
      const fullDto = {
        clothing_id: clothingId,
        custom_name: '我的T恤',
        image_url: 'https://example.com/img.jpg',
        notes: '夏天穿',
      };

      mockDb.wardrobeItem.findFirst.mockResolvedValueOnce(null);
      mockDb.clothingItem.findUnique.mockResolvedValueOnce({
        id: clothingId,
        colors: ['黑色'],
        category: { name: '上装' },
        brand: { name: 'Nike' },
      });
      mockDb.wardrobeItem.create.mockResolvedValueOnce(mockWardrobeItem);

      await service.add(userId, fullDto);

      expect(mockDb.wardrobeItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customName: '我的T恤',
          imageUrl: 'https://example.com/img.jpg',
          notes: '夏天穿',
        }),
      });
    });
  });

  describe('update', () => {
    const updateDto = { custom_name: '新名称', notes: '新备注' };

    it('should update wardrobe item', async () => {
      mockDb.wardrobeItem.findUnique.mockResolvedValueOnce(mockWardrobeItem);
      mockDb.wardrobeItem.update.mockResolvedValueOnce({
        ...mockWardrobeItem,
        customName: '新名称',
        notes: '新备注',
      });

      const result = (await service.update(userId, 'wardrobe-001', updateDto)) as Record<string, unknown>;

      expect(result.customName).toBe('新名称');
      expect(result.notes).toBe('新备注');
    });

    it('should throw NotFoundException if item not found', async () => {
      mockDb.wardrobeItem.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update(userId, 'nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if item belongs to another user', async () => {
      mockDb.wardrobeItem.findUnique.mockResolvedValueOnce({
        ...mockWardrobeItem,
        userId: 'other-user',
      });

      await expect(
        service.update(userId, 'wardrobe-001', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should only update provided fields', async () => {
      const partialDto = { custom_name: '仅改名称' };

      mockDb.wardrobeItem.findUnique.mockResolvedValueOnce(mockWardrobeItem);
      mockDb.wardrobeItem.update.mockResolvedValueOnce({
        ...mockWardrobeItem,
        customName: '仅改名称',
      });

      await service.update(userId, 'wardrobe-001', partialDto);

      expect(mockDb.wardrobeItem.update).toHaveBeenCalledWith({
        where: { id: 'wardrobe-001' },
        data: expect.objectContaining({ customName: '仅改名称' }),
      });
    });
  });

  describe('remove', () => {
    it('should remove wardrobe item', async () => {
      mockDb.wardrobeItem.findUnique.mockResolvedValueOnce(mockWardrobeItem);
      mockDb.wardrobeItem.delete.mockResolvedValueOnce(mockWardrobeItem);

      await service.remove(userId, 'wardrobe-001');

      expect(mockDb.wardrobeItem.delete).toHaveBeenCalledWith({
        where: { id: 'wardrobe-001' },
      });
    });

    it('should throw NotFoundException if item not found', async () => {
      mockDb.wardrobeItem.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.remove(userId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if item belongs to another user', async () => {
      mockDb.wardrobeItem.findUnique.mockResolvedValueOnce({
        ...mockWardrobeItem,
        userId: 'other-user',
      });

      await expect(
        service.remove(userId, 'wardrobe-001'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      mockDb.wardrobeItem.findMany.mockResolvedValueOnce([
        { category: '上装', color: '黑色', clothingId: 'c1' },
        { category: '上装', color: '白色', clothingId: 'c2' },
        { category: '下装', color: '黑色', clothingId: 'c3' },
        { category: null, color: null, clothingId: null },
      ]);
      mockDb.clothingItem.findMany.mockResolvedValueOnce([
        { seasons: ['spring', 'summer'], styleTags: ['casual', 'street'] },
        { seasons: ['summer'], styleTags: ['casual'] },
        { seasons: ['winter'], styleTags: ['formal'] },
      ]);

      const result = await service.getStats(userId);

      expect(result.total).toBe(4);
      expect(result.byCategory).toEqual({ 上装: 2, 下装: 1 });
      expect(result.byColor).toEqual({ 黑色: 2, 白色: 1 });
      expect(result.bySeason).toEqual({
        spring: 1,
        summer: 2,
        winter: 1,
      });
      expect(result.byStyle).toEqual({
        casual: 2,
        street: 1,
        formal: 1,
      });
    });

    it('should return empty stats when wardrobe is empty', async () => {
      mockDb.wardrobeItem.findMany.mockResolvedValueOnce([]);

      const result = await service.getStats(userId);

      expect(result.total).toBe(0);
      expect(result.byCategory).toEqual({});
      expect(result.byColor).toEqual({});
      expect(result.bySeason).toEqual({});
      expect(result.byStyle).toEqual({});
      expect(mockDb.clothingItem.findMany).not.toHaveBeenCalled();
    });

    it('should skip items with null clothingId for season/style stats', async () => {
      mockDb.wardrobeItem.findMany.mockResolvedValueOnce([
        { category: '上装', color: '黑色', clothingId: null },
      ]);

      const result = await service.getStats(userId);

      expect(result.total).toBe(1);
      expect(result.byCategory).toEqual({ 上装: 1 });
      expect(result.bySeason).toEqual({});
      expect(result.byStyle).toEqual({});
    });
  });
});
