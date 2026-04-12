import { Test, TestingModule } from '@nestjs/testing';
import { DesignMarketController } from '../design-market.controller';
import { DesignMarketService } from '../design-market.service';
import { MarketSortOption } from '../dto/list-designs-query.dto';
import { ReportReason } from '../dto/report-design.dto';

describe('DesignMarketController', () => {
  let controller: DesignMarketController;

  const mockService = {
    listDesigns: jest.fn(),
    getDesignDetail: jest.fn(),
    toggleLike: jest.fn(),
    reportDesign: jest.fn(),
    downloadDesign: jest.fn(),
    publishDesign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DesignMarketController],
      providers: [
        {
          provide: DesignMarketService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DesignMarketController>(DesignMarketController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listDesigns', () => {
    it('should call service.listDesigns with query params', async () => {
      const query = { sort: MarketSortOption.NEWEST, page: 1, limit: 20 };
      const expected = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      mockService.listDesigns.mockResolvedValue(expected);

      const result = await controller.listDesigns(query);

      expect(result).toEqual(expected);
      expect(mockService.listDesigns).toHaveBeenCalledWith(query, undefined);
    });

    it('should pass userId when available', async () => {
      const query = { sort: MarketSortOption.POPULAR };
      mockService.listDesigns.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.listDesigns(query, 'user-001');

      expect(mockService.listDesigns).toHaveBeenCalledWith(query, 'user-001');
    });
  });

  describe('getDesignDetail', () => {
    it('should call service.getDesignDetail with id', async () => {
      const expected = { id: 'design-001', name: 'Test' };
      mockService.getDesignDetail.mockResolvedValue(expected);

      const result = await controller.getDesignDetail('design-001');

      expect(result).toEqual(expected);
      expect(mockService.getDesignDetail).toHaveBeenCalledWith(
        'design-001',
        undefined,
      );
    });

    it('should pass userId when available', async () => {
      mockService.getDesignDetail.mockResolvedValue({ id: 'design-001' });

      await controller.getDesignDetail('design-001', 'user-001');

      expect(mockService.getDesignDetail).toHaveBeenCalledWith(
        'design-001',
        'user-001',
      );
    });
  });

  describe('toggleLike', () => {
    it('should call service.toggleLike with userId and designId', async () => {
      const expected = { isLiked: true, likesCount: 11 };
      mockService.toggleLike.mockResolvedValue(expected);

      const result = await controller.toggleLike('user-001', 'design-001');

      expect(result).toEqual(expected);
      expect(mockService.toggleLike).toHaveBeenCalledWith(
        'design-001',
        'user-001',
      );
    });
  });

  describe('reportDesign', () => {
    it('should call service.reportDesign with correct params', async () => {
      const dto = { reason: ReportReason.SPAM, description: 'Spam content' };
      const expected = {
        reportId: 'report-001',
        status: 'pending',
        reviewResult: null,
      };
      mockService.reportDesign.mockResolvedValue(expected);

      const result = await controller.reportDesign(
        'user-001',
        'design-001',
        dto,
      );

      expect(result).toEqual(expected);
      expect(mockService.reportDesign).toHaveBeenCalledWith(
        'design-001',
        'user-001',
        dto,
      );
    });
  });

  describe('downloadDesign', () => {
    it('should call service.downloadDesign with userId and designId', async () => {
      const expected = {
        designData: {},
        patternImageUrl: null,
        downloadsCount: 6,
      };
      mockService.downloadDesign.mockResolvedValue(expected);

      const result = await controller.downloadDesign('user-001', 'design-001');

      expect(result).toEqual(expected);
      expect(mockService.downloadDesign).toHaveBeenCalledWith(
        'design-001',
        'user-001',
      );
    });
  });

  describe('publishDesign', () => {
    it('should call service.publishDesign with userId and designId', async () => {
      const expected = {
        designId: 'design-001',
        status: 'published',
        reviewResult: null,
      };
      mockService.publishDesign.mockResolvedValue(expected);

      const result = await controller.publishDesign('user-001', 'design-001');

      expect(result).toEqual(expected);
      expect(mockService.publishDesign).toHaveBeenCalledWith(
        'design-001',
        'user-001',
      );
    });
  });
});
