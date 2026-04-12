import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OutfitImageController } from '../outfit-image.controller';
import { OutfitImageService } from '../outfit-image.service';
import { OutfitImageStatus } from '../dto/generate-outfit-image.dto';
import type { GenerateOutfitImageDto } from '../dto/generate-outfit-image.dto';

const MOCK_USER_ID = 'user-001';
const MOCK_RECORD_ID = 'record-001';

function createMockService() {
  return {
    generate: jest.fn(),
    getById: jest.fn(),
    history: jest.fn(),
  };
}

const MOCK_RESPONSE_DTO = {
  id: MOCK_RECORD_ID,
  userId: MOCK_USER_ID,
  items: [
    { name: 'V领毛衣', color: '红色', category: 'top' },
    { name: '直筒裤', color: '深蓝', category: 'bottom' },
  ],
  occasion: 'work',
  styleTips: '简约优雅',
  prompt: 'test-prompt',
  imageUrl: undefined,
  status: OutfitImageStatus.PENDING,
  cost: 0,
  metadata: undefined,
  createdAt: '2026-01-15T10:00:00.000Z',
};

const MOCK_HISTORY_RESULT = {
  items: [MOCK_RESPONSE_DTO],
  meta: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
};

describe('OutfitImageController', () => {
  let controller: OutfitImageController;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(async () => {
    mockService = createMockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutfitImageController],
      providers: [
        { provide: OutfitImageService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<OutfitImageController>(OutfitImageController);
  });

  describe('generate', () => {
    const generateDto = {
      items: MOCK_RESPONSE_DTO.items,
      occasion: 'work',
      styleTips: '简约优雅',
    };

    it('should delegate to service.generate and return wrapped response', async () => {
      mockService.generate.mockResolvedValue(MOCK_RESPONSE_DTO);

      const result = await controller.generate(MOCK_USER_ID, generateDto as unknown as GenerateOutfitImageDto);

      expect(result).toEqual({
        success: true,
        data: MOCK_RESPONSE_DTO,
      });
      expect(mockService.generate).toHaveBeenCalledWith(MOCK_USER_ID, generateDto);
    });

    it('should pass userId from CurrentUser decorator', async () => {
      mockService.generate.mockResolvedValue(MOCK_RESPONSE_DTO);

      await controller.generate('different-user', generateDto as unknown as GenerateOutfitImageDto);

      expect(mockService.generate).toHaveBeenCalledWith('different-user', generateDto);
    });

    it('should pass DTO items correctly to the service', async () => {
      mockService.generate.mockResolvedValue(MOCK_RESPONSE_DTO);

      const dtoWithMultipleItems = {
        items: [
          { name: '衬衫', color: '白色', category: 'top' as const },
          { name: '裙子', color: '黑色', category: 'bottom' as const },
          { name: '高跟鞋', color: '红色', category: 'shoes' as const },
        ],
        occasion: 'date',
      };

      await controller.generate(MOCK_USER_ID, dtoWithMultipleItems as unknown as GenerateOutfitImageDto);

      expect(mockService.generate).toHaveBeenCalledWith(
        MOCK_USER_ID,
        expect.objectContaining({ items: dtoWithMultipleItems.items }),
      );
    });
  });

  describe('history', () => {
    it('should delegate to service.history and return items and meta', async () => {
      mockService.history.mockResolvedValue(MOCK_HISTORY_RESULT);

      const query = { page: 1, limit: 20 };
      const result = await controller.history(MOCK_USER_ID, query);

      expect(result).toEqual({
        success: true,
        data: MOCK_HISTORY_RESULT.items,
        meta: MOCK_HISTORY_RESULT.meta,
      });
      expect(mockService.history).toHaveBeenCalledWith(MOCK_USER_ID, query);
    });

    it('should pass pagination query parameters to service', async () => {
      mockService.history.mockResolvedValue({
        items: [],
        meta: { total: 0, page: 3, limit: 5, totalPages: 0 },
      });

      const query = { page: 3, limit: 5 };
      await controller.history(MOCK_USER_ID, query);

      expect(mockService.history).toHaveBeenCalledWith(MOCK_USER_ID, query);
    });

    it('should return empty data array when no history exists', async () => {
      const emptyResult = {
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockService.history.mockResolvedValue(emptyResult);

      const result = await controller.history(MOCK_USER_ID, { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getById', () => {
    it('should delegate to service.getById and return wrapped response', async () => {
      mockService.getById.mockResolvedValue(MOCK_RESPONSE_DTO);

      const result = await controller.getById(MOCK_USER_ID, MOCK_RECORD_ID);

      expect(result).toEqual({
        success: true,
        data: MOCK_RESPONSE_DTO,
      });
      expect(mockService.getById).toHaveBeenCalledWith(MOCK_RECORD_ID, MOCK_USER_ID);
    });

    it('should pass the correct id and userId to service', async () => {
      mockService.getById.mockResolvedValue(MOCK_RESPONSE_DTO);

      await controller.getById('user-abc', 'record-xyz');

      expect(mockService.getById).toHaveBeenCalledWith('record-xyz', 'user-abc');
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.getById.mockRejectedValue(
        new NotFoundException('穿搭效果图不存在'),
      );

      await expect(
        controller.getById(MOCK_USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
