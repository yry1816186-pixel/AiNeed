import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  PaginatedResponse,
  createPaginatedResponse,
  normalizePaginationParams,
} from "../../../common/types/api-response.types";
import { WardrobeSection } from "../../../types/prisma-enums";

export interface CuratedWardrobe {
  savedOutfits: Awaited<ReturnType<PrismaService["outfit"]["findMany"]>>;
  wishlistedItems: Awaited<ReturnType<PrismaService["clothingItem"]["findMany"]>>;
  purchasedItems: Awaited<ReturnType<PrismaService["clothingItem"]["findMany"]>>;
}

export interface CuratedWardrobeStats {
  savedOutfits: number;
  wishlistedItems: number;
  purchasedItems: number;
  styleDistribution: Record<string, number>;
}

const PURCHASED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.paid,
  OrderStatus.shipped,
  OrderStatus.delivered,
];

@Injectable()
export class CuratedWardrobeService {
  private readonly logger = new Logger(CuratedWardrobeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCuratedWardrobe(userId: string): Promise<CuratedWardrobe> {
    const [savedOutfits, wishlistedItems, purchasedItems] = await Promise.all([
      this.prisma.outfit.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      this.getWishlistedClothingItems(userId),
      this.getPurchasedClothingItems(userId),
    ]);

    return { savedOutfits, wishlistedItems, purchasedItems };
  }

  async moveToWishlist(userId: string, itemId: string) {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
      select: { id: true, isActive: true, isDeleted: true },
    });

    if (!item) {
      throw new NotFoundException("商品不存在");
    }

    if (!item.isActive || item.isDeleted) {
      throw new NotFoundException("该商品已下架或已删除，无法添加到心愿单");
    }

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });

    if (existing) {
      if (existing.section === WardrobeSection.wishlisted) {
        return existing;
      }
      return this.prisma.favorite.update({
        where: { id: existing.id },
        data: { section: WardrobeSection.wishlisted },
      });
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        itemId,
        section: WardrobeSection.wishlisted,
      },
    });
  }

  async removeFromWishlist(userId: string, itemId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({
      where: {
        userId,
        itemId,
        section: WardrobeSection.wishlisted,
      },
    });
  }

  async getSectionStats(userId: string): Promise<CuratedWardrobeStats> {
    const [savedOutfits, wishlistedCount, purchasedCount, userClothing] = await Promise.all([
      this.prisma.outfit.count({ where: { userId } }),
      this.prisma.favorite.count({
        where: { userId, section: WardrobeSection.wishlisted },
      }),
      this.getPurchaseCount(userId),
      this.prisma.userClothing.findMany({
        where: { userId },
        select: { style: true, category: true },
      }),
    ]);

    const styleDistribution: Record<string, number> = {};
    for (const item of userClothing) {
      for (const style of item.style) {
        styleDistribution[style] = (styleDistribution[style] || 0) + 1;
      }
    }

    return {
      savedOutfits,
      wishlistedItems: wishlistedCount,
      purchasedItems: purchasedCount,
      styleDistribution,
    };
  }

  async getWishlistedItems(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      category?: string;
      season?: string;
    } = {}
  ): Promise<PaginatedResponse<unknown>> {
    const { page = 1, pageSize = 20 } = normalizePaginationParams({
      page: params.page,
      limit: params.limit,
    });

    const itemWhere: Record<string, unknown> = {};
    if (params.category) {
      itemWhere.category = params.category;
    }
    if (params.season) {
      itemWhere.seasons = { has: params.season };
    }

    const skip = (page - 1) * pageSize;

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: {
          userId,
          section: WardrobeSection.wishlisted,
          item: itemWhere,
        },
        include: {
          item: {
            include: { brand: { select: { id: true, name: true, logo: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.favorite.count({
        where: {
          userId,
          section: WardrobeSection.wishlisted,
          item: itemWhere,
        },
      }),
    ]);

    const items = favorites
      .map((f) => f.item)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return createPaginatedResponse(items, total, page, pageSize);
  }

  async getPurchasedItems(
    userId: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResponse<unknown>> {
    const { page = 1, pageSize = 20 } = normalizePaginationParams({
      page: params.page,
      limit: params.limit,
    });

    const purchasedItemIds = await this.prisma.orderItem.findMany({
      where: {
        order: {
          userId,
          status: { in: PURCHASED_ORDER_STATUSES },
          isDeleted: false,
        },
        itemId: { not: null },
      },
      select: { itemId: true },
      distinct: ["itemId"],
    });

    const itemIds = purchasedItemIds
      .map((oi) => oi.itemId)
      .filter((id): id is string => id !== null);

    const total = itemIds.length;
    const skip = (page - 1) * pageSize;
    const pagedIds = itemIds.slice(skip, skip + pageSize);

    if (pagedIds.length === 0) {
      return createPaginatedResponse([], total, page, pageSize);
    }

    const items = await this.prisma.clothingItem.findMany({
      where: { id: { in: pagedIds } },
      include: { brand: { select: { id: true, name: true, logo: true } } },
    });

    const itemOrderMap = new Map(pagedIds.map((id, idx) => [id, idx]));
    items.sort((a, b) => (itemOrderMap.get(a.id) ?? 0) - (itemOrderMap.get(b.id) ?? 0));

    return createPaginatedResponse(items, total, page, pageSize);
  }

  private async getWishlistedClothingItems(
    userId: string
  ): Promise<Awaited<ReturnType<PrismaService["clothingItem"]["findMany"]>>> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId, section: WardrobeSection.wishlisted },
      include: {
        item: {
          include: { brand: { select: { id: true, name: true, logo: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return favorites
      .map((f) => f.item)
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  private async getPurchasedClothingItems(
    userId: string
  ): Promise<Awaited<ReturnType<PrismaService["clothingItem"]["findMany"]>>> {
    const purchasedItemIds = await this.prisma.orderItem.findMany({
      where: {
        order: {
          userId,
          status: { in: PURCHASED_ORDER_STATUSES },
          isDeleted: false,
        },
        itemId: { not: null },
      },
      select: { itemId: true },
      distinct: ["itemId"],
    });

    const itemIds = purchasedItemIds
      .map((oi) => oi.itemId)
      .filter((id): id is string => id !== null);

    if (itemIds.length === 0) {
      return [];
    }

    return this.prisma.clothingItem.findMany({
      where: { id: { in: itemIds } },
      include: { brand: { select: { id: true, name: true, logo: true } } },
    });
  }

  private async getPurchaseCount(userId: string): Promise<number> {
    const purchasedItemIds = await this.prisma.orderItem.findMany({
      where: {
        order: {
          userId,
          status: { in: PURCHASED_ORDER_STATUSES },
          isDeleted: false,
        },
        itemId: { not: null },
      },
      select: { itemId: true },
      distinct: ["itemId"],
    });
    return purchasedItemIds.length;
  }
}
