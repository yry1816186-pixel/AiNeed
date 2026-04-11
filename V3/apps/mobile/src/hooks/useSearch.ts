import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  search,
  getSuggestions,
  getHotKeywords,
  getHistory,
  deleteHistory,
  clearHistory,
  type SearchParams,
  type SearchResult,
  type SearchSuggestion,
  type HotKeyword,
  type SearchHistoryItem,
  type SearchTab,
  type SortOption,
  type SearchFilters as SearchFilterValues,
} from '../services/search.service';

const DEBOUNCE_MS = 300;

export function useSearch() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [sort, setSort] = useState<SortOption>('relevance');
  const [filters, setFilters] = useState<SearchFilterValues>({});
  const [page, setPage] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const searchQuery = useQuery<SearchResult, Error>({
    queryKey: ['search', debouncedQuery, activeTab, sort, filters, page],
    queryFn: () =>
      search({
        q: debouncedQuery,
        tab: activeTab,
        sort,
        page,
        limit: 20,
        filters,
      }),
    enabled: debouncedQuery.length > 0,
  });

  const suggestionsQuery = useQuery<SearchSuggestion[], Error>({
    queryKey: ['searchSuggestions', query],
    queryFn: () => getSuggestions(query),
    enabled: query.length > 0 && debouncedQuery.length === 0,
  });

  const hotKeywordsQuery = useQuery<HotKeyword[], Error>({
    queryKey: ['hotKeywords'],
    queryFn: getHotKeywords,
    staleTime: 5 * 60 * 1000,
  });

  const historyQuery = useQuery<SearchHistoryItem[], Error>({
    queryKey: ['searchHistory'],
    queryFn: getHistory,
    staleTime: 30 * 1000,
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: deleteHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: clearHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
    },
  });

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setPage(1);
    setActiveTab('all');
    setSort('relevance');
    setFilters({});
  }, []);

  const handleTabChange = useCallback((tab: SearchTab) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((newFilters: SearchFilterValues) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (searchQuery.data && !searchQuery.isFetchingNextPage) {
      setPage((prev) => prev + 1);
    }
  }, [searchQuery.data, searchQuery.isFetchingNextPage]);

  const isSearching = debouncedQuery.length > 0;
  const isTyping = query.length > 0 && !isSearching;

  return {
    query,
    debouncedQuery,
    activeTab,
    sort,
    filters,
    isSearching,
    isTyping,
    searchResult: searchQuery.data,
    isSearchLoading: searchQuery.isLoading,
    isSearchFetching: searchQuery.isFetching,
    suggestions: suggestionsQuery.data ?? [],
    isSuggestionsLoading: suggestionsQuery.isLoading,
    hotKeywords: hotKeywordsQuery.data ?? [],
    isHotKeywordsLoading: hotKeywordsQuery.isLoading,
    history: historyQuery.data ?? [],
    isHistoryLoading: historyQuery.isLoading,
    handleSearch,
    handleClear,
    handleTabChange,
    handleSortChange,
    handleFilterChange,
    handleLoadMore,
    deleteHistoryItem: deleteHistoryMutation.mutate,
    clearAllHistory: clearHistoryMutation.mutate,
  };
}
