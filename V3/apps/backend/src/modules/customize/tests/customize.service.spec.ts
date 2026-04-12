import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CustomizeService } from '../customize.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { DesignSortOption } from '../dto/design-query.dto';

const USER_ID = 'user-001';
const OTHER_USER_ID = 'user-002';
const DESIGN_ID = 'design-001';
const TEMPLATE_ID = 'template-001';

const mockDesign = {
  id: DESIGN_ID,
  userId: USER_ID,
  name: 'Test Design',
  designData: { elements: [{ type: 'image', x: 100, y: 100 }] },
  patternImageUrl: 'https://example.com/pattern.png',
  previewImageUrl: null,
  productType: 'tshirt',
  productTemplateId: TEMPLATE_ID,
  isPublic: false,
  price: 8900,
  likesCount: 0,
  purchasesCount: 0,
  tags: ['国潮', '原创'],
  status: 'draft',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const mockPublicDesign = {
  ...mockDesign,
  id: 'design-public',
  isPublic: true,
  status: 'published',
  previewImageUrl: 'https://example.com/preview.png',
};

const mockTemplate = {
  id: TEMPLATE_ID,
  productType: 'tshirt',
  material: 'cotton',
  baseCost: 3000,
  suggestedPrice: 8900,
  uvMapUrl: 'https://example.com/uv-tshirt.png',
  previewModelUrl: null,
  availableSizes: ['S', 'M', 'L', 'XL'],
  printArea: { x: 100, y: 100, width: 400, height: 500 },
  podProvider: 'eprolo',
  podProductId: 'eprolo-tshirt-001',
  isActive: true,
};

const prismaMockFactory = () => ({
  customDesign: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  productTemplate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
});

describe('CustomizeService', () => {
  let service: CustomizeService;
  let prisma: ReturnType<typeof prismaMockFactory>;

  beforeEach(async () => {
    prisma = prismaMockFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomizeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CustomizeService>(CustomizeService);
  });

  describe('create', () => {
    it('should create a design successfully', async () => {
      const dto = {
        name: 'Test Design',
        designData: { elements: [{ type: 'image', x: 100, y: 100 }] },
        productType: 'tshirt',
        productTemplateId: TEMPLATE_ID,
        tags: ['国潮', '原创'],
        price: 8900,
      };

      prisma.customDesign.create.mockResolvedValue(mockDesign);

      const result = await service.create(USER_ID, dto);

      expect(result).toEqual(mockDesign);
      expect(prisma.customDesign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          name: 'Test Design',
          productType: 'tshirt',
          isPublic: false,
          status: 'draft',
        }),
      });
    });

    it('should create a design with minimal fields', async () => {
      const dto = {
        name: 'Minimal Design',
        designData: { elements: [] },
        productType: 'hoodie',
      };

      const minimalDesign = {
        ...mockDesign,
        name: 'Minimal Design',
        productType: 'hoodie',
        productTemplateId: null,
        patternImageUrl: null,
        tags: [],
        price: null,
      };

      prisma.customDesign.create.mockResolvedValue(minimalDesign);

      const result = await service.create(USER_ID, dto);

      expect(result).toEqual(minimalDesign);
      expect(prisma.customDesign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productTemplateId: null,
          patternImageUrl: null,
          tags: [],
          price: null,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated designs', async () => {
      prisma.customDesign.findMany.mockResolvedValue([mockDesign]);
      prisma.customDesign.count.mockResolvedValue(1);

      const result = await service.findAll(USER_ID, {
        page: 1,
        limit: 20,
        sort: DesignSortOption.NEWEST,
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by productType', async () => {
      prisma.customDesign.findMany.mockResolvedValue([mockDesign]);
      prisma.customDesign.count.mockResolvedValue(1);

      await service.findAll(USER_ID, {
        productType: 'tshirt',
        page: 1,
        limit: 20,
        sort: DesignSortOption.NEWEST,
      });

      expect(prisma.customDesign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ productType: 'tshirt' }),
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.customDesign.findMany.mockResolvedValue([]);
      prisma.customDesign.count.mockResolvedValue(0);

      await service.findAll(USER_ID, {
        status: 'draft',
        page: 1,
        limit: 20,
        sort: DesignSortOption.NEWEST,
      });

      expect(prisma.customDesign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });

    it('should filter by tags', async () => {
      prisma.customDesign.findMany.mockResolvedValue([]);
      prisma.customDesign.count.mockResolvedValue(0);

      await service.findAll(USER_ID, {
        tags: '国潮,原创',
        page: 1,
        limit: 20,
        sort: DesignSortOption.NEWEST,
      });

      expect(prisma.customDesign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ['国潮', '原创'] },
          }),
        }),
      );
    });

    it('should sort by most liked', async () => {
      prisma.customDesign.findMany.mockResolvedValue([]);
      prisma.customDesign.count.mockResolvedValue(0);

      await service.findAll(USER_ID, {
        sort: DesignSortOption.MOST_LIKED,
        page: 1,
        limit: 20,
      });

      expect(prisma.customDesign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { likesCount: 'desc' },
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      prisma.customDesign.findMany.mockResolvedValue([]);
      prisma.customDesign.count.mockResolvedValue(25);

      const result = await service.findAll(USER_ID, {
        page: 1,
        limit: 10,
        sort: DesignSortOption.NEWEST,
      });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return a design owned by the user', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);

      const result = await service.findOne(USER_ID, DESIGN_ID);

      expect(result).toEqual(mockDesign);
    });

    it('should return a public design for other users', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockPublicDesign);

      const result = await service.findOne(OTHER_USER_ID, 'design-public');

      expect(result).toEqual(mockPublicDesign);
    });

    it('should throw NotFoundException for non-existent design', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for private design of other user', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);

      await expect(
        service.findOne(OTHER_USER_ID, DESIGN_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a design successfully', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);
      const updatedDesign = { ...mockDesign, name: 'Updated Design' };
      prisma.customDesign.update.mockResolvedValue(updatedDesign);

      const result = await service.update(USER_ID, DESIGN_ID, {
        name: 'Updated Design',
      });

      expect(result).toEqual(updatedDesign);
      expect(prisma.customDesign.update).toHaveBeenCalledWith({
        where: { id: DESIGN_ID },
        data: expect.objectContaining({ name: 'Updated Design' }),
      });
    });

    it('should only update provided fields', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);
      prisma.customDesign.update.mockResolvedValue(mockDesign);

      await service.update(USER_ID, DESIGN_ID, { name: 'New Name' });

      expect(prisma.customDesign.update).toHaveBeenCalledWith({
        where: { id: DESIGN_ID },
        data: { name: 'New Name' },
      });
    });

    it('should throw NotFoundException for non-existent design', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(null);

      await expect(
        service.update(USER_ID, 'non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for other user design', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);

      await expect(
        service.update(OTHER_USER_ID, DESIGN_ID, { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a design successfully', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);
      prisma.customDesign.delete.mockResolvedValue(mockDesign);

      await service.remove(USER_ID, DESIGN_ID);

      expect(prisma.customDesign.delete).toHaveBeenCalledWith({
        where: { id: DESIGN_ID },
      });
    });

    it('should throw NotFoundException for non-existent design', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(USER_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for other user design', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);

      await expect(
        service.remove(OTHER_USER_ID, DESIGN_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generatePreview', () => {
    it('should generate preview and update design', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);
      prisma.productTemplate.findUnique.mockResolvedValue(mockTemplate);
      const updatedDesign = {
        ...mockDesign,
        previewImageUrl: expect.stringContaining('previews/'),
      };
      prisma.customDesign.update.mockResolvedValue(updatedDesign);

      const result = await service.generatePreview(USER_ID, DESIGN_ID);

      expect(result).toBeDefined();
      expect(prisma.customDesign.update).toHaveBeenCalledWith({
        where: { id: DESIGN_ID },
        data: { previewImageUrl: expect.stringContaining('previews/') },
      });
    });

    it('should throw BadRequestException when design has no pattern data', async () => {
      const emptyDesign = {
        ...mockDesign,
        patternImageUrl: null,
        designData: null,
      };
      prisma.customDesign.findUnique.mockResolvedValue(emptyDesign);

      await expect(
        service.generatePreview(USER_ID, DESIGN_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for other user design', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);

      await expect(
        service.generatePreview(OTHER_USER_ID, DESIGN_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('publish', () => {
    it('should publish a design successfully', async () => {
      const designWithPreview = {
        ...mockDesign,
        previewImageUrl: 'https://example.com/preview.png',
      };
      prisma.customDesign.findUnique.mockResolvedValue(designWithPreview);
      const publishedDesign = {
        ...designWithPreview,
        isPublic: true,
        status: 'published',
      };
      prisma.customDesign.update.mockResolvedValue(publishedDesign);

      const result = await service.publish(USER_ID, DESIGN_ID);

      expect(result).toBeDefined();
      expect(prisma.customDesign.update).toHaveBeenCalledWith({
        where: { id: DESIGN_ID },
        data: { isPublic: true, status: 'published' },
      });
    });

    it('should throw BadRequestException when no preview image', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockDesign);

      await expect(
        service.publish(USER_ID, DESIGN_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already published', async () => {
      prisma.customDesign.findUnique.mockResolvedValue(mockPublicDesign);

      await expect(
        service.publish(USER_ID, 'design-public'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for other user design', async () => {
      prisma.customDesign.findUnique.mockResolvedValue({
        ...mockDesign,
        previewImageUrl: 'https://example.com/preview.png',
      });

      await expect(
        service.publish(OTHER_USER_ID, DESIGN_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getProductTemplates', () => {
    it('should return all active templates without filter', async () => {
      prisma.productTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getProductTemplates();

      expect(result).toEqual([mockTemplate]);
      expect(prisma.productTemplate.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { productType: 'asc' },
      });
    });

    it('should filter by productType', async () => {
      prisma.productTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getProductTemplates('tshirt');

      expect(result).toEqual([mockTemplate]);
      expect(prisma.productTemplate.findMany).toHaveBeenCalledWith({
        where: { isActive: true, productType: 'tshirt' },
        orderBy: { productType: 'asc' },
      });
    });

    it('should return empty array when no templates match', async () => {
      prisma.productTemplate.findMany.mockResolvedValue([]);

      const result = await service.getProductTemplates('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
