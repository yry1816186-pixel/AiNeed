import { Injectable, Logger } from "@nestjs/common";
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
  mainImage: true;
  colors: true;
  sizes: true;
  tags: true;
  viewCount: true;
  likeCount: true;
  isActive: true;
  createdAt: true;
  updatedAt: true;
};

// 列表查询专用轻量 select（不包含 description/images 等大字段）
type ClothingItemListItemSelect = {
  id: true;
  name: true;
  brandId: true;
  category: true;
  price: true;
  originalPrice: true;
  currency: true;
  mainImage: true;
  colors: true;
  sizes: true;
  viewCount: true;
  likeCount: true;
  isActive: true;
  createdAt: true;
};

type BrandSelect = {
  id: true;
  name: true;
  logo: true;
};

// 详情查询完整 select 类型（包含 description/images/tags 等大字段）
type ClothingItemDetailSelect = {
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

type ClothingItemWithBrandDetail = Prisma.ClothingItemGetPayload<{
  select: ClothingItemDetailSelect & { brand: { select: BrandSelect } };
}>;

// 列表查询轻量类型（不包含 description/images/tags 等大字段）
type ClothingItemListItem = {
  id: string;
  name: string;
  brandId: string | null;
  category: ClothingCategory;
  price: Prisma.Decimal;
  originalPrice: Prisma.Decimal | null;
  currency: string;
  mainImage: string | null;
  colors: string[];
  sizes: string[];
  viewCount: number;
  likeCount: number;
  isActive: boolean;
  createdAt: Date;
  brand?: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
};

function normalizeClothingItem(item: ClothingItemWithBrandDetail | null): ClothingItemResponse | null {
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
    price: typeof item.price === 'object' ? parseFloat(item.price.toString()) : item.price as number,
    originalPrice: item.originalPrice
      ? (typeof item.originalPrice === 'object' ? parseFloat(item.originalPrice.toString()) : item.originalPrice as number)
      : null,
    currency: item.currency,
    description: item.description ?? null,
    mainImage: item.mainImage ?? (item.images?.[0] ?? null),
    images: item.images ?? [],
    colors: item.colors ?? [],
    sizes: item.sizes ?? [],
    tags: item.tags ?? [],
    viewCount: item.viewCount || 0,
    likeCount: item.likeCount || 0,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeClothingListItem(item: ClothingItemListItem): ClothingItemResponse {
  return {
    id: item.id,
    name: item.name,
    brandId: item.brandId,
    brand: item.brand || null,
    category: item.category,
    price: typeof item.price === 'object' ? parseFloat(item.price.toString()) : item.price as number,
    originalPrice: item.originalPrice ? (typeof item.originalPrice === 'object' ? parseFloat(item.originalPrice.toString()) : item.originalPrice as number) : null,
    currency: item.currency,
    description: null, // 列表接口不返回描述
    mainImage: item.mainImage,
    images: [], // 列表接口不返回所有图片
    colors: item.colors || [],
    sizes: item.sizes || [],
    tags: [], // 列表接口不返回标签
    viewCount: item.viewCount || 0,
    likeCount: item.likeCount || 0,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.createdAt, // 使用 createdAt 作为 updatedAt（列表接口不需要精确的更新时间）
  };
}

function normalizeClothingItems(items: ClothingItemWithBrandDetail[]): ClothingItemResponse[] {
  return items.map(normalizeClothingItem).filter((item): item is ClothingItemResponse => item !== null);
}

function normalizeClothingListItems(items: ClothingItemListItem[]): ClothingItemResponse[] {
  return items.map(normalizeClothingListItem);
}

@Injectable()
export class ClothingService {
  private readonly logger = new Logger(ClothingService.name);
  private readonly QUERY_TIMEOUT_MS = 5000; // 5 秒查询超时

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
        return this.executeQueryWithTimeout(
          category,
          brandId,
          minPrice,
          maxPrice,
          colors,
          sizes,
          tags,
          page,
          pageSize,
          sortBy as "price" | "createdAt" | "viewCount" | "likeCount",
          sortOrder as "asc" | "desc"
        );
      },
      CACHE_TTL.CLOTHING_LIST,
    );

    return (
      cachedList ??
      createPaginatedResponse([], 0, page, pageSize)
    );
  }

  /**
   * 执行带超时控制的服装列表查询
   */
  private async executeQueryWithTimeout(
    category?: ClothingCategory,
    brandId?: string,
    minPrice?: number,
    maxPrice?: number,
    colors?: string[],
    sizes?: string[],
    tags?: string[],
    page: number = 1,
    pageSize: number = 20,
    sortBy: "price" | "createdAt" | "viewCount" | "likeCount" = "createdAt",
    sortOrder: "asc" | "desc" = "desc"
  ): Promise<PaginatedResponse<ClothingItemResponse>> {
    const queryStartTime = Date.now();
    this.logger.debug(`开始查询服装列表: page=${page}, pageSize=${pageSize}`);

    // 构建查询条件
    const where: Prisma.ClothingItemWhereInput = { isActive: true, isDeleted: false };

    if (category) { where.category = category; }
    if (brandId) { where.brandId = brandId; }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) { where.price.gte = minPrice; }
      if (maxPrice !== undefined) { where.price.lte = maxPrice; }
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

    // 添加查询超时控制
    const queryPromise = this.performDatabaseQuery(where, skip, pageSize, sortBy, sortOrder);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`服装列表查询超时 (${this.QUERY_TIMEOUT_MS}ms)`));
      }, this.QUERY_TIMEOUT_MS);
    });

    let result;
    try {
      result = await Promise.race([queryPromise, timeoutPromise]);
    } catch (error) {
      this.logger.error(`服装列表查询失败或超时: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }

    const queryDuration = Date.now() - queryStartTime;
    this.logger.log(`服装列表查询完成: 耗时 ${queryDuration}ms`);

    return result;
  }

  /**
   * 执行实际的数据库查询（包含批量 Brand 查询优化）
   */
  private async performDatabaseQuery(
    where: Prisma.ClothingItemWhereInput,
    skip: number,
    take: number,
    sortBy: "price" | "createdAt" | "viewCount" | "likeCount",
    sortOrder: "asc" | "desc"
  ): Promise<PaginatedResponse<ClothingItemResponse>> {
    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        // 使用轻量级 select，不包含 description/images/tags 等大字段
        select: {
          id: true,
          name: true,
          brandId: true,
          category: true,
          price: true,
          originalPrice: true,
          currency: true,
          mainImage: true,
          colors: true,
          sizes: true,
          viewCount: true,
          likeCount: true,
          isActive: true,
          createdAt: true,
          // 延迟加载 brand 信息，避免 N+1 查询
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    // 批量获取 brand 信息（避免 N+1 查询）
    const brandIds = [...new Set(items.map(item => item.brandId).filter(Boolean))] as string[];
    const brandsMap = new Map<string, { id: string; name: string; logo: string | null }>();

    if (brandIds.length > 0) {
      const brands = await this.prisma.brand.findMany({
        where: { id: { in: brandIds } },
        select: { id: true, name: true, logo: true }
      });
      brands.forEach(brand => brandsMap.set(brand.id, brand));
    }

    // 组装结果
    const itemsWithBrand: ClothingItemListItem[] = items.map(item => ({
      ...item,
      brand: item.brandId ? (brandsMap.get(item.brandId) || null) : null
    }));

    return createPaginatedResponse(normalizeClothingListItems(itemsWithBrand), total, Math.floor(skip / take) + 1, take);
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
