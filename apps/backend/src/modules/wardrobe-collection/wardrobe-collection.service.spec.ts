import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../common/prisma/prisma.service";

import { WardrobeCollectionService } from "./wardrobe-collection.service";
import { CollectionItemType } from "./dto/wardrobe-collection.dto";

describe("WardrobeCollectionService", () => {
  let service: WardrobeCollectionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    wardrobeCollection: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wardrobeCollectionItem: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    communityPost: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    outfit: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    virtualTryOn: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fns) => Promise.all(fns)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WardrobeCollectionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WardrobeCollectionService>(WardrobeCollectionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCollection", () => {
    it("should create a collection", async () => {
      const mockCollection = {
        id: "col-1",
        userId: "user-1",
        name: "My Collection",
        icon: null,
        coverImage: null,
        sortOrder: 0,
        isDefault: false,
        _count: { items: 0 },
      };
      mockPrismaService.wardrobeCollection.create.mockResolvedValue(mockCollection);

      const result = await service.createCollection("user-1", {
        name: "My Collection",
      });

      expect(result.id).toBe("col-1");
      expect(result.name).toBe("My Collection");
    });
  });

  describe("getCollections", () => {
    it("should return paginated collections", async () => {
      const mockCollections = [
        { id: "col-1", userId: "user-1", name: "Col 1", _count: { items: 3 } },
      ];
      mockPrismaService.wardrobeCollection.findMany.mockResolvedValue(mockCollections);
      mockPrismaService.wardrobeCollection.count.mockResolvedValue(1);

      const result = await service.getCollections("user-1", { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("getCollectionById", () => {
    it("should throw when collection not found", async () => {
      mockPrismaService.wardrobeCollection.findUnique.mockResolvedValue(null);

      await expect(
        service.getCollectionById("user-1", "col-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw when user does not own the collection", async () => {
      mockPrismaService.wardrobeCollection.findUnique.mockResolvedValue({
        id: "col-1",
        userId: "user-2",
      });

      await expect(
        service.getCollectionById("user-1", "col-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should return collection when owned by user", async () => {
      const mockCollection = {
        id: "col-1",
        userId: "user-1",
        name: "My Col",
        _count: { items: 2 },
      };
      mockPrismaService.wardrobeCollection.findUnique.mockResolvedValue(mockCollection);

      const result = await service.getCollectionById("user-1", "col-1");

      expect(result.id).toBe("col-1");
    });
  });

  describe("updateCollection", () => {
    it("should update collection name", async () => {
      mockPrismaService.wardrobeCollection.findUnique.mockResolvedValue({
        id: "col-1",
        userId: "user-1",
      });
      mockPrismaService.wardrobeCollection.update.mockResolvedValue({
        id: "col-1",
        name: "Updated",
        _count: { items: 0 },
      });

      const result = await service.updateCollection("user-1", "col-1", {
        name: "Updated",
      });

      expect(mockPrismaService.wardrobeCollection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "col-1" },
          data: expect.objectContaining({ name: "Updated" }),
        }),
      );
    });
  });

  describe("deleteCollection", () => {
    it("should throw when trying to delete default collection", async () => {
      mockPrismaService.wardrobeCollection.findUnique.mockResolvedValue({
        id: "col-1",
        userId: "user-1",
        isDefault: true,
      });

      await expect(
        service.deleteCollection("user-1", "col-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should delete non-default collection", async () => {
      mockPrismaService.wardrobeCollection.findUnique.mockResolvedValue({
        id: "col-1",
        userId: "user-1",
        isDefault: false,
      });
      mockPrismaService.wardrobeCollection.delete.mockResolvedValue({ id: "col-1" });

      const result = await service.deleteCollection("user-1", "col-1");

      expect(result.success).toBe(true);
      expect(mockPrismaService.wardrobeCollection.delete).toHaveBeenCalledWith({
        where: { id: "col-1" },
      });
    });
  });

  describe("addCollectionItem", () => {
    it("should add an item to collection", async () => {
      mockPrismaService.wardrobeCollection.findUnique.mockResolvedValue({
        id: "col-1",
        userId: "user-1",
        coverImage: "existing.jpg",
      });
      mockPrismaService.communityPost.findUnique.mockResolvedValue({ id: "post-1" });
      mockPrismaService.wardrobeCollectionItem.create.mockResolvedValue({
        id: "ci-1",
        collectionId: "col-1",
        itemType: CollectionItemType.POST,
        itemId: "post-1",
      });

      const result = await service.addCollectionItem("user-1", "col-1", {
        itemType: CollectionItemType.POST,
        itemId: "post-1",
      });

      expect(result.id).toBe("ci-1");
    });
  });

  describe("getCollectionItems", () => {
    it("should return paginated items with details", async () => {
      mockPrismaService.wardrobeCollection.findUnique.mockResolvedValue({
        id: "col-1",
        userId: "user-1",
      });
      const mockItems = [
        { id: "ci-1", collectionId: "col-1", itemType: CollectionItemType.POST, itemId: "post-1", sortOrder: 0, createdAt: new Date() },
      ];
      mockPrismaService.wardrobeCollectionItem.findMany.mockResolvedValue(mockItems);
      mockPrismaService.wardrobeCollectionItem.count.mockResolvedValue(1);
      mockPrismaService.communityPost.findMany.mockResolvedValue([
        { id: "post-1", title: "Post 1" },
      ]);
      mockPrismaService.outfit.findMany.mockResolvedValue([]);
      mockPrismaService.virtualTryOn.findMany.mockResolvedValue([]);

      const result = await service.getCollectionItems("user-1", "col-1", {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("reorderCollectionItems", () => {
    it("should reorder items using transaction", async () => {
      mockPrismaService.wardrobeCollection.findUnique.mockResolvedValue({
        id: "col-1",
        userId: "user-1",
      });
      mockPrismaService.wardrobeCollectionItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.$transaction.mockImplementation(async (fns) => Promise.all(fns));

      const result = await service.reorderCollectionItems("user-1", "col-1", {
        itemIds: ["ci-2", "ci-1"],
      });

      expect(result.success).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
