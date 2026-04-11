import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFavoriteDto, TargetType } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFavoriteDto) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Already favorited');
    }

    await this.validateTargetExists(dto.targetType, dto.targetId);

    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });

    return {
      id: favorite.id,
      targetType: favorite.targetType,
      targetId: favorite.targetId,
      createdAt: favorite.createdAt.toISOString(),
    };
  }

  async remove(userId: string, targetType: string, targetId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType,
          targetId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: { id: favorite.id },
    });

    return { deleted: true };
  }

  async findAll(
    userId: string,
    targetType?: string,
    page = 1,
    limit = 20,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const where = {
      userId,
      ...(targetType ? { targetType } : {}),
    };

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    const itemsWithTarget = await Promise.all(
      favorites.map(async (fav: { id: string; targetType: string; targetId: string; createdAt: Date }) => {
        const target = await this.fetchTarget(
          fav.targetType as TargetType,
          fav.targetId,
        );
        return {
          id: fav.id,
          targetType: fav.targetType,
          targetId: fav.targetId,
          target,
          createdAt: fav.createdAt.toISOString(),
        };
      }),
    );

    return {
      items: itemsWithTarget,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async check(userId: string, targetType: string, targetIds: string[]) {
    const favorites = await this.prisma.favorite.findMany({
      where: {
        userId,
        targetType,
        targetId: { in: targetIds },
      },
      select: { targetId: true },
    });

    const favoritedSet = new Set(
      favorites.map((f: { targetId: string }) => f.targetId),
    );

    return {
      results: targetIds.map((id) => ({
        targetId: id,
        isFavorited: favoritedSet.has(id),
      })),
    };
  }

  async count(userId: string, targetType?: string) {
    const where = {
      userId,
      ...(targetType ? { targetType } : {}),
    };

    const count = await this.prisma.favorite.count({ where });

    return { count };
  }

  private async validateTargetExists(targetType: TargetType, targetId: string) {
    let exists = false;

    switch (targetType) {
      case 'clothing':
        exists = !!(await this.prisma.clothingItem.findUnique({
          where: { id: targetId },
          select: { id: true },
        }));
        break;
      case 'outfit':
        exists = !!(await this.prisma.outfit.findUnique({
          where: { id: targetId },
          select: { id: true },
        }));
        break;
      case 'post':
        exists = !!(await this.prisma.communityPost.findUnique({
          where: { id: targetId },
          select: { id: true },
        }));
        break;
      case 'design':
        exists = !!(await this.prisma.customDesign.findUnique({
          where: { id: targetId },
          select: { id: true },
        }));
        break;
    }

    if (!exists) {
      throw new NotFoundException(
        `Target ${targetType} with id ${targetId} not found`,
      );
    }
  }

  private async fetchTarget(
    targetType: TargetType,
    targetId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      switch (targetType) {
        case 'clothing': {
          const item = await this.prisma.clothingItem.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              name: true,
              price: true,
              imageUrls: true,
              gender: true,
              colors: true,
            },
          });
          return item as unknown as Record<string, unknown> | null;
        }
        case 'outfit': {
          const item = await this.prisma.outfit.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              name: true,
              occasion: true,
              season: true,
              styleTags: true,
              isPublic: true,
            },
          });
          return item as unknown as Record<string, unknown> | null;
        }
        case 'post': {
          const item = await this.prisma.communityPost.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              title: true,
              content: true,
              imageUrls: true,
              tags: true,
              likesCount: true,
            },
          });
          return item as unknown as Record<string, unknown> | null;
        }
        case 'design': {
          const item = await this.prisma.customDesign.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              name: true,
              productType: true,
              previewImageUrl: true,
              likesCount: true,
              tags: true,
            },
          });
          return item as unknown as Record<string, unknown> | null;
        }
        default:
          return null;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch target ${targetType}/${targetId}: ${String(error)}`,
      );
      return null;
    }
  }
}
