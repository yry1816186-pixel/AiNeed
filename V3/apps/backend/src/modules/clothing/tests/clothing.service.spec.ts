import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClothingService } from '../clothing.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClothingQueryDto, ClothingSortOption } from '../dto/clothing-query.dto';
import { CreateClothingDto } from '../dto/create-clothing.dto';

const mockClothingItem = {
  id: 'item-1',
  brandId: 'brand-1',
  categoryId: 'cat-1',
  name: 'Test T-Shirt',
  description: 'A test t-shirt',
  price: 99.99,
  originalPrice: null,
  currency: 'CNY',
  gender: 'male',
  seasons: ['spring', 'summer'],
  occasions: ['casual'],
  styleTags: ['casual', 'streetwear'],
  colors: ['black'],
  materials: ['cotton'],
  fitType: 'regular',
  imageUrls: ['https://example.com/img.jpg'],
  sourceUrl: null,
  purchaseUrl: null,
  sourceName: null,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  brand: { id: 'brand-1', name: 'Test Brand', logoUrl: null, description: null },
  category: { id: 'cat-1', name: 'T-Shirts', nameEn: null, slug: 't-shirts', parentId: null, sortOrder: 0 },
};

const mockCategory = {
  id: 'cat-1',
  name: 'T-Shirts',
  nameEn: null,
  slug: 't-shirts',
  parentId: null,
  sortOrder: 0,
};

const mockCategoryChild = {
  id: 'cat-2',
  name: 'V-Neck T-Shirts',
  nameEn: null,
  slug: 'v-neck-t-shirts',
  parentId: 'cat-1',
  sortOrder: 0,
};

const mockBrand = {
  id: 'brand-1',
  name: 'Test Brand',
  logoUrl: null,
  description: null,
};

describe('ClothingService', () => {
  let service: ClothingService;
  let prisma: {
    clothingItem: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
    category: {
      findMany: jest.Mock;
    };
    brand: {
      findMany: jest.Mock;
    };
    userStylePreference: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      clothingItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
      brand: {
        findMany: jest.fn(),
      },
      userStylePreference: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClothingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClothingService>(ClothingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated clothing items with default params', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([mockClothingItem]);
      prisma.clothingItem.count.mockResolvedValue(1);

      const query = new ClothingQueryDto();
      const result = await service.findAll(query);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
      expect(prisma.clothingItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply category filter', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const query = new ClothingQueryDto();
      query.categoryId = 'cat-1';

      await service.findAll(query);

      const callArgs = prisma.clothingItem.findMany.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('AND');
      const andConditions = callArgs.where.AND;
      expect(andConditions).toEqual(
        expect.arrayContaining([
          { isActive: true },
          { categoryId: 'cat-1' },
        ]),
      );
    });

    it('should apply price range filter', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const query = new ClothingQueryDto();
      query.minPrice = 50;
      query.maxPrice = 200;

      await service.findAll(query);

      const callArgs = prisma.clothingItem.findMany.mock.calls[0][0];
      const andConditions = callArgs.where.AND;
      const priceCondition = andConditions.find(
        (c: Record<string, unknown>) => 'price' in c,
      );
      expect(priceCondition).toBeDefined();
      expect(priceCondition.price).toBeDefined();
    });

    it('should apply styleTags filter', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const query = new ClothingQueryDto();
      query.styleTags = 'casual,streetwear';

      await service.findAll(query);

      const callArgs = prisma.clothingItem.findMany.mock.calls[0][0];
      const andConditions = callArgs.where.AND;
      const styleCondition = andConditions.find(
        (c: Record<string, unknown>) => 'styleTags' in c,
      );
      expect(styleCondition.styleTags).toEqual({ hasSome: ['casual', 'streetwear'] });
    });

    it('should apply sorting by price ascending', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(0);

      const query = new ClothingQueryDto();
      query.sort = ClothingSortOption.PRICE_ASC;

      await service.findAll(query);

      const callArgs = prisma.clothingItem.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ price: 'asc' });
    });

    it('should calculate totalPages correctly', async () => {
      prisma.clothingItem.findMany.mockResolvedValue([]);
      prisma.clothingItem.count.mockResolvedValue(45);

      const query = new ClothingQueryDto();
      query.limit = 20;

      const result = await service.findAll(query);

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return a clothing item by id', async () => {
      prisma.clothingItem.findUnique.mockResolvedValue(mockClothingItem);

      const result = await service.findOne('item-1');

      expect(result.id).toBe('item-1');
      expect(result.name).toBe('Test T-Shirt');
      expect(prisma.clothingItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        include: expect.objectContaining({
          brand: expect.any(Object),
          category: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      prisma.clothingItem.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategories', () => {
    it('should return flat list when no hierarchy', async () => {
      prisma.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.getCategories();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-1');
      expect(result[0].children).toHaveLength(0);
    });

    it('should build tree structure with parent-child relations', async () => {
      prisma.category.findMany.mockResolvedValue([mockCategory, mockCategoryChild]);

      const result = await service.getCategories();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('cat-2');
    });

    it('should handle orphan categories gracefully', async () => {
      const orphanCategory = {
        id: 'cat-orphan',
        name: 'Orphan',
        nameEn: null,
        slug: 'orphan',
        parentId: 'nonexistent',
        sortOrder: 0,
      };
      prisma.category.findMany.mockResolvedValue([orphanCategory]);

      const result = await service.getCategories();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-orphan');
    });
  });

  describe('getBrands', () => {
    it('should return all brands', async () => {
      prisma.brand.findMany.mockResolvedValue([mockBrand]);

      const result = await service.getBrands();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Brand');
    });
  });

  describe('create', () => {
    it('should create a clothing item', async () => {
      const dto: CreateClothingDto = {
        name: 'New Item',
        brandId: 'brand-1',
        categoryId: 'cat-1',
        price: 199,
        gender: 'male',
        seasons: ['summer'],
        styleTags: ['casual'],
        colors: ['blue'],
        materials: ['cotton'],
      };

      prisma.clothingItem.create.mockResolvedValue(mockClothingItem);

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(prisma.clothingItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Item',
            brandId: 'brand-1',
          }),
        }),
      );
    });

    it('should set default values for optional arrays', async () => {
      const dto: CreateClothingDto = {
        name: 'Minimal Item',
      };

      prisma.clothingItem.create.mockResolvedValue(mockClothingItem);

      await service.create(dto);

      const createCall = prisma.clothingItem.create.mock.calls[0][0];
      expect(createCall.data.seasons).toEqual([]);
      expect(createCall.data.occasions).toEqual([]);
      expect(createCall.data.styleTags).toEqual([]);
      expect(createCall.data.colors).toEqual([]);
      expect(createCall.data.materials).toEqual([]);
      expect(createCall.data.imageUrls).toEqual([]);
    });
  });

  describe('getRecommendations', () => {
    it('should return items matching user style tags', async () => {
      prisma.userStylePreference.findFirst.mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        styleTags: ['casual', 'streetwear'],
        occasionTags: [],
        colorPreferences: [],
        budgetRange: null,
        createdAt: new Date(),
      });
      prisma.clothingItem.findMany.mockResolvedValue([mockClothingItem]);
      prisma.clothingItem.count.mockResolvedValue(1);

      const result = await service.getRecommendations('user-1', 1, 1);

      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should fall back to popular items when user has no preferences', async () => {
      prisma.userStylePreference.findFirst.mockResolvedValue(null);
      prisma.clothingItem.findMany.mockResolvedValue([mockClothingItem]);
      prisma.clothingItem.count.mockResolvedValue(1);

      const result = await service.getRecommendations('user-1');

      expect(result.items).toHaveLength(1);
    });

    it('should fall back to popular items when style tags are empty', async () => {
      prisma.userStylePreference.findFirst.mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        styleTags: [],
        occasionTags: [],
        colorPreferences: [],
        budgetRange: null,
        createdAt: new Date(),
      });
      prisma.clothingItem.findMany.mockResolvedValue([mockClothingItem]);
      prisma.clothingItem.count.mockResolvedValue(1);

      const result = await service.getRecommendations('user-1');

      expect(result.items).toHaveLength(1);
    });

    it('should supplement with popular items when style-matched items are insufficient', async () => {
      prisma.userStylePreference.findFirst.mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        styleTags: ['casual'],
        occasionTags: [],
        colorPreferences: [],
        budgetRange: null,
        createdAt: new Date(),
      });

      const styleItem = { ...mockClothingItem, id: 'style-item' };
      const popularItem = { ...mockClothingItem, id: 'popular-item' };

      prisma.clothingItem.findMany
        .mockResolvedValueOnce([styleItem])
        .mockResolvedValueOnce([popularItem]);
      prisma.clothingItem.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await service.getRecommendations('user-1', 1, 20);

      expect(result.items).toHaveLength(2);
    });
  });
});
