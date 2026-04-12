import { Test } from '@nestjs/testing';
import { EmbeddingService } from '../embedding.service';
import { QdrantService } from '../qdrant.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  IEmbeddingProvider,
  EMBEDDING_PROVIDER_TOKEN,
} from '../providers/embedding-provider.interface';

function generateMockVector(seed: number): number[] {
  const vector: number[] = [];
  let sumSquares = 0;
  for (let i = 0; i < 1024; i++) {
    const val = Math.sin(seed + i) * 0.5;
    vector.push(val);
    sumSquares += val * val;
  }
  const magnitude = Math.sqrt(sumSquares);
  return vector.map((v) => v / magnitude);
}

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let embeddingProvider: IEmbeddingProvider;
  let qdrantService: QdrantService;
  let prismaService: PrismaService;

  const mockVector = generateMockVector(42);

  const mockEmbeddingProvider: IEmbeddingProvider = {
    embed: jest.fn().mockResolvedValue(mockVector),
    embedBatch: jest.fn().mockResolvedValue([mockVector, mockVector]),
    getDimensions: jest.fn().mockReturnValue(1024),
    getModelName: jest.fn().mockReturnValue('mock-embedding'),
  };

  const mockQdrantService = {
    search: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue(undefined),
    batchUpsert: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockResolvedValue(true),
    ensureCollection: jest.fn().mockResolvedValue(undefined),
    onModuleInit: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrismaService = {
    clothingItem: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'clothing-1',
        name: 'Test T-Shirt',
        description: 'A comfortable cotton t-shirt',
        styleTags: ['casual', 'streetwear'],
        colors: ['black', 'white'],
        materials: ['cotton'],
        category: { name: 'T-Shirts' },
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'clothing-1',
          name: 'Test T-Shirt',
          category: { name: 'T-Shirts' },
          styleTags: ['casual'],
          colors: ['black'],
          price: 99.99,
          imageUrls: ['http://example.com/image.jpg'],
        },
      ]),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: EMBEDDING_PROVIDER_TOKEN,
          useValue: mockEmbeddingProvider,
        },
        {
          provide: QdrantService,
          useValue: mockQdrantService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
    embeddingProvider = module.get<IEmbeddingProvider>(EMBEDDING_PROVIDER_TOKEN);
    qdrantService = module.get<QdrantService>(QdrantService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('embedText', () => {
    it('should return embedding vector with metadata', async () => {
      const result = await service.embedText('black cotton t-shirt');

      expect(result.vector).toEqual(mockVector);
      expect(result.dimensions).toBe(1024);
      expect(result.model).toBe('mock-embedding');
      expect(embeddingProvider.embed).toHaveBeenCalledWith('black cotton t-shirt');
    });

    it('should validate vector dimensions', async () => {
      const result = await service.embedText('test');
      expect(result.vector.length).toBe(1024);
    });
  });

  describe('embedBatch', () => {
    it('should return batch embedding results', async () => {
      const texts = ['black shirt', 'white pants'];
      const result = await service.embedBatch(texts);

      expect(result.vectors).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.model).toBe('mock-embedding');
      expect(embeddingProvider.embedBatch).toHaveBeenCalledWith(texts);
    });
  });

  describe('searchSimilar', () => {
    it('should search via Qdrant and return results', async () => {
      const qdrantResults = [
        {
          id: 'clothing-1',
          score: 0.95,
          payload: {
            clothingId: 'clothing-1',
            name: 'Test T-Shirt',
            category: 'T-Shirts',
            styleTags: ['casual'],
            colors: ['black'],
          },
        },
      ];

      mockQdrantService.search.mockResolvedValueOnce(qdrantResults);
      mockPrismaService.clothingItem.findMany.mockResolvedValueOnce([
        {
          id: 'clothing-1',
          name: 'Test T-Shirt',
          category: { name: 'T-Shirts' },
          styleTags: ['casual'],
          colors: ['black'],
          price: 99.99,
          imageUrls: ['http://example.com/image.jpg'],
        },
      ]);

      const result = await service.searchSimilar('casual black shirt', 10, 0.7);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].clothingId).toBe('clothing-1');
      expect(result.items[0].score).toBe(0.95);
      expect(result.total).toBe(1);
      expect(embeddingProvider.embed).toHaveBeenCalledWith('casual black shirt');
    });

    it('should fallback to pgvector when Qdrant fails', async () => {
      mockQdrantService.search.mockRejectedValueOnce(new Error('Qdrant unavailable'));
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        {
          id: 'clothing-1',
          name: 'Test T-Shirt',
          category_name: 'T-Shirts',
          style_tags: ['casual'],
          colors: ['black'],
          price: 99.99,
          image_urls: ['http://example.com/image.jpg'],
          similarity: 0.85,
        },
      ]);

      const result = await service.searchSimilar('casual shirt', 10, 0.7);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].clothingId).toBe('clothing-1');
      expect(result.items[0].score).toBe(0.85);
    });

    it('should return empty results when no matches found', async () => {
      mockQdrantService.search.mockResolvedValueOnce([]);

      const result = await service.searchSimilar('nonexistent item', 10, 0.7);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('indexClothing', () => {
    it('should index a clothing item to both Qdrant and PostgreSQL', async () => {
      const result = await service.indexClothing('clothing-1');

      expect(result.clothingId).toBe('clothing-1');
      expect(result.indexed).toBe(true);
      expect(embeddingProvider.embed).toHaveBeenCalledTimes(1);
      expect(qdrantService.upsert).toHaveBeenCalledTimes(1);
      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw when clothing item not found', async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValueOnce(null);

      await expect(service.indexClothing('nonexistent')).rejects.toThrow(
        'Clothing item not found: nonexistent',
      );
    });

    it('should build text description from clothing fields', async () => {
      await service.indexClothing('clothing-1');

      const embedCall = (embeddingProvider.embed as jest.Mock).mock.calls[0][0] as string;
      expect(embedCall).toContain('Test T-Shirt');
      expect(embedCall).toContain('A comfortable cotton t-shirt');
      expect(embedCall).toContain('casual');
      expect(embedCall).toContain('black');
      expect(embedCall).toContain('cotton');
    });
  });

  describe('batchIndexClothing', () => {
    it('should return task ID and total count', async () => {
      const clothingIds = ['clothing-1', 'clothing-2', 'clothing-3'];
      const result = await service.batchIndexClothing(clothingIds);

      expect(result.taskId).toBeDefined();
      expect(result.total).toBe(3);
    });

    it('should handle empty array', async () => {
      const result = await service.batchIndexClothing([]);

      expect(result.taskId).toBeDefined();
      expect(result.total).toBe(0);
    });

    it('should index all items via setImmediate and log completion', async () => {
      const clothingIds = ['batch-1', 'batch-2'];

      jest.useFakeTimers();

      // Reset mock implementations for clean test
      mockPrismaService.clothingItem.findUnique
        .mockReset()
        .mockResolvedValueOnce({
          id: 'batch-1',
          name: 'Item 1',
          description: 'Desc 1',
          styleTags: ['casual'],
          colors: ['black'],
          materials: ['cotton'],
          category: { name: 'T-Shirts' },
        })
        .mockResolvedValueOnce({
          id: 'batch-2',
          name: 'Item 2',
          description: 'Desc 2',
          styleTags: ['formal'],
          colors: ['navy'],
          materials: ['wool'],
          category: { name: 'Pants' },
        });

      (mockQdrantService.upsert as jest.Mock).mockReset().mockResolvedValue(undefined);
      (mockPrismaService.$executeRaw as jest.Mock).mockReset().mockResolvedValue(1);
      (embeddingProvider.embed as jest.Mock).mockReset().mockResolvedValue(generateMockVector(1));

      await service.batchIndexClothing(clothingIds);

      // Advance timers to run the setImmediate callback
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockQdrantService.upsert).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should handle individual index failures gracefully in batch', async () => {
      const clothingIds = ['good-1', 'bad-1'];

      jest.useFakeTimers();

      mockPrismaService.clothingItem.findUnique
        .mockReset()
        .mockResolvedValueOnce({
          id: 'good-1',
          name: 'Good Item',
          description: 'Good',
          styleTags: [],
          colors: [],
          materials: [],
          category: null,
        })
        .mockResolvedValueOnce(null); // bad-1 will cause "not found" error

      (mockQdrantService.upsert as jest.Mock).mockReset().mockResolvedValue(undefined);
      (mockPrismaService.$executeRaw as jest.Mock).mockReset().mockResolvedValue(1);
      (embeddingProvider.embed as jest.Mock).mockReset().mockResolvedValue(generateMockVector(2));

      await service.batchIndexClothing(clothingIds);

      await jest.advanceTimersByTimeAsync(1000);

      // good-1 should succeed, bad-1 should fail but be caught
      expect(mockQdrantService.upsert).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('searchSimilar - edge cases', () => {
    it('should filter out qdrant results with no matching clothing in DB', async () => {
      const qdrantResults = [
        {
          id: 'qdrant-1',
          score: 0.95,
          payload: {
            clothingId: 'clothing-missing',
            name: 'Missing Item',
            category: 'T-Shirts',
            styleTags: ['casual'],
            colors: ['black'],
          },
        },
      ];

      mockQdrantService.search.mockResolvedValueOnce(qdrantResults);
      // DB returns empty -- clothing not found
      mockPrismaService.clothingItem.findMany.mockResolvedValueOnce([]);

      const result = await service.searchSimilar('missing item', 10, 0.7);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle clothing items with null category and null price', async () => {
      const qdrantResults = [
        {
          id: 'qdrant-1',
          score: 0.9,
          payload: {
            clothingId: 'clothing-1',
            name: 'No Category',
            category: null,
            styleTags: [],
            colors: [],
          },
        },
      ];

      mockQdrantService.search.mockResolvedValueOnce(qdrantResults);
      mockPrismaService.clothingItem.findMany.mockResolvedValueOnce([
        {
          id: 'clothing-1',
          name: 'No Category',
          category: null,
          styleTags: [],
          colors: [],
          price: null,
          imageUrls: [],
        },
      ]);

      const result = await service.searchSimilar('no category item', 10, 0.7);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].clothing.category).toBeNull();
      expect(result.items[0].clothing.price).toBeNull();
    });

    it('should map decimal price to Number', async () => {
      const qdrantResults = [
        {
          id: 'qdrant-1',
          score: 0.88,
          payload: {
            clothingId: 'clothing-1',
            name: 'Priced Item',
            category: 'T-Shirts',
            styleTags: [],
            colors: [],
          },
        },
      ];

      mockQdrantService.search.mockResolvedValueOnce(qdrantResults);
      mockPrismaService.clothingItem.findMany.mockResolvedValueOnce([
        {
          id: 'clothing-1',
          name: 'Priced Item',
          category: { name: 'T-Shirts' },
          styleTags: [],
          colors: [],
          price: '99.99',
          imageUrls: ['http://example.com/img.jpg'],
        },
      ]);

      const result = await service.searchSimilar('priced', 10, 0.7);

      expect(result.items[0].clothing.price).toBe(99.99);
    });

    it('should return pgvector fallback results with correct structure', async () => {
      mockQdrantService.search.mockRejectedValueOnce(new Error('Qdrant down'));
      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        {
          id: 'pg-1',
          name: 'PG Item',
          category_name: 'Pants',
          style_tags: ['formal'],
          colors: ['navy'],
          price: null,
          image_urls: [],
          similarity: 0.75,
        },
      ]);

      const result = await service.searchSimilar('formal pants', 10, 0.7);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].clothingId).toBe('pg-1');
      expect(result.items[0].score).toBe(0.75);
      expect(result.items[0].clothing.name).toBe('PG Item');
    });
  });

  describe('indexClothing - buildClothingText edge cases', () => {
    it('should build text without optional fields when they are null/empty', async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValueOnce({
        id: 'cloth-minimal',
        name: 'Minimal Item',
        description: null,
        styleTags: [],
        colors: [],
        materials: [],
        category: null,
      });
      mockQdrantService.upsert.mockResolvedValue(undefined);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.indexClothing('cloth-minimal');

      const embedCall = (embeddingProvider.embed as jest.Mock).mock.calls[0][0] as string;
      expect(embedCall).toBe('Minimal Item');
      expect(embedCall).not.toContain('分类');
      expect(embedCall).not.toContain('风格');
      expect(embedCall).not.toContain('颜色');
      expect(embedCall).not.toContain('材质');
    });

    it('should include all fields in text when all are present', async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValueOnce({
        id: 'cloth-full',
        name: 'Full Item',
        description: 'Great shirt',
        styleTags: ['casual', 'streetwear'],
        colors: ['black', 'white'],
        materials: ['cotton', 'polyester'],
        category: { name: 'T-Shirts' },
      });
      mockQdrantService.upsert.mockResolvedValue(undefined);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.indexClothing('cloth-full');

      const embedCall = (embeddingProvider.embed as jest.Mock).mock.calls[0][0] as string;
      expect(embedCall).toContain('Full Item');
      expect(embedCall).toContain('Great shirt');
      expect(embedCall).toContain('分类: T-Shirts');
      expect(embedCall).toContain('风格: casual, streetwear');
      expect(embedCall).toContain('颜色: black, white');
      expect(embedCall).toContain('材质: cotton, polyester');
    });
  });
});
