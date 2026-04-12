import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseProvider } from '../providers/database.provider';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchType } from '../dto/search-query.dto';
import type {
  SearchFilters,
  SearchPagination,
} from '../dto/search-response.dto';

// ---------------------------------------------------------------------------
// Mock Prisma Service factory
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    clothingItem: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    communityPost: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const defaultFilters: SearchFilters = {
  colors: [],
  styles: [],
  priceRange: null,
  brands: [],
};

const defaultPagination: SearchPagination = {
  page: 1,
  limit: 20,
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('DatabaseProvider', () => {
  let provider: DatabaseProvider;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseProvider,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    provider = module.get<DatabaseProvider>(DatabaseProvider);
  });

  // -----------------------------------------------------------------------
  // isAvailable
  // -----------------------------------------------------------------------

  describe('isAvailable', () => {
    it('should return true when database query succeeds', async () => {
      const result = await provider.isAvailable();

      expect(result).toBe(true);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when database query throws', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('DB down'));

      const result = await provider.isAvailable();

      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // search - routing by SearchType
  // -----------------------------------------------------------------------

  describe('search', () => {
    it('should search clothing, posts, and users when type is ALL', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);
      prisma.communityPost.findMany.mockResolvedValue([]);
      prisma.communityPost.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const result = await provider.search(
        'test',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(prisma.clothingItem.findMany).toHaveBeenCalled();
      expect(prisma.communityPost.findMany).toHaveBeenCalled();
      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result.total).toBe(0);
    });

    it('should search only clothing when type is CLOTHING', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(prisma.clothingItem.findMany).toHaveBeenCalled();
      expect(prisma.communityPost.findMany).not.toHaveBeenCalled();
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(result.clothing).toEqual([]);
    });

    it('should search only posts when type is POSTS', async () => {
      prisma.communityPost.findMany.mockResolvedValue([]);
      prisma.communityPost.count.mockResolvedValue(0);

      const result = await provider.search(
        'post',
        SearchType.POSTS,
        defaultFilters,
        defaultPagination,
      );

      expect(prisma.communityPost.findMany).toHaveBeenCalled();
      expect(prisma.clothingItem.findMany).not.toHaveBeenCalled();
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(result.posts).toEqual([]);
    });

    it('should search only users when type is USERS', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const result = await provider.search(
        'user',
        SearchType.USERS,
        defaultFilters,
        defaultPagination,
      );

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(prisma.clothingItem.findMany).not.toHaveBeenCalled();
      expect(prisma.communityPost.findMany).not.toHaveBeenCalled();
      expect(result.users).toEqual([]);
    });

    it('should accumulate total from all three types in ALL search', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([{ id: 'c-1', name: 'Shirt', description: '', price: null, originalPrice: null, currency: 'CNY', imageUrls: [], colors: [], styleTags: [], brand: null, purchaseUrl: null }]);
      prisma.clothingItem.count.mockResolvedValue(5);
      prisma.communityPost.findMany.mockResolvedValue([{ id: 'p-1', title: 'Post', content: 'body', imageUrls: [], tags: [], likesCount: 0, commentsCount: 0, user: { id: 'u-1', nickname: 'A', avatarUrl: null } }]);
      prisma.communityPost.count.mockResolvedValue(3);
      prisma.user.findMany.mockResolvedValue([{ id: 'u-1', nickname: 'A', avatarUrl: null, gender: null }]);
      prisma.user.count.mockResolvedValue(2);

      const result = await provider.search(
        'test',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(result.total).toBe(10); // 5 + 3 + 2
    });
  });

  // -----------------------------------------------------------------------
  // searchClothing - filter branches (via buildClothingWhere)
  // -----------------------------------------------------------------------

  describe('clothing search with filters', () => {
    it('should build base where clause with OR conditions for name, description, styleTags', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      await provider.search('shirt', SearchType.CLOTHING, defaultFilters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      expect(whereClause.isActive).toBe(true);
      expect(whereClause.OR).toHaveLength(3);
    });

    it('should add color filter when colors are provided', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const filters: SearchFilters = { ...defaultFilters, colors: ['red', 'blue'] };
      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      expect(whereClause.AND).toContainEqual({ colors: { hasSome: ['red', 'blue'] } });
    });

    it('should add style filter when styles are provided', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const filters: SearchFilters = { ...defaultFilters, styles: ['casual'] };
      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      expect(whereClause.AND).toContainEqual({ styleTags: { hasSome: ['casual'] } });
    });

    it('should add brand filter when brands are provided', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const filters: SearchFilters = { ...defaultFilters, brands: ['Nike'] };
      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      expect(whereClause.AND).toContainEqual({
        brand: { name: { in: ['Nike'] } },
      });
    });

    it('should add price range filter when valid priceRange is provided', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const filters: SearchFilters = { ...defaultFilters, priceRange: '100-500' };
      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      expect(whereClause.AND).toContainEqual({
        price: { gte: 100, lte: 500 },
      });
    });

    it('should not add AND conditions when no filters are provided', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      await provider.search('shirt', SearchType.CLOTHING, defaultFilters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      expect(whereClause.AND).toBeUndefined();
    });

    it('should combine multiple filters together', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const filters: SearchFilters = {
        colors: ['red'],
        styles: ['casual'],
        brands: ['Nike'],
        priceRange: '50-200',
      };

      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      expect(whereClause.AND).toHaveLength(4);
    });

    // parsePriceRange edge cases

    it('should ignore price range with invalid format (too many parts)', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const filters: SearchFilters = { ...defaultFilters, priceRange: '1-2-3' };
      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      // No price range should be added since it's invalid
      if (whereClause.AND) {
        const hasPriceRange = whereClause.AND.some(
          (cond: Record<string, unknown>) => 'price' in cond,
        );
        expect(hasPriceRange).toBe(false);
      }
    });

    it('should ignore price range with non-numeric values', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const filters: SearchFilters = { ...defaultFilters, priceRange: 'abc-xyz' };
      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      if (whereClause.AND) {
        const hasPriceRange = whereClause.AND.some(
          (cond: Record<string, unknown>) => 'price' in cond,
        );
        expect(hasPriceRange).toBe(false);
      }
    });

    it('should ignore price range with single part', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const filters: SearchFilters = { ...defaultFilters, priceRange: '100' };
      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const whereClause = prisma.clothingItem.findMany.mock.calls[0][0].where;
      if (whereClause.AND) {
        const hasPriceRange = whereClause.AND.some(
          (cond: Record<string, unknown>) => 'price' in cond,
        );
        expect(hasPriceRange).toBe(false);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Clothing result mapping
  // -----------------------------------------------------------------------

  describe('clothing result mapping', () => {
    it('should map database rows to ClothingSearchResult', async () => {
      // Simulate a Prisma Decimal via an object with toNumber()
      const mockRow = {
        id: 'c-1',
        name: 'White Shirt',
        description: 'A white shirt',
        price: { toNumber: () => 199 },
        originalPrice: { toNumber: () => 299 },
        currency: 'CNY',
        imageUrls: ['https://img.test/1.jpg'],
        colors: ['white'],
        styleTags: ['casual'],
        brand: { name: 'TestBrand' },
        purchaseUrl: 'https://shop.test/1',
      };

      prisma.clothingItem.findMany.mockResolvedValue([mockRow]);
      prisma.clothingItem.count.mockResolvedValue(1);

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing).toHaveLength(1);
      expect(result.clothing[0]).toEqual({
        id: 'c-1',
        name: 'White Shirt',
        description: 'A white shirt',
        price: 199,
        originalPrice: 299,
        currency: 'CNY',
        imageUrls: ['https://img.test/1.jpg'],
        colors: ['white'],
        styleTags: ['casual'],
        brandName: 'TestBrand',
        purchaseUrl: 'https://shop.test/1',
      });
    });

    it('should handle null price and originalPrice', async () => {
      const mockRow = {
        id: 'c-2',
        name: 'Free Item',
        description: null,
        price: null,
        originalPrice: null,
        currency: 'CNY',
        imageUrls: [],
        colors: [],
        styleTags: [],
        brand: null,
        purchaseUrl: null,
      };

      prisma.clothingItem.findMany.mockResolvedValue([mockRow]);
      prisma.clothingItem.count.mockResolvedValue(1);

      const result = await provider.search(
        'free',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing[0].price).toBeNull();
      expect(result.clothing[0].originalPrice).toBeNull();
      expect(result.clothing[0].brandName).toBeNull();
    });

    it('should handle clothing search database error gracefully', async () => {
      prisma.clothingItem.findMany.mockRejectedValue(new Error('DB error'));

      const result = await provider.search(
        'test',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Posts search and result mapping
  // -----------------------------------------------------------------------

  describe('posts search', () => {
    it('should map database rows to PostSearchResult', async () => {
      const mockRow = {
        id: 'p-1',
        title: 'My Post',
        content: 'Post body',
        imageUrls: ['https://img.test/p1.jpg'],
        tags: ['fashion'],
        likesCount: 10,
        commentsCount: 2,
        user: { id: 'u-1', nickname: 'Alice', avatarUrl: 'https://img.test/avatar.jpg' },
      };

      prisma.communityPost.findMany.mockResolvedValue([mockRow]);
      prisma.communityPost.count.mockResolvedValue(1);

      const result = await provider.search(
        'post',
        SearchType.POSTS,
        defaultFilters,
        defaultPagination,
      );

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]).toEqual({
        id: 'p-1',
        title: 'My Post',
        content: 'Post body',
        imageUrls: ['https://img.test/p1.jpg'],
        tags: ['fashion'],
        likesCount: 10,
        commentsCount: 2,
        userId: 'u-1',
        userNickname: 'Alice',
        userAvatarUrl: 'https://img.test/avatar.jpg',
      });
    });

    it('should include status=published in where clause', async () => {
      prisma.communityPost.findMany.mockResolvedValue([]);
      prisma.communityPost.count.mockResolvedValue(0);

      await provider.search('test', SearchType.POSTS, defaultFilters, defaultPagination);

      const whereClause = prisma.communityPost.findMany.mock.calls[0][0].where;
      expect(whereClause.status).toBe('published');
    });

    it('should handle posts search database error gracefully', async () => {
      prisma.communityPost.findMany.mockRejectedValue(new Error('DB error'));

      const result = await provider.search(
        'test',
        SearchType.POSTS,
        defaultFilters,
        defaultPagination,
      );

      expect(result.posts).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Users search and result mapping
  // -----------------------------------------------------------------------

  describe('users search', () => {
    it('should map database rows to UserSearchResult', async () => {
      const mockRow = {
        id: 'u-1',
        nickname: 'Alice',
        avatarUrl: 'https://img.test/avatar.jpg',
        gender: 'female',
      };

      prisma.user.findMany.mockResolvedValue([mockRow]);
      prisma.user.count.mockResolvedValue(1);

      const result = await provider.search(
        'Alice',
        SearchType.USERS,
        defaultFilters,
        defaultPagination,
      );

      expect(result.users).toHaveLength(1);
      expect(result.users[0]).toEqual({
        id: 'u-1',
        nickname: 'Alice',
        avatarUrl: 'https://img.test/avatar.jpg',
        gender: 'female',
      });
    });

    it('should search by nickname with insensitive contains', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await provider.search('alice', SearchType.USERS, defaultFilters, defaultPagination);

      const whereClause = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereClause.OR[0].nickname.contains).toBe('alice');
      expect(whereClause.OR[0].nickname.mode).toBe('insensitive');
    });

    it('should handle users search database error gracefully', async () => {
      prisma.user.findMany.mockRejectedValue(new Error('DB error'));

      const result = await provider.search(
        'test',
        SearchType.USERS,
        defaultFilters,
        defaultPagination,
      );

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------

  describe('pagination', () => {
    it('should calculate correct skip for page 1', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const pagination: SearchPagination = { page: 1, limit: 10 };

      await provider.search('test', SearchType.CLOTHING, defaultFilters, pagination);

      const callArgs = prisma.clothingItem.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBe(0);
      expect(callArgs.take).toBe(10);
    });

    it('should calculate correct skip for page 3 with limit 10', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const pagination: SearchPagination = { page: 3, limit: 10 };

      await provider.search('test', SearchType.CLOTHING, defaultFilters, pagination);

      const callArgs = prisma.clothingItem.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBe(20); // (3-1) * 10
      expect(callArgs.take).toBe(10);
    });
  });

  // -----------------------------------------------------------------------
  // suggest
  // -----------------------------------------------------------------------

  describe('suggest', () => {
    it('should return clothing name suggestions', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([
        { name: 'White Shirt' },
        { name: 'White Dress' },
      ]);

      const result = await provider.suggest('Whi', 5);

      expect(result).toEqual([
        { text: 'White Shirt', type: 'clothing', count: 0 },
        { text: 'White Dress', type: 'clothing', count: 0 },
      ]);
    });

    it('should use distinct names and limit results', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([
        { name: 'Item A' },
      ]);

      await provider.suggest('I', 3);

      const callArgs = prisma.clothingItem.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(3);
      expect(callArgs.distinct).toEqual(['name']);
    });

    it('should search with isActive=true filter', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);

      await provider.suggest('test', 5);

      const callArgs = prisma.clothingItem.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
    });

    it('should return empty array on database error', async () => {
      prisma.clothingItem.findMany.mockRejectedValue(new Error('DB error'));

      const result = await provider.suggest('test', 5);

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // index (no-op)
  // -----------------------------------------------------------------------

  describe('index', () => {
    it('should be a no-op and not throw', async () => {
      await expect(
        provider.index({ id: '1', type: 'clothing', data: {} }),
      ).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // removeFromIndex (no-op)
  // -----------------------------------------------------------------------

  describe('removeFromIndex', () => {
    it('should be a no-op and not throw', async () => {
      await expect(
        provider.removeFromIndex('1', 'clothing'),
      ).resolves.toBeUndefined();
    });
  });
});
