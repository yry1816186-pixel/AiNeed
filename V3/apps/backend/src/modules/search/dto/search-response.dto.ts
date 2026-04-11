import { ApiProperty } from '@nestjs/swagger';

export interface ClothingSearchResult {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  imageUrls: string[];
  colors: string[];
  styleTags: string[];
  brandName: string | null;
  purchaseUrl: string | null;
}

export interface PostSearchResult {
  id: string;
  title: string | null;
  content: string;
  imageUrls: string[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  userId: string;
  userNickname: string | null;
  userAvatarUrl: string | null;
}

export interface UserSearchResult {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  gender: string | null;
}

export interface SearchFilters {
  colors: string[];
  styles: string[];
  priceRange: string | null;
  brands: string[];
}

export interface SearchPagination {
  page: number;
  limit: number;
}

export interface SearchResult {
  clothing: ClothingSearchResult[];
  posts: PostSearchResult[];
  users: UserSearchResult[];
  total: number;
}

export class SearchResponseDto {
  @ApiProperty()
  clothing: ClothingSearchResult[] = [];

  @ApiProperty()
  posts: PostSearchResult[] = [];

  @ApiProperty()
  users: UserSearchResult[] = [];

  @ApiProperty()
  total: number = 0;
}

export interface SuggestionItem {
  text: string;
  type: string;
  count: number;
}

export class SuggestResponseDto {
  @ApiProperty()
  suggestions: SuggestionItem[] = [];
}

export interface HotKeywordItem {
  text: string;
  heat: number;
}

export class HotKeywordsResponseDto {
  @ApiProperty()
  keywords: HotKeywordItem[] = [];
}

export interface SearchHistoryItem {
  id: string;
  keyword: string;
  searchedAt: Date;
}

export class SearchHistoryResponseDto {
  @ApiProperty()
  items: SearchHistoryItem[] = [];
}
