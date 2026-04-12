import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationController } from '../recommendation.controller';
import { RecommendationService } from '../recommendation.service';
import { TimeRange } from '../dto/recommendation-query.dto';

describe('RecommendationController', () => {
  let controller: RecommendationController;
  let service: RecommendationService;

  const mockRecommendationService = {
    getPersonalizedRecommendations: jest.fn(),
    getTrendingRecommendations: jest.fn(),
    getSimilarRecommendations: jest.fn(),
    trackInteraction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        { provide: RecommendationService, useValue: mockRecommendationService },
      ],
    }).compile();

    controller = module.get<RecommendationController>(RecommendationController);
    service = module.get<RecommendationService>(RecommendationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPersonalizedRecommendations', () => {
    it('should delegate to service with user id and query', async () => {
      const expectedResult = {
        items: [
          {
            clothing: { id: 'item-1', name: 'Test Item' },
            score: 0.85,
            reason: 'Style match',
          },
        ],
        channel: 'content',
      };
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue(expectedResult);

      const query = { limit: 10, occasion: 'work', style: 'minimalist' };
      const result = await controller.getPersonalizedRecommendations(
        { user: { id: 'user-1' } },
        query,
      );

      expect(result).toEqual(expectedResult);
      expect(service.getPersonalizedRecommendations).toHaveBeenCalledWith('user-1', query);
    });

    it('should return empty items when no recommendations', async () => {
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue({
        items: [],
        channel: 'content',
      });

      const result = await controller.getPersonalizedRecommendations(
        { user: { id: 'user-1' } },
        { limit: 10 },
      );

      expect(result.items).toHaveLength(0);
    });

    it('should pass budget_range filter', async () => {
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue({
        items: [],
        channel: 'content',
      });

      await controller.getPersonalizedRecommendations(
        { user: { id: 'user-1' } },
        { budgetRange: '100-500' },
      );

      expect(service.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ budgetRange: '100-500' }),
      );
    });
  });

  describe('getTrendingRecommendations', () => {
    it('should delegate to service with query params', async () => {
      const expectedResult = {
        items: [
          { clothing: { id: 'item-1' }, score: 50 },
        ],
      };
      mockRecommendationService.getTrendingRecommendations.mockResolvedValue(expectedResult);

      const result = await controller.getTrendingRecommendations({
        category: 'top',
        limit: 5,
        timeRange: TimeRange.WEEK,
      });

      expect(result).toEqual(expectedResult);
      expect(service.getTrendingRecommendations).toHaveBeenCalledWith({
        category: 'top',
        limit: 5,
        timeRange: TimeRange.WEEK,
      });
    });

    it('should pass query to service even when time range not specified', async () => {
      mockRecommendationService.getTrendingRecommendations.mockResolvedValue({ items: [] });

      await controller.getTrendingRecommendations({});

      expect(service.getTrendingRecommendations).toHaveBeenCalledWith({});
    });

    it('should return empty items when no trending data', async () => {
      mockRecommendationService.getTrendingRecommendations.mockResolvedValue({ items: [] });

      const result = await controller.getTrendingRecommendations({});

      expect(result.items).toHaveLength(0);
    });
  });

  describe('getSimilarRecommendations', () => {
    it('should delegate to service with clothingId', async () => {
      const expectedResult = {
        items: [
          { clothing: { id: 'item-2' }, similarity: 0.8 },
        ],
      };
      mockRecommendationService.getSimilarRecommendations.mockResolvedValue(expectedResult);

      const result = await controller.getSimilarRecommendations('item-1');

      expect(result).toEqual(expectedResult);
      expect(service.getSimilarRecommendations).toHaveBeenCalledWith('item-1');
    });

    it('should propagate NotFoundException for non-existent clothing', async () => {
      const { NotFoundException } = require('@nestjs/common');
      mockRecommendationService.getSimilarRecommendations.mockRejectedValue(
        new NotFoundException('Clothing not found'),
      );

      await expect(controller.getSimilarRecommendations('non-existent')).rejects.toThrow();
    });
  });

  describe('trackInteraction', () => {
    it('should delegate to service with user id and dto', async () => {
      const dto = { clothingId: 'item-1', interactionType: 'like' as const };
      mockRecommendationService.trackInteraction.mockResolvedValue({ recorded: true });

      const result = await controller.trackInteraction(
        { user: { id: 'user-1' } },
        dto,
      );

      expect(result.recorded).toBe(true);
      expect(service.trackInteraction).toHaveBeenCalledWith('user-1', dto);
    });

    it('should pass duration_ms when provided', async () => {
      const dto = { clothingId: 'item-1', interactionType: 'view' as const, durationMs: 5000 };
      mockRecommendationService.trackInteraction.mockResolvedValue({ recorded: true });

      const result = await controller.trackInteraction(
        { user: { id: 'user-1' } },
        dto,
      );

      expect(result.recorded).toBe(true);
      expect(service.trackInteraction).toHaveBeenCalledWith('user-1', dto);
    });
  });
});
