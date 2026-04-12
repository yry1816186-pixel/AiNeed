/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StudiosService } from '../studios.service';
import { StudioSortOption } from '../dto/studio.dto';

const MOCK_USER_ID = 'user-001';
const MOCK_STUDIO_ID = 'studio-001';

function createMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    bespokeStudio: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    bespokeReview: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ...overrides,
  };
}

function createMockStudio(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
    portfolioImages: ['img1.png', 'img2.png'],
    rating: 4.5,
    reviewCount: 10,
    orderCount: 5,
    isVerified: true,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    user: {
      id: MOCK_USER_ID,
      nickname: 'StudioOwner',
      avatarUrl: 'avatar.png',
    },
    ...overrides,
  };
}

function createMockReview(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'review-001',
    orderId: 'order-001',
    userId: 'user-002',
    studioId: MOCK_STUDIO_ID,
    rating: 5,
    content: 'Excellent work',
    images: ['review-img1.png'],
    isAnonymous: false,
    createdAt: new Date('2025-03-01'),
    user: {
      id: 'user-002',
      nickname: 'Reviewer',
      avatarUrl: 'reviewer-avatar.png',
    },
    ...overrides,
  };
}

describe('StudiosService', () => {
  let service: StudiosService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudiosService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<StudiosService>(StudiosService);
  });

  // ---------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated studios with default query', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([studio]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
      expect(result.items[0].id).toBe(MOCK_STUDIO_ID);
      expect(result.items[0].name).toBe('Test Studio');
    });

    it('should use provided page and limit', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(mockPrisma.bespokeStudio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should calculate correct totalPages', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(25);

      const result = await service.findAll({ limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should filter by city', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ city: 'Beijing' });

      const findManyWhere = mockPrisma.bespokeStudio.findMany.mock.calls[0][0].where;
      expect(findManyWhere.AND).toBeDefined();
      const cityCondition = findManyWhere.AND.find(
        (c: Record<string, unknown>) => 'city' in c,
      );
      expect(cityCondition).toEqual({ city: { contains: 'Beijing', mode: 'insensitive' } });
    });

    it('should filter by specialties', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ specialties: 'suit,dress' });

      const findManyWhere = mockPrisma.bespokeStudio.findMany.mock.calls[0][0].where;
      const specCondition = findManyWhere.AND.find(
        (c: Record<string, unknown>) => 'specialties' in c,
      );
      expect(specCondition).toEqual({ specialties: { hasSome: ['suit', 'dress'] } });
    });

    it('should filter by serviceTypes', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ serviceTypes: 'tailored,design' });

      const findManyWhere = mockPrisma.bespokeStudio.findMany.mock.calls[0][0].where;
      const typeCondition = findManyWhere.AND.find(
        (c: Record<string, unknown>) => 'serviceTypes' in c,
      );
      expect(typeCondition).toEqual({ serviceTypes: { hasSome: ['tailored', 'design'] } });
    });

    it('should filter by priceRange', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ priceRange: '3000-8000' });

      const findManyWhere = mockPrisma.bespokeStudio.findMany.mock.calls[0][0].where;
      const priceCondition = findManyWhere.AND.find(
        (c: Record<string, unknown>) => 'priceRange' in c,
      );
      expect(priceCondition).toEqual({ priceRange: '3000-8000' });
    });

    it('should filter by isVerified=true', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ isVerified: true });

      const findManyWhere = mockPrisma.bespokeStudio.findMany.mock.calls[0][0].where;
      const verifiedCondition = findManyWhere.AND.find(
        (c: Record<string, unknown>) => 'isVerified' in c,
      );
      expect(verifiedCondition).toEqual({ isVerified: true });
    });

    it('should filter by isVerified=false', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ isVerified: false });

      const findManyWhere = mockPrisma.bespokeStudio.findMany.mock.calls[0][0].where;
      const verifiedCondition = findManyWhere.AND.find(
        (c: Record<string, unknown>) => 'isVerified' in c,
      );
      expect(verifiedCondition).toEqual({ isVerified: false });
    });

    it('should use only isActive condition when no filters are provided', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({});

      const where = mockPrisma.bespokeStudio.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ isActive: true });
    });

    it('should sort by rating_desc (default)', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({});

      expect(mockPrisma.bespokeStudio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { rating: 'desc' } }),
      );
    });

    it('should sort by review_count_desc', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ sort: StudioSortOption.REVIEW_COUNT_DESC });

      expect(mockPrisma.bespokeStudio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { reviewCount: 'desc' } }),
      );
    });

    it('should sort by order_count_desc', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ sort: StudioSortOption.ORDER_COUNT_DESC });

      expect(mockPrisma.bespokeStudio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { orderCount: 'desc' } }),
      );
    });

    it('should sort by newest', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ sort: StudioSortOption.NEWEST });

      expect(mockPrisma.bespokeStudio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should serialize studio with owner info', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([studio]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items[0].owner).toEqual({
        id: MOCK_USER_ID,
        nickname: 'StudioOwner',
        avatarUrl: 'avatar.png',
      });
    });

    it('should serialize studio with undefined owner when user is null', async () => {
      const studio = createMockStudio({ user: null });
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([studio]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items[0].owner).toBeUndefined();
    });

    it('should convert rating to number', async () => {
      const studio = createMockStudio({ rating: '4.5' });
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([studio]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items[0].rating).toBe(4.5);
    });

    it('should default rating to 0 when null', async () => {
      const studio = createMockStudio({ rating: null });
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([studio]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items[0].rating).toBe(0);
    });

    it('should handle specialties with empty tags after trim', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ specialties: '  ,  ,  ' });

      const findManyWhere = mockPrisma.bespokeStudio.findMany.mock.calls[0][0].where;
      // No specialties condition should be added because tags are empty after filtering
      const specCondition = findManyWhere.AND
        ? findManyWhere.AND.find((c: Record<string, unknown>) => 'specialties' in c)
        : undefined;
      expect(specCondition).toBeUndefined();
    });

    it('should combine multiple filters with AND', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({ city: 'Beijing', priceRange: '3000-8000', isVerified: true });

      const findManyWhere = mockPrisma.bespokeStudio.findMany.mock.calls[0][0].where;
      expect(findManyWhere.AND).toHaveLength(4); // isActive + city + priceRange + isVerified
    });

    it('should include user in findMany query', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      await service.findAll({});

      expect(mockPrisma.bespokeStudio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        }),
      );
    });

    it('should calculate totalPages as 0 when total is 0', async () => {
      mockPrisma.bespokeStudio.findMany.mockResolvedValue([]);
      mockPrisma.bespokeStudio.count.mockResolvedValue(0);

      const result = await service.findAll({ limit: 10 });

      expect(result.meta.totalPages).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------
  describe('findOne', () => {
    it('should return studio detail when found', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);

      const result = await service.findOne(MOCK_STUDIO_ID);

      expect(result.id).toBe(MOCK_STUDIO_ID);
      expect(result.name).toBe('Test Studio');
      expect(result.owner).toEqual({
        id: MOCK_USER_ID,
        nickname: 'StudioOwner',
        avatarUrl: 'avatar.png',
      });
    });

    it('should throw NotFoundException when studio does not exist', async () => {
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include user relation in query', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);

      await service.findOne(MOCK_STUDIO_ID);

      expect(mockPrisma.bespokeStudio.findUnique).toHaveBeenCalledWith({
        where: { id: MOCK_STUDIO_ID },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      });
    });

    it('should return owner with default values when user is null', async () => {
      const studio = createMockStudio({ user: null });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);

      const result = await service.findOne(MOCK_STUDIO_ID);

      expect(result.owner).toEqual({
        id: MOCK_USER_ID,
        nickname: null,
        avatarUrl: null,
      });
    });

    it('should include all studio fields in the response', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);

      const result = await service.findOne(MOCK_STUDIO_ID);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('slug');
      expect(result).toHaveProperty('logoUrl');
      expect(result).toHaveProperty('coverImageUrl');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('specialties');
      expect(result).toHaveProperty('serviceTypes');
      expect(result).toHaveProperty('priceRange');
      expect(result).toHaveProperty('portfolioImages');
      expect(result).toHaveProperty('rating');
      expect(result).toHaveProperty('reviewCount');
      expect(result).toHaveProperty('orderCount');
      expect(result).toHaveProperty('isVerified');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('owner');
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
      logoUrl: 'logo.png',
      coverImageUrl: 'cover.png',
      description: 'A new studio',
      city: 'Shanghai',
      address: '456 Oak St',
      priceRange: '3000-8000',
      portfolioImages: ['port1.png'],
    };

    it('should create a studio successfully', async () => {
      const studio = createMockStudio({
        name: createDto.name,
        slug: createDto.slug,
      });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(null); // slug not taken
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null); // no active studio
      mockPrisma.bespokeStudio.create.mockResolvedValue(studio);

      const result = await service.create(MOCK_USER_ID, createDto);

      expect(result.id).toBe(MOCK_STUDIO_ID);
      expect(result.name).toBe('New Studio');
      expect(mockPrisma.bespokeStudio.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: MOCK_USER_ID,
            name: createDto.name,
            slug: createDto.slug,
          }),
        }),
      );
    });

    it('should throw ConflictException when slug already exists', async () => {
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(createMockStudio());

      await expect(service.create(MOCK_USER_ID, createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when user already has an active studio', async () => {
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(null); // slug available
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(createMockStudio()); // active studio exists

      await expect(service.create(MOCK_USER_ID, createDto)).rejects.toThrow(ConflictException);
    });

    it('should use null for optional fields when not provided', async () => {
      const minimalDto = {
        name: 'Minimal Studio',
        slug: 'minimal-studio',
        specialties: [],
        serviceTypes: [],
      };
      const studio = createMockStudio({
        name: minimalDto.name,
        logoUrl: null,
        coverImageUrl: null,
        description: null,
        city: null,
        address: null,
        priceRange: null,
        portfolioImages: [],
      });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(null);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);
      mockPrisma.bespokeStudio.create.mockResolvedValue(studio);

      await service.create(MOCK_USER_ID, minimalDto);

      expect(mockPrisma.bespokeStudio.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            logoUrl: null,
            coverImageUrl: null,
            description: null,
            city: null,
            address: null,
            priceRange: null,
            portfolioImages: [],
          }),
        }),
      );
    });

    it('should include user relation in create query', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(null);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);
      mockPrisma.bespokeStudio.create.mockResolvedValue(studio);

      await service.create(MOCK_USER_ID, createDto);

      expect(mockPrisma.bespokeStudio.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        }),
      );
    });

    it('should return serialized studio detail with owner', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(null);
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);
      mockPrisma.bespokeStudio.create.mockResolvedValue(studio);

      const result = await service.create(MOCK_USER_ID, createDto);

      expect(result.owner).toEqual({
        id: MOCK_USER_ID,
        nickname: 'StudioOwner',
        avatarUrl: 'avatar.png',
      });
    });
  });

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  describe('update', () => {
    it('should update studio fields successfully', async () => {
      const original = createMockStudio();
      const updated = createMockStudio({ name: 'Updated Studio' });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(original);
      mockPrisma.bespokeStudio.update.mockResolvedValue(updated);

      const result = await service.update(MOCK_USER_ID, MOCK_STUDIO_ID, {
        name: 'Updated Studio',
      });

      expect(result!.name).toBe('Updated Studio');
      expect(mockPrisma.bespokeStudio.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_STUDIO_ID },
          data: { name: 'Updated Studio' },
        }),
      );
    });

    it('should throw NotFoundException when studio does not exist', async () => {
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(null);

      await expect(
        service.update(MOCK_USER_ID, 'non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the studio owner', async () => {
      const studio = createMockStudio({ userId: 'other-user' });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);

      await expect(
        service.update(MOCK_USER_ID, MOCK_STUDIO_ID, { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should only include defined fields in update data', async () => {
      const studio = createMockStudio();
      const updated = createMockStudio({ description: 'New desc', city: 'Shanghai' });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeStudio.update.mockResolvedValue(updated);

      await service.update(MOCK_USER_ID, MOCK_STUDIO_ID, {
        description: 'New desc',
        city: 'Shanghai',
      });

      const updateData = mockPrisma.bespokeStudio.update.mock.calls[0][0].data;
      expect(Object.keys(updateData)).toEqual(['description', 'city']);
    });

    it('should update all fields when all are provided', async () => {
      const studio = createMockStudio();
      const updated = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeStudio.update.mockResolvedValue(updated);

      const fullDto = {
        name: 'Full Update',
        logoUrl: 'new-logo.png',
        coverImageUrl: 'new-cover.png',
        description: 'Updated desc',
        city: 'Shenzhen',
        address: '789 Elm St',
        specialties: ['suit', 'dress', 'coat'],
        serviceTypes: ['tailored', 'fabric'],
        priceRange: '8000+',
        portfolioImages: ['new-img1.png'],
        isActive: false,
      };

      await service.update(MOCK_USER_ID, MOCK_STUDIO_ID, fullDto);

      const updateData = mockPrisma.bespokeStudio.update.mock.calls[0][0].data;
      expect(updateData).toEqual(fullDto);
    });

    it('should update isActive field', async () => {
      const studio = createMockStudio();
      const updated = createMockStudio({ isActive: false });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeStudio.update.mockResolvedValue(updated);

      await service.update(MOCK_USER_ID, MOCK_STUDIO_ID, {
        isActive: false,
      });

      expect(mockPrisma.bespokeStudio.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
    });

    it('should include user relation in update result', async () => {
      const studio = createMockStudio();
      const updated = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeStudio.update.mockResolvedValue(updated);

      await service.update(MOCK_USER_ID, MOCK_STUDIO_ID, { name: 'Updated' });

      expect(mockPrisma.bespokeStudio.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        }),
      );
    });

    it('should return serialized studio detail after update', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeStudio.update.mockResolvedValue(studio);

      const result = await service.update(MOCK_USER_ID, MOCK_STUDIO_ID, { name: 'Updated' });

      expect(result).toHaveProperty('owner');
      expect(result.owner.id).toBe(MOCK_USER_ID);
    });
  });

  // ---------------------------------------------------------------
  // getReviews
  // ---------------------------------------------------------------
  describe('getReviews', () => {
    it('should return paginated reviews for a studio', async () => {
      const studio = createMockStudio();
      const review = createMockReview();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeReview.findMany.mockResolvedValue([review]);
      mockPrisma.bespokeReview.count.mockResolvedValue(1);

      const result = await service.getReviews(MOCK_STUDIO_ID, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should throw NotFoundException when studio does not exist', async () => {
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(null);

      await expect(
        service.getReviews('non-existent', 1, 20),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate correct skip value for pagination', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeReview.findMany.mockResolvedValue([]);
      mockPrisma.bespokeReview.count.mockResolvedValue(0);

      await service.getReviews(MOCK_STUDIO_ID, 3, 10);

      expect(mockPrisma.bespokeReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should use default page and limit when not provided', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeReview.findMany.mockResolvedValue([]);
      mockPrisma.bespokeReview.count.mockResolvedValue(0);

      const result = await service.getReviews(MOCK_STUDIO_ID);

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should serialize non-anonymous review with user info', async () => {
      const studio = createMockStudio();
      const review = createMockReview({ isAnonymous: false });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeReview.findMany.mockResolvedValue([review]);
      mockPrisma.bespokeReview.count.mockResolvedValue(1);

      const result = await service.getReviews(MOCK_STUDIO_ID);

      expect(result.items[0].user).toEqual({
        id: 'user-002',
        nickname: 'Reviewer',
        avatarUrl: 'reviewer-avatar.png',
      });
    });

    it('should serialize anonymous review without user info', async () => {
      const studio = createMockStudio();
      const review = createMockReview({ isAnonymous: true, user: { id: 'user-002', nickname: 'Secret', avatarUrl: null } });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeReview.findMany.mockResolvedValue([review]);
      mockPrisma.bespokeReview.count.mockResolvedValue(1);

      const result = await service.getReviews(MOCK_STUDIO_ID);

      expect(result.items[0].user).toBeUndefined();
    });

    it('should serialize review with null user as undefined user', async () => {
      const studio = createMockStudio();
      const review = createMockReview({ isAnonymous: false, user: null });
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeReview.findMany.mockResolvedValue([review]);
      mockPrisma.bespokeReview.count.mockResolvedValue(1);

      const result = await service.getReviews(MOCK_STUDIO_ID);

      expect(result.items[0].user).toBeUndefined();
    });

    it('should order reviews by createdAt desc', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeReview.findMany.mockResolvedValue([]);
      mockPrisma.bespokeReview.count.mockResolvedValue(0);

      await service.getReviews(MOCK_STUDIO_ID);

      expect(mockPrisma.bespokeReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should include user relation in review query', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeReview.findMany.mockResolvedValue([]);
      mockPrisma.bespokeReview.count.mockResolvedValue(0);

      await service.getReviews(MOCK_STUDIO_ID);

      expect(mockPrisma.bespokeReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        }),
      );
    });

    it('should return empty items array when no reviews exist', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findUnique.mockResolvedValue(studio);
      mockPrisma.bespokeReview.findMany.mockResolvedValue([]);
      mockPrisma.bespokeReview.count.mockResolvedValue(0);

      const result = await service.getReviews(MOCK_STUDIO_ID);

      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // getMyStudio
  // ---------------------------------------------------------------
  describe('getMyStudio', () => {
    it('should return studio for the user when active studio exists', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(studio);

      const result = await service.getMyStudio(MOCK_USER_ID);

      expect(result.id).toBe(MOCK_STUDIO_ID);
      expect(result.name).toBe('Test Studio');
      expect(result.owner).toEqual({
        id: MOCK_USER_ID,
        nickname: 'StudioOwner',
        avatarUrl: 'avatar.png',
      });
    });

    it('should throw NotFoundException when user has no active studio', async () => {
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(null);

      await expect(service.getMyStudio(MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should query for active studio of the current user', async () => {
      const studio = createMockStudio();
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(studio);

      await service.getMyStudio(MOCK_USER_ID);

      expect(mockPrisma.bespokeStudio.findFirst).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID, isActive: true },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      });
    });

    it('should return serialized studio detail', async () => {
      const studio = createMockStudio({ user: null });
      mockPrisma.bespokeStudio.findFirst.mockResolvedValue(studio);

      const result = await service.getMyStudio(MOCK_USER_ID);

      // serializeStudioDetail returns default owner when user is null
      expect(result.owner).toEqual({
        id: MOCK_USER_ID,
        nickname: null,
        avatarUrl: null,
      });
    });
  });
});
