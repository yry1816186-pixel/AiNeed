import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToWardrobeDto } from './dto/add-to-wardrobe.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import {
  WardrobeListStats,
  WardrobeStatsResponse,
} from './dto/wardrobe-response.dto';

type SortOption = 'added_at_asc' | 'added_at_desc' | 'category' | 'color';

interface FindAllParams {
  userId: string;
  category?: string;
  color?: string;
  brand?: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

interface WardrobeItemDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  findFirst(args: Record<string, unknown>): Promise<unknown | null>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
  count(args: Record<string, unknown>): Promise<number>;
  groupBy(args: Record<string, unknown>): Promise<unknown[]>;
}

interface ClothingItemDelegate {
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
}

interface PrismaDelegates {
  wardrobeItem: WardrobeItemDelegate;
  clothingItem: ClothingItemDelegate;
}

@Injectable()
export class WardrobeService {
  private readonly logger = new Logger(WardrobeService.name);
  private readonly db: PrismaDelegates;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as PrismaDelegates;
  }

  async findAll(params: FindAllParams) {
    const {
      userId,
      category,
      color,
      brand,
      sort = 'added_at_desc',
      page = 1,
      limit = 20,
    } = params;

    const where = {
      userId,
      ...(category && { category }),
      ...(color && { color }),
      ...(brand && { brand }),
    };

    const orderBy = this.buildOrderBy(sort);

    const [items, total] = await Promise.all([
      this.db.wardrobeItem.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.wardrobeItem.count({ where }),
    ]);

    const stats = await this.buildListStats(userId);

    return { items, total, stats };
  }

  async add(userId: string, dto: AddToWardrobeDto) {
    const existing = await this.db.wardrobeItem.findFirst({
      where: { userId, clothingId: dto.clothing_id },
    });

    if (existing) {
      throw new ConflictException('该服装已在衣橱中');
    }

    const clothing = await this.db.clothingItem.findUnique({
      where: { id: dto.clothing_id },
      include: { category: true, brand: true },
    }) as Record<string, unknown> | null;

    if (!clothing) {
      throw new NotFoundException('服装不存在');
    }

    const categoryData = clothing.category as Record<string, unknown> | null;
    const brandData = clothing.brand as Record<string, unknown> | null;
    const colors = clothing.colors as string[] | undefined;

    const snapshotCategory = categoryData?.name as string ?? null;
    const snapshotColor = colors && colors.length > 0 ? colors[0] : null;
    const snapshotBrand = brandData?.name as string ?? null;

    const item = await this.db.wardrobeItem.create({
      data: {
        userId,
        clothingId: dto.clothing_id,
        customName: dto.custom_name ?? null,
        imageUrl: dto.image_url ?? null,
        category: snapshotCategory,
        color: snapshotColor,
        brand: snapshotBrand,
        notes: dto.notes ?? null,
      },
    });

    this.logger.log(`User ${userId} added clothing ${dto.clothing_id} to wardrobe`);
    return item;
  }

  async update(userId: string, id: string, dto: UpdateWardrobeItemDto) {
    const item = await this.findOneOrThrow(id, userId);

    const updated = await this.db.wardrobeItem.update({
      where: { id: (item as Record<string, unknown>).id as string },
      data: {
        ...(dto.custom_name !== undefined && { customName: dto.custom_name }),
        ...(dto.image_url !== undefined && { imageUrl: dto.image_url }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    const item = await this.findOneOrThrow(id, userId);
    await this.db.wardrobeItem.delete({
      where: { id: (item as Record<string, unknown>).id as string },
    });
    this.logger.log(`User ${userId} removed wardrobe item ${id}`);
  }

  async getStats(userId: string): Promise<WardrobeStatsResponse> {
    const [categoryGroups, colorGroups, clothingItems] = await Promise.all([
      this.db.wardrobeItem.groupBy({
        by: ['category'],
        where: { userId, category: { not: null } },
        _count: { category: true },
      }),
      this.db.wardrobeItem.groupBy({
        by: ['color'],
        where: { userId, color: { not: null } },
        _count: { color: true },
      }),
      this.db.wardrobeItem.findMany({
        where: { userId, clothingId: { not: null } },
        select: { clothingId: true },
      }),
    ]);

    const totalCount = await this.db.wardrobeItem.count({ where: { userId } });

    const byCategory: Record<string, number> = {};
    for (const g of categoryGroups as Array<{ category: string; _count: { category: number } }>) {
      byCategory[g.category] = g._count.category;
    }

    const byColor: Record<string, number> = {};
    for (const g of colorGroups as Array<{ color: string; _count: { color: number } }>) {
      byColor[g.color] = g._count.color;
    }

    const clothingIds = (clothingItems as Array<{ clothingId: string | null }>)
      .map((item) => item.clothingId)
      .filter((cid): cid is string => cid !== null);

    const { bySeason, byStyle } = await this.aggregateFromClothing(clothingIds);

    return {
      total: totalCount,
      byCategory,
      byColor,
      bySeason,
      byStyle,
    };
  }

  private async findOneOrThrow(id: string, userId: string) {
    const item = await this.db.wardrobeItem.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('衣橱项不存在');
    }

    const itemRecord = item as Record<string, unknown>;
    if (itemRecord.userId !== userId) {
      throw new ForbiddenException('无权操作此衣橱项');
    }

    return item;
  }

  private buildOrderBy(sort: SortOption) {
    switch (sort) {
      case 'added_at_asc':
        return { addedAt: 'asc' as const };
      case 'added_at_desc':
        return { addedAt: 'desc' as const };
      case 'category':
        return { category: 'asc' as const };
      case 'color':
        return { color: 'asc' as const };
      default:
        return { addedAt: 'desc' as const };
    }
  }

  private async buildListStats(userId: string): Promise<WardrobeListStats> {
    const [categoryGroups, colorGroups, totalCount] = await Promise.all([
      this.db.wardrobeItem.groupBy({
        by: ['category'],
        where: { userId, category: { not: null } },
        _count: { category: true },
      }),
      this.db.wardrobeItem.groupBy({
        by: ['color'],
        where: { userId, color: { not: null } },
        _count: { color: true },
      }),
      this.db.wardrobeItem.count({ where: { userId } }),
    ]);

    const byCategory: Record<string, number> = {};
    for (const g of categoryGroups as Array<{ category: string; _count: { category: number } }>) {
      byCategory[g.category] = g._count.category;
    }

    const byColor: Record<string, number> = {};
    for (const g of colorGroups as Array<{ color: string; _count: { color: number } }>) {
      byColor[g.color] = g._count.color;
    }

    return { byCategory, byColor, totalCount };
  }

  private async aggregateFromClothing(clothingIds: string[]) {
    const bySeason: Record<string, number> = {};
    const byStyle: Record<string, number> = {};

    if (clothingIds.length === 0) {
      return { bySeason, byStyle };
    }

    const clothings = (await this.db.clothingItem.findMany({
      where: { id: { in: clothingIds } },
      select: { seasons: true, styleTags: true },
    })) as Array<{ seasons: string[]; styleTags: string[] }>;

    for (const clothing of clothings) {
      for (const season of clothing.seasons) {
        bySeason[season] = (bySeason[season] ?? 0) + 1;
      }
      for (const style of clothing.styleTags) {
        byStyle[style] = (byStyle[style] ?? 0) + 1;
      }
    }

    return { bySeason, byStyle };
  }
}
