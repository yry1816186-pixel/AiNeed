import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClothingQueryDto, ClothingSortOption } from './dto/clothing-query.dto';
import { CreateClothingDto } from './dto/create-clothing.dto';

interface CategoryNode {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  children: CategoryNode[];
}

interface ClothingItemRow {
  id: string;
  brandId: string | null;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: unknown;
  originalPrice: unknown;
  currency: string;
  gender: string | null;
  seasons: string[];
  occasions: string[];
  styleTags: string[];
  colors: string[];
  materials: string[];
  fitType: string | null;
  imageUrls: string[];
  sourceUrl: string | null;
  purchaseUrl: string | null;
  sourceName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  brand: { id: string; name: string; logoUrl: string | null; description: string | null } | null;
  category: { id: string; name: string; nameEn: string | null; slug: string; parentId: string | null; sortOrder: number } | null;
}

interface WhereCondition {
  isActive?: boolean;
  categoryId?: string;
  brandId?: string;
  gender?: string;
  price?: { gte?: number; lte?: number };
  styleTags?: { hasSome: string[] };
  colors?: { hasSome: string[] };
  seasons?: { hasSome: string[] };
  occasions?: { hasSome: string[] };
  id?: { notIn: string[] };
}

type OrderByClause = Record<string, string>;

@Injectable()
export class ClothingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ClothingQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);
    const orderBy = this.buildOrderByClause(query.sort ?? ClothingSortOption.NEWEST);

    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          brand: { select: { id: true, name: true, logoUrl: true, description: true } },
          category: { select: { id: true, name: true, nameEn: true, slug: true, parentId: true, sortOrder: true } },
        },
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: (items as ClothingItemRow[]).map((item: ClothingItemRow) => this.serializeClothingItem(item)),
      meta: { total, page, limit, totalPages },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true, logoUrl: true, description: true } },
        category: { select: { id: true, name: true, nameEn: true, slug: true, parentId: true, sortOrder: true } },
      },
    });

    if (!item) {
      throw new NotFoundException(`Clothing item with id ${id} not found`);
    }

    return this.serializeClothingItem(item as ClothingItemRow);
  }

  async getCategories(): Promise<CategoryNode[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return this.buildCategoryTree(categories as Array<{
      id: string;
      name: string;
      nameEn: string | null;
      slug: string;
      parentId: string | null;
      sortOrder: number;
    }>);
  }

  async getBrands() {
    const brands = await this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
    }) as Array<{ id: string; name: string; logoUrl: string | null; description: string | null }>;

    return brands.map((b) => ({
      id: b.id,
      name: b.name,
      logoUrl: b.logoUrl,
      description: b.description,
    }));
  }

  async create(dto: CreateClothingDto) {
    const item = await this.prisma.clothingItem.create({
      data: {
        name: dto.name,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        description: dto.description,
        price: dto.price ?? undefined,
        originalPrice: dto.originalPrice ?? undefined,
        currency: dto.currency,
        gender: dto.gender,
        seasons: dto.seasons ?? [],
        occasions: dto.occasions ?? [],
        styleTags: dto.styleTags ?? [],
        colors: dto.colors ?? [],
        materials: dto.materials ?? [],
        fitType: dto.fitType,
        imageUrls: dto.imageUrls ?? [],
        sourceUrl: dto.sourceUrl,
        purchaseUrl: dto.purchaseUrl,
        sourceName: dto.sourceName,
        isActive: dto.isActive ?? true,
      },
      include: {
        brand: { select: { id: true, name: true, logoUrl: true, description: true } },
        category: { select: { id: true, name: true, nameEn: true, slug: true, parentId: true, sortOrder: true } },
      },
    });

    return this.serializeClothingItem(item as ClothingItemRow);
  }

  async getRecommendations(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const preferences = await this.prisma.userStylePreference.findFirst({
      where: { userId },
    }) as { styleTags: string[] } | null;

    let resultItems: ClothingItemRow[];
    let resultTotal: number;

    if (preferences && preferences.styleTags.length > 0) {
      const result = await this.findByStyleTags(preferences.styleTags, skip, limit);
      resultItems = result.items;
      resultTotal = result.total;
    } else {
      const result = await this.findPopularFallback(skip, limit);
      resultItems = result.items;
      resultTotal = result.total;
    }

    const totalPages = Math.ceil(resultTotal / limit);

    return {
      items: resultItems.map((item: ClothingItemRow) => this.serializeClothingItem(item)),
      meta: { total: resultTotal, page, limit, totalPages },
    };
  }

  private async findByStyleTags(styleTags: string[], skip: number, limit: number) {
    const where: WhereCondition = {
      isActive: true,
      styleTags: { hasSome: styleTags },
    };

    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          brand: { select: { id: true, name: true, logoUrl: true, description: true } },
          category: { select: { id: true, name: true, nameEn: true, slug: true, parentId: true, sortOrder: true } },
        },
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    let combinedItems = items as ClothingItemRow[];
    let combinedTotal = total;

    if (combinedItems.length < limit) {
      const remaining = limit - combinedItems.length;
      const existingIds = combinedItems.map((i: ClothingItemRow) => i.id);
      const popularWhere: WhereCondition = {
        isActive: true,
        id: { notIn: existingIds },
      };

      const [popularItems] = await Promise.all([
        this.prisma.clothingItem.findMany({
          where: popularWhere,
          orderBy: { createdAt: 'desc' },
          take: remaining,
          include: {
            brand: { select: { id: true, name: true, logoUrl: true, description: true } },
            category: { select: { id: true, name: true, nameEn: true, slug: true, parentId: true, sortOrder: true } },
          },
        }),
        this.prisma.clothingItem.count({ where: popularWhere }),
      ]);

      combinedItems = [...combinedItems, ...(popularItems as ClothingItemRow[])];
      combinedTotal = combinedTotal + (popularItems as ClothingItemRow[]).length;
    }

    return { items: combinedItems, total: combinedTotal };
  }

  private async findPopularFallback(skip: number, limit: number) {
    const where: WhereCondition = { isActive: true };

    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          brand: { select: { id: true, name: true, logoUrl: true, description: true } },
          category: { select: { id: true, name: true, nameEn: true, slug: true, parentId: true, sortOrder: true } },
        },
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    return { items: items as ClothingItemRow[], total };
  }

  private buildWhereClause(query: ClothingQueryDto): WhereCondition {
    const conditions: WhereCondition[] = [{ isActive: true }];

    if (query.categoryId) {
      conditions.push({ categoryId: query.categoryId });
    }

    if (query.brandId) {
      conditions.push({ brandId: query.brandId });
    }

    if (query.gender) {
      conditions.push({ gender: query.gender });
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: { gte?: number; lte?: number } = {};
      if (query.minPrice !== undefined) {
        priceFilter.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        priceFilter.lte = query.maxPrice;
      }
      conditions.push({ price: priceFilter });
    }

    if (query.styleTags) {
      const tags = query.styleTags.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        conditions.push({ styleTags: { hasSome: tags } });
      }
    }

    if (query.colors) {
      const colors = query.colors.split(',').map((c: string) => c.trim()).filter(Boolean);
      if (colors.length > 0) {
        conditions.push({ colors: { hasSome: colors } });
      }
    }

    if (query.seasons) {
      const seasons = query.seasons.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (seasons.length > 0) {
        conditions.push({ seasons: { hasSome: seasons } });
      }
    }

    if (query.occasions) {
      const occasions = query.occasions.split(',').map((o: string) => o.trim()).filter(Boolean);
      if (occasions.length > 0) {
        conditions.push({ occasions: { hasSome: occasions } });
      }
    }

    return conditions.length === 1 ? conditions[0] : { AND: conditions } as WhereCondition;
  }

  private buildOrderByClause(sort: ClothingSortOption): OrderByClause {
    switch (sort) {
      case ClothingSortOption.PRICE_ASC:
        return { price: 'asc' };
      case ClothingSortOption.PRICE_DESC:
        return { price: 'desc' };
      case ClothingSortOption.POPULAR:
        return { createdAt: 'desc' };
      case ClothingSortOption.NEWEST:
      default:
        return { createdAt: 'desc' };
    }
  }

  private buildCategoryTree(
    categories: Array<{
      id: string;
      name: string;
      nameEn: string | null;
      slug: string;
      parentId: string | null;
      sortOrder: number;
    }>,
  ): CategoryNode[] {
    const nodeMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    for (const cat of categories) {
      nodeMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        nameEn: cat.nameEn,
        slug: cat.slug,
        parentId: cat.parentId,
        sortOrder: cat.sortOrder,
        children: [],
      });
    }

    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private serializeClothingItem(item: ClothingItemRow) {
    return {
      id: item.id,
      brandId: item.brandId,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: item.price != null ? Number(item.price) : null,
      originalPrice: item.originalPrice != null ? Number(item.originalPrice) : null,
      currency: item.currency,
      gender: item.gender,
      seasons: item.seasons,
      occasions: item.occasions,
      styleTags: item.styleTags,
      colors: item.colors,
      materials: item.materials,
      fitType: item.fitType,
      imageUrls: item.imageUrls,
      sourceUrl: item.sourceUrl,
      purchaseUrl: item.purchaseUrl,
      sourceName: item.sourceName,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      brand: item.brand,
      category: item.category,
    };
  }
}
