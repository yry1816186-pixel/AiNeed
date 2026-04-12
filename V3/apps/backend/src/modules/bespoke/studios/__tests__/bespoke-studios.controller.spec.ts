/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { StudiosController } from '../studios.controller';
import { StudiosService } from '../studios.service';
import { StudioSortOption } from '../dto/studio.dto';

const MOCK_USER_ID = 'user-001';
const MOCK_STUDIO_ID = 'studio-001';

function createMockStudioResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_STUDIO_ID,
    userId: MOCK_USER_ID,
    name: 'Test Studio',
    slug: 'test-studio',
    logoUrl: 'logo.png',
    coverImageUrl: 'cover.png',
    description: 'A test studio',
    city: 'Beijing',
    address: '123 Main St',
    specialties: ['suit', 'dress'],
    serviceTypes: ['tailored'],
    priceRange: '3000-8000',
    portfolioImages: ['img1.png'],
    rating: 4.5,
    reviewCount: 10,
    orderCount: 5,
    isVerified: true,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    owner: {
      id: MOCK_USER_ID,
      nickname: 'StudioOwner',
      avatarUrl: 'avatar.png',
    },
    ...overrides,
  };
}

function createMockService() {
  return {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getReviews: jest.fn(),
    getMyStudio: jest.fn(),
  };
}

describe('StudiosController', () => {
  let controller: StudiosController;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(async () => {
    mockService = createMockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudiosController],
      providers: [
        {
          provide: StudiosService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<StudiosController>(StudiosController);
  });

  // ---------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated studios', async () => {
      const studio = createMockStudioResponse();
      const expectedResult = {
        items: [studio],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(expectedResult);
      expect(mockService.findAll).toHaveBeenCalledWith({});
    });

    it('should pass query parameters to service', async () => {
      mockService.findAll.mockResolvedValue({ items: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });

      const query = {
        page: 2,
        limit: 10,
        city: 'Beijing',
        specialties: 'suit,dress',
        sort: StudioSortOption.NEWEST,
      };

      await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });

    it('should pass all filter parameters to service', async () => {
      mockService.findAll.mockResolvedValue({ items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

      const query = {
        city: 'Shanghai',
        specialties: 'suit',
        serviceTypes: 'tailored',
        priceRange: '3000-8000',
        isVerified: true,
        sort: StudioSortOption.RATING_DESC,
        page: 1,
        limit: 20,
      };

      await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });
  });

  // ---------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------
  describe('findOne', () => {
    it('should return studio detail by id', async () => {
      const studio = createMockStudioResponse();
      mockService.findOne.mockResolvedValue(studio);

      const result = await controller.findOne(MOCK_STUDIO_ID);

      expect(result).toEqual(studio);
      expect(mockService.findOne).toHaveBeenCalledWith(MOCK_STUDIO_ID);
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Studio with id non-existent not found`),
      );

      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------
  // create
  // ---------------------------------------------------------------
  describe('create', () => {
    const createDto = {
      name: 'New Studio',
      slug: 'new-studio',
      specialties: ['suit'],
      serviceTypes: ['tailored'],
    };

    it('should create a studio', async () => {
      const studio = createMockStudioResponse({ name: createDto.name });
      mockService.create.mockResolvedValue(studio);

      const result = await controller.create(MOCK_USER_ID, createDto);

      expect(result.name).toBe('New Studio');
      expect(mockService.create).toHaveBeenCalledWith(MOCK_USER_ID, createDto);
    });

    it('should propagate ConflictException when slug exists', async () => {
      mockService.create.mockRejectedValue(
        new ConflictException('Studio slug "new-studio" already exists'),
      );

      await expect(controller.create(MOCK_USER_ID, createDto)).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  describe('update', () => {
    it('should update a studio', async () => {
      const studio = createMockStudioResponse({ name: 'Updated Studio' });
      mockService.update.mockResolvedValue(studio);

      const result = await controller.update(MOCK_USER_ID, MOCK_STUDIO_ID, {
        name: 'Updated Studio',
      });

      expect(result.name).toBe('Updated Studio');
      expect(mockService.update).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_STUDIO_ID, {
        name: 'Updated Studio',
      });
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(`Studio with id non-existent not found`),
      );

      await expect(
        controller.update(MOCK_USER_ID, 'non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when user is not owner', async () => {
      mockService.update.mockRejectedValue(
        new ForbiddenException('Only the studio owner can update this studio'),
      );

      await expect(
        controller.update('other-user', MOCK_STUDIO_ID, { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------
  // getReviews
  // ---------------------------------------------------------------
  describe('getReviews', () => {
    it('should return reviews with default page and limit', async () => {
      const reviews = {
        items: [
          {
            id: 'review-001',
            orderId: 'order-001',
            userId: 'user-002',
            studioId: MOCK_STUDIO_ID,
            rating: 5,
            content: 'Great work',
            images: [],
            isAnonymous: false,
            createdAt: new Date(),
            user: { id: 'user-002', nickname: 'Reviewer', avatarUrl: null },
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockService.getReviews.mockResolvedValue(reviews);

      const result = await controller.getReviews(MOCK_STUDIO_ID);

      expect(result).toEqual(reviews);
      expect(mockService.getReviews).toHaveBeenCalledWith(MOCK_STUDIO_ID, 1, 20);
    });

    it('should parse page and limit from string query params', async () => {
      mockService.getReviews.mockResolvedValue({
        items: [],
        meta: { total: 0, page: 2, limit: 5, totalPages: 0 },
      });

      await controller.getReviews(MOCK_STUDIO_ID, '2', '5');

      expect(mockService.getReviews).toHaveBeenCalledWith(MOCK_STUDIO_ID, 2, 5);
    });

    it('should use default values when page and limit are undefined', async () => {
      mockService.getReviews.mockResolvedValue({
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.getReviews(MOCK_STUDIO_ID, undefined, undefined);

      expect(mockService.getReviews).toHaveBeenCalledWith(MOCK_STUDIO_ID, 1, 20);
    });

    it('should propagate NotFoundException when studio does not exist', async () => {
      mockService.getReviews.mockRejectedValue(
        new NotFoundException('Studio with id non-existent not found'),
      );

      await expect(controller.getReviews('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------
  // getMyStudio
  // ---------------------------------------------------------------
  describe('getMyStudio', () => {
    it('should return the current user studio', async () => {
      const studio = createMockStudioResponse();
      mockService.getMyStudio.mockResolvedValue(studio);

      const result = await controller.getMyStudio(MOCK_USER_ID);

      expect(result).toEqual(studio);
      expect(mockService.getMyStudio).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should propagate NotFoundException when user has no studio', async () => {
      mockService.getMyStudio.mockRejectedValue(
        new NotFoundException('You do not have an active studio'),
      );

      await expect(controller.getMyStudio(MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
