import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ClothingCategory, Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import {
  PaginatedResponse,
  createPaginatedResponse,
  normalizePaginationParams,
} from "../../common/types/api-response.types";
import { CacheKeyBuilder, CACHE_TTL } from "../cache/cache.constants";
import { CacheService } from "../cache/cache.service";

export interface BrandSummary {
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
            stock: true,
            lowStockThreshold: true,
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

  /**
   * Get subcategories grouped by category.
   */
  async getSubcategories(category?: string) {
    const where: Record<string, unknown> = { isActive: true, isDeleted: false };
    if (category) {
      where.category = category;
    }

    const items = await this.prisma.clothingItem.findMany({
      where: where as never,
      select: { category: true, subcategory: true },
      distinct: ["category", "subcategory"],
    });

    // Single groupBy query instead of N+1 count() per subcategory
    const whereForCount: Prisma.ClothingItemWhereInput = {
      isActive: true,
      isDeleted: false,
      subcategory: { not: null },
      ...(category ? { category } : {}),
    };

    const counts = await this.prisma.clothingItem.groupBy({
      by: ['category', 'subcategory'],
      where: whereForCount,
      _count: { subcategory: true },
    });

    const grouped: Record<string, Array<{ name: string; count: number }>> = {};
    for (const row of counts) {
      const cat = row.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ name: row.subcategory!, count: row._count.subcategory });
    }

    if (category) {
      return grouped[category] ?? [];
    }

    return grouped;
  }

  /**
   * Get outfit recommendations per D-03.
   * Returns 3-5 outfit sets with complementary items.
   */
  async getOutfitRecommendations(itemId: string, limit: number = 5) {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException("商品不存在");
    }

    // Determine complementary categories
    const complementMap: Record<string, string[]> = {
      tops: ["bottoms", "footwear"],
      bottoms: ["tops", "footwear"],
      dresses: ["footwear"],
      outerwear: ["tops", "bottoms"],
      footwear: ["tops", "bottoms"],
    };

    const categories = complementMap[item.category] ?? ["tops", "bottoms"];
    const priceRange = {
      min: Number(item.price) * 0.5,
      max: Number(item.price) * 1.5,
    };

    const outfits = [];
    for (let i = 0; i < limit; i++) {
      const outfitItems: Record<string, unknown> = {};

      for (const cat of categories) {
        const candidates = await this.prisma.clothingItem.findMany({
          where: {
            category: cat as ClothingCategory,
            isActive: true,
            isDeleted: false,
            price: { gte: priceRange.min, lte: priceRange.max },
          },
          include: {
            brand: { select: { id: true, name: true, logo: true } },
          },
          take: 3,
          orderBy: { createdAt: "desc" },
          skip: i * 3,
        });

        if (candidates.length > 0) {
          outfitItems[cat] = candidates[i % candidates.length];
        }
      }

      if (Object.keys(outfitItems).length > 0) {
        outfits.push(outfitItems);
      }
    }

    return outfits;
  }

  async create(userId: string, data: {
    name: string;
    category: ClothingCategory;
    subcategory?: string;
    brandId?: string;
    price: number;
    originalPrice?: number;
    description?: string;
    mainImage?: string;
    images?: string[];
    colors?: string[];
    sizes?: string[];
    tags?: string[];
    externalUrl?: string;
  }) {
    const createData: Prisma.ClothingItemCreateInput = {
      name: data.name,
      category: data.category,
      price: data.price,
      isActive: true,
      isDeleted: false,
      isFeatured: false,
      currency: "CNY",
      ...(data.subcategory !== undefined && { subcategory: data.subcategory }),
      ...(data.brandId !== undefined && {
        brand: { connect: { id: data.brandId } },
      }),
      ...(data.originalPrice !== undefined && { originalPrice: data.originalPrice }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.mainImage !== undefined && { mainImage: data.mainImage }),
      ...(data.images !== undefined && { images: data.images }),
      ...(data.colors !== undefined && { colors: data.colors }),
      ...(data.sizes !== undefined && { sizes: data.sizes }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl }),
    };

    const item = await this.prisma.clothingItem.create({
      data: createData,
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
    });

    this.logger.log(`用户 ${userId} 创建了服装商品: ${item.id}`);
    return normalizeClothingItem(item as unknown as ClothingItemWithBrandDetail);
  }

  async update(id: string, data: {
    name?: string;
    category?: ClothingCategory;
    subcategory?: string;
    brandId?: string;
    price?: number;
    originalPrice?: number;
    description?: string;
    mainImage?: string;
    images?: string[];
    colors?: string[];
    sizes?: string[];
    tags?: string[];
    externalUrl?: string;
  }) {
    const existing = await this.prisma.clothingItem.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException("商品不存在");
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subcategory !== undefined) updateData.subcategory = data.subcategory;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.mainImage !== undefined) updateData.mainImage = data.mainImage;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.colors !== undefined) updateData.colors = data.colors;
    if (data.sizes !== undefined) updateData.sizes = data.sizes;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.externalUrl !== undefined) updateData.externalUrl = data.externalUrl;

    if (data.brandId !== undefined) {
      updateData.brand = { connect: { id: data.brandId } };
    }

    const item = await this.prisma.clothingItem.update({
      where: { id },
      data: updateData,
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
    });

    // Invalidate cache after update
    await Promise.all([
      this.cacheService.del(CacheKeyBuilder.clothingDetail(id)),
      this.cacheService.delPattern("clothing:list"),
    ]);

    this.logger.log(`更新了服装商品: ${id}`);
    return normalizeClothingItem(item as unknown as ClothingItemWithBrandDetail);
  }

  async remove(id: string) {
    const existing = await this.prisma.clothingItem.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException("商品不存在");
    }

    await this.prisma.clothingItem.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Invalidate cache after delete
    await Promise.all([
      this.cacheService.del(CacheKeyBuilder.clothingDetail(id)),
      this.cacheService.delPattern("clothing:list"),
    ]);

    this.logger.log(`软删除了服装商品: ${id}`);
  }

  async search(query: string, filters?: {
    category?: ClothingCategory;
    minPrice?: number;
    maxPrice?: number;
    sizes?: string[];
  }): Promise<ClothingItemResponse[]> {
    const where: Prisma.ClothingItemWhereInput = {
      isActive: true,
      isDeleted: false,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { tags: { has: query } },
      ],
    };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters?.minPrice !== undefined) {
        (where.price as Prisma.DecimalFilter).gte = filters.minPrice;
      }
      if (filters?.maxPrice !== undefined) {
        (where.price as Prisma.DecimalFilter).lte = filters.maxPrice;
      }
    }

    if (filters?.sizes && filters.sizes.length > 0) {
      where.sizes = { hasSome: filters.sizes };
    }

    const items = await this.prisma.clothingItem.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { viewCount: "desc" },
      take: 50,
    });

    return normalizeClothingItems(items as unknown as ClothingItemWithBrandDetail[]);
  }

  async getStats(userId: string) {
    const baseWhere = { isActive: true, isDeleted: false };

    const [total, byCategory, allItems] = await Promise.all([
      this.prisma.clothingItem.count({ where: baseWhere }),
      this.prisma.clothingItem.groupBy({
        by: ["category"],
        where: baseWhere,
        _count: { category: true },
      }),
      this.prisma.clothingItem.findMany({
        where: baseWhere,
        select: {
          id: true,
          name: true,
          viewCount: true,
          tags: true,
          category: true,
        },
        orderBy: { viewCount: "desc" },
      }),
    ]);

    const byCategoryMap: Record<string, number> = {};
    for (const group of byCategory) {
      byCategoryMap[group.category] = group._count.category;
    }

    // Extract season stats from tags
    const seasonKeywords = ["spring", "summer", "autumn", "winter", "春", "夏", "秋", "冬"];
    const bySeason: Record<string, number> = {};
    for (const item of allItems) {
      for (const tag of item.tags) {
        const lowerTag = tag.toLowerCase();
        for (const season of seasonKeywords) {
          if (lowerTag.includes(season)) {
            bySeason[season] = (bySeason[season] || 0) + 1;
          }
        }
      }
    }

    const mostWorn = allItems.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.name,
      viewCount: item.viewCount,
    }));

    const leastWorn = allItems.slice(-5).reverse().map((item) => ({
      id: item.id,
      name: item.name,
      viewCount: item.viewCount,
    }));

    this.logger.log(`用户 ${userId} 获取服装统计`);
    return {
      total,
      byCategory: byCategoryMap,
      bySeason,
      mostWorn,
      leastWorn,
    };
  }

  async toggleFavorite(userId: string, itemId: string) {
    const item = await this.prisma.clothingItem.findFirst({
      where: { id: itemId, isDeleted: false },
    });

    if (!item) {
      throw new NotFoundException("商品不存在");
    }

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });

      // Decrement likeCount
      await this.prisma.clothingItem.update({
        where: { id: itemId },
        data: { likeCount: { decrement: 1 } },
      });

      return { ...normalizeClothingItem(item as unknown as ClothingItemWithBrandDetail), isFavorite: false };
    }

    await this.prisma.favorite.create({
      data: { userId, itemId },
    });

    // Increment likeCount
    await this.prisma.clothingItem.update({
      where: { id: itemId },
      data: { likeCount: { increment: 1 } },
    });

    return { ...normalizeClothingItem(item as unknown as ClothingItemWithBrandDetail), isFavorite: true };
  }

  async incrementWearCount(id: string) {
    const existing = await this.prisma.clothingItem.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException("商品不存在");
    }

    const item = await this.prisma.clothingItem.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: {
        brand: { select: { id: true, name: true, logo: true } },
      },
    });

    return normalizeClothingItem(item as unknown as ClothingItemWithBrandDetail);
  }
}
