import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchProvider } from '../providers/elasticsearch.provider';
import { SearchType } from '../dto/search-query.dto';
import type {
  SearchFilters,
  SearchPagination,
} from '../dto/search-response.dto';
import type { IndexableDocument } from '../providers/search-provider.interface';

interface ElasticsearchProviderTestAccess {
  client: unknown;
  available: boolean;
}

function makeEsResponse(
  hits: Array<{ _id: string; _score?: number; _source?: Record<string, unknown> }>,
  total?: number | { value: number },
) {
  return {
    hits: {
      total: total ?? hits.length,
      hits,
    },
  };
}

function makeClothingSource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c-1',
    name: 'Test Shirt',
    description: 'A nice shirt',
    price: 199,
    original_price: 299,
    currency: 'CNY',
    image_urls: ['https://img.test/1.jpg'],
    colors: ['blue'],
    style_tags: ['casual'],
    brand_name: 'TestBrand',
    purchase_url: 'https://shop.test/1',
    ...overrides,
  };
}

function makePostSource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    title: 'Test Post',
    content: 'Post content here',
    image_urls: ['https://img.test/p1.jpg'],
    tags: ['fashion'],
    likes_count: 10,
    comments_count: 2,
    user_id: 'u-1',
    user_nickname: 'Alice',
    user_avatar_url: 'https://img.test/avatar.jpg',
    ...overrides,
  };
}

function createMockEsClient() {
  return {
    ping: jest.fn().mockResolvedValue(true),
    search: jest.fn().mockResolvedValue(
      makeEsResponse([], 0),
    ),
    index: jest.fn().mockResolvedValue({ result: 'created' }),
    delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
    indices: {
      exists: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue({ acknowledged: true }),
    },
  };
}

describe('ElasticsearchProvider', () => {
  let provider: ElasticsearchProvider;
  let mockClient: ReturnType<typeof createMockEsClient>;
  let mockConfigService: { get: jest.Mock };

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

  beforeEach(async () => {
    mockClient = createMockEsClient();
    mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:9200'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<ElasticsearchProvider>(ElasticsearchProvider);

    (provider as unknown as ElasticsearchProviderTestAccess).client = mockClient;
    (provider as unknown as ElasticsearchProviderTestAccess).available = true;
  });

  describe('onModuleInit', () => {
    it('should set available to true on successful ping', async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.indices.exists.mockResolvedValue(true);

      await provider.onModuleInit();

      expect((provider as unknown as ElasticsearchProviderTestAccess).available).toBe(true);
      expect(mockClient.ping).toHaveBeenCalled();
    });

    it('should set available to false when ping fails', async () => {
      mockClient.ping.mockRejectedValue(new Error('Connection refused'));

      await provider.onModuleInit();

      expect((provider as unknown as ElasticsearchProviderTestAccess).available).toBe(false);
    });

    it('should create clothing index when it does not exist', async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.indices.exists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await provider.onModuleInit();

      expect(mockClient.indices.create).toHaveBeenCalledTimes(1);
      expect(mockClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'aineed_clothing' }),
        expect.anything(),
      );
    });

    it('should create posts index when it does not exist', async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.indices.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await provider.onModuleInit();

      expect(mockClient.indices.create).toHaveBeenCalledTimes(1);
      expect(mockClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'aineed_posts' }),
        expect.anything(),
      );
    });

    it('should create both indices when neither exists', async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.indices.exists.mockResolvedValue(false);

      await provider.onModuleInit();

      expect(mockClient.indices.create).toHaveBeenCalledTimes(2);
    });

    it('should skip index creation when both already exist', async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.indices.exists.mockResolvedValue(true);

      await provider.onModuleInit();

      expect(mockClient.indices.create).not.toHaveBeenCalled();
    });

    it('should handle ensureIndices failure gracefully', async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.indices.exists.mockRejectedValue(new Error('Index error'));

      await provider.onModuleInit();

      expect((provider as unknown as ElasticsearchProviderTestAccess).available).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return true without pinging when already available', async () => {
      (provider as unknown as ElasticsearchProviderTestAccess).available = true;

      const result = await provider.isAvailable();

      expect(result).toBe(true);
      expect(mockClient.ping).not.toHaveBeenCalled();
    });

    it('should ping and return true when previously unavailable', async () => {
      (provider as unknown as ElasticsearchProviderTestAccess).available = false;
      mockClient.ping.mockResolvedValue(true);

      const result = await provider.isAvailable();

      expect(result).toBe(true);
      expect(mockClient.ping).toHaveBeenCalled();
    });

    it('should ping and return false when ping fails', async () => {
      (provider as unknown as ElasticsearchProviderTestAccess).available = false;
      mockClient.ping.mockRejectedValue(new Error('fail'));

      const result = await provider.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    it('should search clothing when type is ALL', async () => {
      mockClient.search
        .mockResolvedValueOnce(
          makeEsResponse([{ _id: 'c-1', _source: makeClothingSource() }], 1),
        )
        .mockResolvedValueOnce(
          makeEsResponse([], 0),
        );

      const result = await provider.search(
        'shirt',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should search clothing when type is CLOTHING', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'c-1', _source: makeClothingSource() }], 1),
      );

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing).toHaveLength(1);
      expect(result.posts).toHaveLength(0);
    });

    it('should search posts when type is ALL', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'p-1', _source: makePostSource() }], 1),
      );

      const result = await provider.search(
        'post',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(result.posts).toHaveLength(1);
    });

    it('should search posts when type is POSTS', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'p-1', _source: makePostSource() }], 1),
      );

      const result = await provider.search(
        'post',
        SearchType.POSTS,
        defaultFilters,
        defaultPagination,
      );

      expect(result.posts).toHaveLength(1);
      expect(result.clothing).toHaveLength(0);
    });

    it('should return empty results for USERS type (no ES user search)', async () => {
      const result = await provider.search(
        'user',
        SearchType.USERS,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing).toHaveLength(0);
      expect(result.posts).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(mockClient.search).not.toHaveBeenCalled();
    });

    it('should accumulate total from both clothing and posts in ALL search', async () => {
      mockClient.search
        .mockResolvedValueOnce(
          makeEsResponse([{ _id: 'c-1', _source: makeClothingSource() }], 5),
        )
        .mockResolvedValueOnce(
          makeEsResponse([{ _id: 'p-1', _source: makePostSource() }], 3),
        );

      const result = await provider.search(
        'test',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(result.total).toBe(8);
      expect(result.clothing).toHaveLength(1);
      expect(result.posts).toHaveLength(1);
    });
  });

  describe('searchClothing (via search)', () => {
    it('should include color filters when colors are provided', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = {
        ...defaultFilters,
        colors: ['red', 'blue'],
      };

      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toEqual([
        { terms: { colors: ['red', 'blue'] } },
      ]);
    });

    it('should include style filters when styles are provided', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = {
        ...defaultFilters,
        styles: ['casual'],
      };

      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toEqual([
        { terms: { style_tags: ['casual'] } },
      ]);
    });

    it('should include brand filters when brands are provided', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = {
        ...defaultFilters,
        brands: ['Nike', 'Adidas'],
      };

      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toEqual([
        { terms: { brand_name: ['Nike', 'Adidas'] } },
      ]);
    });

    it('should include price range filter when valid priceRange is provided', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = {
        ...defaultFilters,
        priceRange: '100-500',
      };

      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toEqual([
        { range: { price: { gte: 100, lte: 500 } } },
      ]);
    });

    it('should omit price range filter when priceRange is invalid (not two parts)', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = {
        ...defaultFilters,
        priceRange: 'invalid',
      };

      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toBeUndefined();
    });

    it('should omit price range filter when priceRange has NaN values', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = {
        ...defaultFilters,
        priceRange: 'abc-def',
      };

      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toBeUndefined();
    });

    it('should combine all filter types together', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = {
        colors: ['red'],
        styles: ['casual'],
        brands: ['Nike'],
        priceRange: '0-1000',
      };

      await provider.search('shirt', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toHaveLength(4);
    });

    it('should omit filter clause entirely when no filters are set', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      await provider.search('shirt', SearchType.CLOTHING, defaultFilters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toBeUndefined();
    });
  });

  describe('extractTotal (via searchClothing)', () => {
    it('should handle numeric hits.total', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'c-1', _source: makeClothingSource() }], 7),
      );

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.total).toBe(7);
    });

    it('should handle object hits.total with value property', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse(
          [{ _id: 'c-1', _source: makeClothingSource() }],
          { value: 42 },
        ),
      );

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.total).toBe(42);
    });

    it('should return 0 when hits.total is undefined', async () => {
      mockClient.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'c-1', _source: makeClothingSource() }],
        },
      });

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.total).toBe(0);
    });
  });

  describe('clothing result mapping', () => {
    it('should map full clothing source correctly', async () => {
      const source = makeClothingSource();
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'c-1', _score: 1.5, _source: source }], 1),
      );

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      const item = result.clothing[0];
      expect(item).toEqual({
        id: 'c-1',
        name: 'Test Shirt',
        description: 'A nice shirt',
        price: 199,
        originalPrice: 299,
        currency: 'CNY',
        imageUrls: ['https://img.test/1.jpg'],
        colors: ['blue'],
        styleTags: ['casual'],
        brandName: 'TestBrand',
        purchaseUrl: 'https://shop.test/1',
      });
    });

    it('should use _id as fallback when source.id is missing', async () => {
      const source = { ...makeClothingSource() };
      const { id: _id, ...sourceWithoutId } = source;
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'fallback-id', _source: sourceWithoutId }], 1),
      );

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing[0].id).toBe('fallback-id');
    });

    it('should handle missing source (undefined _source)', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'no-source' }], 1),
      );

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      const item = result.clothing[0];
      expect(item.id).toBe('no-source');
      expect(item.name).toBe('');
      expect(item.description).toBeNull();
      expect(item.price).toBeNull();
      expect(item.originalPrice).toBeNull();
      expect(item.currency).toBe('CNY');
      expect(item.imageUrls).toEqual([]);
      expect(item.colors).toEqual([]);
      expect(item.styleTags).toEqual([]);
      expect(item.brandName).toBeNull();
      expect(item.purchaseUrl).toBeNull();
    });

    it('should handle empty hits array', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([], 0),
      );

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle hits with undefined hits array', async () => {
      mockClient.search.mockResolvedValue({
        hits: {},
      });

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing).toEqual([]);
    });
  });

  describe('posts result mapping', () => {
    it('should map full post source correctly', async () => {
      const source = makePostSource();
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'p-1', _score: 2.0, _source: source }], 1),
      );

      const result = await provider.search(
        'post',
        SearchType.POSTS,
        defaultFilters,
        defaultPagination,
      );

      const item = result.posts[0];
      expect(item).toEqual({
        id: 'p-1',
        title: 'Test Post',
        content: 'Post content here',
        imageUrls: ['https://img.test/p1.jpg'],
        tags: ['fashion'],
        likesCount: 10,
        commentsCount: 2,
        userId: 'u-1',
        userNickname: 'Alice',
        userAvatarUrl: 'https://img.test/avatar.jpg',
      });
    });

    it('should use _id as fallback when post source.id is missing', async () => {
      const source = { ...makePostSource() };
      const { id: _id, ...sourceWithoutId } = source;
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'fallback-post', _source: sourceWithoutId }], 1),
      );

      const result = await provider.search(
        'post',
        SearchType.POSTS,
        defaultFilters,
        defaultPagination,
      );

      expect(result.posts[0].id).toBe('fallback-post');
    });

    it('should handle missing post source (undefined _source)', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([{ _id: 'no-source-post' }], 1),
      );

      const result = await provider.search(
        'post',
        SearchType.POSTS,
        defaultFilters,
        defaultPagination,
      );

      const item = result.posts[0];
      expect(item.id).toBe('no-source-post');
      expect(item.title).toBeNull();
      expect(item.content).toBe('');
      expect(item.imageUrls).toEqual([]);
      expect(item.tags).toEqual([]);
      expect(item.likesCount).toBe(0);
      expect(item.commentsCount).toBe(0);
      expect(item.userId).toBe('');
      expect(item.userNickname).toBeNull();
      expect(item.userAvatarUrl).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return empty results when clothing search throws', async () => {
      mockClient.search.mockRejectedValue(new Error('ES down'));

      const result = await provider.search(
        'shirt',
        SearchType.CLOTHING,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty results when posts search throws', async () => {
      mockClient.search.mockRejectedValue(new Error('ES down'));

      const result = await provider.search(
        'post',
        SearchType.POSTS,
        defaultFilters,
        defaultPagination,
      );

      expect(result.posts).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle clothing error + posts success in ALL search', async () => {
      mockClient.search
        .mockRejectedValueOnce(new Error('clothing fail'))
        .mockResolvedValueOnce(
          makeEsResponse([{ _id: 'p-1', _source: makePostSource() }], 1),
        );

      const result = await provider.search(
        'test',
        SearchType.ALL,
        defaultFilters,
        defaultPagination,
      );

      expect(result.clothing).toEqual([]);
      expect(result.posts).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('pagination', () => {
    it('should calculate correct "from" offset for page 2', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const pagination: SearchPagination = { page: 2, limit: 10 };

      await provider.search('test', SearchType.CLOTHING, defaultFilters, pagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.from).toBe(10);
      expect(searchCall.size).toBe(10);
    });

    it('should calculate correct "from" offset for page 1', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const pagination: SearchPagination = { page: 1, limit: 20 };

      await provider.search('test', SearchType.CLOTHING, defaultFilters, pagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.from).toBe(0);
      expect(searchCall.size).toBe(20);
    });
  });

  describe('suggest', () => {
    it('should return suggestions matching prefix', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([
          { _id: '1', _score: 1.5, _source: { name: 'White Shirt' } },
          { _id: '2', _score: 1.2, _source: { name: 'White Dress' } },
        ], 2),
      );

      const result = await provider.suggest('Whi', 5);

      expect(result).toEqual([
        { text: 'White Shirt', type: 'clothing', count: 1.5 },
        { text: 'White Dress', type: 'clothing', count: 1.2 },
      ]);
    });

    it('should filter out suggestions with empty text', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([
          { _id: '1', _score: 1.0, _source: { name: 'Valid' } },
          { _id: '2', _score: 0.5, _source: { name: '' } },
          { _id: '3', _score: 0.3 },
        ], 3),
      );

      const result = await provider.suggest('test', 10);

      expect(result).toEqual([
        { text: 'Valid', type: 'clothing', count: 1.0 },
      ]);
    });

    it('should use 0 as default score when _score is undefined', async () => {
      mockClient.search.mockResolvedValue(
        makeEsResponse([
          { _id: '1', _source: { name: 'Item' } },
        ], 1),
      );

      const result = await provider.suggest('I', 5);

      expect(result[0].count).toBe(0);
    });

    it('should return empty array on error', async () => {
      mockClient.search.mockRejectedValue(new Error('ES suggest failed'));

      const result = await provider.suggest('test', 5);

      expect(result).toEqual([]);
    });
  });

  describe('index', () => {
    it('should index a clothing document to the clothing index', async () => {
      const doc: IndexableDocument = {
        id: 'c-1',
        type: 'clothing',
        data: { name: 'Test Shirt' },
      };

      await provider.index(doc);

      expect(mockClient.index).toHaveBeenCalledWith({
        index: 'aineed_clothing',
        id: 'c-1',
        body: { name: 'Test Shirt' },
        refresh: 'wait_for',
      });
    });

    it('should index a posts document to the posts index', async () => {
      const doc: IndexableDocument = {
        id: 'p-1',
        type: 'posts',
        data: { title: 'Test Post' },
      };

      await provider.index(doc);

      expect(mockClient.index).toHaveBeenCalledWith({
        index: 'aineed_posts',
        id: 'p-1',
        body: { title: 'Test Post' },
        refresh: 'wait_for',
      });
    });

    it('should handle indexing failure gracefully', async () => {
      mockClient.index.mockRejectedValue(new Error('Index failed'));
      const doc: IndexableDocument = {
        id: 'c-1',
        type: 'clothing',
        data: { name: 'Test' },
      };

      await expect(provider.index(doc)).resolves.toBeUndefined();
    });
  });

  describe('removeFromIndex', () => {
    it('should remove from clothing index', async () => {
      await provider.removeFromIndex('c-1', 'clothing');

      expect(mockClient.delete).toHaveBeenCalledWith({
        index: 'aineed_clothing',
        id: 'c-1',
        refresh: 'wait_for',
      });
    });

    it('should remove from posts index', async () => {
      await provider.removeFromIndex('p-1', 'posts');

      expect(mockClient.delete).toHaveBeenCalledWith({
        index: 'aineed_posts',
        id: 'p-1',
        refresh: 'wait_for',
      });
    });

    it('should handle removal failure gracefully', async () => {
      mockClient.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(provider.removeFromIndex('c-1', 'clothing')).resolves.toBeUndefined();
    });
  });

  describe('parsePriceRange', () => {
    it('should parse a valid price range', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = { ...defaultFilters, priceRange: '50-200' };
      await provider.search('test', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toEqual([
        { range: { price: { gte: 50, lte: 200 } } },
      ]);
    });

    it('should reject price range with too many parts', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = { ...defaultFilters, priceRange: '1-2-3' };
      await provider.search('test', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toBeUndefined();
    });

    it('should reject price range with non-numeric values', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = { ...defaultFilters, priceRange: 'abc-xyz' };
      await provider.search('test', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toBeUndefined();
    });

    it('should reject price range with single part', async () => {
      mockClient.search.mockResolvedValue(makeEsResponse([], 0));

      const filters: SearchFilters = { ...defaultFilters, priceRange: '100' };
      await provider.search('test', SearchType.CLOTHING, filters, defaultPagination);

      const searchCall = mockClient.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toBeUndefined();
    });
  });
});
