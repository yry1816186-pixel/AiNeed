import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  PaginatedResponse,
  createPaginatedResponse,
  normalizePaginationParams,
} from "../../../../common/types/api-response.types";

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavorite(userId: string, itemId: string) {
    // 并行查询商品和已存在的收藏记录，避免串行查询
    const [item, existing] = await Promise.all([
      this.prisma.clothingItem.findUnique({
        where: { id: itemId },
        select: { id: true, isActive: true, isDeleted: true },
      }),
      this.prisma.favorite.findUnique({
        where: { userId_itemId: { userId, itemId } },
      }),
    ]);

    if (!item) {
      throw new NotFoundException("商品不存在");
    }

    if (!item.isActive) {
      throw new BadRequestException("该商品已下架，无法收藏");
    }

    if (item.isDeleted) {
      throw new BadRequestException("该商品已删除，无法收藏");
    }

    if (existing) {
      return existing;
    }

    return this.prisma.favorite.create({
      data: { userId, itemId },
    });
  }

  async removeFavorite(userId: string, itemId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId, itemId },
    });
  }

  async getUserFavorites(
    userId: string,
    params: {
      page?: number;
      pageSize?: number;
      limit?: number;
    } = {},
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, pageSize = 20 } = normalizePaginationParams(params);

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        include: {
          item: {
            include: {
              brand: { select: { id: true, name: true, logo: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    const favoritesItems = items.map((f: { 
      item: { 
        id: string; 
        name: string; 
        description: string | null; 
        category: string; 
        colors: string[]; 
        sizes: string[]; 
        price: { toString(): string }; 
        images: string[]; 
        mainImage: string | null; 
        brand: { id: string; name: string; logo: string | null } | null 
      } | null 
    }) => {
      if (!f.item) {return null;}
      return {
        ...f.item,
        price: parseFloat(f.item.price.toString()),
      };
    }).filter((item: unknown): item is NonNullable<typeof item> => item !== null);

    return createPaginatedResponse(favoritesItems, total, page, pageSize);
  }

  async isFavorite(userId: string, itemId: string): Promise<boolean> {
    const favorite = await this.prisma.favorite.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });
    return !!favorite;
  }

  async getFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { itemId: true },
    });
    return favorites.map((f: { itemId: string }) => f.itemId);
  }
}
