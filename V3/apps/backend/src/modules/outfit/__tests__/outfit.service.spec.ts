import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OutfitService } from '../outfit.service';
import { PrismaService } from '../../../prisma/prisma.service';

const USER_ID = 'user-001';
const OTHER_USER_ID = 'user-002';
const OUTFIT_ID = 'outfit-001';
const CLOTHING_ID = 'clothing-001';
const ITEM_ID = 'item-001';

const mockOutfit = {
  id: OUTFIT_ID,
  userId: USER_ID,
  name: 'Test Outfit',
  description: 'A test outfit',
  occasion: 'casual',
  season: 'summer',
  styleTags: ['streetwear'],
  isPublic: false,
  likesCount: 0,
  commentsCount: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const mockClothingItem = {
  id: CLOTHING_ID,
  name: 'Test Shirt',
  description: 'A test shirt',
  price: 99.99,
  imageUrls: ['https://example.com/img.jpg'],
  colors: ['blue'],
  materials: ['cotton'],
};

const mockOutfitItem = {
  id: ITEM_ID,
  outfitId: OUTFIT_ID,
  clothingId: CLOTHING_ID,
  slot: 'top',
  sortOrder: 0,
  clothingItem: mockClothingItem,
};

const prismaMockFactory = () => ({
  outfit: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  outfitItem: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  clothingItem: {
    findUnique: jest.fn(),
  },
});

describe('OutfitService', () => {
  let service: OutfitService;
  let prisma: ReturnType<typeof prismaMockFactory>;

  beforeEach(async () => {
    prisma = prismaMockFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutfitService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OutfitService>(OutfitService);
  });

  describe('create', () => {
    it('should create an outfit successfully', async () => {
      prisma.outfit.create.mockResolvedValue(mockOutfit);

      const result = await service.create(USER_ID, {
        name: 'Test Outfit',
        description: 'A test outfit',
        occasion: 'casual',
        season: 'summer',
        style_tags: ['streetwear'],
        is_public: false,
      });

      expect(result).toEqual(mockOutfit);
      expect(prisma.outfit.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          name: 'Test Outfit',
          description: 'A test outfit',
          occasion: 'casual',
          season: 'summer',
          styleTags: ['streetwear'],
          isPublic: false,
        },
      });
    });

    it('should create an outfit with minimal fields', async () => {
      const minimalOutfit = { ...mockOutfit, description: null, occasion: null, season: null, styleTags: [] };
      prisma.outfit.create.mockResolvedValue(minimalOutfit);

      const result = await service.create(USER_ID, {
        name: 'Minimal Outfit',
      });

      expect(result).toBeDefined();
      expect(prisma.outfit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: USER_ID,
            name: 'Minimal Outfit',
            styleTags: [],
            isPublic: false,
          }),
        }),
      );
    });

    it('should propagate database errors', async () => {
      prisma.outfit.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create(USER_ID, { name: 'Fail' }),
      ).rejects.toThrow('DB error');
    });
  });

  describe('findAll', () => {
    it('should return paginated outfits with items', async () => {
      prisma.outfit.findMany.mockResolvedValue([mockOutfit]);
      prisma.outfit.count.mockResolvedValue(1);

      const result = await service.findAll(USER_ID, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should enforce minimum page of 1', async () => {
      prisma.outfit.findMany.mockResolvedValue([]);
      prisma.outfit.count.mockResolvedValue(0);

      const result = await service.findAll(USER_ID, -1, 20);

      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit of 100', async () => {
      prisma.outfit.findMany.mockResolvedValue([]);
      prisma.outfit.count.mockResolvedValue(0);

      const result = await service.findAll(USER_ID, 1, 200);

      expect(result.limit).toBe(100);
    });

    it('should enforce minimum limit of 1', async () => {
      prisma.outfit.findMany.mockResolvedValue([]);
      prisma.outfit.count.mockResolvedValue(0);

      const result = await service.findAll(USER_ID, 1, 0);

      expect(result.limit).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      prisma.outfit.findMany.mockResolvedValue([]);
      prisma.outfit.count.mockResolvedValue(45);

      const result = await service.findAll(USER_ID, 1, 20);

      expect(result.totalPages).toBe(3);
    });

    it('should default to page 1 and limit 20', async () => {
      prisma.outfit.findMany.mockResolvedValue([]);
      prisma.outfit.count.mockResolvedValue(0);

      const result = await service.findAll(USER_ID);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by userId', async () => {
      prisma.outfit.findMany.mockResolvedValue([]);
      prisma.outfit.count.mockResolvedValue(0);

      await service.findAll(USER_ID, 1, 20);

      expect(prisma.outfit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return outfit with items when owner requests', async () => {
      const outfitWithItems = {
        ...mockOutfit,
        items: [mockOutfitItem],
      };
      prisma.outfit.findUnique.mockResolvedValue(outfitWithItems);

      const result = await service.findOne(USER_ID, OUTFIT_ID);

      expect(result).toEqual(outfitWithItems);
    });

    it('should throw NotFoundException if outfit does not exist', async () => {
      prisma.outfit.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(USER_ID, OUTFIT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if non-owner accesses private outfit', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);

      await expect(
        service.findOne(OTHER_USER_ID, OUTFIT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow non-owner to access public outfit', async () => {
      const publicOutfit = { ...mockOutfit, isPublic: true };
      prisma.outfit.findUnique.mockResolvedValue(publicOutfit);

      const result = await service.findOne(OTHER_USER_ID, OUTFIT_ID);

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update an outfit successfully', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);
      const updatedOutfit = { ...mockOutfit, name: 'Updated Name', items: [] };
      prisma.outfit.update.mockResolvedValue(updatedOutfit);

      const result = await service.update(USER_ID, OUTFIT_ID, {
        name: 'Updated Name',
      });

      expect(result).toEqual(updatedOutfit);
      expect(prisma.outfit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Updated Name' },
        }),
      );
    });

    it('should throw NotFoundException if outfit does not exist', async () => {
      prisma.outfit.findUnique.mockResolvedValue(null);

      await expect(
        service.update(USER_ID, OUTFIT_ID, { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);

      await expect(
        service.update(OTHER_USER_ID, OUTFIT_ID, { name: 'New' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update multiple fields at once', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);
      const updatedOutfit = {
        ...mockOutfit,
        name: 'New Name',
        description: 'New Desc',
        items: [],
      };
      prisma.outfit.update.mockResolvedValue(updatedOutfit);

      await service.update(USER_ID, OUTFIT_ID, {
        name: 'New Name',
        description: 'New Desc',
      });

      expect(prisma.outfit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'New Name', description: 'New Desc' },
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete an outfit successfully', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);
      prisma.outfit.delete.mockResolvedValue(mockOutfit);

      await service.remove(USER_ID, OUTFIT_ID);

      expect(prisma.outfit.delete).toHaveBeenCalledWith({
        where: { id: OUTFIT_ID },
      });
    });

    it('should throw NotFoundException if outfit does not exist', async () => {
      prisma.outfit.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(USER_ID, OUTFIT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);

      await expect(
        service.remove(OTHER_USER_ID, OUTFIT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addItem', () => {
    it('should add clothing to outfit successfully', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);
      prisma.clothingItem.findUnique.mockResolvedValue({ id: CLOTHING_ID });
      prisma.outfitItem.findFirst.mockResolvedValue(null);
      prisma.outfitItem.create.mockResolvedValue(mockOutfitItem);

      const result = await service.addItem(USER_ID, OUTFIT_ID, {
        clothing_id: CLOTHING_ID,
        slot: 'top',
        sort_order: 0,
      });

      expect(result).toEqual(mockOutfitItem);
      expect(prisma.outfitItem.create).toHaveBeenCalledWith({
        data: {
          outfitId: OUTFIT_ID,
          clothingId: CLOTHING_ID,
          slot: 'top',
          sortOrder: 0,
        },
        include: {
          clothingItem: {
            select: expect.any(Object),
          },
        },
      });
    });

    it('should use default slot and sort_order when not provided', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);
      prisma.clothingItem.findUnique.mockResolvedValue({ id: CLOTHING_ID });
      prisma.outfitItem.findFirst.mockResolvedValue(null);
      prisma.outfitItem.create.mockResolvedValue({
        ...mockOutfitItem,
        slot: 'default',
        sortOrder: 0,
      });

      await service.addItem(USER_ID, OUTFIT_ID, {
        clothing_id: CLOTHING_ID,
      });

      expect(prisma.outfitItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slot: 'default',
            sortOrder: 0,
          }),
        }),
      );
    });

    it('should throw NotFoundException if outfit does not exist', async () => {
      prisma.outfit.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(USER_ID, OUTFIT_ID, { clothing_id: CLOTHING_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);

      await expect(
        service.addItem(OTHER_USER_ID, OUTFIT_ID, { clothing_id: CLOTHING_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if clothing does not exist', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);
      prisma.clothingItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(USER_ID, OUTFIT_ID, { clothing_id: CLOTHING_ID }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('should remove item from outfit successfully', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);
      prisma.outfitItem.findUnique.mockResolvedValue(mockOutfitItem);
      prisma.outfitItem.delete.mockResolvedValue(mockOutfitItem);

      await service.removeItem(USER_ID, OUTFIT_ID, ITEM_ID);

      expect(prisma.outfitItem.delete).toHaveBeenCalledWith({
        where: { id: ITEM_ID },
      });
    });

    it('should throw NotFoundException if outfit does not exist', async () => {
      prisma.outfit.findUnique.mockResolvedValue(null);

      await expect(
        service.removeItem(USER_ID, OUTFIT_ID, ITEM_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);

      await expect(
        service.removeItem(OTHER_USER_ID, OUTFIT_ID, ITEM_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if item does not exist', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);
      prisma.outfitItem.findUnique.mockResolvedValue(null);

      await expect(
        service.removeItem(USER_ID, OUTFIT_ID, ITEM_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if item belongs to different outfit', async () => {
      prisma.outfit.findUnique.mockResolvedValue(mockOutfit);
      prisma.outfitItem.findUnique.mockResolvedValue({
        ...mockOutfitItem,
        outfitId: 'different-outfit-id',
      });

      await expect(
        service.removeItem(USER_ID, OUTFIT_ID, ITEM_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
