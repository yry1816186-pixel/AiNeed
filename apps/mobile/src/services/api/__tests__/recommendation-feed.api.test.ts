import { apiClient } from "../client";
import { recommendationFeedApi } from "../recommendation-feed.api";

// ---- Mocks ----
jest.mock("../client", () => ({
  __esModule: true,
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    upload: jest.fn(),
  },
}));

const mockGet = apiClient.get as jest.Mock;

// ---- Test Data ----
const feedResult = {
  items: [
    {
      id: "feed-1",
      mainImage: "http://img1.jpg",
      brand: { id: "b1", name: "BrandA" },
      price: 199,
      originalPrice: 299,
      styleTags: ["casual", "minimalist"],
      colorHarmony: { score: 0.9, colors: ["white", "black"] },
      matchReason: "Matches your style",
      category: "tops",
    },
    {
      id: "feed-2",
      mainImage: "http://img2.jpg",
      brand: null,
      price: 99,
      styleTags: ["sporty"],
      colorHarmony: { score: 0.7, colors: ["blue"] },
      matchReason: "Trending this week",
      category: "bottoms",
    },
  ],
  total: 2,
  hasMore: true,
};

// ---- Tests ----
describe("recommendationFeedApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getFeed ====================

  describe("getFeed", () => {
    it("should GET /recommendations/feed with default params", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      const result = await recommendationFeedApi.getFeed();

      expect(mockGet).toHaveBeenCalledWith(
        "/recommendations/feed",
        expect.objectContaining({
          category: "daily",
          page: 1,
          pageSize: 10,
        }),
      );
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it("should pass custom params to GET request", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      const result = await recommendationFeedApi.getFeed({
        category: "trending",
        subCategory: "tops",
        page: 2,
        pageSize: 20,
      });

      expect(mockGet).toHaveBeenCalledWith(
        "/recommendations/feed",
        expect.objectContaining({
          category: "trending",
          subCategory: "tops",
          page: 2,
          pageSize: 20,
        }),
      );
      expect(result.items).toHaveLength(2);
    });

    it("should not include subCategory when not provided", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      await recommendationFeedApi.getFeed({ category: "daily" });

      const callArgs = mockGet.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty("subCategory");
    });

    it("should include subCategory when provided", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      await recommendationFeedApi.getFeed({
        category: "occasion",
        subCategory: "work",
      });

      const callArgs = mockGet.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.subCategory).toBe("work");
    });

    it("should return empty result when API fails", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "SERVER_ERROR", message: "Error" },
      });

      const result = await recommendationFeedApi.getFeed();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("should return empty result when data is null", async () => {
      mockGet.mockResolvedValue({ success: true, data: null });

      const result = await recommendationFeedApi.getFeed();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("should return data directly when API succeeds", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      const result = await recommendationFeedApi.getFeed();

      expect(result).toEqual(feedResult);
    });
  });

  // ==================== getDaily ====================

  describe("getDaily", () => {
    it("should call getFeed with category=daily", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      const result = await recommendationFeedApi.getDaily(1, 10);

      expect(mockGet).toHaveBeenCalledWith(
        "/recommendations/feed",
        expect.objectContaining({
          category: "daily",
          page: 1,
          pageSize: 10,
        }),
      );
      expect(result.items).toHaveLength(2);
    });

    it("should use default page and pageSize", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      await recommendationFeedApi.getDaily();

      expect(mockGet).toHaveBeenCalledWith(
        "/recommendations/feed",
        expect.objectContaining({
          category: "daily",
          page: 1,
          pageSize: 10,
        }),
      );
    });
  });

  // ==================== getOccasion ====================

  describe("getOccasion", () => {
    it("should call getFeed with category=occasion and subCategory", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      const result = await recommendationFeedApi.getOccasion("work", 1, 10);

      expect(mockGet).toHaveBeenCalledWith(
        "/recommendations/feed",
        expect.objectContaining({
          category: "occasion",
          subCategory: "work",
          page: 1,
          pageSize: 10,
        }),
      );
      expect(result.items).toHaveLength(2);
    });

    it("should work without subCategory", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      await recommendationFeedApi.getOccasion(undefined, 2, 5);

      const callArgs = mockGet.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.category).toBe("occasion");
      expect(callArgs).not.toHaveProperty("subCategory");
      expect(callArgs.page).toBe(2);
      expect(callArgs.pageSize).toBe(5);
    });
  });

  // ==================== getTrending ====================

  describe("getTrending", () => {
    it("should call getFeed with category=trending", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      const result = await recommendationFeedApi.getTrending(1, 15);

      expect(mockGet).toHaveBeenCalledWith(
        "/recommendations/feed",
        expect.objectContaining({
          category: "trending",
          page: 1,
          pageSize: 15,
        }),
      );
      expect(result.items).toHaveLength(2);
    });

    it("should use default page and pageSize", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      await recommendationFeedApi.getTrending();

      expect(mockGet).toHaveBeenCalledWith(
        "/recommendations/feed",
        expect.objectContaining({
          category: "trending",
          page: 1,
          pageSize: 10,
        }),
      );
    });
  });

  // ==================== getExplore ====================

  describe("getExplore", () => {
    it("should call getFeed with category=explore", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      const result = await recommendationFeedApi.getExplore(3, 25);

      expect(mockGet).toHaveBeenCalledWith(
        "/recommendations/feed",
        expect.objectContaining({
          category: "explore",
          page: 3,
          pageSize: 25,
        }),
      );
      expect(result.items).toHaveLength(2);
    });

    it("should use default page and pageSize", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      await recommendationFeedApi.getExplore();

      expect(mockGet).toHaveBeenCalledWith(
        "/recommendations/feed",
        expect.objectContaining({
          category: "explore",
          page: 1,
          pageSize: 10,
        }),
      );
    });
  });

  // ==================== Response Parsing ====================

  describe("response parsing", () => {
    it("should correctly parse feed items with all fields", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      const result = await recommendationFeedApi.getFeed();

      expect(result.items[0].id).toBe("feed-1");
      expect(result.items[0].brand).toEqual({ id: "b1", name: "BrandA" });
      expect(result.items[0].price).toBe(199);
      expect(result.items[0].originalPrice).toBe(299);
      expect(result.items[0].styleTags).toEqual(["casual", "minimalist"]);
      expect(result.items[0].colorHarmony.score).toBe(0.9);
      expect(result.items[0].matchReason).toBe("Matches your style");
      expect(result.items[0].category).toBe("tops");
    });

    it("should handle items with null brand", async () => {
      mockGet.mockResolvedValue({ success: true, data: feedResult });

      const result = await recommendationFeedApi.getFeed();

      expect(result.items[1].brand).toBeNull();
    });

    it("should handle items without originalPrice", async () => {
      const data = {
        items: [
          {
            id: "feed-3",
            mainImage: "http://img3.jpg",
            brand: null,
            price: 50,
            styleTags: [],
            colorHarmony: { score: 0.5, colors: [] },
            matchReason: "",
            category: "accessories",
          },
        ],
        total: 1,
        hasMore: false,
      };
      mockGet.mockResolvedValue({ success: true, data });

      const result = await recommendationFeedApi.getFeed();

      expect(result.items[0].originalPrice).toBeUndefined();
    });
  });
});
