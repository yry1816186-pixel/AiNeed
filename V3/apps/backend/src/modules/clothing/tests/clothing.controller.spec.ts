import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClothingController } from '../clothing.controller';
import { ClothingService } from '../clothing.service';
import { ClothingQueryDto, ClothingSortOption } from '../dto/clothing-query.dto';
import { CreateClothingDto } from '../dto/create-clothing.dto';

const mockClothingResponse = {
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

describe('ClothingController', () => {
  let controller: ClothingController;
  let service: ClothingService;

  const mockClothingService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getCategories: jest.fn(),
    getBrands: jest.fn(),
    create: jest.fn(),
    getRecommendations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClothingController],
      providers: [
        {
          provide: ClothingService,
          useValue: mockClothingService,
        },
      ],
    }).compile();

    controller = module.get<ClothingController>(ClothingController);
    service = module.get<ClothingService>(ClothingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with query params', async () => {
      const paginatedResult = {
        items: [mockClothingResponse],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockClothingService.findAll.mockResolvedValue(paginatedResult);

      const query = new ClothingQueryDto();
      query.page = 1;
      query.limit = 20;
      query.sort = ClothingSortOption.NEWEST;

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      mockClothingService.findOne.mockResolvedValue(mockClothingResponse);

      const result = await controller.findOne('item-1');

      expect(service.findOne).toHaveBeenCalledWith('item-1');
      expect(result).toEqual(mockClothingResponse);
    });

    it('should propagate NotFoundException', async () => {
      mockClothingService.findOne.mockRejectedValue(
        new NotFoundException('Clothing item with id nonexistent not found'),
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategories', () => {
    it('should call service.getCategories', async () => {
      const categories = [
        {
          id: 'cat-1',
          name: 'T-Shirts',
          nameEn: null,
          slug: 't-shirts',
          parentId: null,
          sortOrder: 0,
          children: [],
        },
      ];
      mockClothingService.getCategories.mockResolvedValue(categories);

      const result = await controller.getCategories();

      expect(service.getCategories).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });
  });

  describe('getBrands', () => {
    it('should call service.getBrands', async () => {
      const brands = [
        { id: 'brand-1', name: 'Test Brand', logoUrl: null, description: null },
      ];
      mockClothingService.getBrands.mockResolvedValue(brands);

      const result = await controller.getBrands();

      expect(service.getBrands).toHaveBeenCalled();
      expect(result).toEqual(brands);
    });
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const dto: CreateClothingDto = {
        name: 'New Item',
        brandId: 'brand-1',
        categoryId: 'cat-1',
        price: 199,
        gender: 'male',
      };
      mockClothingService.create.mockResolvedValue(mockClothingResponse);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockClothingResponse);
    });
  });

  describe('getRecommendations', () => {
    it('should call service.getRecommendations with userId and pagination', async () => {
      const paginatedResult = {
        items: [mockClothingResponse],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockClothingService.getRecommendations.mockResolvedValue(paginatedResult);

      const result = await controller.getRecommendations('user-1', '1', '20');

      expect(service.getRecommendations).toHaveBeenCalledWith('user-1', 1, 20);
      expect(result).toEqual(paginatedResult);
    });

    it('should use default pagination when not provided', async () => {
      const paginatedResult = {
        items: [mockClothingResponse],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockClothingService.getRecommendations.mockResolvedValue(paginatedResult);

      await controller.getRecommendations('user-1');

      expect(service.getRecommendations).toHaveBeenCalledWith('user-1', 1, 20);
    });
  });
});
