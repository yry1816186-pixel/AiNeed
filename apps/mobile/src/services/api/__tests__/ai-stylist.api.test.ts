/* eslint-disable @typescript-eslint/unbound-method */
import { aiStylistApi } from "../ai-stylist.api";

import apiClient from "../client";

jest.mock("../client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

describe("aiStylistApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createSession", () => {
    it("should call POST /ai-stylist/sessions with payload", async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          message: "Session created",
          assistantMessage: "Hello!",
          timestamp: "2025-01-01T00:00:00Z",
          sessionId: "sess-1",
        },
      };

      mockedPost.mockResolvedValue(mockResponse);

      const payload = { entry: "casual", goal: "daily_outfit" };
      const result = await aiStylistApi.createSession(payload);

      expect(mockedPost).toHaveBeenCalledWith("/ai-stylist/sessions", payload);
      expect(result).toEqual(mockResponse);
    });

    it("should call POST /ai-stylist/sessions without payload", async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          message: "Session created",
          assistantMessage: "Hi!",
          timestamp: "2025-01-01T00:00:00Z",
          sessionId: "sess-2",
        },
      };

      mockedPost.mockResolvedValue(mockResponse);

      const result = await aiStylistApi.createSession();

      expect(mockedPost).toHaveBeenCalledWith("/ai-stylist/sessions", undefined);
      expect(result.success).toBe(true);
    });
  });

  describe("sendMessage", () => {
    it("should call POST with message only when no coordinates provided", async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          message: "Message sent",
          assistantMessage: "I recommend...",
          timestamp: "2025-01-01T00:00:00Z",
        },
      };

      mockedPost.mockResolvedValue(mockResponse);

      const result = await aiStylistApi.sendMessage("sess-1", "What should I wear?");

      expect(mockedPost).toHaveBeenCalledWith("/ai-stylist/sessions/sess-1/messages", {
        message: "What should I wear?",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should include latitude and longitude in payload when provided", async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          message: "Message sent",
          assistantMessage: "Based on your location...",
          timestamp: "2025-01-01T00:00:00Z",
        },
      };

      mockedPost.mockResolvedValue(mockResponse);

      const result = await aiStylistApi.sendMessage("sess-1", "Weather outfit?", 39.9042, 116.4074);

      expect(mockedPost).toHaveBeenCalledWith("/ai-stylist/sessions/sess-1/messages", {
        message: "Weather outfit?",
        latitude: 39.9042,
        longitude: 116.4074,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("getSessionStatus", () => {
    it("should call GET /ai-stylist/sessions/:sessionId", async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          message: "Active",
          assistantMessage: "",
          timestamp: "2025-01-01T00:00:00Z",
          sessionState: {
            sceneReady: true,
            bodyReady: false,
            styleReady: false,
            candidateReady: false,
            commerceReady: false,
            currentStage: "body_analysis",
            slots: { preferredStyles: [], styleAvoidances: [], fitGoals: [], preferredColors: [] },
            bodyProfile: { shapeFeatures: [] },
          },
        },
      };

      mockedGet.mockResolvedValue(mockResponse);

      const result = await aiStylistApi.getSessionStatus("sess-1");

      expect(mockedGet).toHaveBeenCalledWith("/ai-stylist/sessions/sess-1");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getOutfitPlan", () => {
    it("should call GET /ai-stylist/sessions/:sessionId/outfit-plan", async () => {
      const mockResponse = {
        success: true,
        data: {
          title: "Casual Friday",
          items: [{ category: "top", name: "White Shirt", reason: "Classic look" }],
          styleExplanation: ["Clean and minimal"],
        },
      };

      mockedGet.mockResolvedValue(mockResponse);

      const result = await aiStylistApi.getOutfitPlan("sess-1");

      expect(mockedGet).toHaveBeenCalledWith("/ai-stylist/sessions/sess-1/outfit-plan");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("submitFeedback", () => {
    it("should call POST /ai-stylist/sessions/:sessionId/feedback with data", async () => {
      const mockResponse = {
        success: true,
        data: { success: true, message: "Feedback recorded" },
      };

      mockedPost.mockResolvedValue(mockResponse);

      const feedbackData = {
        outfitIndex: 0,
        action: "like" as const,
        rating: 5,
      };

      const result = await aiStylistApi.submitFeedback("sess-1", feedbackData);

      expect(mockedPost).toHaveBeenCalledWith("/ai-stylist/sessions/sess-1/feedback", feedbackData);
      expect(result).toEqual(mockResponse);
    });

    it("should send dislike feedback with reason", async () => {
      const mockResponse = {
        success: true,
        data: { success: true, message: "Feedback recorded" },
      };

      mockedPost.mockResolvedValue(mockResponse);

      const feedbackData = {
        outfitIndex: 1,
        action: "dislike" as const,
        itemId: "item-3",
        dislikeReason: "Too expensive",
      };

      const result = await aiStylistApi.submitFeedback("sess-1", feedbackData);

      expect(mockedPost).toHaveBeenCalledWith("/ai-stylist/sessions/sess-1/feedback", feedbackData);
      expect(result.success).toBe(true);
    });
  });

  describe("getCalendarDays", () => {
    it("should call GET with year and month query params", async () => {
      const mockResponse = {
        success: true,
        data: [1, 5, 12, 20, 28],
      };

      mockedGet.mockResolvedValue(mockResponse);

      const result = await aiStylistApi.getCalendarDays(2025, 6);

      expect(mockedGet).toHaveBeenCalledWith("/ai-stylist/sessions/calendar?year=2025&month=6");
      expect(result).toEqual(mockResponse);
    });

    it("should handle different year and month values", async () => {
      const mockResponse = {
        success: true,
        data: [3, 15],
      };

      mockedGet.mockResolvedValue(mockResponse);

      const result = await aiStylistApi.getCalendarDays(2024, 12);

      expect(mockedGet).toHaveBeenCalledWith("/ai-stylist/sessions/calendar?year=2024&month=12");
      expect(result.data).toEqual([3, 15]);
    });
  });
});
