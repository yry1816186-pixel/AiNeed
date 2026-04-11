import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QdrantService } from '../qdrant.service';

describe('QdrantService', () => {
  let service: QdrantService;

  const mockQdrantClient = {
    getCollections: jest.fn().mockResolvedValue({ collections: [] }),
    createCollection: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    search: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({}),
    deleteCollection: jest.fn().mockResolvedValue({}),
  };

  jest.mock('@qdrant/js-client-rest', () => ({
    QdrantClient: jest.fn().mockImplementation(() => mockQdrantClient),
  }));

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureCollection', () => {
    it('should create collection when it does not exist', async () => {
      mockQdrantClient.getCollections.mockResolvedValueOnce({
        collections: [],
      });

      await service.ensureCollection();

      expect(mockQdrantClient.createCollection).toHaveBeenCalledWith(
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
      mockQdrantClient.getCollections.mockResolvedValueOnce({
        collections: [{ name: 'aineed_fashion' }],
      });

      await service.ensureCollection();

      expect(mockQdrantClient.createCollection).not.toHaveBeenCalled();
    });
  });

  describe('upsert', () => {
    it('should upsert a single point', async () => {
      const vector = new Array(1024).fill(0.1);
      const payload = {
        clothingId: 'test-1',
        name: 'Test Item',
        category: 'T-Shirts',
        styleTags: ['casual'],
        colors: ['black'],
      };

      await service.upsert('test-1', vector, payload);

      expect(mockQdrantClient.upsert).toHaveBeenCalledWith(
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

      await service.batchUpsert(points);

      expect(mockQdrantClient.upsert).toHaveBeenCalledWith(
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
      expect(mockQdrantClient.upsert).not.toHaveBeenCalled();
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

      mockQdrantClient.search.mockResolvedValueOnce(mockResults);

      const results = await service.search(vector, 10, 0.7);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-1');
      expect(results[0].score).toBe(0.95);
      expect(mockQdrantClient.search).toHaveBeenCalledWith(
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

      mockQdrantClient.search.mockResolvedValueOnce([]);

      await service.search(vector, 10, 0.7, filters);

      expect(mockQdrantClient.search).toHaveBeenCalledWith(
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
      mockQdrantClient.search.mockResolvedValueOnce([]);

      const results = await service.search(vector, 10, 0.7);

      expect(results).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete a point by clothing ID', async () => {
      await service.delete('test-1');

      expect(mockQdrantClient.delete).toHaveBeenCalledWith('aineed_fashion', {
        points: ['test-1'],
      });
    });
  });

  describe('deleteCollection', () => {
    it('should delete the collection', async () => {
      await service.deleteCollection();

      expect(mockQdrantClient.deleteCollection).toHaveBeenCalledWith('aineed_fashion');
    });
  });

  describe('isHealthy', () => {
    it('should return true when Qdrant is available', async () => {
      mockQdrantClient.getCollections.mockResolvedValueOnce({ collections: [] });

      const result = await service.isHealthy();
      expect(result).toBe(true);
    });

    it('should return false when Qdrant is unavailable', async () => {
      mockQdrantClient.getCollections.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.isHealthy();
      expect(result).toBe(false);
    });
  });
});
