import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  PaginatedResponse,
  createPaginatedResponse,
  normalizePaginationParams,
} from "../../../common/types/api-response.types";

@Injectable()
export class WardrobeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      category?: string;
      season?: string;
      color?: string;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, pageSize = 20 } = normalizePaginationParams({
      page: params.page,
      limit: params.limit,
    });

    const where: Record<string, any> = { userId };

    if (params.category) {
      where.category = params.category;
    }

    if (params.season) {
      where.seasons = { has: params.season };
    }

    if (params.color) {
      where.colors = { has: params.color };
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.userClothing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.userClothing.count({ where }),
    ]);

    return createPaginatedResponse(items, total, page, pageSize);
  }

  async create(
    userId: string,
    dto: {
      clothingId?: string;
      name?: string;
      category?: string;
      color?: string;
      brand?: string;
      season?: string | string[];
      imageUrl?: string;
      tags?: string[];
    }
  ) {
    if (dto.clothingId) {
      const clothingItem = await this.prisma.clothingItem.findUnique({
        where: { id: dto.clothingId },
      });

      if (!clothingItem) {
        throw new NotFoundException("服装商品不存在");
      }

      if (!clothingItem.isActive || clothingItem.isDeleted) {
        throw new BadRequestException("该商品已下架或已删除，无法添加到衣橱");
      }

      return this.prisma.userClothing.create({
        data: {
          userId,
          imageUri: clothingItem.mainImage || clothingItem.images[0] || "",
          category: clothingItem.category,
          subcategory: clothingItem.subcategory,
          name: clothingItem.name,
          brand: clothingItem.brandId,
          colors: clothingItem.colors,
          style: [],
          seasons: [],
          occasions: [],
          tags: [...clothingItem.tags, ...(dto.tags || [])],
        },
      });
    }

    if (!dto.imageUrl) {
      throw new BadRequestException("手动添加时 imageUrl 为必填项");
    }

    if (!dto.category) {
      throw new BadRequestException("手动添加时 category 为必填项");
    }

    return this.prisma.userClothing.create({
      data: {
        userId,
        imageUri: dto.imageUrl,
        category: dto.category,
        name: dto.name || null,
        brand: dto.brand || null,
        colors: dto.color ? [dto.color] : [],
        style: [],
        seasons: Array.isArray(dto.season) ? dto.season : dto.season ? [dto.season] : [],
        occasions: [],
        tags: dto.tags || [],
      },
    });
  }

  async findOne(userId: string, id: string) {
    const item = await this.prisma.userClothing.findUnique({
      where: { id },
    });

    if (!item || item.userId !== userId) {
      throw new NotFoundException("衣橱单品不存在");
    }

    return item;
  }

  async update(
    userId: string,
    id: string,
    dto: {
      name?: string;
      category?: string;
      subcategory?: string;
      brand?: string;
      imageUri?: string;
      thumbnailUri?: string;
      colors?: string[];
      style?: string[];
      seasons?: string[];
      occasions?: string[];
      tags?: string[];
      isFavorite?: boolean;
      notes?: string;
    }
  ) {
    const item = await this.prisma.userClothing.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!item || item.userId !== userId) {
      throw new NotFoundException("衣橱单品不存在");
    }

    const data: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "category",
      "subcategory",
      "brand",
      "imageUri",
      "thumbnailUri",
      "colors",
      "style",
      "seasons",
      "occasions",
      "tags",
      "isFavorite",
      "notes",
    ] as const;

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        data[field] = dto[field];
      }
    }

    return this.prisma.userClothing.update({
      where: { id },
      data,
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const item = await this.prisma.userClothing.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!item || item.userId !== userId) {
      throw new NotFoundException("衣橱单品不存在");
    }

    await this.prisma.userClothing.delete({
      where: { id },
    });
  }
}
