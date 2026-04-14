import { useWardrobeStore, UserClothing, Outfit } from "../wardrobeStore";

// Mocks
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const mockClothing = (overrides: Partial<UserClothing> = {}): UserClothing => ({
  id: "cloth-1",
  userId: "user-1",
  name: "白色T恤",
  category: "tops",
  imageUri: "https://example.com/img.jpg",
  tags: ["casual"],
  occasions: ["daily"],
  seasons: ["summer"],
  style: ["casual"],
  isFavorite: false,
  wearCount: 0,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

const mockOutfit = (overrides: Partial<Outfit> = {}): Outfit => ({
  id: "outfit-1",
  userId: "user-1",
  name: "休闲搭配",
  items: ["cloth-1"],
  occasions: ["daily"],
  seasons: ["summer"],
  style: "casual",
  isFavorite: false,
  wearCount: 0,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

const defaultStats = {
  totalItems: 0,
  totalOutfits: 0,
  categories: {},
  styles: {},
  colors: {},
  mostWorn: null,
  leastWorn: null,
  totalValue: 0,
};

describe("useWardrobeStore", () => {
  beforeEach(() => {
    useWardrobeStore.setState({
      items: [],
      outfits: [],
      stats: { ...defaultStats },
      selectedItems: [],
      filterCategory: null,
      filterSeason: null,
      filterOccasion: null,
      sortBy: "newest",
      searchQuery: "",
      isLoading: false,
    });
  });

  // ==================== 初始状态 ====================

  describe("初始状态", () => {
    test("items 应为空数组", () => {
      expect(useWardrobeStore.getState().items).toEqual([]);
    });

    test("outfits 应为空数组", () => {
      expect(useWardrobeStore.getState().outfits).toEqual([]);
    });

    test("stats 应为默认值", () => {
      expect(useWardrobeStore.getState().stats).toEqual(defaultStats);
    });

    test("selectedItems 应为空数组", () => {
      expect(useWardrobeStore.getState().selectedItems).toEqual([]);
    });

    test("filterCategory 应为 null", () => {
      expect(useWardrobeStore.getState().filterCategory).toBeNull();
    });

    test("filterSeason 应为 null", () => {
      expect(useWardrobeStore.getState().filterSeason).toBeNull();
    });

    test("filterOccasion 应为 null", () => {
      expect(useWardrobeStore.getState().filterOccasion).toBeNull();
    });

    test("sortBy 应为 'newest'", () => {
      expect(useWardrobeStore.getState().sortBy).toBe("newest");
    });

    test("searchQuery 应为空字符串", () => {
      expect(useWardrobeStore.getState().searchQuery).toBe("");
    });

    test("isLoading 应为 false", () => {
      expect(useWardrobeStore.getState().isLoading).toBe(false);
    });
  });

  // ==================== setItems ====================

  describe("setItems", () => {
    test("应替换所有 items", () => {
      const items = [mockClothing({ id: "1" }), mockClothing({ id: "2" })];
      useWardrobeStore.getState().setItems(items);
      expect(useWardrobeStore.getState().items).toEqual(items);
    });

    test("应触发 recalculateStats 更新 totalItems", () => {
      const items = [mockClothing({ id: "1" }), mockClothing({ id: "2" })];
      useWardrobeStore.getState().setItems(items);
      expect(useWardrobeStore.getState().stats.totalItems).toBe(2);
    });
  });

  // ==================== addItem ====================

  describe("addItem", () => {
    test("应将 item 添加到列表开头", () => {
      useWardrobeStore.getState().setItems([mockClothing({ id: "1" })]);
      useWardrobeStore.getState().addItem(mockClothing({ id: "2" }));
      expect(useWardrobeStore.getState().items).toHaveLength(2);
      expect(useWardrobeStore.getState().items[0].id).toBe("2");
    });

    test("应触发 recalculateStats", () => {
      useWardrobeStore.getState().addItem(mockClothing({ id: "1" }));
      expect(useWardrobeStore.getState().stats.totalItems).toBe(1);
    });
  });

  // ==================== updateItem ====================

  describe("updateItem", () => {
    test("应更新指定 item 的字段", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", name: "旧名称" }),
      ]);
      useWardrobeStore.getState().updateItem("1", { name: "新名称" });
      expect(useWardrobeStore.getState().items[0].name).toBe("新名称");
    });

    test("应更新 updatedAt 字段", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", updatedAt: "2025-01-01T00:00:00Z" }),
      ]);
      useWardrobeStore.getState().updateItem("1", { name: "更新" });
      expect(useWardrobeStore.getState().items[0].updatedAt).not.toBe(
        "2025-01-01T00:00:00Z",
      );
    });

    test("不应影响其他 item", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", name: "A" }),
        mockClothing({ id: "2", name: "B" }),
      ]);
      useWardrobeStore.getState().updateItem("1", { name: "A-updated" });
      expect(useWardrobeStore.getState().items[1].name).toBe("B");
    });

    test("应触发 recalculateStats", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", category: "tops" }),
      ]);
      useWardrobeStore.getState().updateItem("1", { category: "bottoms" });
      expect(useWardrobeStore.getState().stats.categories).toEqual({
        bottoms: 1,
      });
    });
  });

  // ==================== removeItem ====================

  describe("removeItem", () => {
    test("应移除指定 item", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1" }),
        mockClothing({ id: "2" }),
      ]);
      useWardrobeStore.getState().removeItem("1");
      expect(useWardrobeStore.getState().items).toHaveLength(1);
      expect(useWardrobeStore.getState().items[0].id).toBe("2");
    });

    test("应从 selectedItems 中移除该 item", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1" }),
        mockClothing({ id: "2" }),
      ]);
      useWardrobeStore.getState().selectItem("1");
      useWardrobeStore.getState().selectItem("2");
      useWardrobeStore.getState().removeItem("1");
      expect(useWardrobeStore.getState().selectedItems).not.toContain("1");
      expect(useWardrobeStore.getState().selectedItems).toContain("2");
    });

    test("应触发 recalculateStats", () => {
      useWardrobeStore.getState().setItems([mockClothing({ id: "1" })]);
      useWardrobeStore.getState().removeItem("1");
      expect(useWardrobeStore.getState().stats.totalItems).toBe(0);
    });
  });

  // ==================== setOutfits ====================

  describe("setOutfits", () => {
    test("应替换所有 outfits", () => {
      const outfits = [mockOutfit({ id: "o1" })];
      useWardrobeStore.getState().setOutfits(outfits);
      expect(useWardrobeStore.getState().outfits).toEqual(outfits);
    });

    test("应触发 recalculateStats 更新 totalOutfits", () => {
      useWardrobeStore.getState().setOutfits([
        mockOutfit({ id: "o1" }),
        mockOutfit({ id: "o2" }),
      ]);
      expect(useWardrobeStore.getState().stats.totalOutfits).toBe(2);
    });
  });

  // ==================== addOutfit ====================

  describe("addOutfit", () => {
    test("应将 outfit 添加到列表开头", () => {
      useWardrobeStore.getState().setOutfits([mockOutfit({ id: "o1" })]);
      useWardrobeStore.getState().addOutfit(mockOutfit({ id: "o2" }));
      expect(useWardrobeStore.getState().outfits).toHaveLength(2);
      expect(useWardrobeStore.getState().outfits[0].id).toBe("o2");
    });

    test("应触发 recalculateStats", () => {
      useWardrobeStore.getState().addOutfit(mockOutfit({ id: "o1" }));
      expect(useWardrobeStore.getState().stats.totalOutfits).toBe(1);
    });
  });

  // ==================== updateOutfit ====================

  describe("updateOutfit", () => {
    test("应更新指定 outfit 的字段", () => {
      useWardrobeStore.getState().setOutfits([
        mockOutfit({ id: "o1", name: "旧搭配" }),
      ]);
      useWardrobeStore.getState().updateOutfit("o1", { name: "新搭配" });
      expect(useWardrobeStore.getState().outfits[0].name).toBe("新搭配");
    });

    test("应更新 updatedAt 字段", () => {
      useWardrobeStore.getState().setOutfits([
        mockOutfit({ id: "o1", updatedAt: "2025-01-01T00:00:00Z" }),
      ]);
      useWardrobeStore.getState().updateOutfit("o1", { name: "更新" });
      expect(useWardrobeStore.getState().outfits[0].updatedAt).not.toBe(
        "2025-01-01T00:00:00Z",
      );
    });
  });

  // ==================== removeOutfit ====================

  describe("removeOutfit", () => {
    test("应移除指定 outfit", () => {
      useWardrobeStore.getState().setOutfits([
        mockOutfit({ id: "o1" }),
        mockOutfit({ id: "o2" }),
      ]);
      useWardrobeStore.getState().removeOutfit("o1");
      expect(useWardrobeStore.getState().outfits).toHaveLength(1);
      expect(useWardrobeStore.getState().outfits[0].id).toBe("o2");
    });

    test("应触发 recalculateStats", () => {
      useWardrobeStore.getState().setOutfits([mockOutfit({ id: "o1" })]);
      useWardrobeStore.getState().removeOutfit("o1");
      expect(useWardrobeStore.getState().stats.totalOutfits).toBe(0);
    });
  });

  // ==================== selectItem / deselectItem / clearSelection ====================

  describe("selectItem", () => {
    test("应将 item id 添加到 selectedItems", () => {
      useWardrobeStore.getState().selectItem("1");
      expect(useWardrobeStore.getState().selectedItems).toContain("1");
    });

    test("应支持多选", () => {
      useWardrobeStore.getState().selectItem("1");
      useWardrobeStore.getState().selectItem("2");
      expect(useWardrobeStore.getState().selectedItems).toEqual(["1", "2"]);
    });
  });

  describe("deselectItem", () => {
    test("应从 selectedItems 中移除指定 id", () => {
      useWardrobeStore.getState().selectItem("1");
      useWardrobeStore.getState().selectItem("2");
      useWardrobeStore.getState().deselectItem("1");
      expect(useWardrobeStore.getState().selectedItems).toEqual(["2"]);
    });

    test("移除不存在的 id 不应报错", () => {
      useWardrobeStore.getState().selectItem("1");
      useWardrobeStore.getState().deselectItem("non-existent");
      expect(useWardrobeStore.getState().selectedItems).toEqual(["1"]);
    });
  });

  describe("clearSelection", () => {
    test("应清空 selectedItems", () => {
      useWardrobeStore.getState().selectItem("1");
      useWardrobeStore.getState().selectItem("2");
      useWardrobeStore.getState().clearSelection();
      expect(useWardrobeStore.getState().selectedItems).toEqual([]);
    });
  });

  // ==================== 过滤和排序 ====================

  describe("setFilterCategory", () => {
    test("应设置分类过滤器", () => {
      useWardrobeStore.getState().setFilterCategory("tops");
      expect(useWardrobeStore.getState().filterCategory).toBe("tops");
    });

    test("应能设置为 null", () => {
      useWardrobeStore.getState().setFilterCategory("tops");
      useWardrobeStore.getState().setFilterCategory(null);
      expect(useWardrobeStore.getState().filterCategory).toBeNull();
    });
  });

  describe("setFilterSeason", () => {
    test("应设置季节过滤器", () => {
      useWardrobeStore.getState().setFilterSeason("summer");
      expect(useWardrobeStore.getState().filterSeason).toBe("summer");
    });
  });

  describe("setFilterOccasion", () => {
    test("应设置场合过滤器", () => {
      useWardrobeStore.getState().setFilterOccasion("work");
      expect(useWardrobeStore.getState().filterOccasion).toBe("work");
    });
  });

  describe("setSortBy", () => {
    test("应设置排序方式", () => {
      useWardrobeStore.getState().setSortBy("mostWorn");
      expect(useWardrobeStore.getState().sortBy).toBe("mostWorn");
    });
  });

  describe("setSearchQuery", () => {
    test("应设置搜索关键词", () => {
      useWardrobeStore.getState().setSearchQuery("T恤");
      expect(useWardrobeStore.getState().searchQuery).toBe("T恤");
    });
  });

  // ==================== incrementWearCount ====================

  describe("incrementWearCount", () => {
    test("type='item' 时应增加 item 的 wearCount", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", wearCount: 3 }),
      ]);
      useWardrobeStore.getState().incrementWearCount("1", "item");
      expect(useWardrobeStore.getState().items[0].wearCount).toBe(4);
    });

    test("type='item' 时应更新 lastWorn", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", wearCount: 0, lastWorn: undefined }),
      ]);
      useWardrobeStore.getState().incrementWearCount("1", "item");
      expect(useWardrobeStore.getState().items[0].lastWorn).toBeDefined();
    });

    test("type='outfit' 时应增加 outfit 的 wearCount", () => {
      useWardrobeStore.getState().setOutfits([
        mockOutfit({ id: "o1", wearCount: 5 }),
      ]);
      useWardrobeStore.getState().incrementWearCount("o1", "outfit");
      expect(useWardrobeStore.getState().outfits[0].wearCount).toBe(6);
    });

    test("type='outfit' 时应更新 lastWorn", () => {
      useWardrobeStore.getState().setOutfits([
        mockOutfit({ id: "o1", wearCount: 0, lastWorn: undefined }),
      ]);
      useWardrobeStore.getState().incrementWearCount("o1", "outfit");
      expect(useWardrobeStore.getState().outfits[0].lastWorn).toBeDefined();
    });

    test("应触发 recalculateStats", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", wearCount: 0 }),
        mockClothing({ id: "2", wearCount: 0 }),
      ]);
      useWardrobeStore.getState().incrementWearCount("1", "item");
      // mostWorn 应该是 id "1" (wearCount=1 > 0)
      expect(useWardrobeStore.getState().stats.mostWorn).toBe("1");
    });
  });

  // ==================== recalculateStats ====================

  describe("recalculateStats", () => {
    test("应正确计算 totalItems", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1" }),
        mockClothing({ id: "2" }),
        mockClothing({ id: "3" }),
      ]);
      expect(useWardrobeStore.getState().stats.totalItems).toBe(3);
    });

    test("应正确计算 totalOutfits", () => {
      useWardrobeStore.getState().setOutfits([
        mockOutfit({ id: "o1" }),
        mockOutfit({ id: "o2" }),
      ]);
      expect(useWardrobeStore.getState().stats.totalOutfits).toBe(2);
    });

    test("应正确计算 categories 统计", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", category: "tops" }),
        mockClothing({ id: "2", category: "tops" }),
        mockClothing({ id: "3", category: "bottoms" }),
      ]);
      expect(useWardrobeStore.getState().stats.categories).toEqual({
        tops: 2,
        bottoms: 1,
      });
    });

    test("应正确计算 styles 统计", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", style: ["casual", "street"] }),
        mockClothing({ id: "2", style: ["casual"] }),
      ]);
      expect(useWardrobeStore.getState().stats.styles).toEqual({
        casual: 2,
        street: 1,
      });
    });

    test("应正确计算 colors 统计", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", color: "black" }),
        mockClothing({ id: "2", color: "black" }),
        mockClothing({ id: "3", color: "white" }),
      ]);
      expect(useWardrobeStore.getState().stats.colors).toEqual({
        black: 2,
        white: 1,
      });
    });

    test("应正确计算 totalValue", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", price: 299 }),
        mockClothing({ id: "2", price: 599 }),
        mockClothing({ id: "3" }), // 无 price
      ]);
      expect(useWardrobeStore.getState().stats.totalValue).toBe(898);
    });

    test("应正确计算 mostWorn", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", wearCount: 5 }),
        mockClothing({ id: "2", wearCount: 10 }),
        mockClothing({ id: "3", wearCount: 3 }),
      ]);
      expect(useWardrobeStore.getState().stats.mostWorn).toBe("2");
    });

    test("应正确计算 leastWorn", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", wearCount: 5 }),
        mockClothing({ id: "2", wearCount: 10 }),
        mockClothing({ id: "3", wearCount: 3 }),
      ]);
      expect(useWardrobeStore.getState().stats.leastWorn).toBe("3");
    });

    test("空 items 时 mostWorn 和 leastWorn 应为 null", () => {
      useWardrobeStore.getState().setItems([]);
      expect(useWardrobeStore.getState().stats.mostWorn).toBeNull();
      expect(useWardrobeStore.getState().stats.leastWorn).toBeNull();
    });

    test("无 price 的 item 不应影响 totalValue", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1" }), // 无 price
      ]);
      expect(useWardrobeStore.getState().stats.totalValue).toBe(0);
    });

    test("无 color 的 item 不应影响 colors 统计", () => {
      useWardrobeStore.getState().setItems([
        mockClothing({ id: "1", color: undefined }),
      ]);
      expect(useWardrobeStore.getState().stats.colors).toEqual({});
    });
  });
});
