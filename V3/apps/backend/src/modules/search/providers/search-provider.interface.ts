import {
  SearchResult,
  SearchFilters,
  SearchPagination,
  SuggestionItem,
} from '../dto/search-response.dto';
import { SearchType } from '../dto/search-query.dto';

export interface IndexableDocument {
  id: string;
  type: 'clothing' | 'posts';
  data: Record<string, unknown>;
}

export interface ISearchProvider {
  search(
    query: string,
    type: SearchType,
    filters: SearchFilters,
    pagination: SearchPagination,
  ): Promise<SearchResult>;

  suggest(prefix: string, limit: number): Promise<SuggestionItem[]>;

  index(document: IndexableDocument): Promise<void>;

  removeFromIndex(id: string, type: 'clothing' | 'posts'): Promise<void>;

  isAvailable(): Promise<boolean>;
}

export const SEARCH_PROVIDER = 'SEARCH_PROVIDER';
