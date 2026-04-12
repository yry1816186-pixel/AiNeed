import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingController } from '../embedding.controller';
import { EmbeddingService } from '../embedding.service';

describe('EmbeddingController', () => {
  let controller: EmbeddingController;
  let service: EmbeddingService;

  const mockEmbeddingService = {
    embedText: jest.fn(),
    embedBatch: jest.fn(),
    searchSimilar: jest.fn(),
    indexClothing: jest.fn(),
    batchIndexClothing: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmbeddingController],
      providers: [
        { provide: EmbeddingService, useValue: mockEmbeddingService },
      ],
    }).compile();

    controller = module.get<EmbeddingController>(EmbeddingController);
    service = module.get<EmbeddingService>(EmbeddingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('embedText', () => {
    it('should call service.embedText with the text from dto', async () => {
      const mockResult = {
        vector: [0.1, 0.2, 0.3],
        dimensions: 1024,
        model: 'bge-m3',
      };
      mockEmbeddingService.embedText.mockResolvedValue(mockResult);

      const result = await controller.embedText({ text: 'black cotton shirt' });

      expect(service.embedText).toHaveBeenCalledWith('black cotton shirt');
      expect(result).toEqual(mockResult);
    });
  });

  describe('embedBatch', () => {
    it('should call service.embedBatch with the texts from dto', async () => {
      const mockResult = {
        vectors: [[0.1], [0.2]],
        count: 2,
        model: 'bge-m3',
      };
      mockEmbeddingService.embedBatch.mockResolvedValue(mockResult);

      const result = await controller.embedBatch({ texts: ['shirt', 'pants'] });

      expect(service.embedBatch).toHaveBeenCalledWith(['shirt', 'pants']);
      expect(result).toEqual(mockResult);
    });
  });

  describe('searchSimilar', () => {
    it('should call service.searchSimilar with default limit and threshold', async () => {
      const mockResult = { items: [], total: 0 };
      mockEmbeddingService.searchSimilar.mockResolvedValue(mockResult);

      const result = await controller.searchSimilar({
        query: 'casual shirt',
      });

      expect(service.searchSimilar).toHaveBeenCalledWith(
        'casual shirt',
        10,
        0.7,
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('should pass custom limit and threshold', async () => {
      const mockResult = { items: [], total: 0 };
      mockEmbeddingService.searchSimilar.mockResolvedValue(mockResult);

      await controller.searchSimilar({
        query: 'dress',
        limit: 20,
        threshold: 0.8,
      });

      expect(service.searchSimilar).toHaveBeenCalledWith(
        'dress',
        20,
        0.8,
        undefined,
      );
    });

    it('should pass filters when provided', async () => {
      const mockResult = { items: [], total: 0 };
      mockEmbeddingService.searchSimilar.mockResolvedValue(mockResult);
      const filters = { category: 'T-Shirts' };

      await controller.searchSimilar({
        query: 'shirt',
        limit: 5,
        threshold: 0.6,
        filters,
      });

      expect(service.searchSimilar).toHaveBeenCalledWith(
        'shirt',
        5,
        0.6,
        filters,
      );
    });
  });

  describe('indexClothing', () => {
    it('should call service.indexClothing with clothingId', async () => {
      const mockResult = { clothingId: 'cloth-001', indexed: true };
      mockEmbeddingService.indexClothing.mockResolvedValue(mockResult);

      const result = await controller.indexClothing('cloth-001');

      expect(service.indexClothing).toHaveBeenCalledWith('cloth-001');
      expect(result).toEqual(mockResult);
    });
  });

  describe('batchIndex', () => {
    it('should call service.batchIndexClothing with clothingIds', async () => {
      const mockResult = { taskId: 'task-001', total: 3 };
      mockEmbeddingService.batchIndexClothing.mockResolvedValue(mockResult);
      const clothingIds = ['cloth-001', 'cloth-002', 'cloth-003'];

      const result = await controller.batchIndex({ clothingIds });

      expect(service.batchIndexClothing).toHaveBeenCalledWith(clothingIds);
      expect(result).toEqual(mockResult);
    });

    it('should handle empty clothingIds array', async () => {
      const mockResult = { taskId: 'task-002', total: 0 };
      mockEmbeddingService.batchIndexClothing.mockResolvedValue(mockResult);

      const result = await controller.batchIndex({ clothingIds: [] });

      expect(service.batchIndexClothing).toHaveBeenCalledWith([]);
      expect(result.total).toBe(0);
    });
  });
});
