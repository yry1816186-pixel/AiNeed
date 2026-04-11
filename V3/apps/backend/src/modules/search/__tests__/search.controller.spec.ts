import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '../search.controller';
import { SearchService } from '../search.service';
import { SearchType, SearchQueryDto } from '../dto/search-query.dto';
import {
  SearchResult,
  SuggestionItem,
  HotKeywordItem,
  SearchHistoryItem,
} from '../dto/search-response.dto';

describe('SearchController', () => {
  let controller: SearchController;
  let service: SearchService;

  const mockSearchResult: SearchResult = {
    clothing: [
      {
        id: '1',
        name: '白色T恤',
        description: '纯棉白色T恤',
        price: 99,
        originalPrice: 199,
        currency: 'CNY',
        imageUrls: [],
        colors: ['白色'],
        styleTags: ['休闲'],
        brandName: null,
        purchaseUrl: null,
      },
    ],
    posts: [],
    users: [],
    total: 1,
  };

  const mockSuggestions: SuggestionItem[] = [
    { text: '白色T恤', type: 'clothing', count: 10 },
  ];

  const mockHotKeywords: HotKeywordItem[] = [
    { text: '休闲', heat: 100 },
    { text: '运动', heat: 80 },
  ];

  const mockHistory: SearchHistoryItem[] = [
    { id: 'user-1-0', keyword: 'T恤', searchedAt: new Date() },
  ];

  beforeEach(async () => {
    const mockSearchService = {
      search: jest.fn().mockResolvedValue(mockSearchResult),
      suggest: jest.fn().mockResolvedValue(mockSuggestions),
      getHotKeywords: jest.fn().mockResolvedValue(mockHotKeywords),
      getSearchHistory: jest.fn().mockResolvedValue(mockHistory),
      deleteSearchHistory: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should call service.search with correct parameters', async () => {
      const dto = new SearchQueryDto();
      dto.q = '白色T恤';
      dto.type = SearchType.ALL;
      dto.page = 1;
      dto.limit = 20;
      dto.colors = [];
      dto.styles = [];
      dto.priceRange = '';
      dto.brands = [];

      const req = { user: { id: 'user-1' } };

      const result = await controller.search(dto, req);

      expect(service.search).toHaveBeenCalledWith(
        '白色T恤',
        SearchType.ALL,
        { colors: [], styles: [], priceRange: null, brands: [] },
        { page: 1, limit: 20 },
        'user-1',
      );
      expect(result).toEqual(mockSearchResult);
    });

    it('should pass filters correctly', async () => {
      const dto = new SearchQueryDto();
      dto.q = 'T恤';
      dto.type = SearchType.CLOTHING;
      dto.page = 1;
      dto.limit = 10;
      dto.colors = ['白色'];
      dto.styles = ['休闲'];
      dto.priceRange = '0-500';
      dto.brands = ['品牌A'];

      const req = { user: undefined };

      await controller.search(dto, req);

      expect(service.search).toHaveBeenCalledWith(
        'T恤',
        SearchType.CLOTHING,
        { colors: ['白色'], styles: ['休闲'], priceRange: '0-500', brands: ['品牌A'] },
        { page: 1, limit: 10 },
        undefined,
      );
    });

    it('should work without authenticated user', async () => {
      const dto = new SearchQueryDto();
      dto.q = 'T恤';
      dto.type = SearchType.ALL;
      dto.page = 1;
      dto.limit = 20;
      dto.colors = [];
      dto.styles = [];
      dto.priceRange = '';
      dto.brands = [];

      const req = {};

      await controller.search(dto, req);

      expect(service.search).toHaveBeenCalledWith(
        'T恤',
        SearchType.ALL,
        expect.any(Object),
        expect.any(Object),
        undefined,
      );
    });
  });

  describe('suggest', () => {
    it('should call service.suggest with correct parameters', async () => {
      const dto = { q: '白色', limit: 5 };

      const result = await controller.suggest(dto);

      expect(service.suggest).toHaveBeenCalledWith('白色', 5);
      expect(result).toEqual({ suggestions: mockSuggestions });
    });
  });

  describe('hotKeywords', () => {
    it('should call service.getHotKeywords', async () => {
      const result = await controller.hotKeywords();

      expect(service.getHotKeywords).toHaveBeenCalled();
      expect(result).toEqual({ keywords: mockHotKeywords });
    });
  });

  describe('history', () => {
    it('should call service.getSearchHistory with user id', async () => {
      const req = { user: { id: 'user-1' } };

      const result = await controller.history(req);

      expect(service.getSearchHistory).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ items: mockHistory });
    });
  });

  describe('deleteHistory', () => {
    it('should call service.deleteSearchHistory with correct parameters', async () => {
      const req = { user: { id: 'user-1' } };

      const result = await controller.deleteHistory('user-1-0', req);

      expect(service.deleteSearchHistory).toHaveBeenCalledWith('user-1', 'user-1-0');
      expect(result).toEqual({ success: true });
    });

    it('should return success false when deletion fails', async () => {
      (service.deleteSearchHistory as jest.Mock).mockResolvedValue(false);

      const req = { user: { id: 'user-1' } };

      const result = await controller.deleteHistory('invalid-id', req);

      expect(result).toEqual({ success: false });
    });
  });
});
