import { useRecommendationFeedStore } from "../recommendationFeedStore";
import { recommendationFeedApi } from "../../services/api/recommendation-feed.api";
import type { FeedItem, FeedResult } from "../../services/api/recommendation-feed.api";

jest.mock("../../services/api/recommendation-feed.api", () => ({
  recommendationFeedApi: {
    getFeed: jest.fn(),
  },
}));

const mockedGetFeed = recommendationFeedApi.getFeed as jest.Mock;

const mockFeedItems: FeedItem[] = [
  {
    id: "item-1",
    mainImage: "https://example.com/img1.jpg",
    brand: { id: "brand-1", name: "Brand A" },
    price: 299,
    styleTags: ["casual", "minimalist"],
    colorHarmony: { score: 0.9, colors: ["#000", "#fff"] },
    matchReason: "Matches your style",
    category: "tops",
  },
  {
    id: "item-2",
    mainImage: "https://example.com/img2.jpg",
    brand: null,
    price: 199,
    originalPrice: 299,
    styleTags: ["formal"],
    colorHarmony: { score: 0.8, colors: ["#333"] },
    matchReason: "Great for work",
    category: "bottoms",
  },
];

const mockFeedResult: FeedResult = {
  items: mockFeedItems,
  total: 25,
  hasMore: true,
};

describe("useRecommendationFeedStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRecommendationFeedStore.setState({
      items: [],
      total: 0,
      hasMore: true,
      isLoading: false,
      isRefreshing: false,
      activeCategory: "daily",
      activeSubCategory: null,
      page: 1,
      error: null,
    });
  });

  // ==================== 初始状态 ====================

  describe("initial state", () => {
    it("should have correct default values", () => {
      const state = useRecommendationFeedStore.getState();
      expect(state.items).toEqual([]);
      expect(state.activeCategory).toBe("daily");
      expect(state.activeSubCategory).toBeNull();
      expect(state.page).toBe(1);
      expect(state.hasMore).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.isRefreshing).toBe(false);
      expect(state.total).toBe(0);
      expect(state.error).toBeNull();
    });
  });

  // ==================== setCategory ====================

  describe("setCategory", () => {
    it("should reset items/page/hasMore and call fetchFeed", async () => {
      useRecommendationFeedStore.setState({
        items: mockFeedItems,
        page: 3,
        hasMore: false,
        error: "old error",
      });

      mockedGetFeed.mockResolvedValueOnce({
        items: [],
        total: 0,
        hasMore: false,
      });

      useRecommendationFeedStore.getState().setCategory("trending");

      // Verify state was reset before fetch
      const state = useRecommendationFeedStore.getState();
      expect(state.activeCategory).toBe("trending");
      expect(state.items).toEqual([]);
      expect(state.page).toBe(1);
      expect(state.hasMore).toBe(true);
      expect(state.error).toBeNull();

      // Wait for fetchFeed to complete
      await Promise.resolve();
    });
  });

  // ==================== setSubCategory ====================

  describe("setSubCategory", () => {
    it("should reset items/page/hasMore and call fetchFeed", async () => {
      useRecommendationFeedStore.setState({
        items: mockFeedItems,
        page: 2,
        hasMore: false,
        error: "old error",
      });

      mockedGetFeed.mockResolvedValueOnce({
        items: [],
        total: 0,
        hasMore: false,
      });

      useRecommendationFeedStore.getState().setSubCategory("work");

      const state = useRecommendationFeedStore.getState();
      expect(state.activeSubCategory).toBe("work");
      expect(state.items).toEqual([]);
      expect(state.page).toBe(1);
      expect(state.hasMore).toBe(true);
      expect(state.error).toBeNull();

      await Promise.resolve();
    });

    it("should set subCategory to null", async () => {
      useRecommendationFeedStore.setState({ activeSubCategory: "work" });

      mockedGetFeed.mockResolvedValueOnce({
        items: [],
        total: 0,
        hasMore: false,
      });

      useRecommendationFeedStore.getState().setSubCategory(null);
      expect(useRecommendationFeedStore.getState().activeSubCategory).toBeNull();

      await Promise.resolve();
    });
  });

  // ==================== fetchFeed ====================

  describe("fetchFeed", () => {
    it("should set items, total, hasMore, and increment page on success", async () => {
      mockedGetFeed.mockResolvedValueOnce(mockFeedResult);

      await useRecommendationFeedStore.getState().fetchFeed();

      const state = useRecommendationFeedStore.getState();
      expect(state.items).toEqual(mockFeedItems);
      expect(state.total).toBe(25);
      expect(state.hasMore).toBe(true);
      expect(state.page).toBe(2); // incremented from 1 to 2
      expect(state.isLoading).toBe(false);
    });

    it("should replace items when reset is true", async () => {
      useRecommendationFeedStore.setState({
        items: mockFeedItems,
        page: 3,
      });

      const newItems = [
        {
          id: "item-3",
          mainImage: "https://example.com/img3.jpg",
          brand: null,
          price: 100,
          styleTags: [],
          colorHarmony: { score: 0.7, colors: [] },
          matchReason: "New item",
          category: "shoes",
        },
      ];

      mockedGetFeed.mockResolvedValueOnce({
        items: newItems,
        total: 5,
        hasMore: false,
      });

      await useRecommendationFeedStore.getState().fetchFeed(true);

      const state = useRecommendationFeedStore.getState();
      expect(state.items).toEqual(newItems);
      expect(state.total).toBe(5);
      expect(state.hasMore).toBe(false);
    });

    it("should append items when reset is false (loadMore)", async () => {
      useRecommendationFeedStore.setState({
        items: mockFeedItems,
        page: 2,
      });

      const moreItems = [
        {
          id: "item-3",
          mainImage: "https://example.com/img3.jpg",
          brand: null,
          price: 100,
          styleTags: [],
          colorHarmony: { score: 0.7, colors: [] },
          matchReason: "More item",
          category: "shoes",
        },
      ];

      mockedGetFeed.mockResolvedValueOnce({
        items: moreItems,
        total: 30,
        hasMore: true,
      });

      await useRecommendationFeedStore.getState().fetchFeed(false);

      const state = useRecommendationFeedStore.getState();
      expect(state.items).toHaveLength(3);
      expect(state.items[2].id).toBe("item-3");
    });

    it("should not fetch if already loading", async () => {
      useRecommendationFeedStore.setState({ isLoading: true });

      await useRecommendationFeedStore.getState().fetchFeed();

      expect(mockedGetFeed).not.toHaveBeenCalled();
    });

    it("should set error on fetch failure", async () => {
      mockedGetFeed.mockRejectedValueOnce(new Error("Network error"));

      await useRecommendationFeedStore.getState().fetchFeed();

      const state = useRecommendationFeedStore.getState();
      expect(state.error).toBe("Network error");
      expect(state.isLoading).toBe(false);
    });

    it("should set default error message for non-Error exceptions", async () => {
      mockedGetFeed.mockRejectedValueOnce("unknown error");

      await useRecommendationFeedStore.getState().fetchFeed();

      expect(useRecommendationFeedStore.getState().error).toBe("加载失败");
    });
  });

  // ==================== loadMore ====================

  describe("loadMore", () => {
    it("should call fetchFeed(false)", async () => {
      mockedGetFeed.mockResolvedValueOnce(mockFeedResult);

      await useRecommendationFeedStore.getState().loadMore();

      expect(mockedGetFeed).toHaveBeenCalled();
    });

    it("should not load more if already loading", async () => {
      useRecommendationFeedStore.setState({ isLoading: true });

      await useRecommendationFeedStore.getState().loadMore();

      expect(mockedGetFeed).not.toHaveBeenCalled();
    });

    it("should not load more if hasMore is false", async () => {
      useRecommendationFeedStore.setState({ hasMore: false });

      await useRecommendationFeedStore.getState().loadMore();

      expect(mockedGetFeed).not.toHaveBeenCalled();
    });
  });

  // ==================== refresh ====================

  describe("refresh", () => {
    it("should set isRefreshing and call fetchFeed(true)", async () => {
      mockedGetFeed.mockResolvedValueOnce(mockFeedResult);

      const refreshPromise = useRecommendationFeedStore.getState().refresh();

      // isRefreshing should be true during refresh
      expect(useRecommendationFeedStore.getState().isRefreshing).toBe(true);

      await refreshPromise;

      expect(useRecommendationFeedStore.getState().isRefreshing).toBe(false);
      expect(mockedGetFeed).toHaveBeenCalled();
    });
  });

  // ==================== reset ====================

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      useRecommendationFeedStore.setState({
        items: mockFeedItems,
        total: 25,
        hasMore: false,
        page: 5,
        error: "some error",
        activeCategory: "trending",
        activeSubCategory: "work",
      });

      useRecommendationFeedStore.getState().reset();

      const state = useRecommendationFeedStore.getState();
      expect(state.items).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.hasMore).toBe(true);
      expect(state.page).toBe(1);
      expect(state.error).toBeNull();
      expect(state.activeCategory).toBe("daily");
      expect(state.activeSubCategory).toBeNull();
    });
  });
});
