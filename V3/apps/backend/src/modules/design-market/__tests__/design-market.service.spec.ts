/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DesignMarketService } from '../design-market.service';
import {
  CONTENT_REVIEW_PROVIDER,
  type ReviewResult,
} from '../providers/content-review.interface';
import { MarketSortOption } from '../dto/list-designs-query.dto';
import { ReportReason } from '../dto/report-design.dto';

const MOCK_USER_ID = 'user-001';
const MOCK_DESIGN_ID = 'design-001';

function createMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    customDesign: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    designLike: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    designReport: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    ...overrides,
  };
}

function createMockReviewProvider(
  defaultResult: ReviewResult = {
    verdict: 'approved',
    confidence: 0.95,
    reasons: [],
    categories: [],
  },
) {
  return {
    review: jest.fn().mockResolvedValue(defaultResult),
  };
}

const PUBLISHED_DESIGN = {
  id: MOCK_DESIGN_ID,
  userId: 'user-creator',
  name: 'Test Design',
  designData: { layers: [] },
  patternImageUrl: 'https://example.com/pattern.png',
  previewImageUrl: 'https://example.com/preview.png',
  productType: 'tshirt',
  isPublic: true,
  likesCount: 10,
  downloadsCount: 5,
  tags: ['cute', 'korean'],
  status: 'published',
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: 'user-creator',
    nickname: 'Designer',
    avatarUrl: 'https://example.com/avatar.png',
  },
};

describe('DesignMarketService', () => {
  let service: DesignMarketService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockReviewProvider: ReturnType<typeof createMockReviewProvider>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockReviewProvider = createMockReviewProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignMarketService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CONTENT_REVIEW_PROVIDER,
          useValue: mockReviewProvider,
        },
      ],
    }).compile();

    service = module.get<DesignMarketService>(DesignMarketService);
  });

  describe('listDesigns', () => {
    it('should return paginated published designs', async () => {
      mockPrisma.customDesign.findMany.mockResolvedValue([PUBLISHED_DESIGN]);
      mockPrisma.customDesign.count.mockResolvedValue(1);
      mockPrisma.designLike.findUnique.mockResolvedValue(null);

      const result = await service.listDesigns({
        sort: MarketSortOption.NEWEST,
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockPrisma.customDesign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublic: true,
            status: 'published',
          }),
        }),
      );
    });

    it('should sort by popularity when sort=popular', async () => {
      mockPrisma.customDesign.findMany.mockResolvedValue([]);
      mockPrisma.customDesign.count.mockResolvedValue(0);

      await service.listDesigns({ sort: MarketSortOption.POPULAR });

      expect(mockPrisma.customDesign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { likesCount: 'desc' },
        }),
      );
    });

    it('should filter by product_type', async () => {
      mockPrisma.customDesign.findMany.mockResolvedValue([]);
      mockPrisma.customDesign.count.mockResolvedValue(0);

      await service.listDesigns({ product_type: 'tshirt' });

      expect(mockPrisma.customDesign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ productType: 'tshirt' }),
        }),
      );
    });

    it('should filter by tag', async () => {
      mockPrisma.customDesign.findMany.mockResolvedValue([]);
      mockPrisma.customDesign.count.mockResolvedValue(0);

      await service.listDesigns({ tag: 'cute' });

      expect(mockPrisma.customDesign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tags: { has: 'cute' } }),
        }),
      );
    });

    it('should search by keyword', async () => {
      mockPrisma.customDesign.findMany.mockResolvedValue([]);
      mockPrisma.customDesign.count.mockResolvedValue(0);

      await service.listDesigns({ keyword: 'test' });

      expect(mockPrisma.customDesign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { tags: { has: 'test' } },
            ],
          }),
        }),
      );
    });

    it('should indicate isLiked when user has liked', async () => {
      mockPrisma.customDesign.findMany.mockResolvedValue([PUBLISHED_DESIGN]);
      mockPrisma.customDesign.count.mockResolvedValue(1);
      mockPrisma.designLike.findMany.mockResolvedValue([
        { designId: MOCK_DESIGN_ID },
      ]);

      const result = await service.listDesigns(
        { sort: MarketSortOption.NEWEST },
        MOCK_USER_ID,
      );

      expect(result.items[0].isLiked).toBe(true);
    });
  });

  describe('getDesignDetail', () => {
    it('should return design detail for published design', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(PUBLISHED_DESIGN);
      mockPrisma.designLike.findUnique.mockResolvedValue(null);

      const result = await service.getDesignDetail(
        MOCK_DESIGN_ID,
        MOCK_USER_ID,
      );

      expect(result.id).toBe(MOCK_DESIGN_ID);
      expect(result.isLiked).toBe(false);
      expect((result.designer as Record<string, unknown>).nickname).toBe(
        'Designer',
      );
    });

    it('should throw NotFoundException for non-existent design', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(null);

      await expect(service.getDesignDetail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-published non-public design', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue({
        ...PUBLISHED_DESIGN,
        status: 'draft',
        isPublic: false,
      });

      await expect(service.getDesignDetail(MOCK_DESIGN_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleLike', () => {
    it('should like a design when not previously liked', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(PUBLISHED_DESIGN);
      mockPrisma.designLike.findUnique.mockResolvedValue(null);
      mockPrisma.designLike.create.mockResolvedValue({});
      mockPrisma.customDesign.update.mockResolvedValue({ likesCount: 11 });

      const result = await service.toggleLike(MOCK_DESIGN_ID, MOCK_USER_ID);

      expect(result.isLiked).toBe(true);
      expect(result.likesCount).toBe(11);
      expect(mockPrisma.designLike.create).toHaveBeenCalled();
    });

    it('should unlike a design when previously liked', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(PUBLISHED_DESIGN);
      mockPrisma.designLike.findUnique.mockResolvedValue({
        userId: MOCK_USER_ID,
        designId: MOCK_DESIGN_ID,
      });
      mockPrisma.designLike.delete.mockResolvedValue({});
      mockPrisma.customDesign.update.mockResolvedValue({ likesCount: 9 });

      const result = await service.toggleLike(MOCK_DESIGN_ID, MOCK_USER_ID);

      expect(result.isLiked).toBe(false);
      expect(result.likesCount).toBe(9);
      expect(mockPrisma.designLike.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent design', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleLike('non-existent', MOCK_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-published design', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue({
        ...PUBLISHED_DESIGN,
        status: 'draft',
      });

      await expect(
        service.toggleLike(MOCK_DESIGN_ID, MOCK_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not decrement likesCount below 0', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue({
        ...PUBLISHED_DESIGN,
        likesCount: 0,
      });
      mockPrisma.designLike.findUnique.mockResolvedValue({
        userId: MOCK_USER_ID,
        designId: MOCK_DESIGN_ID,
      });
      mockPrisma.designLike.delete.mockResolvedValue({});
      mockPrisma.customDesign.update.mockResolvedValue({ likesCount: -1 });

      const result = await service.toggleLike(MOCK_DESIGN_ID, MOCK_USER_ID);

      expect(result.likesCount).toBe(0);
    });
  });

  describe('reportDesign', () => {
    it('should create a report and return auto_rejected when review rejects', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(PUBLISHED_DESIGN);
      mockPrisma.designReport.findFirst.mockResolvedValue(null);
      mockReviewProvider.review.mockResolvedValue({
        verdict: 'rejected',
        confidence: 0.92,
        reasons: ['Sensitive content'],
        categories: ['sensitive_content'],
      });
      mockPrisma.designReport.create.mockResolvedValue({ id: 'report-001' });
      mockPrisma.customDesign.update.mockResolvedValue({});

      const result = await service.reportDesign(MOCK_DESIGN_ID, MOCK_USER_ID, {
        reason: ReportReason.INAPPROPRIATE,
        description: 'Bad content',
      });

      expect(result.status).toBe('auto_rejected');
      expect(result.reviewResult).toBeDefined();
      expect(mockPrisma.customDesign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'rejected',
            isPublic: false,
          }),
        }),
      );
    });

    it('should create a pending report when review is suspicious', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(PUBLISHED_DESIGN);
      mockPrisma.designReport.findFirst.mockResolvedValue(null);
      mockReviewProvider.review.mockResolvedValue({
        verdict: 'suspicious',
        confidence: 0.78,
        reasons: ['Potential copyright'],
        categories: ['copyright'],
      });
      mockPrisma.designReport.create.mockResolvedValue({ id: 'report-002' });

      const result = await service.reportDesign(MOCK_DESIGN_ID, MOCK_USER_ID, {
        reason: ReportReason.COPYRIGHT,
      });

      expect(result.status).toBe('pending');
      expect(result.reviewResult).toBeNull();
    });

    it('should throw ConflictException when user already has pending report', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(PUBLISHED_DESIGN);
      mockPrisma.designReport.findFirst.mockResolvedValue({
        id: 'existing-report',
      });

      await expect(
        service.reportDesign(MOCK_DESIGN_ID, MOCK_USER_ID, {
          reason: ReportReason.SPAM,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent design', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(null);

      await expect(
        service.reportDesign('non-existent', MOCK_USER_ID, {
          reason: ReportReason.SPAM,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadDesign', () => {
    it('should return design data and increment downloads count', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(PUBLISHED_DESIGN);
      mockPrisma.customDesign.update.mockResolvedValue({ downloadsCount: 6 });

      const result = await service.downloadDesign(MOCK_DESIGN_ID, MOCK_USER_ID);

      expect(result.designData).toEqual({ layers: [] });
      expect(result.patternImageUrl).toBe('https://example.com/pattern.png');
      expect(result.downloadsCount).toBe(6);
      expect(mockPrisma.customDesign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { downloadsCount: { increment: 1 } },
        }),
      );
    });

    it('should throw NotFoundException for non-existent design', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(null);

      await expect(
        service.downloadDesign('non-existent', MOCK_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-published design', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue({
        ...PUBLISHED_DESIGN,
        status: 'draft',
      });

      await expect(
        service.downloadDesign(MOCK_DESIGN_ID, MOCK_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publishDesign', () => {
    it('should publish design when review approves', async () => {
      const ownDesign = {
        ...PUBLISHED_DESIGN,
        userId: MOCK_USER_ID,
        status: 'draft',
      };
      mockPrisma.customDesign.findUnique.mockResolvedValue(ownDesign);
      mockReviewProvider.review.mockResolvedValue({
        verdict: 'approved',
        confidence: 0.95,
        reasons: [],
        categories: [],
      });
      mockPrisma.customDesign.update.mockResolvedValue({});

      const result = await service.publishDesign(MOCK_DESIGN_ID, MOCK_USER_ID);

      expect(result.status).toBe('published');
      expect(result.reviewResult).toBeNull();
    });

    it('should keep under_review status when review is suspicious', async () => {
      const ownDesign = {
        ...PUBLISHED_DESIGN,
        userId: MOCK_USER_ID,
        status: 'draft',
      };
      mockPrisma.customDesign.findUnique.mockResolvedValue(ownDesign);
      mockReviewProvider.review.mockResolvedValue({
        verdict: 'suspicious',
        confidence: 0.78,
        reasons: ['Potential copyright'],
        categories: ['copyright'],
      });
      mockPrisma.customDesign.update.mockResolvedValue({});

      const result = await service.publishDesign(MOCK_DESIGN_ID, MOCK_USER_ID);

      expect(result.status).toBe('under_review');
      expect(result.reviewResult).toBeDefined();
    });

    it('should reject design when review rejects', async () => {
      const ownDesign = {
        ...PUBLISHED_DESIGN,
        userId: MOCK_USER_ID,
        status: 'draft',
      };
      mockPrisma.customDesign.findUnique.mockResolvedValue(ownDesign);
      mockReviewProvider.review.mockResolvedValue({
        verdict: 'rejected',
        confidence: 0.92,
        reasons: ['Sensitive content'],
        categories: ['sensitive_content'],
      });
      mockPrisma.customDesign.update.mockResolvedValue({});

      const result = await service.publishDesign(MOCK_DESIGN_ID, MOCK_USER_ID);

      expect(result.status).toBe('rejected');
    });

    it('should throw BadRequestException when publishing someone elses design', async () => {
      mockPrisma.customDesign.findUnique.mockResolvedValue(PUBLISHED_DESIGN);

      await expect(
        service.publishDesign(MOCK_DESIGN_ID, MOCK_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when design is already published', async () => {
      const ownDesign = {
        ...PUBLISHED_DESIGN,
        userId: MOCK_USER_ID,
        status: 'published',
      };
      mockPrisma.customDesign.findUnique.mockResolvedValue(ownDesign);

      await expect(
        service.publishDesign(MOCK_DESIGN_ID, MOCK_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when preview image is missing', async () => {
      const ownDesign = {
        ...PUBLISHED_DESIGN,
        userId: MOCK_USER_ID,
        status: 'draft',
        previewImageUrl: null,
      };
      mockPrisma.customDesign.findUnique.mockResolvedValue(ownDesign);

      await expect(
        service.publishDesign(MOCK_DESIGN_ID, MOCK_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
