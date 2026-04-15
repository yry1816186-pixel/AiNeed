import apiClient from "../client";
import { tryOnApi, recommendationsApi } from "../tryon.api";

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

jest.mock("../asset-url", () => ({
  buildTryOnResultAssetUrl: jest.fn((_id: string, url?: string | null) => url ?? ""),
  buildPhotoAssetUrl: jest.fn((_id: string, variant: string, url?: string | null) => url ?? ""),
  normalizeAssetUrl: jest.fn((url?: string | null) => url ?? ""),
}));

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;
const _mockPatch = apiClient.patch as jest.Mock;

// ---- Test Data ----
const tryOnResult = {
  id: "tryon-1",
  status: "completed" as const,
  resultImageUrl: "http://result.jpg",
  resultImageDataUri: undefined,
  errorMessage: undefined,
  photo: {
    id: "photo-1",
    thumbnailUrl: "http://thumb.jpg",
  },
  item: {
    id: "item-1",
    name: "White T-Shirt",
    mainImage: "http://item.jpg",
  },
  createdAt: "2025-01-01T00:00:00.000Z",
  completedAt: "2025-01-01T00:01:00.000Z",
};

// ---- Tests ----
describe("tryOnApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== create ====================

  describe("create", () => {
    it("should POST to /try-on with photoId and itemId", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { id: "tryon-1", status: "pending" },
      });

      const result = await tryOnApi.create("photo-1", "item-1");

      expect(mockPost).toHaveBeenCalledWith("/try-on", {
        photoId: "photo-1",
        itemId: "item-1",
      });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe("tryon-1");
        expect(result.data.status).toBe("pending");
      }
    });

    it("should return error on failed creation", async () => {
      mockPost.mockResolvedValue({
        success: false,
        error: { code: "QUOTA_EXCEEDED", message: "Daily quota exceeded" },
      });

      const result = await tryOnApi.create("photo-1", "item-1");

      expect(result.success).toBe(false);
    });
  });

  // ==================== getStatus ====================

  describe("getStatus", () => {
    it("should GET /try-on/:id and normalize the result", async () => {
      mockGet.mockResolvedValue({ success: true, data: tryOnResult });

      const result = await tryOnApi.getStatus("tryon-1");

      expect(mockGet).toHaveBeenCalledWith("/try-on/tryon-1");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe("tryon-1");
        expect(result.data.status).toBe("completed");
        expect(result.data.item.name).toBe("White T-Shirt");
      }
    });

    it("should return error when try-on not found", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "NOT_FOUND", message: "Try-on not found" },
      });

      const result = await tryOnApi.getStatus("nonexistent");

      expect(result.success).toBe(false);
    });

    it("should pass through failed response without normalization", async () => {
      const errorResponse = {
        success: false,
        error: { code: "SERVER_ERROR", message: "Error" },
      };
      mockGet.mockResolvedValue(errorResponse);

      const result = await tryOnApi.getStatus("tryon-1");

      expect(result).toEqual(errorResponse);
    });
  });

  // ==================== getHistory ====================

  describe("getHistory", () => {
    it("should GET /try-on/history with pagination params", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { items: [tryOnResult], total: 1 },
      });

      const result = await tryOnApi.getHistory(1, 10);

      expect(mockGet).toHaveBeenCalledWith("/try-on/history", { page: 1, limit: 10 });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.total).toBe(1);
      }
    });

    it("should GET /try-on/history without pagination params", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      });

      const result = await tryOnApi.getHistory();

      expect(mockGet).toHaveBeenCalledWith("/try-on/history", {
        page: undefined,
        limit: undefined,
      });
      expect(result.success).toBe(true);
    });

    it("should handle empty items array", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      });

      const result = await tryOnApi.getHistory();

      if (result.success && result.data) {
        expect(result.data.items).toEqual([]);
      }
    });

    it("should handle missing items array", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { total: 0 },
      });

      const result = await tryOnApi.getHistory();

      if (result.success && result.data) {
        expect(result.data.items).toEqual([]);
      }
    });
  });

  // ==================== deleteTryOn ====================

  describe("deleteTryOn", () => {
    it("should DELETE /try-on/:id", async () => {
      mockDelete.mockResolvedValue({ success: true, data: undefined });

      const result = await tryOnApi.deleteTryOn("tryon-1");

      expect(mockDelete).toHaveBeenCalledWith("/try-on/tryon-1");
      expect(result.success).toBe(true);
    });
  });

  // ==================== retryTryOn ====================

  describe("retryTryOn", () => {
    it("should POST to /try-on/:id/retry", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { id: "tryon-1", status: "pending" },
      });

      const result = await tryOnApi.retryTryOn("tryon-1");

      expect(mockPost).toHaveBeenCalledWith("/try-on/tryon-1/retry");
      expect(result.success).toBe(true);
    });
  });

  // ==================== getDailyQuota ====================

  describe("getDailyQuota", () => {
    it("should GET /try-on/daily-quota", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { used: 3, limit: 10, remaining: 7 },
      });

      const result = await tryOnApi.getDailyQuota();

      expect(mockGet).toHaveBeenCalledWith("/try-on/daily-quota");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.used).toBe(3);
        expect(result.data.remaining).toBe(7);
      }
    });
  });
});

describe("recommendationsApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getPersonalized ====================

  describe("getPersonalized", () => {
    it("should GET /recommendations with params", async () => {
      mockGet.mockResolvedValue({ success: true, data: { items: [] } });

      const result = await recommendationsApi.getPersonalized({
        category: "tops",
        occasion: "work",
        season: "spring",
        limit: 10,
      });

      expect(mockGet).toHaveBeenCalledWith("/recommendations", {
        category: "tops",
        occasion: "work",
        season: "spring",
        limit: 10,
      });
      expect(result.success).toBe(true);
    });

    it("should GET /recommendations without params", async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });

      const result = await recommendationsApi.getPersonalized();

      expect(mockGet).toHaveBeenCalledWith("/recommendations", undefined);
      expect(result.success).toBe(true);
    });

    it("should normalize recommendation items", async () => {
      const rawItems = [
        {
          id: "rec-1",
          name: "Stylish Top",
          brand: { name: "BrandA" },
          price: 199,
          mainImage: "http://img.jpg",
          category: "tops",
          score: 0.85,
          matchReasons: ["Matches your style"],
          externalUrl: "https://example.com",
        },
      ];
      mockGet.mockResolvedValue({ success: true, data: { items: rawItems } });

      const result = await recommendationsApi.getPersonalized();

      if (result.success && result.data) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("rec-1");
        expect(result.data[0].name).toBe("Stylish Top");
        expect(result.data[0].brand).toBe("BrandA");
        expect(result.data[0].price).toBe(199);
      }
    });

    it("should return error with fallback code on failure", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "SERVER_ERROR", message: "Error" },
      });

      const result = await recommendationsApi.getPersonalized();

      expect(result.success).toBe(false);
    });
  });

  // ==================== getAdvanced ====================

  describe("getAdvanced", () => {
    it("should GET /recommendations/advanced", async () => {
      mockGet.mockResolvedValue({ success: true, data: { items: [] } });

      const result = await recommendationsApi.getAdvanced({
        occasion: "date",
        limit: 5,
      });

      expect(mockGet).toHaveBeenCalledWith("/recommendations/advanced", {
        occasion: "date",
        limit: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== getDailyOutfit ====================

  describe("getDailyOutfit", () => {
    it("should GET /recommendations/daily and normalize response", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          items: [],
          outfitName: "Casual Friday",
          description: "A relaxed look",
        },
      });

      const result = await recommendationsApi.getDailyOutfit();

      expect(mockGet).toHaveBeenCalledWith("/recommendations/daily");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.outfitName).toBe("Casual Friday");
        expect(result.data.description).toBe("A relaxed look");
      }
    });

    it("should default outfitName and description to empty strings", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await recommendationsApi.getDailyOutfit();

      if (result.success && result.data) {
        expect(result.data.outfitName).toBe("");
        expect(result.data.description).toBe("");
      }
    });
  });

  // ==================== getOccasion ====================

  describe("getOccasion", () => {
    it("should GET /recommendations/occasion with type and limit", async () => {
      mockGet.mockResolvedValue({ success: true, data: { items: [] } });

      const result = await recommendationsApi.getOccasion("work", 5);

      expect(mockGet).toHaveBeenCalledWith("/recommendations/occasion", {
        type: "work",
        limit: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== getTrending ====================

  describe("getTrending", () => {
    it("should GET /recommendations/trending with limit", async () => {
      mockGet.mockResolvedValue({ success: true, data: { items: [] } });

      const result = await recommendationsApi.getTrending(20);

      expect(mockGet).toHaveBeenCalledWith("/recommendations/trending", { limit: 20 });
      expect(result.success).toBe(true);
    });
  });

  // ==================== getDiscover ====================

  describe("getDiscover", () => {
    it("should GET /recommendations/discover", async () => {
      mockGet.mockResolvedValue({ success: true, data: { items: [] } });

      const result = await recommendationsApi.getDiscover(15);

      expect(mockGet).toHaveBeenCalledWith("/recommendations/discover", { limit: 15 });
      expect(result.success).toBe(true);
    });
  });

  // ==================== getStyleGuide ====================

  describe("getStyleGuide", () => {
    it("should GET /recommendations/style-guide", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          bodyType: "hourglass",
          skinTone: "medium",
          colorSeason: "autumn",
          faceShape: "oval",
          recommendations: ["Wear fitted tops"],
        },
      });

      const result = await recommendationsApi.getStyleGuide();

      expect(mockGet).toHaveBeenCalledWith("/recommendations/style-guide");
      expect(result.success).toBe(true);
    });
  });

  // ==================== getCompleteTheLook ====================

  describe("getCompleteTheLook", () => {
    it("should GET /recommendations/complete-the-look/:clothingId", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: {
          anchor: {
            id: "item-1",
            name: "Jacket",
            category: "outerwear",
            imageUrl: "http://img.jpg",
          },
          suggestions: { top: [], bottom: [], shoes: [], accessories: [] },
          harmonyScore: 0.9,
          harmonyRule: "complementary",
          harmonyDescription: "Great combination",
        },
      });

      const result = await recommendationsApi.getCompleteTheLook("item-1");

      expect(mockGet).toHaveBeenCalledWith("/recommendations/complete-the-look/item-1");
      expect(result.success).toBe(true);
    });
  });

  // ==================== submitFeedback ====================

  describe("submitFeedback", () => {
    it("should POST to /recommendations/feedback", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { success: true, message: "Feedback recorded" },
      });

      const result = await recommendationsApi.submitFeedback({
        clothingId: "item-1",
        action: "like",
        recommendationId: "rec-1",
      });

      expect(mockPost).toHaveBeenCalledWith("/recommendations/feedback", {
        clothingId: "item-1",
        action: "like",
        recommendationId: "rec-1",
      });
      expect(result.success).toBe(true);
    });
  });

  // ==================== submitBatchFeedback ====================

  describe("submitBatchFeedback", () => {
    it("should POST to /recommendations/feedback/batch", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { success: true, message: "Batch feedback recorded" },
      });

      const items = [
        { clothingId: "item-1", action: "like" as const },
        { clothingId: "item-2", action: "dislike" as const, recommendationId: "rec-2" },
      ];

      const result = await recommendationsApi.submitBatchFeedback(items);

      expect(mockPost).toHaveBeenCalledWith("/recommendations/feedback/batch", { items });
      expect(result.success).toBe(true);
    });
  });

  // ==================== getColdStartRecommendations ====================

  describe("getColdStartRecommendations", () => {
    it("should GET /recommendations/cold-start with limit", async () => {
      mockGet.mockResolvedValue({ success: true, data: { items: [] } });

      const result = await recommendationsApi.getColdStartRecommendations(10);

      expect(mockGet).toHaveBeenCalledWith("/recommendations/cold-start", { limit: 10 });
      expect(result.success).toBe(true);
    });
  });

  // ==================== Score Normalization ====================

  describe("score normalization", () => {
    it("should normalize percentage scores (1-100) to 0-1 range", async () => {
      const rawItems = [
        { id: "r1", name: "Item", price: 0, mainImage: "", category: "", score: 85 },
      ];
      mockGet.mockResolvedValue({ success: true, data: { items: rawItems } });

      const result = await recommendationsApi.getPersonalized();

      if (result.success && result.data) {
        expect(result.data[0].score).toBe(0.85);
      }
    });

    it("should normalize decimal scores (0-1) directly", async () => {
      const rawItems = [
        { id: "r1", name: "Item", price: 0, mainImage: "", category: "", score: 0.75 },
      ];
      mockGet.mockResolvedValue({ success: true, data: { items: rawItems } });

      const result = await recommendationsApi.getPersonalized();

      if (result.success && result.data) {
        expect(result.data[0].score).toBe(0.75);
      }
    });

    it("should return undefined for zero or invalid scores", async () => {
      const rawItems = [
        { id: "r1", name: "Item", price: 0, mainImage: "", category: "", score: 0 },
      ];
      mockGet.mockResolvedValue({ success: true, data: { items: rawItems } });

      const result = await recommendationsApi.getPersonalized();

      if (result.success && result.data) {
        expect(result.data[0].score).toBeUndefined();
      }
    });

    it("should filter out items with empty IDs", async () => {
      const rawItems = [
        { id: "", name: "No ID", price: 0, mainImage: "", category: "" },
        { id: "r1", name: "Valid", price: 0, mainImage: "", category: "" },
      ];
      mockGet.mockResolvedValue({ success: true, data: { items: rawItems } });

      const result = await recommendationsApi.getPersonalized();

      if (result.success && result.data) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("r1");
      }
    });
  });
});
