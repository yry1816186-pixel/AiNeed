import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../common/prisma/prisma.service";

import { FavoritesService } from "./favorites.service";


describe("FavoritesService", () => {
  let service: FavoritesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    clothingItem: {
      findUnique: jest.fn(),
    },
    favorite: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockClothingItem = {
    id: "item-id",
    name: "测试服装",
    price: 199,
    isActive: true,
    isDeleted: false,
    brand: {
      id: "brand-id",
      name: "测试品牌",
      logo: "https://example.com/logo.jpg",
    },
  };

  const mockFavorite = {
    id: "favorite-id",
    userId: "test-user-id",
    itemId: "item-id",
    createdAt: new Date(),
    item: mockClothingItem,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("addFavorite", () => {
    it("应该成功添加收藏", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);
      mockPrismaService.favorite.create.mockResolvedValue(mockFavorite);

      const result = await service.addFavorite("test-user-id", "item-id");

      expect(result).toEqual(mockFavorite);
      expect(mockPrismaService.favorite.create).toHaveBeenCalledWith({
        data: { userId: "test-user-id", itemId: "item-id" },
      });
    });

    it("应该返回已存在的收藏", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(
        mockClothingItem,
      );
      mockPrismaService.favorite.findUnique.mockResolvedValue(mockFavorite);

      const result = await service.addFavorite("test-user-id", "item-id");

      expect(result).toEqual(mockFavorite);
      expect(mockPrismaService.favorite.create).not.toHaveBeenCalled();
    });

    it("应该抛出 NotFoundException 当商品不存在", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addFavorite("test-user-id", "non-existent-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeFavorite", () => {
    it("应该成功移除收藏", async () => {
      mockPrismaService.favorite.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeFavorite("test-user-id", "item-id");

      expect(mockPrismaService.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: "test-user-id", itemId: "item-id" },
      });
    });
  });

  describe("getUserFavorites", () => {
    it("应该返回用户收藏列表", async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([mockFavorite]);
      mockPrismaService.favorite.count.mockResolvedValue(1);

      const result = await service.getUserFavorites("test-user-id");

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it("应该支持分页", async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([mockFavorite]);
      mockPrismaService.favorite.count.mockResolvedValue(50);

      const result = await service.getUserFavorites("test-user-id", { page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(5);
    });

    it("应该返回空列表当没有收藏", async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([]);
      mockPrismaService.favorite.count.mockResolvedValue(0);

      const result = await service.getUserFavorites("test-user-id");

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("isFavorite", () => {
    it("应该返回 true 当已收藏", async () => {
      mockPrismaService.favorite.findUnique.mockResolvedValue(mockFavorite);

      const result = await service.isFavorite("test-user-id", "item-id");

      expect(result).toBe(true);
    });

    it("应该返回 false 当未收藏", async () => {
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);

      const result = await service.isFavorite("test-user-id", "item-id");

      expect(result).toBe(false);
    });
  });

  describe("getFavoriteIds", () => {
    it("应该返回收藏的商品ID列表", async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([
        { itemId: "item-1" },
        { itemId: "item-2" },
      ]);

      const result = await service.getFavoriteIds("test-user-id");

      expect(result).toEqual(["item-1", "item-2"]);
    });

    it("应该返回空数组当没有收藏", async () => {
      mockPrismaService.favorite.findMany.mockResolvedValue([]);

      const result = await service.getFavoriteIds("test-user-id");

      expect(result).toEqual([]);
    });
  });
});
