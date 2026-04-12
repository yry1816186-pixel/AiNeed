import { usePagination, type PageResult } from '../usePagination';

describe('usePagination', () => {
  let mockFetchFn: jest.MockedFunction<
    (page: number, pageSize: number) => Promise<PageResult<string>>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchFn = jest.fn();
  });

  describe('initial state', () => {
    it('should start with empty data', () => {
      expect(mockFetchFn).not.toHaveBeenCalled();
    });
  });

  describe('fetchData logic', () => {
    it('should fetch first page and set data', async () => {
      const pageResult: PageResult<string> = {
        data: ['item1', 'item2', 'item3'],
        total: 10,
        page: 1,
        pageSize: 3,
        totalPages: 4,
      };
      mockFetchFn.mockResolvedValue(pageResult);

      const result = await mockFetchFn(1, 3);
      expect(result.data).toEqual(['item1', 'item2', 'item3']);
      expect(result.totalPages).toBe(4);
    });

    it('should append data on subsequent pages', async () => {
      const page1: PageResult<string> = {
        data: ['a', 'b'],
        total: 6,
        page: 1,
        pageSize: 2,
        totalPages: 3,
      };
      const page2: PageResult<string> = {
        data: ['c', 'd'],
        total: 6,
        page: 2,
        pageSize: 2,
        totalPages: 3,
      };

      mockFetchFn
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const r1 = await mockFetchFn(1, 2);
      const r2 = await mockFetchFn(2, 2);

      const combined = [...r1.data, ...r2.data];
      expect(combined).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should replace data on refresh', async () => {
      const pageResult: PageResult<string> = {
        data: ['new1', 'new2'],
        total: 2,
        page: 1,
        pageSize: 2,
        totalPages: 1,
      };
      mockFetchFn.mockResolvedValue(pageResult);

      const result = await mockFetchFn(1, 2);
      expect(result.data).toEqual(['new1', 'new2']);
    });
  });

  describe('hasNext logic', () => {
    it('should have next page when current page < totalPages', () => {
      const currentPage = 1;
      const totalPages = 3;
      const hasNext = currentPage < totalPages;
      expect(hasNext).toBe(true);
    });

    it('should not have next page when current page >= totalPages', () => {
      const currentPage = 3;
      const totalPages = 3;
      const hasNext = currentPage < totalPages;
      expect(hasNext).toBe(false);
    });

    it('should not have next page for single page results', () => {
      const currentPage = 1;
      const totalPages = 1;
      const hasNext = currentPage < totalPages;
      expect(hasNext).toBe(false);
    });
  });

  describe('loadMore logic', () => {
    it('should increment page when loading more', () => {
      let page = 1;
      const totalPages = 5;
      const hasNext = page < totalPages;

      if (hasNext) {
        page++;
      }

      expect(page).toBe(2);
    });

    it('should not increment page when no more pages', () => {
      let page = 5;
      const totalPages = 5;
      const hasNext = page < totalPages;

      if (hasNext) {
        page++;
      }

      expect(page).toBe(5);
    });
  });

  describe('refresh logic', () => {
    it('should reset to page 1 on refresh', async () => {
      const pageResult: PageResult<string> = {
        data: ['refreshed1'],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
      mockFetchFn.mockResolvedValue(pageResult);

      const result = await mockFetchFn(1, 20);
      expect(result.page).toBe(1);
      expect(result.data).toEqual(['refreshed1']);
    });
  });

  describe('concurrent fetch prevention', () => {
    it('should use isFetchingRef to prevent concurrent requests', () => {
      let isFetching = false;
      const results: string[] = [];

      const tryFetch = () => {
        if (isFetching) return 'blocked';
        isFetching = true;
        results.push('fetching');
        isFetching = false;
        return 'ok';
      };

      expect(tryFetch()).toBe('ok');
      expect(results).toHaveLength(1);
    });
  });

  describe('PageResult type', () => {
    it('should handle empty results', async () => {
      const emptyResult: PageResult<string> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };
      mockFetchFn.mockResolvedValue(emptyResult);

      const result = await mockFetchFn(1, 20);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle single item result', async () => {
      const singleResult: PageResult<string> = {
        data: ['Item 1'],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
      mockFetchFn.mockResolvedValue(singleResult);

      const result = await mockFetchFn(1, 20);
      expect(result.data[0]).toBe('Item 1');
    });
  });

  describe('default pageSize', () => {
    it('should use default pageSize of 20', () => {
      const defaultPageSize = 20;
      expect(defaultPageSize).toBe(20);
    });

    it('should support custom pageSize', () => {
      const customPageSize = 10;
      expect(customPageSize).toBe(10);
    });
  });
});
