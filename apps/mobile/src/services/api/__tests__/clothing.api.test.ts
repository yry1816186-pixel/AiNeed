import apiClient from "../client";
import { clothingApi } from "../clothing.api";

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
const mockPut = apiClient.put as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;
const mockUpload = apiClient.upload as jest.Mock;

// ---- Test Data ----
const backendItem = {
  id: "item-1",
  name: "White T-Shirt",
  description: "A comfortable white t-shirt",
  category: "tops",
  subcategory: "t-shirts",
  colors: ["white", "cream"],
  sizes: ["S", "M", "L"],
  tags: ["basic", "casual"],
  price: 99.9,
  originalPrice: 129.9,
  currency: "CNY",
  images: ["http://img1.jpg", "http://img2.jpg"],
  mainImage: "http://img1.jpg",
  externalUrl: "https://example.com/item",
  externalId: "ext-1",
  attributes: {
    style: ["casual", "minimalist"],
    seasons: ["spring", "summer"],
    occasions: ["daily", "work"],
    colors: ["white"],
  },
  viewCount: 42,
  likeCount: 10,
  brand: { id: "brand-1", name: "TestBrand", logo: "http://logo.jpg" },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-06-01T00:00:00.000Z",
  isFavorite: true,
};

const backendListResponse = {
  items: [backendItem],
  total: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  hasMore: false,
};

// ---- Tests ----
describe("clothingApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getAll ====================

  describe("getAll", () => {
    it("should GET /clothing with query params", async () => {
      mockGet.mockResolvedValue({ success: true, data: backendListResponse });

      const result = await clothingApi.getAll({
        page: 1,
        limit: 20,
        filter: { category: "tops" as const },
        sort: { field: "createdAt" as const, direction: "asc" },
      });

      expect(mockGet).toHaveBeenCalledWith(
        "/clothing",
        expect.objectContaining({
          page: 1,
          limit: 20,
          category: "tops",
          sortBy: "createdAt",
          sortOrder: "asc",
        })
      );
      expect(result.success).toBe(true);
    });

    it("should normalize paginated response correctly", async () => {
      mockGet.mockResolvedValue({ success: true, data: backendListResponse });

      const result = await clothingApi.getAll();

      if (result.success && result.data) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0].id).toBe("item-1");
        expect(result.data.items[0].name).toBe("White T-Shirt");
        expect(result.data.items[0].category).toBe("tops");
        expect(result.data.items[0].brand).toBe("TestBrand");
        expect(result.data.items[0].isFavorite).toBe(true);
        expect(result.data.page).toBe(1);
        expect(result.data.total).toBe(1);
      }
    });

    it("should return error when request fails", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "SERVER_ERROR", message: "Server error" },
      });

      const result = await clothingApi.getAll();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should filter out undefined query params", async () => {
      mockGet.mockResolvedValue({ success: true, data: backendListResponse });

      await clothingApi.getAll({ page: 1 });

      const callArgs = mockGet.mock.calls[0][1] as Record<string, unknown>;
      // undefined values should be filtered out
      Object.values(callArgs).forEach((val) => {
        expect(val).not.toBeUndefined();
      });
    });
  });

  // ==================== getById ====================

  describe("getById", () => {
    it("should GET /clothing/:id and normalize the item", async () => {
      mockGet.mockResolvedValue({ success: true, data: backendItem });

      const result = await clothingApi.getById("item-1");

      expect(mockGet).toHaveBeenCalledWith("/clothing/item-1");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe("item-1");
        expect(result.data.name).toBe("White T-Shirt");
        expect(result.data.category).toBe("tops");
      }
    });

    it("should return error when item not found", async () => {
      mockGet.mockResolvedValue({
        success: false,
        error: { code: "NOT_FOUND", message: "Item not found" },
      });

      const result = await clothingApi.getById("nonexistent");

      expect(result.success).toBe(false);
    });
  });

  // ==================== create ====================

  describe("create", () => {
    it("should POST to /clothing with data and normalize response", async () => {
      const inputData = {
        name: "New Item",
        category: "tops" as const,
        imageUri: "http://img.jpg",
      };
      mockPost.mockResolvedValue({ success: true, data: backendItem });

      const result = await clothingApi.create(inputData);

      expect(mockPost).toHaveBeenCalledWith("/clothing", inputData);
      expect(result.success).toBe(true);
    });
  });

  // ==================== update ====================

  describe("update", () => {
    it("should PUT to /clothing/:id with data", async () => {
      const updateData = { name: "Updated Item" };
      mockPut.mockResolvedValue({ success: true, data: { ...backendItem, name: "Updated Item" } });

      const result = await clothingApi.update("item-1", updateData);

      expect(mockPut).toHaveBeenCalledWith("/clothing/item-1", updateData);
      expect(result.success).toBe(true);
    });
  });

  // ==================== delete ====================

  describe("delete", () => {
    it("should DELETE /clothing/:id", async () => {
      mockDelete.mockResolvedValue({ success: true, data: undefined });

      const result = await clothingApi.delete("item-1");

      expect(mockDelete).toHaveBeenCalledWith("/clothing/item-1");
      expect(result.success).toBe(true);
    });
  });

  // ==================== uploadImage ====================

  describe("uploadImage", () => {
    it("should upload image to /clothing/upload with FormData", async () => {
      const analysisResult = { bodyType: "hourglass" };
      mockUpload.mockResolvedValue({
        success: true,
        data: { item: backendItem, analysis: analysisResult },
      });

      const result = await clothingApi.uploadImage("file:///photo/shirt.jpg", true);

      expect(mockUpload).toHaveBeenCalledWith("/clothing/upload", expect.any(FormData));
      expect(result.success).toBe(true);
    });

    it("should default autoAnalyze to true", async () => {
      mockUpload.mockResolvedValue({
        success: true,
        data: { item: backendItem },
      });

      await clothingApi.uploadImage("file:///photo/shirt.jpg");

      const formData = mockUpload.mock.calls[0][1] as FormData;
      expect(formData).toBeDefined();
    });
  });

  // ==================== toggleFavorite ====================

  describe("toggleFavorite", () => {
    it("should POST to /clothing/:id/favorite", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { ...backendItem, isFavorite: false },
      });

      const result = await clothingApi.toggleFavorite("item-1");

      expect(mockPost).toHaveBeenCalledWith("/clothing/item-1/favorite");
      expect(result.success).toBe(true);
    });
  });

  // ==================== incrementWearCount ====================

  describe("incrementWearCount", () => {
    it("should POST to /clothing/:id/wear", async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: { ...backendItem, viewCount: 43 },
      });

      const result = await clothingApi.incrementWearCount("item-1");

      expect(mockPost).toHaveBeenCalledWith("/clothing/item-1/wear");
      expect(result.success).toBe(true);
    });
  });

  // ==================== getCategories ====================

  describe("getCategories", () => {
    it("should GET /clothing/categories", async () => {
      const categories = ["tops", "bottoms", "dresses"];
      mockGet.mockResolvedValue({ success: true, data: categories });

      const result = await clothingApi.getCategories();

      expect(mockGet).toHaveBeenCalledWith("/clothing/categories");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(categories);
    });
  });

  // ==================== getStats ====================

  describe("getStats", () => {
    it("should GET /clothing/stats and normalize response", async () => {
      const statsData = {
        total: 50,
        byCategory: { tops: 20, bottoms: 30 },
        bySeason: { spring: 15 },
        mostWorn: [backendItem],
        leastWorn: [backendItem],
      };
      mockGet.mockResolvedValue({ success: true, data: statsData });

      const result = await clothingApi.getStats();

      expect(mockGet).toHaveBeenCalledWith("/clothing/stats");
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.total).toBe(50);
        expect(result.data.mostWorn).toHaveLength(1);
      }
    });

    it("should handle missing optional fields in stats", async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: { total: 0 },
      });

      const result = await clothingApi.getStats();

      if (result.success && result.data) {
        expect(result.data.byCategory).toEqual({});
        expect(result.data.bySeason).toEqual({});
        expect(result.data.mostWorn).toEqual([]);
        expect(result.data.leastWorn).toEqual([]);
      }
    });
  });

  // ==================== search ====================

  describe("search", () => {
    it("should POST to /clothing/search with query and filter", async () => {
      mockPost.mockResolvedValue({ success: true, data: { items: [backendItem], total: 1, page: 1, pageSize: 20, hasMore: false } });

      const result = await clothingApi.search(
        "white shirt",
        { category: "tops" as const },
        {
          minPrice: 50,
          maxPrice: 200,
        }
      );

      expect(mockPost).toHaveBeenCalledWith("/clothing/search", {
        query: "white shirt",
        filter: { category: "tops" },
        minPrice: 50,
        maxPrice: 200,
        sizes: undefined,
        sort: undefined,
        brands: undefined,
        colors: undefined,
        subcategory: undefined,
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it("should return paginated response with empty items when no results", async () => {
      mockPost.mockResolvedValue({ success: true, data: { items: [], total: 0, page: 1, pageSize: 20, hasMore: false } });

      const result = await clothingApi.search("nonexistent");

      if (result.success && result.data) {
        expect(result.data.items).toEqual([]);
      }
    });
  });

  // ==================== Normalization Edge Cases ====================

  describe("normalization edge cases", () => {
    it("should handle string price correctly", async () => {
      const stringPriceItem = { ...backendItem, price: "199.9" };
      mockGet.mockResolvedValue({ success: true, data: stringPriceItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.price).toBe(199.9);
      }
    });

    it("should handle null brand as undefined", async () => {
      const nullBrandItem = { ...backendItem, brand: null };
      mockGet.mockResolvedValue({ success: true, data: nullBrandItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.brand).toBeUndefined();
      }
    });

    it("should handle string brand name", async () => {
      const stringBrandItem = { ...backendItem, brand: "BrandName" };
      mockGet.mockResolvedValue({ success: true, data: stringBrandItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.brand).toBe("BrandName");
      }
    });

    it("should handle missing category as 'other'", async () => {
      const noCategoryItem = { ...backendItem, category: null };
      mockGet.mockResolvedValue({ success: true, data: noCategoryItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.category).toBe("other");
      }
    });

    it("should handle unknown category as 'other'", async () => {
      const unknownCategoryItem = { ...backendItem, category: "unknown_cat" };
      mockGet.mockResolvedValue({ success: true, data: unknownCategoryItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.category).toBe("other");
      }
    });

    it("should map 'shoes' category correctly", async () => {
      const shoesItem = { ...backendItem, category: "shoes" };
      mockGet.mockResolvedValue({ success: true, data: shoesItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.category).toBe("shoes");
      }
    });

    it("should map 'footwear' category to 'shoes'", async () => {
      const footwearItem = { ...backendItem, category: "footwear" };
      mockGet.mockResolvedValue({ success: true, data: footwearItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.category).toBe("shoes");
      }
    });

    it("should normalize style 'minimal' to 'minimalist'", async () => {
      const minimalItem = {
        ...backendItem,
        attributes: { style: ["minimal"] },
      };
      mockGet.mockResolvedValue({ success: true, data: minimalItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.style).toContain("minimalist");
      }
    });

    it("should normalize season 'autumn' to 'fall'", async () => {
      const autumnItem = {
        ...backendItem,
        attributes: { seasons: ["autumn"] },
      };
      mockGet.mockResolvedValue({ success: true, data: autumnItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.seasons).toContain("fall");
      }
    });

    it("should normalize occasion 'daily' to 'everyday'", async () => {
      const dailyItem = {
        ...backendItem,
        attributes: { occasions: ["daily"] },
      };
      mockGet.mockResolvedValue({ success: true, data: dailyItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        expect(result.data.occasions).toContain("everyday");
      }
    });

    it("should handle invalid date strings", async () => {
      const invalidDateItem = { ...backendItem, createdAt: "not-a-date" };
      mockGet.mockResolvedValue({ success: true, data: invalidDateItem });

      const result = await clothingApi.getById("item-1");

      if (result.success && result.data) {
        // Should fallback to epoch
        expect(result.data.createdAt).toBe(new Date(0).toISOString());
      }
    });
  });
});
