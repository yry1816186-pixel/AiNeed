import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AvatarTemplateController } from '../avatar-template.controller';
import { AvatarTemplateService } from '../avatar-template.service';

const TEMPLATE_ID = 'tpl-001';

const mockTemplateService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockTemplate = {
  id: TEMPLATE_ID,
  name: '男性模板',
  gender: 'male',
  thumbnailUrl: 'https://cdn.aineed.com/avatar/male-thumb.png',
  drawingConfig: { head: { path: 'M50,10', width: 80, height: 80 } },
  parameters: {
    faceShape: { min: 0, max: 100, default: 50, label: '脸型' },
  },
  isActive: true,
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('AvatarTemplateController', () => {
  let controller: AvatarTemplateController;
  let service: AvatarTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvatarTemplateController],
      providers: [
        { provide: AvatarTemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    controller = module.get<AvatarTemplateController>(AvatarTemplateController);
    service = module.get<AvatarTemplateService>(AvatarTemplateService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call service.findAll without filters', async () => {
      const expectedResult = { items: [mockTemplate], total: 1 };
      mockTemplateService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should pass gender filter to service', async () => {
      const expectedResult = { items: [mockTemplate], total: 1 };
      mockTemplateService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll({ gender: 'male' });

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith('male', undefined);
    });

    it('should pass isActive filter to service', async () => {
      const expectedResult = { items: [mockTemplate], total: 1 };
      mockTemplateService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll({ isActive: true });

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(undefined, true);
    });

    it('should pass both filters to service', async () => {
      const expectedResult = { items: [mockTemplate], total: 1 };
      mockTemplateService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll({ gender: 'male', isActive: true });

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith('male', true);
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      mockTemplateService.findOne.mockResolvedValue(mockTemplate);

      const result = await controller.findOne(TEMPLATE_ID);

      expect(result).toEqual(mockTemplate);
      expect(service.findOne).toHaveBeenCalledWith(TEMPLATE_ID);
    });

    it('should propagate NotFoundException from service', async () => {
      mockTemplateService.findOne.mockRejectedValue(
        new NotFoundException({
          code: 'TEMPLATE_NOT_FOUND',
          message: '形象模板不存在',
        }),
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: '新模板',
      gender: 'female',
      drawingConfig: {
        head: { path: 'M50,10', width: 80, height: 80 },
        eyes: [{ componentId: 'eye-round', offsetX: -15, offsetY: -5 }],
        mouth: { componentId: 'mouth-smile', offsetX: 0, offsetY: 10 },
        nose: { componentId: 'nose-small', offsetX: 0, offsetY: 5 },
        hair: { svgPath: 'M30,10', zIndex: 2 },
        body: { path: 'M35,90', width: 40, height: 60 },
        clothingSlots: {
          top: { x: 30, y: 90, width: 40, height: 30, zIndex: 1 },
          bottom: { x: 30, y: 120, width: 40, height: 30, zIndex: 1 },
          shoes: { x: 30, y: 145, width: 40, height: 10, zIndex: 1 },
          outerwear: { x: 25, y: 85, width: 50, height: 40, zIndex: 3 },
        },
      },
      parameters: {
        faceShape: { min: 0, max: 100, default: 50, label: '脸型' },
        eyeType: { options: ['round'], default: 'round', label: '眼型' },
        skinTone: { options: ['#FDEBD0'], default: '#FDEBD0', label: '肤色' },
        hairId: { options: ['hair-short'], default: 'hair-short', label: '发型' },
      },
    };

    it('should create a template and return it', async () => {
      mockTemplateService.create.mockResolvedValue(mockTemplate);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockTemplate);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a template and return it', async () => {
      const updateDto = { name: '更新后模板' };
      const updatedTemplate = { ...mockTemplate, name: '更新后模板' };
      mockTemplateService.update.mockResolvedValue(updatedTemplate);

      const result = await controller.update(TEMPLATE_ID, updateDto);

      expect(result).toEqual(updatedTemplate);
      expect(service.update).toHaveBeenCalledWith(TEMPLATE_ID, updateDto);
    });

    it('should propagate NotFoundException from service', async () => {
      mockTemplateService.update.mockRejectedValue(
        new NotFoundException({
          code: 'TEMPLATE_NOT_FOUND',
          message: '形象模板不存在',
        }),
      );

      await expect(
        controller.update('nonexistent', { name: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a template and return it', async () => {
      const deletedTemplate = { ...mockTemplate, isActive: false };
      mockTemplateService.remove.mockResolvedValue(deletedTemplate);

      const result = await controller.remove(TEMPLATE_ID);

      expect(result).toEqual(deletedTemplate);
      expect(service.remove).toHaveBeenCalledWith(TEMPLATE_ID);
    });

    it('should propagate NotFoundException from service', async () => {
      mockTemplateService.remove.mockRejectedValue(
        new NotFoundException({
          code: 'TEMPLATE_NOT_FOUND',
          message: '形象模板不存在',
        }),
      );

      await expect(controller.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
