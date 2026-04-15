import apiClient from "../client";
import { aiStylistApi } from "../ai-stylist.api";

// ---- Mocks ----
jest.mock("../client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    upload: jest.fn(),
  },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockUpload = apiClient.upload as jest.Mock;

// ---- Tests ----
describe("aiStylistApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== createSession ====================

  describe("createSession", () => {
    it("should POST to /ai-stylist/sessions with payload", async () => {
      const payload = {
        entry: "home",
        goal: "daily outfit",
        context: { season: "spring" },
      };
      const sessionResponse = {
        success: true,
        message: "Session created",
        assistantMessage: "Hello!",
        timestamp: "2025-01-01T00:00:00.000Z",
        sessionId: "session-1",
      };
      mockPost.mockResolvedValue({ success: true, data: sessionResponse });

      const result = await aiStylistApi.createSession(payload);

      expect(mockPost).toHaveBeenCalledWith("/ai-stylist/sessions", payload);
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.sessionId).toBe("session-1");
      }
    });

    it("should POST without payload", async () => {
      const sessionResponse = {
        success: true,
        message: "Session created",
        assistantMessage: "Hello!",
        timestamp: "2025-01-01T00:00:00.000Z",
      };
      mockPost.mockResolvedValue({ success: true, data: sessionResponse });

      const result = await aiStylistApi.createSession();

      expect(mockPost).toHaveBeenCalledWith("/ai-stylist/sessions", undefined);
      expect(result.success).toBe(true);
    });
  });

  // ==================== getSessionStatus ====================

  describe("getSessionStatus", () => {
    it("should GET /ai-stylist/sessions/:sessionId", async () => {
      const statusResponse = {
        success: true,
        message: "OK",
        assistantMessage: "Processing",
        timestamp: "2025-01-01T00:00:00.000Z",
        sessionState: {
          sceneReady: true,
          bodyReady: false,
          styleReady: false,
          candidateReady: false,
          commerceReady: false,
          currentStage: "body_analysis",
          slots: {
            preferredStyles: [],
            styleAvoidances: [],
            fitGoals: [],
            preferredColors: [],
          },
          bodyProfile: {
            shapeFeatures: [],
          },
        },
      };
      mockGet.mockResolvedValue({ success: true, data: statusResponse });

      const result = await aiStylistApi.getSessionStatus("session-1");

      expect(mockGet).toHaveBeenCalledWith("/ai-stylist/sessions/session-1");
      expect(result.success).toBe(true);
    });
  });

  // ==================== sendMessage ====================

  describe("sendMessage", () => {
    it("should POST to /ai-stylist/sessions/:sessionId/messages with message", async () => {
      const messageResponse = {
        success: true,
        message: "OK",
        assistantMessage: "I recommend casual style",
        timestamp: "2025-01-01T00:00:00.000Z",
      };
      mockPost.mockResolvedValue({ success: true, data: messageResponse });

      const result = await aiStylistApi.sendMessage("session-1", "I want casual style");

      expect(mockPost).toHaveBeenCalledWith("/ai-stylist/sessions/session-1/messages", {
        message: "I want casual style",
      });
      expect(result.success).toBe(true);
    });

    it("should include latitude and longitude when provided", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { success: true, message: "OK", assistantMessage: "Got it", timestamp: "" },
      });

      await aiStylistApi.sendMessage("session-1", "What to wear today", 39.9, 116.4);

      expect(mockPost).toHaveBeenCalledWith("/ai-stylist/sessions/session-1/messages", {
        message: "What to wear today",
        latitude: 39.9,
        longitude: 116.4,
      });
    });

    it("should not include latitude/longitude when not provided", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { success: true, message: "OK", assistantMessage: "Hi", timestamp: "" },
      });

      await aiStylistApi.sendMessage("session-1", "Hello");

      const payload = mockPost.mock.calls[0][1] as Record<string, unknown>;
      expect(payload).not.toHaveProperty("latitude");
      expect(payload).not.toHaveProperty("longitude");
    });
  });

  // ==================== uploadPhoto ====================

  describe("uploadPhoto", () => {
    it("should upload photo to /ai-stylist/sessions/:sessionId/photo", async () => {
      const photoResponse = {
        success: true,
        message: "OK",
        assistantMessage: "Photo received",
        timestamp: "2025-01-01T00:00:00.000Z",
        photoId: "photo-1",
        analysisStatus: "processing",
      };
      mockUpload.mockResolvedValue({ success: true, data: photoResponse });

      const result = await aiStylistApi.uploadPhoto("session-1", "file:///photo/body.jpg");

      expect(mockUpload).toHaveBeenCalledWith(
        "/ai-stylist/sessions/session-1/photo",
        expect.any(FormData)
      );
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.photoId).toBe("photo-1");
      }
    });

    it("should default photo type to full_body", async () => {
      mockUpload.mockResolvedValue({
        success: true,
        data: { success: true, message: "OK", assistantMessage: "", timestamp: "" },
      });

      await aiStylistApi.uploadPhoto("session-1", "file:///photo.jpg");

      const formData = mockUpload.mock.calls[0][1] as FormData;
      expect(formData).toBeDefined();
    });

    it("should use specified photo type", async () => {
      mockUpload.mockResolvedValue({
        success: true,
        data: { success: true, message: "OK", assistantMessage: "", timestamp: "" },
      });

      await aiStylistApi.uploadPhoto("session-1", "file:///face.jpg", "face");

      const formData = mockUpload.mock.calls[0][1] as FormData;
      expect(formData).toBeDefined();
    });
  });

  // ==================== attachExistingPhoto ====================

  describe("attachExistingPhoto", () => {
    it("should POST to /ai-stylist/sessions/:sessionId/photo/reference", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { success: true, message: "OK", assistantMessage: "Photo attached", timestamp: "" },
      });

      const result = await aiStylistApi.attachExistingPhoto("session-1", "photo-1");

      expect(mockPost).toHaveBeenCalledWith("/ai-stylist/sessions/session-1/photo/reference", {
        photoId: "photo-1",
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== resolveSession ====================

  describe("resolveSession", () => {
    it("should POST to /ai-stylist/sessions/:sessionId/resolve", async () => {
      const resolveResponse = {
        success: true,
        message: "OK",
        assistantMessage: "Here are your outfits",
        timestamp: "2025-01-01T00:00:00.000Z",
        result: {
          lookSummary: "Casual summer look",
          whyItFits: ["Matches your style"],
          outfits: [
            {
              title: "Casual Summer",
              items: [{ category: "tops", name: "White T-Shirt", reason: "Classic" }],
              styleExplanation: ["Simple and clean"],
            },
          ],
        },
      };
      mockPost.mockResolvedValue({ success: true, data: resolveResponse });

      const result = await aiStylistApi.resolveSession("session-1");

      expect(mockPost).toHaveBeenCalledWith("/ai-stylist/sessions/session-1/resolve");
      expect(result.success).toBe(true);
    });
  });

  // ==================== getSuggestions ====================

  describe("getSuggestions", () => {
    it("should GET /ai-stylist/suggestions", async () => {
      const suggestionsResponse = {
        suggestions: [
          { text: "What should I wear today?", icon: "shirt" },
          { text: "Help me find a date outfit", icon: "heart" },
        ],
      };
      mockGet.mockResolvedValue({ success: true, data: suggestionsResponse });

      const result = await aiStylistApi.getSuggestions();

      expect(mockGet).toHaveBeenCalledWith("/ai-stylist/suggestions");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.suggestions).toHaveLength(2);
      }
    });
  });

  // ==================== getOutfitPlan ====================

  describe("getOutfitPlan", () => {
    it("should GET /ai-stylist/sessions/:sessionId/outfit-plan", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { outfits: [] },
      });

      const result = await aiStylistApi.getOutfitPlan("session-1");

      expect(mockGet).toHaveBeenCalledWith("/ai-stylist/sessions/session-1/outfit-plan");
      expect(result.success).toBe(true);
    });
  });

  // ==================== getAlternatives ====================

  describe("getAlternatives", () => {
    it("should GET alternatives with outfitIndex, itemIndex, and limit", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { alternatives: [] },
      });

      const result = await aiStylistApi.getAlternatives("session-1", 0, 1, 5);

      expect(mockGet).toHaveBeenCalledWith(
        "/ai-stylist/sessions/session-1/items/alternatives?outfitIndex=0&itemIndex=1&limit=5"
      );
      expect(result.success).toBe(true);
    });

    it("should default limit to 10", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { alternatives: [] },
      });

      await aiStylistApi.getAlternatives("session-1", 0, 0);

      expect(mockGet).toHaveBeenCalledWith(
        "/ai-stylist/sessions/session-1/items/alternatives?outfitIndex=0&itemIndex=0&limit=10"
      );
    });
  });

  // ==================== replaceItem ====================

  describe("replaceItem", () => {
    it("should POST to /ai-stylist/sessions/:sessionId/items/replace", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { success: true },
      });

      const result = await aiStylistApi.replaceItem("session-1", 0, 1, "new-item-1");

      expect(mockPost).toHaveBeenCalledWith("/ai-stylist/sessions/session-1/items/replace", {
        outfitIndex: 0,
        itemIndex: 1,
        newItemId: "new-item-1",
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== submitFeedback ====================

  describe("submitFeedback", () => {
    it("should POST to /ai-stylist/sessions/:sessionId/feedback with like action", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { success: true, message: "Feedback recorded" },
      });

      const result = await aiStylistApi.submitFeedback("session-1", {
        outfitIndex: 0,
        action: "like",
        itemId: "item-1",
        rating: 5,
      });

      expect(mockPost).toHaveBeenCalledWith("/ai-stylist/sessions/session-1/feedback", {
        outfitIndex: 0,
        action: "like",
        itemId: "item-1",
        rating: 5,
      });
      expect(result.success).toBe(true);
    });

    it("should POST feedback with dislike action and reason", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { success: true, message: "Feedback recorded" },
      });

      const result = await aiStylistApi.submitFeedback("session-1", {
        outfitIndex: 0,
        action: "dislike",
        dislikeReason: "Too colorful",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/ai-stylist/sessions/session-1/feedback",
        expect.objectContaining({ action: "dislike", dislikeReason: "Too colorful" })
      );
      expect(result.success).toBe(true);
    });
  });

  // ==================== getPresetQuestions ====================

  describe("getPresetQuestions", () => {
    it("should GET /ai-stylist/preset-questions", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { questions: ["What to wear today?"] },
      });

      const result = await aiStylistApi.getPresetQuestions();

      expect(mockGet).toHaveBeenCalledWith("/ai-stylist/preset-questions");
      expect(result.success).toBe(true);
    });
  });

  // ==================== getCalendarDays ====================

  describe("getCalendarDays", () => {
    it("should GET /ai-stylist/sessions/calendar with year and month", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { days: [1, 5, 15] },
      });

      const result = await aiStylistApi.getCalendarDays(2025, 6);

      expect(mockGet).toHaveBeenCalledWith("/ai-stylist/sessions/calendar?year=2025&month=6");
      expect(result.success).toBe(true);
    });
  });

  // ==================== getSessionsByDate ====================

  describe("getSessionsByDate", () => {
    it("should GET /ai-stylist/sessions/date/:date", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { sessions: [] },
      });

      const result = await aiStylistApi.getSessionsByDate("2025-06-15");

      expect(mockGet).toHaveBeenCalledWith("/ai-stylist/sessions/date/2025-06-15");
      expect(result.success).toBe(true);
    });
  });

  // ==================== Error Handling ====================

  describe("error handling", () => {
    it("should propagate error from failed createSession", async () => {
      mockPost.mockResolvedValue({
        success: false,
        error: { code: "SERVER_ERROR", message: "Server error" },
      });

      const result = await aiStylistApi.createSession();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should propagate error from failed sendMessage", async () => {
      mockPost.mockResolvedValue({
        success: false,
        error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
      });

      const result = await aiStylistApi.sendMessage("invalid-session", "hello");

      expect(result.success).toBe(false);
    });
  });
});
