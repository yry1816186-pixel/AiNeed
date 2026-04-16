import { useClothingStore, ClothingItem, ClothingFilter } from "../../features/wardrobe/stores/clothingStore";

// Mocks
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const mockItem = (overrides: Partial<ClothingItem> = {}): ClothingItem => ({
  id: "item-1",
  name: "测试服装",
  category: "tops",
  price: 299,
  images: ["https://example.com/img.jpg"],
  colors: ["black"],
  sizes: ["M"],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

const defaultFilters: ClothingFilter = {
  categories: [],
  priceRange: [0, 100000],
  colors: [],
  sizes: [],
  styles: [],
  occasions: [],
  seasons: [],
  brands: [],
  sortBy: "newest",
  searchQuery: "",
};

const defaultPagination = {
  page: 1,
  pageSize: 20,
  hasMore: true,
  total: 0,
};

describe("useClothingStore", () => {
  beforeEach(() => {
    useClothingStore.setState({
      items: [],
      featuredItems: [],
      trendingItems: [],
      newArrivals: [],
      filters: { ...defaultFilters },
      pagination: { ...defaultPagination },
      selectedCategory: null,
      selectedSubcategory: null,
      viewMode: "grid",
      isLoading: false,
      error: null,
    });
  });

  // ==================== 初始状态 ====================

  describe("初始状态", () => {
    test("items 应为空数组", () => {
      expect(useClothingStore.getState().items).toEqual([]);
    });

    test("featuredItems 应为空数组", () => {
      expect(useClothingStore.getState().featuredItems).toEqual([]);
    });

    test("trendingItems 应为空数组", () => {
      expect(useClothingStore.getState().trendingItems).toEqual([]);
    });

    test("newArrivals 应为空数组", () => {
      expect(useClothingStore.getState().newArrivals).toEqual([]);
    });

    test("filters 应为默认值", () => {
      expect(useClothingStore.getState().filters).toEqual(defaultFilters);
    });

    test("pagination 应为默认值", () => {
      expect(useClothingStore.getState().pagination).toEqual(defaultPagination);
    });

    test("selectedCategory 应为 null", () => {
      expect(useClothingStore.getState().selectedCategory).toBeNull();
    });

    test("selectedSubcategory 应为 null", () => {
      expect(useClothingStore.getState().selectedSubcategory).toBeNull();
    });

    test("viewMode 应为 'grid'", () => {
      expect(useClothingStore.getState().viewMode).toBe("grid");
    });

    test("isLoading 应为 false", () => {
      expect(useClothingStore.getState().isLoading).toBe(false);
    });

    test("error 应为 null", () => {
      expect(useClothingStore.getState().error).toBeNull();
    });
  });

  // ==================== setItems ====================

  describe("setItems", () => {
    test("应替换所有 items", () => {
      const items = [mockItem({ id: "1" }), mockItem({ id: "2" })];
      useClothingStore.getState().setItems(items);
      expect(useClothingStore.getState().items).toEqual(items);
    });

    test("应能设置为空数组", () => {
      const items = [mockItem()];
      useClothingStore.getState().setItems(items);
      useClothingStore.getState().setItems([]);
      expect(useClothingStore.getState().items).toEqual([]);
    });
  });

  // ==================== addItems ====================

  describe("addItems", () => {
    test("应追加 items 到现有列表", () => {
      useClothingStore.getState().setItems([mockItem({ id: "1" })]);
      useClothingStore.getState().addItems([mockItem({ id: "2" }), mockItem({ id: "3" })]);
      expect(useClothingStore.getState().items).toHaveLength(3);
      expect(useClothingStore.getState().items.map((i) => i.id)).toEqual(["1", "2", "3"]);
    });

    test("在空列表上追加", () => {
      useClothingStore.getState().addItems([mockItem({ id: "1" })]);
      expect(useClothingStore.getState().items).toHaveLength(1);
    });
  });

  // ==================== setFeaturedItems / setTrendingItems / setNewArrivals ====================

  describe("setFeaturedItems", () => {
    test("应设置推荐商品列表", () => {
      const items = [mockItem({ id: "f1" })];
      useClothingStore.getState().setFeaturedItems(items);
      expect(useClothingStore.getState().featuredItems).toEqual(items);
    });
  });

  describe("setTrendingItems", () => {
    test("应设置趋势商品列表", () => {
      const items = [mockItem({ id: "t1" })];
      useClothingStore.getState().setTrendingItems(items);
      expect(useClothingStore.getState().trendingItems).toEqual(items);
    });
  });

  describe("setNewArrivals", () => {
    test("应设置新品列表", () => {
      const items = [mockItem({ id: "n1" })];
      useClothingStore.getState().setNewArrivals(items);
      expect(useClothingStore.getState().newArrivals).toEqual(items);
    });
  });

  // ==================== setFilters ====================

  describe("setFilters", () => {
    test("应合并部分 filter 到现有 filters", () => {
      useClothingStore.getState().setFilters({ categories: ["tops"] });
      expect(useClothingStore.getState().filters.categories).toEqual(["tops"]);
      // 其他字段保持默认
      expect(useClothingStore.getState().filters.sortBy).toBe("newest");
    });

    test("应合并多个 filter 字段", () => {
      useClothingStore.getState().setFilters({
        categories: ["tops"],
        priceRange: [100, 500],
        colors: ["black"],
      });
      const filters = useClothingStore.getState().filters;
      expect(filters.categories).toEqual(["tops"]);
      expect(filters.priceRange).toEqual([100, 500]);
      expect(filters.colors).toEqual(["black"]);
    });

    test("设置 filter 时应重置分页到第 1 页", () => {
      useClothingStore.getState().setPagination({ page: 3, total: 100 });
      expect(useClothingStore.getState().pagination.page).toBe(3);

      useClothingStore.getState().setFilters({ categories: ["tops"] });
      expect(useClothingStore.getState().pagination.page).toBe(1);
    });

    test("多次 setFilters 应增量合并", () => {
      useClothingStore.getState().setFilters({ categories: ["tops"] });
      useClothingStore.getState().setFilters({ colors: ["red"] });
      const filters = useClothingStore.getState().filters;
      expect(filters.categories).toEqual(["tops"]);
      expect(filters.colors).toEqual(["red"]);
    });
  });

  // ==================== resetFilters ====================

  describe("resetFilters", () => {
    test("应将 filters 和 pagination 重置为默认值", () => {
      useClothingStore.getState().setFilters({
        categories: ["tops"],
        priceRange: [100, 500],
        sortBy: "price_asc",
      });
      useClothingStore.getState().setPagination({ page: 5, total: 200 });

      useClothingStore.getState().resetFilters();

      expect(useClothingStore.getState().filters).toEqual(defaultFilters);
      expect(useClothingStore.getState().pagination).toEqual(defaultPagination);
    });
  });

  // ==================== setPagination ====================

  describe("setPagination", () => {
    test("应合并部分 pagination 字段", () => {
      useClothingStore.getState().setPagination({ page: 2, total: 50 });
      const pagination = useClothingStore.getState().pagination;
      expect(pagination.page).toBe(2);
      expect(pagination.total).toBe(50);
      expect(pagination.pageSize).toBe(20); // 保持默认
    });

    test("应更新 hasMore", () => {
      useClothingStore.getState().setPagination({ hasMore: false });
      expect(useClothingStore.getState().pagination.hasMore).toBe(false);
    });
  });

  // ==================== setSelectedCategory ====================

  describe("setSelectedCategory", () => {
    test("应设置选中的分类", () => {
      useClothingStore.getState().setSelectedCategory("tops");
      expect(useClothingStore.getState().selectedCategory).toBe("tops");
    });

    test("设置分类时应重置 selectedSubcategory 为 null", () => {
      useClothingStore.getState().setSelectedSubcategory("t-shirts");
      expect(useClothingStore.getState().selectedSubcategory).toBe("t-shirts");

      useClothingStore.getState().setSelectedCategory("tops");
      expect(useClothingStore.getState().selectedSubcategory).toBeNull();
    });

    test("设置分类时应重置分页为默认值", () => {
      useClothingStore.getState().setPagination({ page: 5, total: 100 });
      useClothingStore.getState().setSelectedCategory("tops");
      expect(useClothingStore.getState().pagination).toEqual(defaultPagination);
    });

    test("应能设置为 null", () => {
      useClothingStore.getState().setSelectedCategory("tops");
      useClothingStore.getState().setSelectedCategory(null);
      expect(useClothingStore.getState().selectedCategory).toBeNull();
    });
  });

  // ==================== setSelectedSubcategory ====================

  describe("setSelectedSubcategory", () => {
    test("应设置子分类", () => {
      useClothingStore.getState().setSelectedSubcategory("t-shirts");
      expect(useClothingStore.getState().selectedSubcategory).toBe("t-shirts");
    });

    test("设置子分类时应重置分页为默认值", () => {
      useClothingStore.getState().setPagination({ page: 3, total: 50 });
      useClothingStore.getState().setSelectedSubcategory("t-shirts");
      expect(useClothingStore.getState().pagination).toEqual(defaultPagination);
    });

    test("应能设置为 null", () => {
      useClothingStore.getState().setSelectedSubcategory("t-shirts");
      useClothingStore.getState().setSelectedSubcategory(null);
      expect(useClothingStore.getState().selectedSubcategory).toBeNull();
    });
  });

  // ==================== setViewMode ====================

  describe("setViewMode", () => {
    test("应设置视图模式为 'list'", () => {
      useClothingStore.getState().setViewMode("list");
      expect(useClothingStore.getState().viewMode).toBe("list");
    });

    test("应设置视图模式为 'grid'", () => {
      useClothingStore.getState().setViewMode("list");
      useClothingStore.getState().setViewMode("grid");
      expect(useClothingStore.getState().viewMode).toBe("grid");
    });
  });

  // ==================== setLoading ====================

  describe("setLoading", () => {
    test("应设置加载状态为 true", () => {
      useClothingStore.getState().setLoading(true);
      expect(useClothingStore.getState().isLoading).toBe(true);
    });

    test("应设置加载状态为 false", () => {
      useClothingStore.getState().setLoading(true);
      useClothingStore.getState().setLoading(false);
      expect(useClothingStore.getState().isLoading).toBe(false);
    });
  });

  // ==================== setError ====================

  describe("setError", () => {
    test("应设置错误信息", () => {
      useClothingStore.getState().setError("网络错误");
      expect(useClothingStore.getState().error).toBe("网络错误");
    });

    test("应能清除错误信息", () => {
      useClothingStore.getState().setError("网络错误");
      useClothingStore.getState().setError(null);
      expect(useClothingStore.getState().error).toBeNull();
    });
  });

  // ==================== clear ====================

  describe("clear", () => {
    test("应清空 items、filters、pagination 和 error", () => {
      const items = [mockItem()];
      useClothingStore.getState().setItems(items);
      useClothingStore.getState().setFilters({ categories: ["tops"] });
      useClothingStore.getState().setPagination({ page: 5, total: 100 });
      useClothingStore.getState().setError("错误");

      useClothingStore.getState().clear();

      expect(useClothingStore.getState().items).toEqual([]);
      expect(useClothingStore.getState().filters).toEqual(defaultFilters);
      expect(useClothingStore.getState().pagination).toEqual(defaultPagination);
      expect(useClothingStore.getState().error).toBeNull();
    });

    test("clear 不应清空 featuredItems/trendingItems/newArrivals", () => {
      const items = [mockItem({ id: "f1" })];
      useClothingStore.getState().setFeaturedItems(items);
      useClothingStore.getState().setTrendingItems(items);
      useClothingStore.getState().setNewArrivals(items);

      useClothingStore.getState().clear();

      expect(useClothingStore.getState().featuredItems).toEqual(items);
      expect(useClothingStore.getState().trendingItems).toEqual(items);
      expect(useClothingStore.getState().newArrivals).toEqual(items);
    });
  });
});
