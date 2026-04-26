/* eslint-disable @typescript-eslint/require-await */
import { useAiStylistStore } from "../aiStylistStore";
import type { OutfitPlanDetail } from "../aiStylistStore";

import { aiStylistApi } from "../../../../services/api/ai-stylist.api";

jest.mock("../../../services/api/ai-stylist.api", () => ({
  aiStylistApi: {
    createSession: jest.fn(),
    sendMessage: jest.fn(),
    getSessionStatus: jest.fn(),
    uploadPhoto: jest.fn(),
    attachExistingPhoto: jest.fn(),
    resolveSession: jest.fn(),
    getSuggestions: jest.fn(),
    getOutfitPlan: jest.fn(),
    getAlternatives: jest.fn(),
    replaceItem: jest.fn(),
    submitFeedback: jest.fn(),
    getPresetQuestions: jest.fn(),
    getCalendarDays: jest.fn(),
    getSessionsByDate: jest.fn(),
    pollProgress: jest.fn(),
    sendMessageWithProgress: jest.fn(),
  },
}));

const mockAiStylistApi = aiStylistApi as jest.Mocked<typeof aiStylistApi>;

beforeEach(() => {
  useAiStylistStore.getState().reset();
});

describe("useAiStylistStore", () => {
  describe("createSession", () => {
    it("should create session and set currentSessionId on success", async () => {
      mockAiStylistApi.createSession.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          message: "Session created",
          assistantMessage: "Hello!",
          timestamp: new Date().toISOString(),
          sessionId: "session-abc-123",
        },
      });

      const result = await useAiStylistStore.getState().createSession("I need help", "daily");

      expect(result).toBe("session-abc-123");
      expect(useAiStylistStore.getState().currentSessionId).toBe("session-abc-123");
      expect(useAiStylistStore.getState().isLoading).toBe(false);
      expect(useAiStylistStore.getState().error).toBeNull();
    });

    it("should set error and return null on API failure", async () => {
      mockAiStylistApi.createSession.mockResolvedValueOnce({
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error" },
      });

      const result = await useAiStylistStore.getState().createSession();

      expect(result).toBeNull();
      expect(useAiStylistStore.getState().currentSessionId).toBeNull();
      expect(useAiStylistStore.getState().error).toBe("Internal server error");
      expect(useAiStylistStore.getState().isLoading).toBe(false);
    });

    it("should set error and return null on exception", async () => {
      mockAiStylistApi.createSession.mockRejectedValueOnce(new Error("Network timeout"));

      const result = await useAiStylistStore.getState().createSession();

      expect(result).toBeNull();
      expect(useAiStylistStore.getState().error).toBe("Network timeout");
      expect(useAiStylistStore.getState().isLoading).toBe(false);
    });
  });

  describe("sendMessage", () => {
    it("should return null when no current session", async () => {
      useAiStylistStore.getState().setCurrentSessionId(null);

      const result = await useAiStylistStore.getState().sendMessage("Hello");

      expect(result).toBeNull();
      expect(mockAiStylistApi.sendMessage).not.toHaveBeenCalled();
    });

    it("should send message and return response on success", async () => {
      useAiStylistStore.getState().setCurrentSessionId("session-1");

      const mockResponse = {
        success: true,
        message: "Reply sent",
        assistantMessage: "I recommend a blue shirt!",
        timestamp: new Date().toISOString(),
      };

      mockAiStylistApi.sendMessage.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
      });

      const result = await useAiStylistStore
        .getState()
        .sendMessage("What should I wear?", 39.9, 116.4);

      expect(result).toEqual(mockResponse);
      expect(useAiStylistStore.getState().isGenerating).toBe(false);
      expect(useAiStylistStore.getState().error).toBeNull();
      expect(mockAiStylistApi.sendMessage).toHaveBeenCalledWith(
        "session-1",
        "What should I wear?",
        39.9,
        116.4
      );
    });

    it("should set error when sendMessage API fails", async () => {
      useAiStylistStore.getState().setCurrentSessionId("session-1");

      mockAiStylistApi.sendMessage.mockResolvedValueOnce({
        success: false,
        error: { code: "RATE_LIMIT", message: "Too many requests" },
      });

      const result = await useAiStylistStore.getState().sendMessage("Hello");

      expect(result).toBeNull();
      expect(useAiStylistStore.getState().error).toBe("Too many requests");
      expect(useAiStylistStore.getState().isGenerating).toBe(false);
    });
  });

  describe("fetchOutfitPlan", () => {
    it("should fetch and set outfit plan on success", async () => {
      const mockOutfitPlan: OutfitPlanDetail = {
        sessionId: "session-1",
        lookSummary: "Casual summer look",
        whyItFits: ["Matches your style", "Weather appropriate"],
        outfits: [
          {
            title: "Casual Day Out",
            items: [
              {
                category: "tops",
                name: "Blue T-Shirt",
                reason: "Comfortable and stylish",
              },
            ],
            styleExplanation: ["Relaxed fit for casual occasions"],
            estimatedTotalPrice: 299,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      mockAiStylistApi.getOutfitPlan.mockResolvedValueOnce({
        success: true,
        data: mockOutfitPlan,
      });

      await useAiStylistStore.getState().fetchOutfitPlan("session-1");

      const state = useAiStylistStore.getState();
      expect(state.currentOutfitPlan).toEqual(mockOutfitPlan);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set error when fetchOutfitPlan API fails", async () => {
      mockAiStylistApi.getOutfitPlan.mockResolvedValueOnce({
        success: false,
        error: { code: "NOT_FOUND", message: "Outfit plan not found" },
      });

      await useAiStylistStore.getState().fetchOutfitPlan("session-invalid");

      const state = useAiStylistStore.getState();
      expect(state.currentOutfitPlan).toBeNull();
      expect(state.error).toBe("Outfit plan not found");
      expect(state.isLoading).toBe(false);
    });

    it("should set error when fetchOutfitPlan throws exception", async () => {
      mockAiStylistApi.getOutfitPlan.mockRejectedValueOnce(new Error("Connection refused"));

      await useAiStylistStore.getState().fetchOutfitPlan("session-1");

      const state = useAiStylistStore.getState();
      expect(state.error).toBe("Connection refused");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset all state to initial values", async () => {
      useAiStylistStore.getState().setCurrentSessionId("session-1");
      useAiStylistStore.setState({
        currentOutfitPlan: {
          sessionId: "session-1",
          lookSummary: "test",
          whyItFits: [],
          outfits: [],
          createdAt: new Date().toISOString(),
        },
        isLoading: true,
        isGenerating: true,
        error: "some error",
        presetQuestions: [{ id: "1", text: "Q", icon: "icon", category: "daily" }],
        isNewUser: true,
        calendarDays: [{ date: "2026-04-17", sessionCount: 1, hasOutfitPlan: true }],
        archivedSessions: [
          { id: "s1", status: "completed", hasOutfitPlan: true, createdAt: "", updatedAt: "" },
        ],
        alternatives: [
          {
            id: "a1",
            name: "Alt",
            category: "tops",
            imageUrl: null,
            price: null,
            brand: null,
            tags: [],
            matchScore: 0.9,
          },
        ],
        isAlternativesLoading: true,
      });

      useAiStylistStore.getState().reset();

      const state = useAiStylistStore.getState();
      expect(state.currentSessionId).toBeNull();
      expect(state.currentOutfitPlan).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBeNull();
      expect(state.presetQuestions).toEqual([]);
      expect(state.isNewUser).toBe(false);
      expect(state.calendarDays).toEqual([]);
      expect(state.archivedSessions).toEqual([]);
      expect(state.alternatives).toEqual([]);
      expect(state.isAlternativesLoading).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      mockAiStylistApi.createSession.mockResolvedValueOnce({
        success: false,
        error: { code: "ERROR", message: "Something went wrong" },
      });

      await useAiStylistStore.getState().createSession();
      expect(useAiStylistStore.getState().error).toBe("Something went wrong");

      useAiStylistStore.getState().clearError();
      expect(useAiStylistStore.getState().error).toBeNull();
    });
  });
});
