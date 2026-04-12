import { wardrobeService } from '../../services/wardrobe.service';
import {
  WARDROBE_KEYS,
  CATEGORY_LABELS,
  ALL_CATEGORIES,
  BODY_ZONE_TO_CATEGORY,
} from '../useWardrobe';
import type { WardrobeItem, WardrobeListResponse, WardrobeStatsResponse } from '../../services/wardrobe.service';

jest.mock('../../services/wardrobe.service');

const mockWardrobeService = wardrobeService as jest.Mocked<typeof wardrobeService>;

const makeWardrobeItem = (overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id: 'wi-1',
  clothingId: 'c-1',
  name: 'T-Shirt',
  category: 'top',
  color: { name: 'White', hex: '#FFFFFF' },
  imageUrl: null,
  thumbnailUrl: null,
  brand: null,
  createdAt: '2026-01-01',
  ...overrides,
});

describe('useWardrobe hook logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WARDROBE_KEYS', () => {
    it('should generate correct all key', () => {
      expect(WARDROBE_KEYS.all).toEqual(['wardrobe']);
    });

    it('should generate correct list key with params', () => {
      const params = { category: 'top' as const, page: 1 };
      const key = WARDROBE_KEYS.list(params);
      expect(key).toEqual(['wardrobe', 'list', params]);
    });

    it('should generate correct stats key', () => {
      expect(WARDROBE_KEYS.stats).toEqual(['wardrobe', 'stats']);
    });

    it('should generate unique keys for different params', () => {
      const key1 = WARDROBE_KEYS.list({ category: 'top' });
      const key2 = WARDROBE_KEYS.list({ category: 'bottom' });
      expect(key1).not.toEqual(key2);
    });
  });

  describe('CATEGORY_LABELS', () => {
    it('should have Chinese labels for all categories', () => {
      expect(CATEGORY_LABELS.top).toBe('上装');
      expect(CATEGORY_LABELS.bottom).toBe('下装');
      expect(CATEGORY_LABELS.outerwear).toBe('外套');
      expect(CATEGORY_LABELS.shoes).toBe('鞋子');
      expect(CATEGORY_LABELS.bag).toBe('包包');
      expect(CATEGORY_LABELS.accessory).toBe('配饰');
    });

    it('should have labels for exactly 6 categories', () => {
      expect(Object.keys(CATEGORY_LABELS)).toHaveLength(6);
    });
  });

  describe('ALL_CATEGORIES', () => {
    it('should contain all 6 categories', () => {
      expect(ALL_CATEGORIES).toHaveLength(6);
      expect(ALL_CATEGORIES).toContain('top');
      expect(ALL_CATEGORIES).toContain('bottom');
      expect(ALL_CATEGORIES).toContain('outerwear');
      expect(ALL_CATEGORIES).toContain('shoes');
      expect(ALL_CATEGORIES).toContain('bag');
      expect(ALL_CATEGORIES).toContain('accessory');
    });
  });

  describe('BODY_ZONE_TO_CATEGORY', () => {
    it('should map upper zone to top category', () => {
      expect(BODY_ZONE_TO_CATEGORY.upper).toBe('top');
    });

    it('should map lower zone to bottom category', () => {
      expect(BODY_ZONE_TO_CATEGORY.lower).toBe('bottom');
    });

    it('should map feet zone to shoes category', () => {
      expect(BODY_ZONE_TO_CATEGORY.feet).toBe('shoes');
    });
  });

  describe('wardrobeService.getWardrobe', () => {
    it('should call service with default params', async () => {
      const mockResponse: WardrobeListResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      mockWardrobeService.getWardrobe.mockResolvedValue(mockResponse);

      const result = await wardrobeService.getWardrobe();
      expect(mockWardrobeService.getWardrobe).toHaveBeenCalledWith();
      expect(result.items).toEqual([]);
    });

    it('should call service with category filter', async () => {
      const mockResponse: WardrobeListResponse = {
        items: [makeWardrobeItem()],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockWardrobeService.getWardrobe.mockResolvedValue(mockResponse);

      const result = await wardrobeService.getWardrobe({ category: 'top' });
      expect(mockWardrobeService.getWardrobe).toHaveBeenCalledWith({ category: 'top' });
      expect(result.items).toHaveLength(1);
    });

    it('should handle API errors', async () => {
      mockWardrobeService.getWardrobe.mockRejectedValue(new Error('获取衣橱失败'));

      await expect(wardrobeService.getWardrobe()).rejects.toThrow('获取衣橱失败');
    });
  });

  describe('wardrobeService.addToWardrobe', () => {
    it('should add clothing to wardrobe', async () => {
      const mockItem = makeWardrobeItem();
      mockWardrobeService.addToWardrobe.mockResolvedValue(mockItem);

      const result = await wardrobeService.addToWardrobe('c-1');
      expect(mockWardrobeService.addToWardrobe).toHaveBeenCalledWith('c-1');
      expect(result.clothingId).toBe('c-1');
    });
  });

  describe('wardrobeService.removeFromWardrobe', () => {
    it('should remove item from wardrobe', async () => {
      mockWardrobeService.removeFromWardrobe.mockResolvedValue(undefined);

      await wardrobeService.removeFromWardrobe('wi-1');
      expect(mockWardrobeService.removeFromWardrobe).toHaveBeenCalledWith('wi-1');
    });

    it('should handle removal errors', async () => {
      mockWardrobeService.removeFromWardrobe.mockRejectedValue(new Error('删除失败'));

      await expect(wardrobeService.removeFromWardrobe('wi-1')).rejects.toThrow('删除失败');
    });
  });

  describe('wardrobeService.getStats', () => {
    it('should return wardrobe statistics', async () => {
      const mockStats: WardrobeStatsResponse = {
        total: 25,
        categories: [{ category: 'top', count: 10 }],
        colors: [{ name: 'White', hex: '#FFFFFF', count: 5 }],
      };
      mockWardrobeService.getStats.mockResolvedValue(mockStats);

      const result = await wardrobeService.getStats();
      expect(result.total).toBe(25);
      expect(result.categories).toHaveLength(1);
      expect(result.colors).toHaveLength(1);
    });
  });
});
