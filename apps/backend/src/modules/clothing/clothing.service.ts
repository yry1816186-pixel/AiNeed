import { Injectable } from "@nestjs/common";
import { ClothingCategory, Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import {
  PaginatedResponse,
  createPaginatedResponse,
  normalizePaginationParams,
} from "../../common/types/api-response.types";
import { CacheKeyBuilder, CACHE_TTL } from "../cache/cache.constants";
import { CacheService } from "../cache/cache.service";

interface BrandSummary {
  id: string;
  name: string;
  logo: string | null;
}

export interface ClothingItemResponse {
  id: string;
  name: string;
  brandId: string | null;
  brand: BrandSummary | null;
  category: ClothingCategory;
  price: number;
  originalPrice: number | null;
  currency: string;
  description: string | null;
  mainImage: string | null;
  images: string[];
  colors: string[];
  sizes: string[];
  tags: string[];
  viewCount: number;
  likeCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type ClothingItemSelect = {
  id: true;
  name: true;
  brandId: true;
  category: true;
  price: true;
  originalPrice: true;
  currency: true;
  description: true;
  mainImage: true;
  images: true;
  colors: true;
  sizes: true;
  tags: true;
  viewCount: true;
  likeCount: true;
  isActive: true;
  createdAt: true;
  updatedAt: true;
};

type BrandSelect = {
  id: true;
  name: true;
  logo: true;
};

type ClothingItemWithBrandPartial = Prisma.ClothingItemGetPayload<{
  select: ClothingItemSelect & { brand: { select: BrandSelect } };
}>;

type ClothingItemWithBrandFull = Prisma.ClothingItemGetPayload<{ select: ClothingItemSelect & { brand: true } }>;

function normalizeClothingItem(item: ClothingItemWithBrandPartial | ClothingItemWithBrandFull | null): ClothingItemResponse | null {
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    brandId: item.brandId,
    brand: item.brand ? {
      id: item.brand.id,
      name: item.brand.name,
      logo: item.brand.logo,
    } : null,
    category: item.category,
    price: typeof item.price === 'object' ? parseFloat(item.price.toString()) : item.price,
    originalPrice: item.originalPrice ? (typeof item.originalPrice === 'object' ? parseFloat(item.originalPrice.toString()) : item.originalPrice) : null,
    currency: item.currency,
    description: item.description,
    mainImage: item.mainImage || (item.images?.[0] ?? null),
    images: item.images || [],
    colors: item.colors || [],
    sizes: item.sizes || [],
    tags: item.tags || [],
    viewCount: item.viewCount || 0,
    likeCount: item.likeCount || 0,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeClothingItems(items: (ClothingItemWithBrandPartial | ClothingItemWithBrandFull)[]): ClothingItemResponse[] {
  return items.map(normalizeClothingItem).filter((item): item is ClothingItemResponse => item !== null);
}

@Injectable()
export class ClothingService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getItems(params: {
    category?: ClothingCategory;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    colors?: string[];
    sizes?: string[];
    tags?: string[];
    page?: number;
    pageSize?: number;
    limit?: number;
    sortBy?: "price" | "createdAt" | "viewCount" | "likeCount";
    sortOrder?: "asc" | "desc";
  }): Promise<PaginatedResponse<ClothingItemResponse>> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = normalizePaginationParams(params);

    const {
      category,
      brandId,
      minPrice,
      maxPrice,
      colors,
      sizes,
      tags,
    } = params;

    const cacheKey = CacheKeyBuilder.clothingList({
      category,
      brandId,
      minPrice,
      maxPrice,
      colors,
      sizes,
      tags,
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    const cachedList = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: Prisma.ClothingItemWhereInput = { isActive: true, isDeleted: false };

        if (category) {where.category = category;}
        if (brandId) {where.brandId = brandId;}
        if (minPrice !== undefined || maxPrice !== undefined) {
          where.price = {};
          if (minPrice !== undefined) {where.price.gte = minPrice;}
          if (maxPrice !== undefined) {where.price.lte = maxPrice;}
        }
        if (colors && colors.length > 0) {
          where.colors = { hasSome: colors };
        }
        if (sizes && sizes.length > 0) {
          where.sizes = { hasSome: sizes };
        }
        if (tags && tags.length > 0) {
          where.tags = { hasSome: tags };
        }

        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
          this.prisma.clothingItem.findMany({
            where,
            select: {
              id: true,
              name: true,
              brandId: true,
              category: true,
              price: true,
              originalPrice: true,
              currency: true,
              description: true,
              mainImage: true,
              images: true,
              colors: true,
              sizes: true,
              tags: true,
              viewCount: true,
              likeCount: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              brand: {
                select: { id: true, name: true, logo: true },
              },
            },
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: pageSize,
          }),
          this.prisma.clothingItem.count({ where }),
        ]);

        return createPaginatedResponse(normalizeClothingItems(items), total, page, pageSize);
      },
      CACHE_TTL.CLOTHING_LIST,
    );

    return (
      cachedList ??
      createPaginatedResponse([], 0, page, pageSize)
    );
  }

  async getItemById(id: string) {
    const cacheKey = CacheKeyBuilder.clothingDetail(id);

    const item = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.clothingItem.findFirst({
          where: { id, isDeleted: false },
          select: {
            id: true,
            name: true,
            brandId: true,
            category: true,
            price: true,
            originalPrice: true,
            currency: true,
            description: true,
            mainImage: true,
            images: true,
            colors: true,
            sizes: true,
            tags: true,
            viewCount: true,
            likeCount: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            brand: true,
          },
        });
      },
      CACHE_TTL.CLOTHING_DETAIL,
    );

    if (item) {
      // 异步更新浏览计数，不阻塞响应
      this.prisma.clothingItem
        .update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        })
        .catch(() => {});
    }

    return normalizeClothingItem(item);
  }

  async getFeaturedItems(pageSize: number = 10) {
    const cacheKey = CacheKeyBuilder.clothingFeatured(pageSize);

    const featuredItems = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.clothingItem.findMany({
          where: { isActive: true, isFeatured: true, isDeleted: false },
          select: {
            id: true,
            name: true,
            brandId: true,
            category: true,
            price: true,
            originalPrice: true,
            currency: true,
            description: true,
            mainImage: true,
            images: true,
            colors: true,
            sizes: true,
            tags: true,
            viewCount: true,
            likeCount: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            brand: true,
          },
          take: pageSize,
          orderBy: { createdAt: "desc" },
        });
      },
      CACHE_TTL.CLOTHING_FEATURED,
    );

    return normalizeClothingItems(featuredItems ?? []);
  }

  async getCategories(): Promise<string[]> {
    return Object.values(ClothingCategory);
  }

  async getPopularTags(pageSize: number = 20): Promise<string[]> {
    // 严格验证 pageSize 防止 SQL 注入：确保为 1-100 之间的整数
    const safeLimit = Math.min(Math.max(Number(pageSize) || 20, 1), 100);

    const cacheKey = CacheKeyBuilder.clothingTags(safeLimit);

    const popularTags = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await this.prisma.$queryRaw<
          { tag: string; count: bigint }[]
        >`
          SELECT unnest(tags) as tag, COUNT(*) as count
          FROM "ClothingItem"
          WHERE "isActive" = true AND "isDeleted" = false
          GROUP BY tag
          ORDER BY count DESC
          LIMIT ${safeLimit}
        `;
        return result.map((r: { tag: string; count: bigint }) => r.tag);
      },
      CACHE_TTL.CLOTHING_TAGS,
    );

    return popularTags ?? [];
  }
}
