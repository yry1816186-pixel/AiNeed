import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OutfitController } from '../outfit.controller';
import { OutfitService } from '../outfit.service';

const USER_ID = 'user-001';
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

const mockOutfitItem = {
  id: ITEM_ID,
  outfitId: OUTFIT_ID,
  clothingId: CLOTHING_ID,
  slot: 'top',
  sortOrder: 0,
  clothingItem: {
    id: CLOTHING_ID,
    name: 'Test Shirt',
    imageUrls: ['https://example.com/img.jpg'],
    colors: ['blue'],
  },
};

const mockOutfitService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addItem: jest.fn(),
  removeItem: jest.fn(),
};

describe('OutfitController', () => {
  let controller: OutfitController;
  let service: OutfitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutfitController],
      providers: [
        { provide: OutfitService, useValue: mockOutfitService },
      ],
    }).compile();

    controller = module.get<OutfitController>(OutfitController);
    service = module.get<OutfitService>(OutfitService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      const dto = {
        name: 'Test Outfit',
        description: 'A test outfit',
        occasion: 'casual',
        season: 'summer',
        style_tags: ['streetwear'],
        is_public: false,
      };

      mockOutfitService.create.mockResolvedValue(mockOutfit);

      const result = await controller.create(USER_ID, dto);

      expect(result).toEqual(mockOutfit);
      expect(service.create).toHaveBeenCalledWith(USER_ID, dto);
    });

    it('should propagate errors from service', async () => {
      const dto = { name: 'Fail' };
      mockOutfitService.create.mockRejectedValue(new Error('DB error'));

      await expect(controller.create(USER_ID, dto)).rejects.toThrow('DB error');
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with default pagination', async () => {
      const expectedResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      mockOutfitService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(USER_ID);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(USER_ID, undefined, undefined);
    });

    it('should pass query parameters to service', async () => {
      const expectedResult = {
        items: [mockOutfit],
        total: 1,
        page: 2,
        limit: 10,
        totalPages: 1,
      };

      mockOutfitService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(USER_ID, 2, 10);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(USER_ID, 2, 10);
    });

    it('should pass numeric query params correctly', async () => {
      mockOutfitService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 3,
        limit: 5,
        totalPages: 0,
      });

      await controller.findAll(USER_ID, 3, 5);

      expect(service.findAll).toHaveBeenCalledWith(USER_ID, 3, 5);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return result', async () => {
      const outfitWithItems = { ...mockOutfit, items: [mockOutfitItem] };
      mockOutfitService.findOne.mockResolvedValue(outfitWithItems);

      const result = await controller.findOne(USER_ID, OUTFIT_ID);

      expect(result).toEqual(outfitWithItems);
      expect(service.findOne).toHaveBeenCalledWith(USER_ID, OUTFIT_ID);
    });

    it('should propagate NotFoundException from service', async () => {
      mockOutfitService.findOne.mockRejectedValue(
        new NotFoundException('搭配不存在'),
      );

      await expect(
        controller.findOne(USER_ID, OUTFIT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service', async () => {
      mockOutfitService.findOne.mockRejectedValue(
        new ForbiddenException('无权查看此搭配'),
      );

      await expect(
        controller.findOne(USER_ID, OUTFIT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto = { name: 'Updated Name' };
      const updatedOutfit = { ...mockOutfit, name: 'Updated Name', items: [] };
      mockOutfitService.update.mockResolvedValue(updatedOutfit);

      const result = await controller.update(USER_ID, OUTFIT_ID, dto);

      expect(result).toEqual(updatedOutfit);
      expect(service.update).toHaveBeenCalledWith(USER_ID, OUTFIT_ID, dto);
    });

    it('should propagate NotFoundException from service', async () => {
      mockOutfitService.update.mockRejectedValue(
        new NotFoundException('搭配不存在'),
      );

      await expect(
        controller.update(USER_ID, OUTFIT_ID, { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      mockOutfitService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(USER_ID, OUTFIT_ID);

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(USER_ID, OUTFIT_ID);
    });

    it('should propagate ForbiddenException from service', async () => {
      mockOutfitService.remove.mockRejectedValue(
        new ForbiddenException('无权操作此搭配'),
      );

      await expect(
        controller.remove(USER_ID, OUTFIT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addItem', () => {
    it('should call service.addItem and return result', async () => {
      const dto = {
        clothing_id: CLOTHING_ID,
        slot: 'top',
        sort_order: 0,
      };

      mockOutfitService.addItem.mockResolvedValue(mockOutfitItem);

      const result = await controller.addItem(USER_ID, OUTFIT_ID, dto);

      expect(result).toEqual(mockOutfitItem);
      expect(service.addItem).toHaveBeenCalledWith(USER_ID, OUTFIT_ID, dto);
    });

    it('should propagate NotFoundException if clothing does not exist', async () => {
      const dto = { clothing_id: CLOTHING_ID };
      mockOutfitService.addItem.mockRejectedValue(
        new NotFoundException('服装不存在'),
      );

      await expect(
        controller.addItem(USER_ID, OUTFIT_ID, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('should call service.removeItem and return result', async () => {
      mockOutfitService.removeItem.mockResolvedValue(undefined);

      const result = await controller.removeItem(USER_ID, OUTFIT_ID, ITEM_ID);

      expect(result).toBeUndefined();
      expect(service.removeItem).toHaveBeenCalledWith(USER_ID, OUTFIT_ID, ITEM_ID);
    });

    it('should propagate NotFoundException if item does not exist', async () => {
      mockOutfitService.removeItem.mockRejectedValue(
        new NotFoundException('搭配项不存在'),
      );

      await expect(
        controller.removeItem(USER_ID, OUTFIT_ID, ITEM_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException if item belongs to different outfit', async () => {
      mockOutfitService.removeItem.mockRejectedValue(
        new ForbiddenException('该搭配项不属于此搭配'),
      );

      await expect(
        controller.removeItem(USER_ID, OUTFIT_ID, ITEM_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
