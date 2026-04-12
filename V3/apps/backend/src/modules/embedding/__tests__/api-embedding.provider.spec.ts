import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiEmbeddingProvider } from '../providers/api-embedding.provider';

// Mock ioredis
const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

describe('ApiEmbeddingProvider', () => {
  let provider: ApiEmbeddingProvider;

  const mockConfig = {
    EMBEDDING_SERVICE_URL: 'http://localhost:8003',
    ZHIPU_API_KEY: 'test-api-key',
    EMBEDDING_MODEL: 'bge-m3',
  };

  // Store original fetch
  const originalFetch = global.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ApiEmbeddingProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              return mockConfig[key as keyof typeof mockConfig] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<ApiEmbeddingProvider>(ApiEmbeddingProvider);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('getDimensions', () => {
    it('should return 1024', () => {
      expect(provider.getDimensions()).toBe(1024);
    });
  });

  describe('getModelName', () => {
    it('should return the configured model name', () => {
      expect(provider.getModelName()).toBe('bge-m3');
    });
  });

  describe('embed', () => {
    const mockVector = new Array(1024).fill(0).map((_, i) => i / 1024);

    it('should call the embedding API and return a vector', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector }],
        }),
      });

      const result = await provider.embed('test text');

      expect(result).toHaveLength(1024);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8003/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
          body: expect.stringContaining('test text'),
        }),
      );
    });

    it('should throw when API returns non-ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(provider.embed('test')).rejects.toThrow(
        'Embedding API error: 500 - Internal Server Error',
      );
    });

    it('should throw when API returns mismatched response length', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector }, { embedding: mockVector }],
        }),
      });

      await expect(provider.embed('test')).rejects.toThrow(
        'Embedding API returned unexpected response length',
      );
    });

    it('should throw when API returns invalid vector dimensions', async () => {
      const shortVector = [0.1, 0.2, 0.3];
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: shortVector }],
        }),
      });

      await expect(provider.embed('test')).rejects.toThrow(
        'Invalid embedding dimensions',
      );
    });

    it('should throw when API call itself fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(provider.embed('test')).rejects.toThrow('Network error');
    });

    it('should throw when API response has no data field', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await expect(provider.embed('test')).rejects.toThrow(
        'Embedding API returned unexpected response length',
      );
    });
  });

  describe('embedBatch', () => {
    const mockVector = new Array(1024).fill(0).map((_, i) => i / 1024);

    it('should embed multiple texts in one call', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector }, { embedding: mockVector }],
        }),
      });

      const result = await provider.embedBatch(['text1', 'text2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(1024);
      expect(result[1]).toHaveLength(1024);
    });

    it('should return same-length array as input', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { embedding: mockVector },
            { embedding: mockVector },
            { embedding: mockVector },
          ],
        }),
      });

      const result = await provider.embedBatch(['a', 'b', 'c']);

      expect(result).toHaveLength(3);
    });

    it('should handle single text batch', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector }],
        }),
      });

      const result = await provider.embedBatch(['single']);

      expect(result).toHaveLength(1);
    });
  });

  describe('Redis caching', () => {
    const mockVector = new Array(1024).fill(0).map((_, i) => i / 1024);

    let providerWithRedis: ApiEmbeddingProvider;

    beforeEach(async () => {
      jest.clearAllMocks();

      const module = await Test.createTestingModule({
        providers: [
          ApiEmbeddingProvider,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                const config: Record<string, string> = {
                  EMBEDDING_SERVICE_URL: 'http://localhost:8003',
                  ZHIPU_API_KEY: 'test-api-key',
                  EMBEDDING_MODEL: 'bge-m3',
                  REDIS_URL: 'redis://localhost:6379',
                };
                return config[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      providerWithRedis = module.get<ApiEmbeddingProvider>(ApiEmbeddingProvider);
    });

    describe('embed with cache', () => {
      it('should return cached vector when available in Redis', async () => {
        global.fetch = jest.fn();
        mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify(mockVector));

        const result = await providerWithRedis.embed('cached text');

        expect(result).toEqual(mockVector);
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should call API and cache result when not in Redis', async () => {
        mockRedisInstance.get.mockResolvedValueOnce(null);
        mockRedisInstance.set.mockResolvedValueOnce('OK');
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [{ embedding: mockVector }],
          }),
        });

        const result = await providerWithRedis.embed('new text');

        expect(result).toEqual(mockVector);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(mockRedisInstance.set).toHaveBeenCalledWith(
          expect.stringContaining('embed:'),
          JSON.stringify(mockVector),
          'EX',
          86400,
        );
      });

      it('should handle Redis read failure gracefully', async () => {
        mockRedisInstance.get.mockRejectedValueOnce(new Error('Redis down'));
        mockRedisInstance.set.mockResolvedValueOnce('OK');
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [{ embedding: mockVector }],
          }),
        });

        const result = await providerWithRedis.embed('redis-fail text');

        expect(result).toEqual(mockVector);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('should handle Redis write failure gracefully', async () => {
        mockRedisInstance.get.mockResolvedValueOnce(null);
        mockRedisInstance.set.mockRejectedValueOnce(new Error('Redis write failed'));
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [{ embedding: mockVector }],
          }),
        });

        const result = await providerWithRedis.embed('write-fail text');

        // Should still return result even if cache write fails
        expect(result).toEqual(mockVector);
      });

      it('should reuse existing Redis connection on subsequent calls', async () => {
        mockRedisInstance.get.mockResolvedValue(null);
        mockRedisInstance.set.mockResolvedValue('OK');
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [{ embedding: mockVector }],
          }),
        });

        await providerWithRedis.embed('first');
        await providerWithRedis.embed('second');

        // Redis constructor should only be called once
        const Redis = jest.requireMock('ioredis') as unknown as jest.Mock;
        expect(Redis).toHaveBeenCalledTimes(1);
      });
    });

    describe('embedBatch with cache', () => {
      it('should use cached results for some texts and API for rest', async () => {
        const otherVector = new Array(1024).fill(0).map((_, i) => (i + 1) / 1024);

        mockRedisInstance.get
          .mockResolvedValueOnce(JSON.stringify(mockVector))   // text1 cached
          .mockResolvedValueOnce(null)                          // text2 not cached
          .mockResolvedValueOnce(JSON.stringify(otherVector));  // text3 cached

        mockRedisInstance.set.mockResolvedValue('OK');

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [{ embedding: mockVector }],
          }),
        });

        const result = await providerWithRedis.embedBatch(['text1', 'text2', 'text3']);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual(mockVector);
        expect(result[1]).toEqual(mockVector);
        expect(result[2]).toEqual(otherVector);
        // Only text2 should hit the API
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('should return all cached results without API call', async () => {
        global.fetch = jest.fn();
        mockRedisInstance.get
          .mockResolvedValueOnce(JSON.stringify(mockVector))
          .mockResolvedValueOnce(JSON.stringify(mockVector));

        const result = await providerWithRedis.embedBatch(['cached1', 'cached2']);

        expect(result).toHaveLength(2);
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('without REDIS_URL', () => {
    it('should work without Redis when REDIS_URL is not set', async () => {
      const mockVector = new Array(1024).fill(0).map((_, i) => i / 1024);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector }],
        }),
      });

      const result = await provider.embed('no redis');

      expect(result).toEqual(mockVector);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Redis connection failure', () => {
    it('should handle Redis constructor throwing an error', async () => {
      const mockVector = new Array(1024).fill(0).map((_, i) => i / 1024);

      // Force Redis constructor to throw
      const Redis = jest.requireMock('ioredis') as unknown as jest.Mock;
      Redis.mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const module = await Test.createTestingModule({
        providers: [
          ApiEmbeddingProvider,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                const config: Record<string, string> = {
                  EMBEDDING_SERVICE_URL: 'http://localhost:8003',
                  ZHIPU_API_KEY: 'test-api-key',
                  EMBEDDING_MODEL: 'bge-m3',
                  REDIS_URL: 'redis://invalid-host:6379',
                };
                return config[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const providerWithBadRedis = module.get<ApiEmbeddingProvider>(ApiEmbeddingProvider);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector }],
        }),
      });

      // Should still work despite Redis failure -- falls back to no-cache
      const result = await providerWithBadRedis.embed('redis-constructor-fail');

      expect(result).toEqual(mockVector);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
