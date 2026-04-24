/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";

import { ClothingCategory } from "../../../types/prisma-enums";

import { RecommendationOrchestrator } from "./orchestrator/recommendation.orchestrator";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";

// Mock the transitive dependency modules that have TS compilation errors
jest.mock("./services/behavior-tracking.service", () => ({
  BehaviorTrackingService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("./services/recommendation-feed.service", () => ({
  RecommendationFeedService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("./orchestrator/recommendation.orchestrator", () => ({
  RecommendationOrchestrator: jest.fn().mockImplementation(() => ({})),
}));

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

  const mockOrchestrator = {
    getRecommendations: jest.fn().mockResolvedValue({ items: [], strategies: [], metadata: {} }),
    getDailyOutfitRecommendation: jest.fn().mockResolvedValue(null),
    getOccasionRecommendations: jest.fn().mockResolvedValue([]),
    getTrendingRecommendations: jest.fn().mockResolvedValue([]),
    recordFeedback: jest.fn().mockResolvedValue(undefined),
    getStyleGuide: jest.fn().mockResolvedValue({
      bodyType: null,
      skinTone: null,
      colorSeason: null,
      recommendations: [],
    }),
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
        { provide: RecommendationOrchestrator, useValue: mockOrchestrator },
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
      mockOrchestrator.getRecommendations.mockResolvedValue({
        items: [{ id: "item-1", name: "Test" }],
        explanation: { why: "test", alternative: "test", nextAction: "test", confidence: 0.8 },
        experimentId: "exp-test",
        degraded: false,
      });

      const result = await controller.getRecommendations("user-1");

      expect(result.items).toHaveLength(1);
      expect(result.experimentId).toBe("exp-test");
    });

    it("should pass filter options to orchestrator", async () => {
      mockOrchestrator.getRecommendations.mockResolvedValue([]);

      await controller.getRecommendations("user-1", ClothingCategory.tops, "daily", "spring", "10");

      expect(mockOrchestrator.getRecommendations).toHaveBeenCalledWith({
        userId: "user-1",
        context: { occasion: "daily", season: "spring" },
        options: { limit: 10, category: ClothingCategory.tops },
      });
    });
  });

  describe("getFeed", () => {
    it("should call feedService.getFeed", async () => {
      mockFeedService.getFeed.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });

      await controller.getFeed("user-1", { category: "daily" });

      expect(mockFeedService.getFeed).toHaveBeenCalledWith("user-1", "daily", undefined, 1, 10);
    });
  });

  describe("getStyleGuide", () => {
    it("should return style guide for user", async () => {
      mockOrchestrator.getStyleGuide.mockResolvedValue({
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
      mockOrchestrator.getTrendingRecommendations.mockResolvedValue([
        { id: "item-1", name: "Trending" },
      ]);

      await controller.getTrendingRecommendations("10");

      expect(mockOrchestrator.getTrendingRecommendations).toHaveBeenCalledWith(10);
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
          action: "post_like",
          clothingId: "item-1",
        })
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
      mockOrchestrator.getRecommendations.mockResolvedValue([{ id: "item-1" }]);

      await controller.getDiscoverRecommendations("user-1");

      expect(mockOrchestrator.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
        })
      );
    });

    it("should return trending recommendations for anonymous user", async () => {
      mockOrchestrator.getTrendingRecommendations.mockResolvedValue([]);

      await controller.getDiscoverRecommendations(undefined);

      expect(mockOrchestrator.getTrendingRecommendations).toHaveBeenCalledWith(20);
    });
  });
});
