/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { ClothingCategory } from '../../../types/prisma-enums';

import { ClothingController } from "./clothing.controller";
import { ClothingService } from "./clothing.service";

describe("ClothingController", () => {
  let controller: ClothingController;
  let service: ClothingService;

  const mockClothingService = {
    getItems: jest.fn(),
    getItemById: jest.fn(),
    getFeaturedItems: jest.fn(),
    getCategories: jest.fn(),
    getPopularTags: jest.fn(),
  };

  const mockItem = {
    id: "item-1",
    name: "Test Item",
    brandId: null,
    brand: null,
    category: ClothingCategory.tops,
    price: 199,
    originalPrice: null,
    currency: "CNY",
    description: "A test item",
    mainImage: "https://example.com/image.jpg",
    images: ["https://example.com/image.jpg"],
    colors: ["black"],
    sizes: ["M"],
    tags: ["casual"],
    viewCount: 10,
    likeCount: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClothingController],
      providers: [
        {
          provide: ClothingService,
          useValue: mockClothingService,
        },
      ],
    }).compile();

    controller = module.get<ClothingController>(ClothingController);
    service = module.get<ClothingService>(ClothingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getItems", () => {
    it("should return paginated items", async () => {
      const mockResult = {
        items: [mockItem],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockClothingService.getItems.mockResolvedValue(mockResult);

      const result = await controller.getItems({
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should pass filter params to service", async () => {
      mockClothingService.getItems.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await controller.getItems({
        category: ClothingCategory.tops,
        minPrice: 100,
        maxPrice: 500,
      });

      expect(mockClothingService.getItems).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ClothingCategory.tops,
          minPrice: 100,
          maxPrice: 500,
        }),
      );
    });

    it("should split comma-separated colors, sizes, tags", async () => {
      mockClothingService.getItems.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await controller.getItems({
        colors: "red, blue",
        sizes: "M, L",
        tags: "casual, summer",
      });

      expect(mockClothingService.getItems).toHaveBeenCalledWith(
        expect.objectContaining({
          colors: ["red", "blue"],
          sizes: ["M", "L"],
          tags: ["casual", "summer"],
        }),
      );
    });
  });

  describe("getFeatured", () => {
    it("should return featured items with default limit", async () => {
      mockClothingService.getFeaturedItems.mockResolvedValue([mockItem]);

      const result = await controller.getFeatured();

      expect(result).toHaveLength(1);
      expect(mockClothingService.getFeaturedItems).toHaveBeenCalledWith(10);
    });

    it("should pass custom limit", async () => {
      mockClothingService.getFeaturedItems.mockResolvedValue([]);

      await controller.getFeatured("25");

      expect(mockClothingService.getFeaturedItems).toHaveBeenCalledWith(25);
    });
  });

  describe("getCategories", () => {
    it("should return category list", async () => {
      mockClothingService.getCategories.mockResolvedValue([
        ClothingCategory.tops,
        ClothingCategory.bottoms,
      ]);

      const result = await controller.getCategories();

      expect(result).toContain(ClothingCategory.tops);
      expect(result).toContain(ClothingCategory.bottoms);
    });
  });

  describe("getPopularTags", () => {
    it("should return tags with default limit", async () => {
      mockClothingService.getPopularTags.mockResolvedValue(["casual", "summer"]);

      const result = await controller.getPopularTags();

      expect(result).toEqual(["casual", "summer"]);
      expect(mockClothingService.getPopularTags).toHaveBeenCalledWith(20);
    });

    it("should pass custom limit", async () => {
      mockClothingService.getPopularTags.mockResolvedValue([]);

      await controller.getPopularTags("50");

      expect(mockClothingService.getPopularTags).toHaveBeenCalledWith(50);
    });
  });

  describe("getItemById", () => {
    it("should return item detail", async () => {
      mockClothingService.getItemById.mockResolvedValue(mockItem);

      const result = await controller.getItemById("item-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("item-1");
      expect(result!.name).toBe("Test Item");
    });

    it("should return null when item not found", async () => {
      mockClothingService.getItemById.mockResolvedValue(null);

      const result = await controller.getItemById("non-existent");

      expect(result).toBeNull();
    });
  });
});
