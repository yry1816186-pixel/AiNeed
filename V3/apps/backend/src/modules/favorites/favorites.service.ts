import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFavoriteDto, TargetType } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {

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

    const itemsWithTarget = await this.batchFetchTargets(
      favorites as Array<{ id: string; targetType: string; targetId: string; createdAt: Date }>,
    );

    return {
      items: itemsWithTarget,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  private async batchFetchTargets(
    favorites: Array<{ id: string; targetType: string; targetId: string; createdAt: Date }>,
  ): Promise<Array<{ id: string; targetType: string; targetId: string; target: Record<string, unknown> | null; createdAt: string }>> {
    const grouped = new Map<string, string[]>();
    for (const fav of favorites) {
      const ids = grouped.get(fav.targetType) ?? [];
      ids.push(fav.targetId);
      grouped.set(fav.targetType, ids);
    }

    const targetMap = new Map<string, Record<string, unknown> | null>();

    const typeQueries: Promise<void>[] = [];

    const clothingIds = grouped.get('clothing') ?? [];
    if (clothingIds.length > 0) {
      typeQueries.push(
        this.prisma.clothingItem.findMany({
          where: { id: { in: clothingIds } },
          select: { id: true, name: true, price: true, imageUrls: true, gender: true, colors: true },
        }).then((items) => {
          for (const item of items) targetMap.set(`clothing:${item.id}`, item as unknown as Record<string, unknown>);
        }),
      );
    }

    const outfitIds = grouped.get('outfit') ?? [];
    if (outfitIds.length > 0) {
      typeQueries.push(
        this.prisma.outfit.findMany({
          where: { id: { in: outfitIds } },
          select: { id: true, name: true, occasion: true, season: true, styleTags: true, isPublic: true },
        }).then((items) => {
          for (const item of items) targetMap.set(`outfit:${item.id}`, item as unknown as Record<string, unknown>);
        }),
      );
    }

    const postIds = grouped.get('post') ?? [];
    if (postIds.length > 0) {
      typeQueries.push(
        this.prisma.communityPost.findMany({
          where: { id: { in: postIds } },
          select: { id: true, title: true, content: true, imageUrls: true, tags: true, likesCount: true },
        }).then((items) => {
          for (const item of items) targetMap.set(`post:${item.id}`, item as unknown as Record<string, unknown>);
        }),
      );
    }

    const designIds = grouped.get('design') ?? [];
    if (designIds.length > 0) {
      typeQueries.push(
        this.prisma.customDesign.findMany({
          where: { id: { in: designIds } },
          select: { id: true, name: true, productType: true, previewImageUrl: true, likesCount: true, tags: true },
        }).then((items) => {
          for (const item of items) targetMap.set(`design:${item.id}`, item as unknown as Record<string, unknown>);
        }),
      );
    }

    await Promise.all(typeQueries);

    return favorites.map((fav) => ({
      id: fav.id,
      targetType: fav.targetType,
      targetId: fav.targetId,
      target: targetMap.get(`${fav.targetType}:${fav.targetId}`) ?? null,
      createdAt: fav.createdAt.toISOString(),
    }));
  }

  async check(userId: string, targetType: string, targetIds: string[]) {
    if (targetIds.length === 0) {
      return { results: [] };
    }

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

}
