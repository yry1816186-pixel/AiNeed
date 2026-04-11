import { Test } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { WardrobeController } from '../wardrobe.controller';
import { WardrobeService } from '../wardrobe.service';

const mockWardrobeService = {
  findAll: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getStats: jest.fn(),
};

describe('WardrobeController', () => {
  let controller: WardrobeController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [WardrobeController],
      providers: [
        { provide: WardrobeService, useValue: mockWardrobeService },
      ],
    }).compile();

    controller = module.get<WardrobeController>(WardrobeController);
  });

  const userId = 'user-001';

  describe('findAll', () => {
    it('should call service with correct params', async () => {
      const mockResult = {
        items: [],
        total: 0,
        stats: { byCategory: {}, byColor: {}, totalCount: 0 },
      };
      mockWardrobeService.findAll.mockResolvedValueOnce(mockResult);

      const result = await controller.findAll(
        userId,
        '上装',
        '黑色',
        'Nike',
        'added_at_desc',
        1,
        20,
      );

      expect(result).toEqual(mockResult);
      expect(mockWardrobeService.findAll).toHaveBeenCalledWith({
        userId,
        category: '上装',
        color: '黑色',
        brand: 'Nike',
        sort: 'added_at_desc',
        page: 1,
        limit: 20,
      });
    });

    it('should work with minimal params', async () => {
      const mockResult = {
        items: [],
        total: 0,
        stats: { byCategory: {}, byColor: {}, totalCount: 0 },
      };
      mockWardrobeService.findAll.mockResolvedValueOnce(mockResult);

      await controller.findAll(userId);

      expect(mockWardrobeService.findAll).toHaveBeenCalledWith({
        userId,
        category: undefined,
        color: undefined,
        brand: undefined,
        sort: undefined,
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('add', () => {
    const dto = { clothing_id: 'clothing-001' };

    it('should call service.add with userId and dto', async () => {
      const mockItem = { id: 'w-001', userId, clothingId: 'clothing-001' };
      mockWardrobeService.add.mockResolvedValueOnce(mockItem);

      const result = await controller.add(userId, dto);

      expect(result).toEqual(mockItem);
      expect(mockWardrobeService.add).toHaveBeenCalledWith(userId, dto);
    });

    it('should propagate ConflictException', async () => {
      mockWardrobeService.add.mockRejectedValueOnce(
        new ConflictException('该服装已在衣橱中'),
      );

      await expect(controller.add(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate NotFoundException', async () => {
      mockWardrobeService.add.mockRejectedValueOnce(
        new NotFoundException('服装不存在'),
      );

      await expect(controller.add(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return stats from service', async () => {
      const mockStats = {
        total: 5,
        byCategory: { 上装: 3, 下装: 2 },
        byColor: { 黑色: 3, 白色: 2 },
        bySeason: { summer: 3 },
        byStyle: { casual: 4 },
      };
      mockWardrobeService.getStats.mockResolvedValueOnce(mockStats);

      const result = await controller.getStats(userId);

      expect(result).toEqual(mockStats);
      expect(mockWardrobeService.getStats).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    const dto = { custom_name: '新名称' };

    it('should call service.update with correct params', async () => {
      const mockUpdated = { id: 'w-001', customName: '新名称' };
      mockWardrobeService.update.mockResolvedValueOnce(mockUpdated);

      const result = await controller.update(userId, 'w-001', dto);

      expect(result).toEqual(mockUpdated);
      expect(mockWardrobeService.update).toHaveBeenCalledWith(
        userId,
        'w-001',
        dto,
      );
    });

    it('should propagate ForbiddenException', async () => {
      mockWardrobeService.update.mockRejectedValueOnce(
        new ForbiddenException('无权操作此衣橱项'),
      );

      await expect(
        controller.update(userId, 'w-001', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException', async () => {
      mockWardrobeService.update.mockRejectedValueOnce(
        new NotFoundException('衣橱项不存在'),
      );

      await expect(
        controller.update(userId, 'nonexistent', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should call service.remove with correct params', async () => {
      mockWardrobeService.remove.mockResolvedValueOnce(undefined);

      await controller.remove(userId, 'w-001');

      expect(mockWardrobeService.remove).toHaveBeenCalledWith(userId, 'w-001');
    });

    it('should propagate NotFoundException', async () => {
      mockWardrobeService.remove.mockRejectedValueOnce(
        new NotFoundException('衣橱项不存在'),
      );

      await expect(
        controller.remove(userId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException', async () => {
      mockWardrobeService.remove.mockRejectedValueOnce(
        new ForbiddenException('无权操作此衣橱项'),
      );

      await expect(
        controller.remove(userId, 'w-001'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
