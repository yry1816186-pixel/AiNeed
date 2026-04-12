import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QdrantService, QdrantPayload } from '../qdrant.service';

describe('QdrantService', () => {
  let service: QdrantService;

  const mockClient = {
    getCollections: jest.fn(),
    createCollection: jest.fn(),
    upsert: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    deleteCollection: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        QdrantService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                QDRANT_URL: 'http://localhost:6333',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QdrantService>(QdrantService);
    (service as unknown as { client: typeof mockClient }).client = mockClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureCollection', () => {
    it('should create collection when it does not exist', async () => {
      mockClient.getCollections.mockResolvedValueOnce({
        collections: [],
      });

      await service.ensureCollection();

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        'aineed_fashion',
        expect.objectContaining({
          vectors: expect.objectContaining({
            size: 1024,
            distance: 'Cosine',
          }),
        }),
      );
    });

    it('should not create collection when it already exists', async () => {
      mockClient.getCollections.mockResolvedValueOnce({
        collections: [{ name: 'aineed_fashion' }],
      });

      await service.ensureCollection();

      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });
  });

  describe('upsert', () => {
    it('should upsert a single point', async () => {
      const vector = new Array(1024).fill(0.1);
      const payload: QdrantPayload = {
        clothingId: 'test-1',
        name: 'Test Item',
        category: 'T-Shirts',
        styleTags: ['casual'],
        colors: ['black'],
      };

      mockClient.upsert.mockResolvedValueOnce({});

      await service.upsert('test-1', vector, payload);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        'aineed_fashion',
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              id: 'test-1',
              vector,
            }),
          ]),
        }),
      );
    });
  });

  describe('batchUpsert', () => {
    it('should upsert multiple points', async () => {
      const vector = new Array(1024).fill(0.1);
      const points = [
        {
          clothingId: 'test-1',
          vector,
          payload: {
            clothingId: 'test-1',
            name: 'Item 1',
            category: 'T-Shirts',
            styleTags: ['casual'],
            colors: ['black'],
          },
        },
        {
          clothingId: 'test-2',
          vector,
          payload: {
            clothingId: 'test-2',
            name: 'Item 2',
            category: 'Pants',
            styleTags: ['formal'],
            colors: ['navy'],
          },
        },
      ];

      mockClient.upsert.mockResolvedValueOnce({});

      await service.batchUpsert(points);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        'aineed_fashion',
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({ id: 'test-1' }),
            expect.objectContaining({ id: 'test-2' }),
          ]),
        }),
      );
    });

    it('should handle empty points array', async () => {
      await service.batchUpsert([]);
      expect(mockClient.upsert).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search with vector and return results', async () => {
      const vector = new Array(1024).fill(0.1);
      const mockResults = [
        {
          id: 'test-1',
          score: 0.95,
          payload: {
            clothingId: 'test-1',
            name: 'Test Item',
            category: 'T-Shirts',
            styleTags: ['casual'],
            colors: ['black'],
          },
        },
      ];

      mockClient.search.mockResolvedValueOnce(mockResults);

      const results = await service.search(vector, 10, 0.7);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-1');
      expect(results[0].score).toBe(0.95);
      expect(mockClient.search).toHaveBeenCalledWith(
        'aineed_fashion',
        expect.objectContaining({
          vector,
          limit: 10,
          score_threshold: 0.7,
          with_payload: true,
        }),
      );
    });

    it('should search with filters', async () => {
      const vector = new Array(1024).fill(0.1);
      const filters = { colors: ['black', 'white'] };

      mockClient.search.mockResolvedValueOnce([]);

      await service.search(vector, 10, 0.7, filters);

      expect(mockClient.search).toHaveBeenCalledWith(
        'aineed_fashion',
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                key: 'colors',
                match: expect.objectContaining({ any: ['black', 'white'] }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should return empty results when no matches', async () => {
      const vector = new Array(1024).fill(0.1);
      mockClient.search.mockResolvedValueOnce([]);

      const results = await service.search(vector, 10, 0.7);

      expect(results).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete a point by clothing ID', async () => {
      mockClient.delete.mockResolvedValueOnce({});

      await service.delete('test-1');

      expect(mockClient.delete).toHaveBeenCalledWith('aineed_fashion', {
        points: ['test-1'],
      });
    });
  });

  describe('deleteCollection', () => {
    it('should delete the collection', async () => {
      mockClient.deleteCollection.mockResolvedValueOnce({});

      await service.deleteCollection();

      expect(mockClient.deleteCollection).toHaveBeenCalledWith('aineed_fashion');
    });
  });

  describe('isHealthy', () => {
    it('should return true when Qdrant is available', async () => {
      mockClient.getCollections.mockResolvedValueOnce({ collections: [] });

      const result = await service.isHealthy();
      expect(result).toBe(true);
    });

    it('should return false when Qdrant is unavailable', async () => {
      mockClient.getCollections.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.isHealthy();
      expect(result).toBe(false);
    });
  });

  // --- Error paths ---

  describe('onModuleInit', () => {
    it('should initialize successfully when collection exists', async () => {
      mockClient.getCollections.mockResolvedValueOnce({
        collections: [{ name: 'aineed_fashion' }],
      });

      await service.onModuleInit();

      // Should not throw
    });

    it('should catch and log error when initialization fails', async () => {
      mockClient.getCollections.mockRejectedValueOnce(new Error('init failed'));

      // Should not throw -- the error is caught internally
      await service.onModuleInit();
    });
  });

  describe('ensureCollection - error paths', () => {
    it('should throw when getCollections fails', async () => {
      mockClient.getCollections.mockRejectedValueOnce(new Error('connection lost'));

      await expect(service.ensureCollection()).rejects.toThrow('connection lost');
    });
  });

  describe('upsert - error path', () => {
    it('should throw when client.upsert fails', async () => {
      const vector = new Array(1024).fill(0.1);
      const payload = {
        clothingId: 'test-1',
        name: 'Test Item',
        category: 'T-Shirts',
        styleTags: ['casual'],
        colors: ['black'],
      };

      mockClient.upsert.mockRejectedValueOnce(new Error('write failed'));

      await expect(service.upsert('test-1', vector, payload)).rejects.toThrow('write failed');
    });
  });

  describe('batchUpsert - error path', () => {
    it('should throw when client.upsert fails in batch', async () => {
      const vector = new Array(1024).fill(0.1);
      const points = [
        {
          clothingId: 'test-1',
          vector,
          payload: {
            clothingId: 'test-1',
            name: 'Item 1',
            category: 'T-Shirts',
            styleTags: ['casual'],
            colors: ['black'],
          },
        },
      ];

      mockClient.upsert.mockRejectedValueOnce(new Error('batch write failed'));

      await expect(service.batchUpsert(points)).rejects.toThrow('batch write failed');
    });
  });

  describe('search - error path', () => {
    it('should throw when client.search fails', async () => {
      const vector = new Array(1024).fill(0.1);

      mockClient.search.mockRejectedValueOnce(new Error('search timeout'));

      await expect(service.search(vector, 10, 0.7)).rejects.toThrow('search timeout');
    });
  });

  describe('delete - error path', () => {
    it('should throw when client.delete fails', async () => {
      mockClient.delete.mockRejectedValueOnce(new Error('delete failed'));

      await expect(service.delete('test-1')).rejects.toThrow('delete failed');
    });
  });

  describe('deleteCollection - error path', () => {
    it('should throw when client.deleteCollection fails', async () => {
      mockClient.deleteCollection.mockRejectedValueOnce(new Error('cannot delete'));

      await expect(service.deleteCollection()).rejects.toThrow('cannot delete');
    });
  });

  describe('search - buildFilter edge cases', () => {
    it('should handle filters with scalar (non-array) values', async () => {
      const vector = new Array(1024).fill(0.1);
      const filters = { category: 'T-Shirts' };

      mockClient.search.mockResolvedValueOnce([]);

      await service.search(vector, 10, 0.7, filters);

      expect(mockClient.search).toHaveBeenCalledWith(
        'aineed_fashion',
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                key: 'category',
                match: expect.objectContaining({ value: 'T-Shirts' }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should handle filters with mixed array and scalar values', async () => {
      const vector = new Array(1024).fill(0.1);
      const filters = {
        colors: ['black', 'white'],
        category: 'Pants',
      };

      mockClient.search.mockResolvedValueOnce([]);

      await service.search(vector, 10, 0.7, filters);

      const call = mockClient.search.mock.calls[0][1] as Record<string, unknown>;
      const filter = call.filter as Record<string, unknown>;
      const conditions = filter.must as Array<Record<string, unknown>>;

      expect(conditions).toHaveLength(2);
    });
  });
});
