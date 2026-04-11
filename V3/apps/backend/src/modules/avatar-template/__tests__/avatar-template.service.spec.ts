import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AvatarTemplateService } from '../avatar-template.service';
import { PrismaService } from '../../../prisma/prisma.service';

const TEMPLATE_ID = 'tpl-001';

const mockTemplate = {
  id: TEMPLATE_ID,
  name: '男性模板',
  gender: 'male',
  thumbnailUrl: 'https://cdn.aineed.com/avatar/male-thumb.png',
  drawingConfig: {
    head: { path: 'M50,10 a40,40 0 1,0 0.01,0', width: 80, height: 80 },
    eyes: [{ componentId: 'eye-round', offsetX: -15, offsetY: -5 }],
    mouth: { componentId: 'mouth-smile', offsetX: 0, offsetY: 10 },
    nose: { componentId: 'nose-small', offsetX: 0, offsetY: 5 },
    hair: { svgPath: 'M30,10 Q50,0 70,10', zIndex: 2 },
    body: { path: 'M35,90 L65,90 L70,150 L30,150 Z', width: 40, height: 60 },
    clothingSlots: {
      top: { x: 30, y: 90, width: 40, height: 30, zIndex: 1 },
      bottom: { x: 30, y: 120, width: 40, height: 30, zIndex: 1 },
      shoes: { x: 30, y: 145, width: 40, height: 10, zIndex: 1 },
      outerwear: { x: 25, y: 85, width: 50, height: 40, zIndex: 3 },
    },
  },
  parameters: {
    faceShape: { min: 0, max: 100, default: 50, label: '脸型' },
    eyeType: { options: ['round', 'almond', 'narrow'], default: 'round', label: '眼型' },
    skinTone: { options: ['#FDEBD0', '#F5CBA7', '#E0AC69', '#C68642'], default: '#F5CBA7', label: '肤色' },
    hairId: { options: ['hair-short', 'hair-medium', 'hair-long'], default: 'hair-short', label: '发型' },
  },
  defaultClothingMap: {
    top: { color: '#4A90D9', type: 'tshirt' },
    bottom: { color: '#2C3E50', type: 'jeans' },
    shoes: { color: '#1A1A1A', type: 'sneakers' },
  },
  isActive: true,
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const prismaMockFactory = () => ({
  avatarTemplate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
});

describe('AvatarTemplateService', () => {
  let service: AvatarTemplateService;
  let prisma: ReturnType<typeof prismaMockFactory>;

  beforeEach(async () => {
    prisma = prismaMockFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarTemplateService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AvatarTemplateService>(AvatarTemplateService);
  });

  describe('findAll', () => {
    it('should return all templates without filters', async () => {
      prisma.avatarTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.avatarTemplate.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.avatarTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter by gender', async () => {
      prisma.avatarTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.avatarTemplate.count.mockResolvedValue(1);

      const result = await service.findAll('male');

      expect(result.items).toHaveLength(1);
      expect(prisma.avatarTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gender: 'male' }),
        }),
      );
    });

    it('should filter by isActive', async () => {
      prisma.avatarTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.avatarTemplate.count.mockResolvedValue(1);

      await service.findAll(undefined, true);

      expect(prisma.avatarTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should filter by both gender and isActive', async () => {
      prisma.avatarTemplate.findMany.mockResolvedValue([mockTemplate]);
      prisma.avatarTemplate.count.mockResolvedValue(1);

      await service.findAll('male', true);

      expect(prisma.avatarTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { gender: 'male', isActive: true },
        }),
      );
    });

    it('should throw NotFoundException for invalid gender', async () => {
      await expect(service.findAll('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should return empty list when no templates match', async () => {
      prisma.avatarTemplate.findMany.mockResolvedValue([]);
      prisma.avatarTemplate.count.mockResolvedValue(0);

      const result = await service.findAll('female');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      prisma.avatarTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.findOne(TEMPLATE_ID);

      expect(result).toEqual(mockTemplate);
      expect(prisma.avatarTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.avatarTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: '新模板',
      gender: 'female',
      drawingConfig: mockTemplate.drawingConfig,
      parameters: mockTemplate.parameters,
      defaultClothingMap: mockTemplate.defaultClothingMap,
    };

    it('should create a template successfully', async () => {
      prisma.avatarTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTemplate);
      expect(prisma.avatarTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: '新模板',
          gender: 'female',
        }),
      });
    });

    it('should create a template without defaultClothingMap', async () => {
      const dtoWithoutClothing = { ...createDto, defaultClothingMap: undefined };
      prisma.avatarTemplate.create.mockResolvedValue({
        ...mockTemplate,
        defaultClothingMap: null,
      });

      await service.create(dtoWithoutClothing);

      expect(prisma.avatarTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          defaultClothingMap: undefined,
        }),
      });
    });
  });

  describe('update', () => {
    it('should update a template name', async () => {
      prisma.avatarTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.avatarTemplate.update.mockResolvedValue({
        ...mockTemplate,
        name: '更新后模板',
      });

      const result = await service.update(TEMPLATE_ID, { name: '更新后模板' });

      expect(result.name).toBe('更新后模板');
      expect(prisma.avatarTemplate.update).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
        data: expect.objectContaining({ name: '更新后模板' }),
      });
    });

    it('should merge drawingConfig on update', async () => {
      prisma.avatarTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.avatarTemplate.update.mockResolvedValue(mockTemplate);

      await service.update(TEMPLATE_ID, {
        drawingConfig: { head: { path: 'new-path', width: 100, height: 100 } },
      });

      expect(prisma.avatarTemplate.update).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
        data: expect.objectContaining({
          drawingConfig: expect.objectContaining({
            head: { path: 'new-path', width: 100, height: 100 },
          }),
        }),
      });
    });

    it('should merge parameters on update', async () => {
      prisma.avatarTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.avatarTemplate.update.mockResolvedValue(mockTemplate);

      await service.update(TEMPLATE_ID, {
        parameters: { faceShape: { min: 10, max: 90, default: 50, label: '脸型' } },
      });

      expect(prisma.avatarTemplate.update).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
        data: expect.objectContaining({
          parameters: expect.objectContaining({
            faceShape: { min: 10, max: 90, default: 50, label: '脸型' },
          }),
        }),
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.avatarTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a template by setting isActive to false', async () => {
      prisma.avatarTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.avatarTemplate.update.mockResolvedValue({
        ...mockTemplate,
        isActive: false,
      });

      const result = await service.remove(TEMPLATE_ID);

      expect(result.isActive).toBe(false);
      expect(prisma.avatarTemplate.update).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.avatarTemplate.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
