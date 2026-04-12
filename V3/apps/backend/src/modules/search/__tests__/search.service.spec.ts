import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../search.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ISearchProvider } from '../providers/search-provider.interface';
import { SEARCH_PROVIDER } from '../providers/search-provider.interface';
import { DatabaseProvider } from '../providers/database.provider';
import { SearchType } from '../dto/search-query.dto';
import {
  SearchResult,
  SearchFilters,
  SearchPagination,
  SuggestionItem,
} from '../dto/search-response.dto';

describe('SearchService', () => {
  let service: SearchService;
  let searchProvider: ISearchProvider;
  let databaseProvider: DatabaseProvider;
  let prismaService: PrismaService;

  const mockSearchResult: SearchResult = {
    clothing: [
      {
        id: '1',
        name: '白色T恤',
        description: '纯棉白色T恤',
        price: 99,
        originalPrice: 199,
        currency: 'CNY',
        imageUrls: ['https://example.com/img.jpg'],
        colors: ['白色'],
        styleTags: ['休闲'],
        brandName: '测试品牌',
        purchaseUrl: 'https://example.com/buy',
      },
    ],
    posts: [],
    users: [],
    total: 1,
  };

  const mockSuggestions: SuggestionItem[] = [
    { text: '白色T恤', type: 'clothing', count: 10 },
  ];

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

  function createMockRedisClient() {
    const pipelineMock: Record<string, jest.Mock> = {};
    pipelineMock.lrem = jest.fn().mockReturnValue(pipelineMock);
    pipelineMock.lpush = jest.fn().mockReturnValue(pipelineMock);
    pipelineMock.ltrim = jest.fn().mockReturnValue(pipelineMock);
    pipelineMock.expire = jest.fn().mockReturnValue(pipelineMock);
    pipelineMock.exec = jest.fn().mockResolvedValue([[null, 'OK']]);

    return {
      zrevrange: jest.fn().mockResolvedValue(['休闲', '100', '运动', '80']),
      zincrby: jest.fn().mockResolvedValue('1'),
      expire: jest.fn().mockResolvedValue(1),
      lrange: jest.fn().mockResolvedValue([
        JSON.stringify({ keyword: 'T恤', searchedAt: '2024-01-01T00:00:00.000Z' }),
      ]),
      lpush: jest.fn().mockResolvedValue(1),
      lrem: jest.fn().mockResolvedValue(1),
      ltrim: jest.fn().mockResolvedValue('OK'),
      pipeline: jest.fn().mockReturnValue(pipelineMock),
    };
  }

  function setRedisClient(client: ReturnType<typeof createMockRedisClient> | null) {
    (globalThis as Record<string, unknown>).__redisClient = client;
  }

  beforeEach(async () => {
    const mockSearchProvider: Partial<ISearchProvider> = {
      search: jest.fn().mockResolvedValue(mockSearchResult),
      suggest: jest.fn().mockResolvedValue(mockSuggestions),
      index: jest.fn().mockResolvedValue(undefined),
      removeFromIndex: jest.fn().mockResolvedValue(undefined),
      isAvailable: jest.fn().mockResolvedValue(true),
    };

    const mockDatabaseProvider: Partial<DatabaseProvider> = {
      search: jest.fn().mockResolvedValue(mockSearchResult),
      suggest: jest.fn().mockResolvedValue(mockSuggestions),
      index: jest.fn().mockResolvedValue(undefined),
      removeFromIndex: jest.fn().mockResolvedValue(undefined),
      isAvailable: jest.fn().mockResolvedValue(true),
    };

    const mockPrismaService = {
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
      userStylePreference: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: SEARCH_PROVIDER,
          useValue: mockSearchProvider,
        },
        {
          provide: DatabaseProvider,
          useValue: mockDatabaseProvider,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    searchProvider = module.get<ISearchProvider>(SEARCH_PROVIDER);
    databaseProvider = module.get<DatabaseProvider>(DatabaseProvider);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    setRedisClient(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should use primary provider when available', async () => {
      const result = await service.search(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(searchProvider.isAvailable).toHaveBeenCalled();
      expect(searchProvider.search).toHaveBeenCalledWith(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );
      expect(result).toEqual(mockSearchResult);
    });

    it('should fallback to database when ES is unavailable', async () => {
      (searchProvider.isAvailable as jest.Mock).mockResolvedValue(false);
      (databaseProvider.search as jest.Mock).mockResolvedValue(mockSearchResult);

      const result = await service.search(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(databaseProvider.search).toHaveBeenCalledWith(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );
      expect(result).toEqual(mockSearchResult);
    });

    it('should fallback to database when ES throws error', async () => {
      (searchProvider.isAvailable as jest.Mock).mockResolvedValue(true);
      (searchProvider.search as jest.Mock).mockRejectedValue(new Error('ES connection failed'));
      (databaseProvider.search as jest.Mock).mockResolvedValue(mockSearchResult);

      const result = await service.search(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(databaseProvider.search).toHaveBeenCalled();
      expect(result).toEqual(mockSearchResult);
    });

    it('should search by clothing type only', async () => {
      const clothingOnlyResult: SearchResult = {
        clothing: mockSearchResult.clothing,
        posts: [],
        users: [],
        total: 1,
      };
      (searchProvider.search as jest.Mock).mockResolvedValue(clothingOnlyResult);

      const result = await service.search(
        '白色T恤',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(searchProvider.search).toHaveBeenCalledWith(
        '白色T恤',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );
      expect(result.clothing).toHaveLength(1);
    });

    it('should apply filters correctly', async () => {
      const filters: SearchFilters = {
        colors: ['白色', '黑色'],
        styles: ['休闲'],
        priceRange: '0-500',
        brands: ['测试品牌'],
      };

      await service.search('T恤', SearchType.ALL, filters, defaultPagination);

      expect(searchProvider.search).toHaveBeenCalledWith(
        'T恤',
        SearchType.ALL,
        filters,
        defaultPagination,
      );
    });

    it('should apply pagination correctly', async () => {
      const pagination: SearchPagination = { page: 2, limit: 10 };

      await service.search('T恤', SearchType.ALL, defaultFilters, pagination);

      expect(searchProvider.search).toHaveBeenCalledWith(
        'T恤',
        SearchType.ALL,
        defaultFilters,
        pagination,
      );
    });

    it('should record search history when userId is provided', async () => {
      const redis = createMockRedisClient();
      setRedisClient(redis);

      await service.search(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
        'user-1',
      );

      expect(redis.pipeline).toHaveBeenCalled();
      expect(redis.pipeline().lpush).toHaveBeenCalled();
    });

    it('should not record search history when userId is not provided', async () => {
      const redis = createMockRedisClient();
      setRedisClient(redis);

      await service.search(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(redis.pipeline).not.toHaveBeenCalled();
    });

    it('should increment hot keyword on search', async () => {
      const redis = createMockRedisClient();
      setRedisClient(redis);

      await service.search(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(redis.zincrby).toHaveBeenCalledWith('search:hot_keywords', 1, '白色T恤');
    });

    it('should handle search history recording failure gracefully', async () => {
      const redis = createMockRedisClient();
      redis.pipeline().exec.mockRejectedValue(new Error('Redis error'));
      setRedisClient(redis);

      const result = await service.search(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
        'user-1',
      );

      expect(result).toEqual(mockSearchResult);
    });

    it('should handle hot keyword increment failure gracefully', async () => {
      const redis = createMockRedisClient();
      redis.zincrby.mockRejectedValue(new Error('Redis error'));
      setRedisClient(redis);

      const result = await service.search(
        '白色T恤',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(result).toEqual(mockSearchResult);
    });
  });

  describe('suggest', () => {
    it('should return suggestions from primary provider', async () => {
      const result = await service.suggest('白色', 5);

      expect(searchProvider.isAvailable).toHaveBeenCalled();
      expect(searchProvider.suggest).toHaveBeenCalledWith('白色', 5);
      expect(result).toEqual(mockSuggestions);
    });

    it('should fallback to database when ES is unavailable', async () => {
      (searchProvider.isAvailable as jest.Mock).mockResolvedValue(false);
      (databaseProvider.suggest as jest.Mock).mockResolvedValue(mockSuggestions);

      const result = await service.suggest('白色', 5);

      expect(databaseProvider.suggest).toHaveBeenCalledWith('白色', 5);
      expect(result).toEqual(mockSuggestions);
    });
  });

  describe('getHotKeywords', () => {
    it('should return keywords from Redis when available', async () => {
      const redis = createMockRedisClient();
      setRedisClient(redis);

      const result = await service.getHotKeywords(10);

      expect(redis.zrevrange).toHaveBeenCalledWith('search:hot_keywords', 0, 9, 'WITHSCORES');
      expect(result).toEqual([
        { text: '休闲', heat: 100 },
        { text: '运动', heat: 80 },
      ]);
    });

    it('should return fallback keywords when Redis is unavailable', async () => {
      const mockStyleTags = [
        { styleTags: ['休闲', '运动'] },
        { styleTags: ['休闲', '正式'] },
        { styleTags: ['运动'] },
      ];
      (prismaService.clothingItem.findMany as jest.Mock).mockResolvedValue(mockStyleTags);

      const result = await service.getHotKeywords(10);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].text).toBe('休闲');
      expect(result[0].heat).toBe(2);
    });

    it('should return empty array on database error', async () => {
      (prismaService.clothingItem.findMany as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.getHotKeywords(10);

      expect(result).toEqual([]);
    });

    it('should fallback to database when Redis throws error', async () => {
      const redis = createMockRedisClient();
      redis.zrevrange.mockRejectedValue(new Error('Redis error'));
      setRedisClient(redis);

      const mockStyleTags = [{ styleTags: ['休闲'] }];
      (prismaService.clothingItem.findMany as jest.Mock).mockResolvedValue(mockStyleTags);

      const result = await service.getHotKeywords(10);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getSearchHistory', () => {
    it('should return search history from Redis', async () => {
      const redis = createMockRedisClient();
      setRedisClient(redis);

      const result = await service.getSearchHistory('user-1');

      expect(redis.lrange).toHaveBeenCalledWith('search:history:user-1', 0, 49);
      expect(result).toHaveLength(1);
      expect(result[0].keyword).toBe('T恤');
      expect(result[0].id).toBe('user-1-0');
    });

    it('should return empty array when Redis is unavailable', async () => {
      const result = await service.getSearchHistory('user-1');

      expect(result).toEqual([]);
    });

    it('should return empty array when Redis throws error', async () => {
      const redis = createMockRedisClient();
      redis.lrange.mockRejectedValue(new Error('Redis error'));
      setRedisClient(redis);

      const result = await service.getSearchHistory('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('deleteSearchHistory', () => {
    it('should delete search history from Redis', async () => {
      const redis = createMockRedisClient();
      setRedisClient(redis);

      const result = await service.deleteSearchHistory('user-1', 'user-1-0');

      expect(redis.lrange).toHaveBeenCalledWith('search:history:user-1', 0, 0);
      expect(redis.lrem).toHaveBeenCalledWith('search:history:user-1', 1, expect.any(String));
      expect(result).toBe(true);
    });

    it('should return false when Redis is unavailable', async () => {
      const result = await service.deleteSearchHistory('user-1', 'user-1-0');

      expect(result).toBe(false);
    });

    it('should return false when history ID has invalid index', async () => {
      const redis = createMockRedisClient();
      setRedisClient(redis);

      const result = await service.deleteSearchHistory('user-1', 'invalid');

      expect(result).toBe(false);
    });

    it('should return false when item not found in Redis', async () => {
      const redis = createMockRedisClient();
      redis.lrange.mockResolvedValue([]);
      setRedisClient(redis);

      const result = await service.deleteSearchHistory('user-1', 'user-1-0');

      expect(result).toBe(false);
    });

    it('should return false when Redis throws error', async () => {
      const redis = createMockRedisClient();
      redis.lrange.mockRejectedValue(new Error('Redis error'));
      setRedisClient(redis);

      const result = await service.deleteSearchHistory('user-1', 'user-1-0');

      expect(result).toBe(false);
    });
  });

  describe('indexDocument', () => {
    it('should delegate to primary search provider', async () => {
      const doc = { id: '1', type: 'clothing' as const, data: { name: 'Test' } };

      await service.indexDocument(doc);

      expect(searchProvider.index).toHaveBeenCalledWith(doc);
    });
  });

  describe('removeFromIndex', () => {
    it('should delegate to primary search provider', async () => {
      await service.removeFromIndex('1', 'clothing');

      expect(searchProvider.removeFromIndex).toHaveBeenCalledWith('1', 'clothing');
    });
  });
});
