import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ISearchProvider, IndexableDocument } from './search-provider.interface';
import {
  SearchResult,
  SearchFilters,
  SearchPagination,
  SuggestionItem,
  ClothingSearchResult,
  PostSearchResult,
  UserSearchResult,
} from '../dto/search-response.dto';
import { SearchType } from '../dto/search-query.dto';

type ClothingItemWithBrand = {
  id: string;
  name: string;
  description: string | null;
  price: { toNumber: () => number } | null;
  originalPrice: { toNumber: () => number } | null;
  currency: string;
  imageUrls: string[];
  colors: string[];
  styleTags: string[];
  purchaseUrl: string | null;
  brand: { name: string } | null;
};

type PostWithUser = {
  id: string;
  title: string | null;
  content: string;
  imageUrls: string[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  user: { id: string; nickname: string | null; avatarUrl: string | null };
};

type UserSearchRow = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  gender: string | null;
};

@Injectable()
export class DatabaseProvider implements ISearchProvider {
  private readonly logger = new Logger(DatabaseProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async isAvailable(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async search(
    query: string,
    type: SearchType,
    filters: SearchFilters,
    pagination: SearchPagination,
  ): Promise<SearchResult> {
    const result: SearchResult = { clothing: [], posts: [], users: [], total: 0 };

    if (type === SearchType.ALL || type === SearchType.CLOTHING) {
      const clothingResult = await this.searchClothing(query, filters, pagination);
      result.clothing = clothingResult.items;
      result.total += clothingResult.total;
    }

    if (type === SearchType.ALL || type === SearchType.POSTS) {
      const postsResult = await this.searchPosts(query, pagination);
      result.posts = postsResult.items;
      result.total += postsResult.total;
    }

    if (type === SearchType.ALL || type === SearchType.USERS) {
      const usersResult = await this.searchUsers(query, pagination);
      result.users = usersResult.items;
      result.total += usersResult.total;
    }

    return result;
  }

  private buildClothingWhere(query: string, filters: SearchFilters) {
    const where: Record<string, unknown> = {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { styleTags: { hasSome: [query] } },
      ],
    };

    const andConditions: Record<string, unknown>[] = [];

    if (filters.colors.length > 0) {
      andConditions.push({ colors: { hasSome: filters.colors } });
    }
    if (filters.styles.length > 0) {
      andConditions.push({ styleTags: { hasSome: filters.styles } });
    }
    if (filters.brands.length > 0) {
      andConditions.push({
        brand: { name: { in: filters.brands } },
      });
    }
    if (filters.priceRange) {
      const range = this.parsePriceRange(filters.priceRange);
      if (range) {
        andConditions.push({
          price: { gte: range.gte, lte: range.lte },
        });
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return where;
  }

  private parsePriceRange(priceRange: string): { gte: number; lte: number } | null {
    const parts = priceRange.split('-');
    if (parts.length !== 2) return null;

    const min = parseFloat(parts[0]);
    const max = parseFloat(parts[1]);

    if (Number.isNaN(min) || Number.isNaN(max)) return null;

    return { gte: min, lte: max };
  }

  private async searchClothing(
    query: string,
    filters: SearchFilters,
    pagination: SearchPagination,
  ): Promise<{ items: ClothingSearchResult[]; total: number }> {
    try {
      const where = this.buildClothingWhere(query, filters);
      const skip = (pagination.page - 1) * pagination.limit;

      const [rows, total] = await Promise.all([
        this.prisma.clothingItem.findMany({
          where,
          skip,
          take: pagination.limit,
          include: { brand: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.clothingItem.count({ where }),
      ]);

      const items: ClothingSearchResult[] = (rows as ClothingItemWithBrand[]).map(
        (item: ClothingItemWithBrand) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price ? item.price.toNumber() : null,
          originalPrice: item.originalPrice ? item.originalPrice.toNumber() : null,
          currency: item.currency,
          imageUrls: item.imageUrls,
          colors: item.colors,
          styleTags: item.styleTags,
          brandName: item.brand?.name ?? null,
          purchaseUrl: item.purchaseUrl,
        }),
      );

      return { items, total };
    } catch (error) {
      this.logger.warn(`Database clothing search failed: ${String(error)}`);
      return { items: [], total: 0 };
    }
  }

  private async searchPosts(
    query: string,
    pagination: SearchPagination,
  ): Promise<{ items: PostSearchResult[]; total: number }> {
    try {
      const where = {
        status: 'published',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } },
        ],
      };

      const skip = (pagination.page - 1) * pagination.limit;

      const [rows, total] = await Promise.all([
        this.prisma.communityPost.findMany({
          where,
          skip,
          take: pagination.limit,
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.communityPost.count({ where }),
      ]);

      const items: PostSearchResult[] = (rows as PostWithUser[]).map(
        (item: PostWithUser) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          imageUrls: item.imageUrls,
          tags: item.tags,
          likesCount: item.likesCount,
          commentsCount: item.commentsCount,
          userId: item.user.id,
          userNickname: item.user.nickname,
          userAvatarUrl: item.user.avatarUrl,
        }),
      );

      return { items, total };
    } catch (error) {
      this.logger.warn(`Database posts search failed: ${String(error)}`);
      return { items: [], total: 0 };
    }
  }

  private async searchUsers(
    query: string,
    pagination: SearchPagination,
  ): Promise<{ items: UserSearchResult[]; total: number }> {
    try {
      const where = {
        OR: [
          { nickname: { contains: query, mode: 'insensitive' } },
        ],
      };

      const skip = (pagination.page - 1) * pagination.limit;

      const [rows, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: pagination.limit,
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            gender: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      const items: UserSearchResult[] = (rows as UserSearchRow[]).map(
        (item: UserSearchRow) => ({
          id: item.id,
          nickname: item.nickname,
          avatarUrl: item.avatarUrl,
          gender: item.gender,
        }),
      );

      return { items, total };
    } catch (error) {
      this.logger.warn(`Database users search failed: ${String(error)}`);
      return { items: [], total: 0 };
    }
  }

  async suggest(prefix: string, limit: number): Promise<SuggestionItem[]> {
    try {
      const clothingItems = await this.prisma.clothingItem.findMany({
        where: {
          isActive: true,
          name: { contains: prefix, mode: 'insensitive' },
        },
        select: { name: true },
        take: limit,
        distinct: ['name'],
      });

      return clothingItems.map((item: { name: string }) => ({
        text: item.name,
        type: 'clothing',
        count: 0,
      }));
    } catch (error) {
      this.logger.warn(`Database suggest failed: ${String(error)}`);
      return [];
    }
  }

  async index(_document: IndexableDocument): Promise<void> {
    this.logger.debug('DatabaseProvider.index is a no-op; data is already in PostgreSQL');
  }

  async removeFromIndex(_id: string, _type: 'clothing' | 'posts'): Promise<void> {
    this.logger.debug('DatabaseProvider.removeFromIndex is a no-op; data is managed by PostgreSQL');
  }
}

export const DATABASE_PROVIDER = {
  provide: 'DATABASE_SEARCH_PROVIDER',
  useClass: DatabaseProvider,
};
