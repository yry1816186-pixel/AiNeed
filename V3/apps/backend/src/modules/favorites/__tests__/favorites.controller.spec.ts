import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesController } from '../favorites.controller';
import { FavoritesService } from '../favorites.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const USER_ID = 'user-001';
const TARGET_ID = 'target-001';

const mockFavoritesService = {
  create: jest.fn(),
  remove: jest.fn(),
  findAll: jest.fn(),
  check: jest.fn(),
  count: jest.fn(),
};

describe('FavoritesController', () => {
  let controller: FavoritesController;
  let service: FavoritesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritesController],
      providers: [
        { provide: FavoritesService, useValue: mockFavoritesService },
      ],
    }).compile();

    controller = module.get<FavoritesController>(FavoritesController);
    service = module.get<FavoritesService>(FavoritesService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      const dto = { targetType: 'clothing' as const, targetId: TARGET_ID };
      const expectedResult = {
        id: 'fav-001',
        targetType: 'clothing',
        targetId: TARGET_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      mockFavoritesService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(USER_ID, dto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(USER_ID, dto);
    });

    it('should propagate ConflictException from service', async () => {
      const dto = { targetType: 'clothing' as const, targetId: TARGET_ID };
      mockFavoritesService.create.mockRejectedValue(
        new ConflictException('Already favorited'),
      );

      await expect(controller.create(USER_ID, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      mockFavoritesService.remove.mockResolvedValue({ deleted: true });

      const result = await controller.remove(USER_ID, 'clothing', TARGET_ID);

      expect(result).toEqual({ deleted: true });
      expect(service.remove).toHaveBeenCalledWith(
        USER_ID,
        'clothing',
        TARGET_ID,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      mockFavoritesService.remove.mockRejectedValue(
        new NotFoundException('Favorite not found'),
      );

      await expect(
        controller.remove(USER_ID, 'clothing', TARGET_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with default pagination', async () => {
      const expectedResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      mockFavoritesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(USER_ID);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(
        USER_ID,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should pass query parameters to service', async () => {
      const expectedResult = {
        items: [],
        total: 0,
        page: 2,
        limit: 10,
      };

      mockFavoritesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(
        USER_ID,
        'clothing',
        2,
        10,
      );

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(
        USER_ID,
        'clothing',
        2,
        10,
      );
    });
  });

  describe('check', () => {
    it('should parse comma-separated target_ids and call service.check', async () => {
      const expectedResult = {
        results: [
          { targetId: 'id-1', isFavorited: true },
          { targetId: 'id-2', isFavorited: false },
        ],
      };

      mockFavoritesService.check.mockResolvedValue(expectedResult);

      const result = await controller.check(
        USER_ID,
        'clothing',
        'id-1,id-2',
      );

      expect(result).toEqual(expectedResult);
      expect(service.check).toHaveBeenCalledWith(USER_ID, 'clothing', [
        'id-1',
        'id-2',
      ]);
    });

    it('should handle target_ids with spaces', async () => {
      mockFavoritesService.check.mockResolvedValue({ results: [] });

      await controller.check(USER_ID, 'clothing', ' id-1 , id-2 ');

      expect(service.check).toHaveBeenCalledWith(USER_ID, 'clothing', [
        'id-1',
        'id-2',
      ]);
    });

    it('should filter out empty strings from target_ids', async () => {
      mockFavoritesService.check.mockResolvedValue({ results: [] });

      await controller.check(USER_ID, 'clothing', 'id-1,,id-2,');

      expect(service.check).toHaveBeenCalledWith(USER_ID, 'clothing', [
        'id-1',
        'id-2',
      ]);
    });
  });

  describe('count', () => {
    it('should call service.count without targetType', async () => {
      mockFavoritesService.count.mockResolvedValue({ count: 42 });

      const result = await controller.count(USER_ID);

      expect(result).toEqual({ count: 42 });
      expect(service.count).toHaveBeenCalledWith(USER_ID, undefined);
    });

    it('should call service.count with targetType', async () => {
      mockFavoritesService.count.mockResolvedValue({ count: 10 });

      const result = await controller.count(USER_ID, 'clothing');

      expect(result).toEqual({ count: 10 });
      expect(service.count).toHaveBeenCalledWith(USER_ID, 'clothing');
    });
  });
});
