import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';
import { AddOutfitItemDto } from './dto/add-outfit-item.dto';

interface OutfitDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
  count(args: Record<string, unknown>): Promise<number>;
}

interface OutfitItemDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  findFirst(args: Record<string, unknown>): Promise<unknown | null>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
}

interface ClothingItemDelegate {
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
}

interface PrismaDelegates {
  outfit: OutfitDelegate;
  outfitItem: OutfitItemDelegate;
  clothingItem: ClothingItemDelegate;
}

@Injectable()
export class OutfitService {
  private readonly logger = new Logger(OutfitService.name);
  private readonly db: PrismaDelegates;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as PrismaDelegates;
  }

  async create(userId: string, dto: CreateOutfitDto) {
    try {
      const outfit = await this.db.outfit.create({
        data: {
          userId,
          name: dto.name,
          description: dto.description ?? null,
          occasion: dto.occasion ?? null,
          season: dto.season ?? null,
          styleTags: dto.style_tags ?? [],
          isPublic: dto.is_public ?? false,
        },
      });

      this.logger.log(`User ${userId} created outfit ${(outfit as Record<string, unknown>).id}`);
      return outfit;
    } catch (error) {
      this.logger.error(`Failed to create outfit for user ${userId}: ${String(error)}`);
      throw error;
    }
  }

  async findAll(userId: string, page = 1, limit = 20) {
    try {
      const safePage = Math.max(1, page);
      const safeLimit = Math.min(100, Math.max(1, limit));
      const skip = (safePage - 1) * safeLimit;

      const where = { userId };

      const [items, total] = await Promise.all([
        this.db.outfit.findMany({
          where,
          skip,
          take: safeLimit,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                clothingItem: {
                  select: {
                    id: true,
                    name: true,
                    imageUrls: true,
                    colors: true,
                    category: true,
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        }),
        this.db.outfit.count({ where }),
      ]);

      return {
        items,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (error) {
      this.logger.error(`Failed to list outfits for user ${userId}: ${String(error)}`);
      throw error;
    }
  }

  async findOne(userId: string, outfitId: string) {
    try {
      const outfit = await this.db.outfit.findUnique({
        where: { id: outfitId },
        include: {
          items: {
            include: {
              clothingItem: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  imageUrls: true,
                  colors: true,
                  materials: true,
                  brand: true,
                  category: true,
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!outfit) {
        throw new NotFoundException('搭配不存在');
      }

      const outfitRecord = outfit as Record<string, unknown>;
      if (outfitRecord.userId !== userId && !outfitRecord.isPublic) {
        throw new ForbiddenException('无权查看此搭配');
      }

      return outfit;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to get outfit ${outfitId}: ${String(error)}`);
      throw error;
    }
  }

  async update(userId: string, outfitId: string, dto: UpdateOutfitDto) {
    try {
      const outfit = await this.findOutfitOrFail(outfitId);
      this.verifyOwnership(outfit, userId);

      const data: Record<string, unknown> = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.occasion !== undefined) data.occasion = dto.occasion;
      if (dto.season !== undefined) data.season = dto.season;
      if (dto.style_tags !== undefined) data.styleTags = dto.style_tags;
      if (dto.is_public !== undefined) data.isPublic = dto.is_public;

      const updated = await this.db.outfit.update({
        where: { id: outfitId },
        data,
        include: {
          items: {
            include: {
              clothingItem: {
                select: {
                  id: true,
                  name: true,
                  imageUrls: true,
                  colors: true,
                  category: true,
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      this.logger.log(`User ${userId} updated outfit ${outfitId}`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to update outfit ${outfitId}: ${String(error)}`);
      throw error;
    }
  }

  async remove(userId: string, outfitId: string): Promise<void> {
    try {
      const outfit = await this.findOutfitOrFail(outfitId);
      this.verifyOwnership(outfit, userId);

      await this.db.outfit.delete({ where: { id: outfitId } });
      this.logger.log(`User ${userId} deleted outfit ${outfitId}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to delete outfit ${outfitId}: ${String(error)}`);
      throw error;
    }
  }

  async addItem(userId: string, outfitId: string, dto: AddOutfitItemDto) {
    try {
      const outfit = await this.findOutfitOrFail(outfitId);
      this.verifyOwnership(outfit, userId);

      await this.validateClothingItemExists(dto.clothing_id);

      const existing = await this.db.outfitItem.findFirst({
        where: { outfitId, clothingId: dto.clothing_id },
      });
      if (existing) {
        throw new ConflictException('该服装已在此搭配方案中');
      }

      const outfitItem = await this.db.outfitItem.create({
        data: {
          outfitId,
          clothingId: dto.clothing_id,
          slot: dto.slot ?? 'default',
          sortOrder: dto.sort_order ?? 0,
        },
        include: {
          clothingItem: {
            select: {
              id: true,
              name: true,
              imageUrls: true,
              colors: true,
              category: true,
            },
          },
        },
      });

      this.logger.log(
        `User ${userId} added clothing ${dto.clothing_id} to outfit ${outfitId}`,
      );
      return outfitItem;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to add item to outfit ${outfitId}: ${String(error)}`,
      );
      throw error;
    }
  }

  async removeItem(userId: string, outfitId: string, itemId: string): Promise<void> {
    try {
      const outfit = await this.findOutfitOrFail(outfitId);
      this.verifyOwnership(outfit, userId);

      const item = await this.db.outfitItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new NotFoundException('搭配项不存在');
      }

      const itemRecord = item as Record<string, unknown>;
      if (itemRecord.outfitId !== outfitId) {
        throw new ForbiddenException('该搭配项不属于此搭配');
      }

      await this.db.outfitItem.delete({ where: { id: itemId } });
      this.logger.log(`User ${userId} removed item ${itemId} from outfit ${outfitId}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Failed to remove item ${itemId} from outfit ${outfitId}: ${String(error)}`,
      );
      throw error;
    }
  }

  private async findOutfitOrFail(outfitId: string): Promise<unknown> {
    const outfit = await this.db.outfit.findUnique({
      where: { id: outfitId },
    });

    if (!outfit) {
      throw new NotFoundException('搭配不存在');
    }

    return outfit;
  }

  private verifyOwnership(outfit: unknown, userId: string): void {
    const record = outfit as Record<string, unknown>;
    if (record.userId !== userId) {
      throw new ForbiddenException('无权操作此搭配');
    }
  }

  private async validateClothingItemExists(clothingId: string): Promise<void> {
    const item = await this.db.clothingItem.findUnique({
      where: { id: clothingId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('服装不存在');
    }
  }
}
