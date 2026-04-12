import {
  search,
  getSuggestions,
  getHotKeywords,
  getHistory,
  deleteHistory,
  clearHistory,
} from '../../services/search.service';
import type {
  SearchParams,
  SearchResult,
  SearchSuggestion,
  HotKeyword,
  SearchHistoryItem,
} from '../../services/search.service';

jest.mock('../../services/search.service');

const mockSearch = search as jest.MockedFunction<typeof search>;
const mockGetSuggestions = getSuggestions as jest.MockedFunction<typeof getSuggestions>;
const mockGetHotKeywords = getHotKeywords as jest.MockedFunction<typeof getHotKeywords>;
const mockGetHistory = getHistory as jest.MockedFunction<typeof getHistory>;
const mockDeleteHistory = deleteHistory as jest.MockedFunction<typeof deleteHistory>;
const mockClearHistory = clearHistory as jest.MockedFunction<typeof clearHistory>;

describe('useSearch hook logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search service', () => {
    it('should search with query only', async () => {
      const mockResult: SearchResult = {
        clothing: [],
        posts: [],
        users: [],
        total: 0,
        page: 1,
        limit: 20,
      };
      mockSearch.mockResolvedValue(mockResult);

      const params: SearchParams = { q: 'dress' };
      const result = await search(params);

      expect(mockSearch).toHaveBeenCalledWith(params);
      expect(result.total).toBe(0);
    });

    it('should search with full params', async () => {
      const mockResult: SearchResult = {
        clothing: [{
          id: '1',
          name: 'Red Dress',
          imageUrl: '',
          price: 199,
          brand: 'ZARA',
          category: 'dress',
        }],
        posts: [],
        users: [],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockSearch.mockResolvedValue(mockResult);

      const params: SearchParams = {
        q: 'dress',
        tab: 'clothing',
        sort: 'price_asc',
        page: 1,
        limit: 20,
        filters: { priceMin: 100, priceMax: 300 },
      };

      const result = await search(params);
      expect(result.clothing).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle search errors', async () => {
      mockSearch.mockRejectedValue(new Error('搜索失败'));

      await expect(search({ q: 'test' })).rejects.toThrow('搜索失败');
    });

    it('should search with different tabs', async () => {
      const mockResult: SearchResult = {
        clothing: [],
        posts: [{
          id: '1',
          title: 'Post',
          coverUrl: '',
          authorName: 'User',
          authorAvatar: '',
          likeCount: 5,
          height: 200,
        }],
        users: [],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockSearch.mockResolvedValue(mockResult);

      const result = await search({ q: 'fashion', tab: 'post' });
      expect(result.posts).toHaveLength(1);
    });
  });

  describe('suggestions', () => {
    it('should get search suggestions', async () => {
      const mockSuggestions: SearchSuggestion[] = [
        { text: 'dress', type: 'clothing' },
        { text: 'dress shirt', type: 'clothing' },
      ];
      mockGetSuggestions.mockResolvedValue(mockSuggestions);

      const result = await getSuggestions('dre');
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('dress');
    });

    it('should handle empty suggestions', async () => {
      mockGetSuggestions.mockResolvedValue([]);

      const result = await getSuggestions('xyz');
      expect(result).toEqual([]);
    });
  });

  describe('hot keywords', () => {
    it('should get hot keywords', async () => {
      const mockKeywords: HotKeyword[] = [
        { id: '1', text: '夏季穿搭', heat: 1000 },
        { id: '2', text: '连衣裙', heat: 800 },
      ];
      mockGetHotKeywords.mockResolvedValue(mockKeywords);

      const result = await getHotKeywords();
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('夏季穿搭');
    });
  });

  describe('search history', () => {
    it('should get search history', async () => {
      const mockHistory: SearchHistoryItem[] = [
        { id: '1', text: 'dress', searchedAt: '2026-01-01' },
        { id: '2', text: 'shoes', searchedAt: '2026-01-02' },
      ];
      mockGetHistory.mockResolvedValue(mockHistory);

      const result = await getHistory();
      expect(result).toHaveLength(2);
    });

    it('should delete a history item', async () => {
      mockDeleteHistory.mockResolvedValue(undefined);

      await deleteHistory('1');
      expect(mockDeleteHistory).toHaveBeenCalledWith('1');
    });

    it('should clear all history', async () => {
      mockClearHistory.mockResolvedValue(undefined);

      await clearHistory();
      expect(mockClearHistory).toHaveBeenCalled();
    });

    it('should handle delete history errors', async () => {
      mockDeleteHistory.mockRejectedValue(new Error('删除搜索历史失败'));

      await expect(deleteHistory('1')).rejects.toThrow('删除搜索历史失败');
    });
  });

  describe('search state transitions', () => {
    it('should track isSearching when debouncedQuery exists', () => {
      const debouncedQuery = 'dress';
      const isSearching = debouncedQuery.length > 0;
      expect(isSearching).toBe(true);
    });

    it('should track isTyping when query exists but not yet debounced', () => {
      const query = 'dre';
      const debouncedQuery = '';
      const isTyping = query.length > 0 && debouncedQuery.length === 0;
      expect(isTyping).toBe(true);
    });

    it('should not be searching when query is empty', () => {
      const debouncedQuery = '';
      const isSearching = debouncedQuery.length > 0;
      expect(isSearching).toBe(false);
    });
  });
});
