import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";

import {
  CreateWardrobeCollectionDto,
  UpdateWardrobeCollectionDto,
  WardrobeCollectionQueryDto,
  CreateCollectionItemDto,
  BatchCreateCollectionItemsDto,
  UpdateCollectionItemDto,
  CollectionItemQueryDto,
  ReorderCollectionItemsDto,
  CollectionItemType,
} from "./dto/wardrobe-collection.dto";

@Injectable()
export class WardrobeCollectionService {
  private readonly logger = new Logger(WardrobeCollectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== 分类 CRUD ====================

  async createCollection(userId: string, dto: CreateWardrobeCollectionDto) {
    const collection = await this.prisma.wardrobeCollection.create({
      data: {
        userId,
        name: dto.name,
        icon: dto.icon,
        coverImage: dto.coverImage,
        sortOrder: dto.sortOrder ?? 0,
        isDefault: dto.isDefault ?? false,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    this.logger.log(`User ${userId} created wardrobe collection ${collection.id}`);
    return collection;
  }

  async getCollections(userId: string, query: WardrobeCollectionQueryDto) {
    const { page = 1, pageSize = 20 } = query;

    const [collections, total] = await Promise.all([
      this.prisma.wardrobeCollection.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { items: true },
          },
        },
      }),
      this.prisma.wardrobeCollection.count({ where: { userId } }),
    ]);

    return {
      data: collections,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getCollectionById(userId: string, collectionId: string) {
    const collection = await this.prisma.wardrobeCollection.findUnique({
      where: { id: collectionId },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException("分类不存在");
    }

    if (collection.userId !== userId) {
      throw new ForbiddenException("无权访问此分类");
    }

    return collection;
  }

  async updateCollection(
    userId: string,
    collectionId: string,
    dto: UpdateWardrobeCollectionDto,
  ) {
    await this.verifyOwnership(userId, collectionId);

    return this.prisma.wardrobeCollection.update({
      where: { id: collectionId },
      data: {
        name: dto.name,
        icon: dto.icon,
        coverImage: dto.coverImage,
        sortOrder: dto.sortOrder,
        isDefault: dto.isDefault,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
  }

  async deleteCollection(userId: string, collectionId: string) {
    const collection = await this.verifyOwnership(userId, collectionId);

    if (collection.isDefault) {
      throw new ForbiddenException("默认分类不可删除");
    }

    await this.prisma.wardrobeCollection.delete({
      where: { id: collectionId },
    });

    this.logger.log(`User ${userId} deleted wardrobe collection ${collectionId}`);
    return { success: true };
  }

  // ==================== 分类项 CRUD ====================

  async addCollectionItem(
    userId: string,
    collectionId: string,
    dto: CreateCollectionItemDto,
  ) {
    await this.verifyOwnership(userId, collectionId);

    await this.validateItemReference(dto.itemType, dto.itemId);

    const item = await this.prisma.wardrobeCollectionItem.create({
      data: {
        collectionId,
        userId,
        itemType: dto.itemType,
        itemId: dto.itemId,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.updateCollectionCoverImage(collectionId, dto.itemType, dto.itemId);

    return item;
  }

  async batchAddCollectionItems(
    userId: string,
    collectionId: string,
    dto: BatchCreateCollectionItemsDto,
  ) {
    await this.verifyOwnership(userId, collectionId);

    // 逐个校验引用项是否存在
    for (const item of dto.items) {
      await this.validateItemReference(item.itemType, item.itemId);
    }

    const result = await this.prisma.wardrobeCollectionItem.createMany({
      data: dto.items.map((item) => ({
        collectionId,
        userId,
        itemType: item.itemType,
        itemId: item.itemId,
        sortOrder: item.sortOrder ?? 0,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `User ${userId} added ${result.count} items to collection ${collectionId}`,
    );

    return { count: result.count };
  }

  async getCollectionItems(
    userId: string,
    collectionId: string,
    query: CollectionItemQueryDto,
  ) {
    await this.verifyOwnership(userId, collectionId);

    const { itemType, page = 1, pageSize = 20 } = query;

    const where: Prisma.WardrobeCollectionItemWhereInput = { collectionId };
    if (itemType) {
      where.itemType = itemType;
    }

    const [items, total] = await Promise.all([
      this.prisma.wardrobeCollectionItem.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.wardrobeCollectionItem.count({ where }),
    ]);

    // 附加引用项详情 - 批量查询避免 N+1 问题
    const itemsWithDetails = await this.batchGetItemDetails(items);

    return {
      data: itemsWithDetails,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async updateCollectionItem(
    userId: string,
    collectionId: string,
    itemId: string,
    dto: UpdateCollectionItemDto,
  ) {
    await this.verifyCollectionItemOwnership(userId, collectionId, itemId);

    return this.prisma.wardrobeCollectionItem.update({
      where: { id: itemId },
      data: {
        sortOrder: dto.sortOrder,
      },
    });
  }

  async removeCollectionItem(
    userId: string,
    collectionId: string,
    itemId: string,
  ) {
    await this.verifyCollectionItemOwnership(userId, collectionId, itemId);

    await this.prisma.wardrobeCollectionItem.delete({
      where: { id: itemId },
    });

    return { success: true };
  }

  async reorderCollectionItems(
    userId: string,
    collectionId: string,
    dto: ReorderCollectionItemsDto,
  ) {
    await this.verifyOwnership(userId, collectionId);

    // 使用事务批量更新排序
    await this.prisma.$transaction(
      dto.itemIds.map((itemId, index) =>
        this.prisma.wardrobeCollectionItem.updateMany({
          where: { id: itemId, collectionId },
          data: { sortOrder: index },
        }),
      ),
    );

    return { success: true };
  }

  // ==================== 私有方法 ====================

  /**
   * 验证分类归属权
   */
  private async verifyOwnership(userId: string, collectionId: string) {
    const collection = await this.prisma.wardrobeCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException("分类不存在");
    }

    if (collection.userId !== userId) {
      throw new ForbiddenException("无权操作此分类");
    }

    return collection;
  }

  /**
   * 验证分类项归属权
   */
  private async verifyCollectionItemOwnership(
    userId: string,
    collectionId: string,
    itemId: string,
  ) {
    const item = await this.prisma.wardrobeCollectionItem.findUnique({
      where: { id: itemId },
    });

    if (item?.collectionId !== collectionId) {
      throw new NotFoundException("分类项不存在");
    }

    await this.verifyOwnership(userId, collectionId);
    return item;
  }

  /**
   * 验证多态引用项是否存在
   */
  private async validateItemReference(itemType: string, itemId: string) {
    let exists = false;

    switch (itemType) {
      case CollectionItemType.POST: {
        const post = await this.prisma.communityPost.findUnique({
          where: { id: itemId },
        });
        exists = !!post;
        break;
      }
      case CollectionItemType.OUTFIT: {
        const outfit = await this.prisma.outfit.findUnique({
          where: { id: itemId },
        });
        exists = !!outfit;
        break;
      }
      case CollectionItemType.TRY_ON: {
        const tryOn = await this.prisma.virtualTryOn.findUnique({
          where: { id: itemId },
        });
        exists = !!tryOn;
        break;
      }
      default:
        throw new ForbiddenException(`不支持的引用类型: ${itemType}`);
    }

    if (!exists) {
      throw new NotFoundException(`引用的${this.getItemTypeName(itemType)}不存在`);
    }
  }

  /**
   * 批量获取引用项详情 - 避免 N+1 查询问题
   * 按类型分组后批量查询，将 N 次数据库查询降为 3 次（最多3种类型）
   */
  private async batchGetItemDetails(
    items: { id: string; itemType: string; itemId: string; sortOrder: number; createdAt: Date }[],
  ) {
    // 按类型分组收集 ID
    const postIds: string[] = [];
    const outfitIds: string[] = [];
    const tryOnIds: string[] = [];

    for (const item of items) {
      switch (item.itemType) {
        case CollectionItemType.POST: postIds.push(item.itemId); break;
        case CollectionItemType.OUTFIT: outfitIds.push(item.itemId); break;
        case CollectionItemType.TRY_ON: tryOnIds.push(item.itemId); break;
      }
    }

    // 批量查询各类型数据
    const [posts, outfits, tryOns] = await Promise.all([
      postIds.length > 0
        ? this.prisma.communityPost.findMany({
            where: { id: { in: postIds } },
            select: { id: true, title: true, images: true, likeCount: true, author: { select: { id: true, nickname: true, avatar: true } } },
          })
        : [],
      outfitIds.length > 0
        ? this.prisma.outfit.findMany({
            where: { id: { in: outfitIds } },
            select: { id: true, name: true, coverImage: true, rating: true },
          })
        : [],
      tryOnIds.length > 0
        ? this.prisma.virtualTryOn.findMany({
            where: { id: { in: tryOnIds } },
            select: { id: true, resultImageUrl: true, status: true },
          })
        : [],
    ]);

    // 构建查找映射
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detailMap = new Map<string, any>();
    for (const post of posts) {detailMap.set(post.id, post);}
    for (const outfit of outfits) {detailMap.set(outfit.id, outfit);}
    for (const tryOn of tryOns) {detailMap.set(tryOn.id, tryOn);}

    // 组装结果
    return items.map((item) => ({
      ...item,
      detail: detailMap.get(item.itemId) || null,
    }));
  }

  /**
   * 获取引用项详情（单条查询，保留用于非批量场景）
   */
  private async getItemDetail(itemType: string, itemId: string) {
    switch (itemType) {
      case CollectionItemType.POST: {
        return this.prisma.communityPost.findUnique({
          where: { id: itemId },
          select: {
            id: true,
            title: true,
            images: true,
            likeCount: true,
            author: {
              select: { id: true, nickname: true, avatar: true },
            },
          },
        });
      }
      case CollectionItemType.OUTFIT: {
        return this.prisma.outfit.findUnique({
          where: { id: itemId },
          select: {
            id: true,
            name: true,
            coverImage: true,
            rating: true,
          },
        });
      }
      case CollectionItemType.TRY_ON: {
        return this.prisma.virtualTryOn.findUnique({
          where: { id: itemId },
          select: {
            id: true,
            resultImageUrl: true,
            status: true,
          },
        });
      }
      default:
        return null;
    }
  }

  /**
   * 自动更新分类封面图（当添加第一项时）
   */
  private async updateCollectionCoverImage(
    collectionId: string,
    itemType: string,
    itemId: string,
  ) {
    const collection = await this.prisma.wardrobeCollection.findUnique({
      where: { id: collectionId },
      select: { coverImage: true },
    });

    // 已有封面图则不覆盖
    if (collection?.coverImage) {return;}

    let coverImage: string | null = null;

    switch (itemType) {
      case CollectionItemType.POST: {
        const post = await this.prisma.communityPost.findUnique({
          where: { id: itemId },
          select: { images: true },
        });
        coverImage = post?.images?.[0] ?? null;
        break;
      }
      case CollectionItemType.OUTFIT: {
        const outfit = await this.prisma.outfit.findUnique({
          where: { id: itemId },
          select: { coverImage: true },
        });
        coverImage = outfit?.coverImage ?? null;
        break;
      }
      case CollectionItemType.TRY_ON: {
        const tryOn = await this.prisma.virtualTryOn.findUnique({
          where: { id: itemId },
          select: { resultImageUrl: true },
        });
        coverImage = tryOn?.resultImageUrl ?? null;
        break;
      }
    }

    if (coverImage) {
      await this.prisma.wardrobeCollection.update({
        where: { id: collectionId },
        data: { coverImage },
      });
    }
  }

  /**
   * 获取引用类型中文名
   */
  private getItemTypeName(itemType: string): string {
    switch (itemType) {
      case CollectionItemType.POST:
        return "社区帖子";
      case CollectionItemType.OUTFIT:
        return "穿搭方案";
      case CollectionItemType.TRY_ON:
        return "虚拟试衣";
      default:
        return "项目";
    }
  }
}
