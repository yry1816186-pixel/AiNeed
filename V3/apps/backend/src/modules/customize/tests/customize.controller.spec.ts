import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CustomizeController } from '../customize.controller';
import { CustomizeService } from '../customize.service';
import { DesignSortOption } from '../dto/design-query.dto';

const USER_ID = 'user-001';
const DESIGN_ID = 'design-001';

const mockCustomizeService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  generatePreview: jest.fn(),
  publish: jest.fn(),
  getProductTemplates: jest.fn(),
};

describe('CustomizeController', () => {
  let controller: CustomizeController;
  let service: CustomizeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomizeController],
      providers: [
        { provide: CustomizeService, useValue: mockCustomizeService },
      ],
    }).compile();

    controller = module.get<CustomizeController>(CustomizeController);
    service = module.get<CustomizeService>(CustomizeService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      const dto = {
        name: 'Test Design',
        designData: { elements: [] },
        productType: 'tshirt',
      };
      const expectedResult = { id: DESIGN_ID, ...dto };

      mockCustomizeService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(USER_ID, dto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(USER_ID, dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query params', async () => {
      const query = {
        page: 1,
        limit: 20,
        sort: DesignSortOption.NEWEST,
      };
      const expectedResult = {
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };

      mockCustomizeService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(USER_ID, query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(USER_ID, query);
    });

    it('should pass filter parameters to service', async () => {
      const query = {
        productType: 'tshirt',
        status: 'draft',
        tags: '国潮',
        page: 2,
        limit: 10,
        sort: DesignSortOption.MOST_LIKED,
      };

      mockCustomizeService.findAll.mockResolvedValue({
        items: [],
        meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
      });

      await controller.findAll(USER_ID, query);

      expect(service.findAll).toHaveBeenCalledWith(USER_ID, query);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return result', async () => {
      const expectedResult = { id: DESIGN_ID, name: 'Test' };

      mockCustomizeService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(USER_ID, DESIGN_ID);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(USER_ID, DESIGN_ID);
    });

    it('should propagate NotFoundException', async () => {
      mockCustomizeService.findOne.mockRejectedValue(
        new NotFoundException('设计不存在'),
      );

      await expect(
        controller.findOne(USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto = { name: 'Updated' };
      const expectedResult = { id: DESIGN_ID, name: 'Updated' };

      mockCustomizeService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(USER_ID, DESIGN_ID, dto);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(USER_ID, DESIGN_ID, dto);
    });

    it('should propagate ForbiddenException', async () => {
      mockCustomizeService.update.mockRejectedValue(
        new ForbiddenException('无权操作此设计'),
      );

      await expect(
        controller.update(OTHER_USER_ID, DESIGN_ID, { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockCustomizeService.remove.mockResolvedValue(undefined);

      await controller.remove(USER_ID, DESIGN_ID);

      expect(service.remove).toHaveBeenCalledWith(USER_ID, DESIGN_ID);
    });
  });

  describe('generatePreview', () => {
    it('should call service.generatePreview', async () => {
      const expectedResult = {
        id: DESIGN_ID,
        previewImageUrl: 'previews/tshirt/123.png',
      };

      mockCustomizeService.generatePreview.mockResolvedValue(expectedResult);

      const result = await controller.generatePreview(USER_ID, DESIGN_ID);

      expect(result).toEqual(expectedResult);
      expect(service.generatePreview).toHaveBeenCalledWith(USER_ID, DESIGN_ID);
    });

    it('should propagate BadRequestException', async () => {
      mockCustomizeService.generatePreview.mockRejectedValue(
        new BadRequestException('设计缺少图案数据'),
      );

      await expect(
        controller.generatePreview(USER_ID, DESIGN_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publish', () => {
    it('should call service.publish', async () => {
      const expectedResult = {
        id: DESIGN_ID,
        isPublic: true,
        status: 'published',
      };

      mockCustomizeService.publish.mockResolvedValue(expectedResult);

      const result = await controller.publish(USER_ID, DESIGN_ID);

      expect(result).toEqual(expectedResult);
      expect(service.publish).toHaveBeenCalledWith(USER_ID, DESIGN_ID);
    });

    it('should propagate BadRequestException when no preview', async () => {
      mockCustomizeService.publish.mockRejectedValue(
        new BadRequestException('请先生成预览图再发布'),
      );

      await expect(
        controller.publish(USER_ID, DESIGN_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProductTemplates', () => {
    it('should call service.getProductTemplates without filter', async () => {
      const expectedResult = [{ id: 'tpl-001', productType: 'tshirt' }];

      mockCustomizeService.getProductTemplates.mockResolvedValue(expectedResult);

      const result = await controller.getProductTemplates();

      expect(result).toEqual(expectedResult);
      expect(service.getProductTemplates).toHaveBeenCalledWith(undefined);
    });

    it('should pass productType filter to service', async () => {
      mockCustomizeService.getProductTemplates.mockResolvedValue([]);

      await controller.getProductTemplates('tshirt');

      expect(service.getProductTemplates).toHaveBeenCalledWith('tshirt');
    });
  });
});

const OTHER_USER_ID = 'user-002';
