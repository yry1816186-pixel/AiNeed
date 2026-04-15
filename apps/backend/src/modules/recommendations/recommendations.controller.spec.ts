import { Test, TestingModule } from "@nestjs/testing";
import { ClothingCategory } from "@prisma/client";

import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";

// Mock the transitive dependency modules that have TS compilation errors
jest.mock("./services/advanced-recommendation.service", () => ({
  AdvancedRecommendationService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("./services/outfit-completion.service", () => ({
  OutfitCompletionService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("./services/behavior-tracking.service", () => ({
  BehaviorTrackingService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("./services/recommendation-feed.service", () => ({
  RecommendationFeedService: jest.fn().mockImplementation(() => ({})),
}));

// Import after mocks are set up
import { AdvancedRecommendationService } from "./services/advanced-recommendation.service";
import { BehaviorTrackingService } from "./services/behavior-tracking.service";
import { OutfitCompletionService } from "./services/outfit-completion.service";
import { RecommendationFeedService } from "./services/recommendation-feed.service";

describe("RecommendationsController", () => {
  let controller: RecommendationsController;

  const mockRecommendationsService = {
    getPersonalizedRecommendations: jest.fn().mockResolvedValue([]),
    getStyleGuide: jest.fn().mockResolvedValue({
      bodyType: null,
      skinTone: null,
      colorSeason: null,
      recommendations: [],
    }),
  };

  const mockAdvancedRecommendationService = {
    getPersonalizedRecommendations: jest.fn().mockResolvedValue([]),
    getDailyOutfitRecommendation: jest.fn().mockResolvedValue(null),
    getOccasionRecommendations: jest.fn().mockResolvedValue([]),
    getTrendingRecommendations: jest.fn().mockResolvedValue([]),
  };

  const mockOutfitCompletionService = {
    getCompleteTheLook: jest.fn().mockResolvedValue({ items: [] }),
  };

  const mockBehaviorTrackingService = {
    track: jest.fn().mockResolvedValue(undefined),
    trackBatch: jest.fn().mockResolvedValue(undefined),
  };

  const mockFeedService = {
    getFeed: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        { provide: RecommendationsService, useValue: mockRecommendationsService },
        { provide: AdvancedRecommendationService, useValue: mockAdvancedRecommendationService },
        { provide: OutfitCompletionService, useValue: mockOutfitCompletionService },
        { provide: BehaviorTrackingService, useValue: mockBehaviorTrackingService },
        { provide: RecommendationFeedService, useValue: mockFeedService },
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getRecommendations", () => {
    it("should return recommendations for user", async () => {
      mockRecommendationsService.getPersonalizedRecommendations.mockResolvedValue([
        { item: { id: "item-1", name: "Test" }, score: 80, matchReasons: [] },
      ]);

      const result = await controller.getRecommendations("user-1");

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should pass filter options to service", async () => {
      mockRecommendationsService.getPersonalizedRecommendations.mockResolvedValue([]);

      await controller.getRecommendations(
        "user-1",
        ClothingCategory.tops,
        "daily",
        "spring",
        "10",
      );

      expect(mockRecommendationsService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        "user-1",
        { category: ClothingCategory.tops, occasion: "daily", season: "spring", limit: 10 },
      );
    });
  });

  describe("getFeed", () => {
    it("should call feedService.getFeed", async () => {
      mockFeedService.getFeed.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });

      await controller.getFeed("user-1", { category: "daily" });

      expect(mockFeedService.getFeed).toHaveBeenCalledWith(
        "user-1",
        "daily",
        undefined,
        1,
        10,
      );
    });
  });

  describe("getStyleGuide", () => {
    it("should return style guide for user", async () => {
      mockRecommendationsService.getStyleGuide.mockResolvedValue({
        bodyType: "X型",
        skinTone: "medium",
        colorSeason: "秋季暖型",
        recommendations: ["建议1"],
      });

      const result = await controller.getStyleGuide("user-1");

      expect(result.bodyType).toBe("X型");
      expect(result.recommendations).toHaveLength(1);
    });
  });

  describe("getTrendingRecommendations", () => {
    it("should return trending items without auth", async () => {
      mockAdvancedRecommendationService.getTrendingRecommendations.mockResolvedValue([
        { id: "item-1", name: "Trending" },
      ]);

      await controller.getTrendingRecommendations("10");

      expect(mockAdvancedRecommendationService.getTrendingRecommendations).toHaveBeenCalledWith(10);
    });
  });

  describe("submitFeedback", () => {
    it("should track feedback", async () => {
      const result = await controller.submitFeedback("user-1", {
        action: "like",
        clothingId: "item-1",
      });

      expect(mockBehaviorTrackingService.track).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "like",
          clothingId: "item-1",
        }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe("submitBatchFeedback", () => {
    it("should track batch feedback", async () => {
      const result = await controller.submitBatchFeedback("user-1", {
        items: [
          { action: "like", clothingId: "item-1" },
          { action: "dislike", clothingId: "item-2" },
        ],
      });

      expect(mockBehaviorTrackingService.trackBatch).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain("2");
    });
  });

  describe("getDiscoverRecommendations", () => {
    it("should return personalized recommendations for logged-in user", async () => {
      mockAdvancedRecommendationService.getPersonalizedRecommendations.mockResolvedValue([
        { id: "item-1" },
      ]);

      await controller.getDiscoverRecommendations("user-1");

      expect(mockAdvancedRecommendationService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        "user-1",
        {},
        20,
      );
    });

    it("should return trending recommendations for anonymous user", async () => {
      mockAdvancedRecommendationService.getTrendingRecommendations.mockResolvedValue([]);

      await controller.getDiscoverRecommendations(undefined);

      expect(mockAdvancedRecommendationService.getTrendingRecommendations).toHaveBeenCalledWith(20);
    });
  });
});
