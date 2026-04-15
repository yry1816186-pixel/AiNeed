import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ClothingCategory, Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { CouponService } from "../coupon/coupon.service";

export interface CartItemWithItem {
  id: string;
  itemId: string;
  color: string;
  size: string;
  quantity: number;
  selected: boolean;
  createdAt: Date;
  item: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    colors: string[];
    sizes: string[];
    price: number;
    originalPrice: number | null;
    currency: string;
    images: string[];
    tags: string[];
    viewCount: number;
    likeCount: number;
    brand: {
      id: string;
      name: string;
      logo: string | null;
    } | null;
  };
}

/**
 * 购物车项数据库返回类型
 */
interface CartItemWithRelations {
  id: string;
  itemId: string;
  color: string;
  size: string;
  quantity: number;
  selected: boolean;
  createdAt: Date;
  item: {
    id: string;
    name: string;
    description: string | null;
    category: ClothingCategory;
    colors: string[];
    sizes: string[];
    price: Prisma.Decimal;
    originalPrice: Prisma.Decimal | null;
    currency: string;
    images: string[];
    tags: string[];
    viewCount: number;
    likeCount: number;
    brand: {
      id: string;
      name: string;
      logo: string | null;
    } | null;
  };
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => CouponService))
    private couponService: CouponService,
  ) {}

  async getCart(userId: string): Promise<CartItemWithItem[]> {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        item: {
          include: {
            brand: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return items.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      selected: item.selected,
      createdAt: item.createdAt,
      item: {
        id: item.item.id,
        name: item.item.name,
        description: item.item.description,
        category: item.item.category,
        colors: item.item.colors,
        sizes: item.item.sizes,
        price: Number(item.item.price),
        originalPrice:
          item.item.originalPrice === null
            ? null
            : Number(item.item.originalPrice),
        currency: item.item.currency,
        images: item.item.images,
        tags: item.item.tags,
        viewCount: item.item.viewCount,
        likeCount: item.item.likeCount,
        brand: item.item.brand,
      },
    }));
  }

  async addItem(
    userId: string,
    itemId: string,
    color: string,
    size: string,
    quantity: number = 1,
  ): Promise<CartItemWithItem> {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("商品不存在");
    }

    if (!item.isActive) {
      throw new BadRequestException("商品已下架");
    }

    // Stock validation
    if (item.stock < quantity) {
      throw new BadRequestException(`库存不足，当前库存: ${item.stock}`);
    }

    if (!item.colors.includes(color)) {
      throw new BadRequestException(`商品没有 ${color} 颜色`);
    }

    if (!item.sizes.includes(size)) {
      throw new BadRequestException(`商品没有 ${size} 尺码`);
    }

    // FIX-BL-009: 使用upsert解决并发问题 (修复时间: 2026-03-19)
    const cartItem = await this.prisma.cartItem.upsert({
      where: {
        userId_itemId_color_size: {
          userId,
          itemId,
          color,
          size,
        },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        userId,
        itemId,
        color,
        size,
        quantity,
        selected: true,
      },
      include: {
        item: {
          include: {
            brand: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    return this.mapToCartItem(cartItem);
  }

  async updateItem(
    userId: string,
    cartItemId: string,
    data: { quantity?: number; selected?: boolean },
  ): Promise<CartItemWithItem> {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException("购物车商品不存在");
    }

    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new BadRequestException("数量必须大于 0");
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data,
      include: {
        item: {
          include: {
            brand: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    return this.mapToCartItem(updated);
  }

  async removeItem(userId: string, cartItemId: string): Promise<void> {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException("购物车商品不存在");
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  async clearCart(userId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });
  }

  async selectAll(userId: string, selected: boolean): Promise<void> {
    await this.prisma.cartItem.updateMany({
      where: { userId },
      data: { selected },
    });
  }

  async getCartSummary(userId: string): Promise<{
    totalItems: number;
    selectedItems: number;
    totalPrice: number;
    selectedPrice: number;
  }> {
    // 优化：只查询必要的字段，减少数据传输
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      select: {
        quantity: true,
        selected: true,
        item: {
          select: { price: true },
        },
      },
    });

    let totalItems = 0;
    let selectedItems = 0;
    let totalPrice = 0;
    let selectedPrice = 0;

    for (const item of items) {
      totalItems += item.quantity;
      totalPrice += Number(item.item.price) * item.quantity;

      if (item.selected) {
        selectedItems += item.quantity;
        selectedPrice += Number(item.item.price) * item.quantity;
      }
    }

    return {
      totalItems,
      selectedItems,
      totalPrice,
      selectedPrice,
    };
  }

  private mapToCartItem(item: CartItemWithRelations): CartItemWithItem {
    return {
      id: item.id,
      itemId: item.itemId,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      selected: item.selected,
      createdAt: item.createdAt,
      item: {
        id: item.item.id,
        name: item.item.name,
        description: item.item.description,
        category: item.item.category,
        colors: item.item.colors,
        sizes: item.item.sizes,
        price: item.item.price.toNumber(),
        originalPrice: item.item.originalPrice?.toNumber() ?? null,
        currency: item.item.currency,
        images: item.item.images,
        tags: item.item.tags,
        viewCount: item.item.viewCount,
        likeCount: item.item.likeCount,
        brand: item.item.brand,
      },
    };
  }

  // ==================== Phase 5: Enhanced cart methods ====================

  /**
   * Enhanced getCartSummary with coupon support.
   */
  async getCartSummaryWithCoupon(
    userId: string,
    couponCode?: string,
  ): Promise<{
    totalItems: number;
    selectedItems: number;
    totalAmount: number;
    selectedAmount: number;
    discountAmount: number;
    shippingFee: number;
    finalAmount: number;
    couponStatus?: 'valid' | 'invalid';
    couponMessage?: string;
  }> {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      select: {
        quantity: true,
        selected: true,
        item: {
          select: { price: true },
        },
      },
    });

    let totalItems = 0;
    let selectedItems = 0;
    let totalAmount = 0;
    let selectedAmount = 0;

    for (const item of items) {
      totalItems += item.quantity;
      totalAmount += Number(item.item.price) * item.quantity;

      if (item.selected) {
        selectedItems += item.quantity;
        selectedAmount += Number(item.item.price) * item.quantity;
      }
    }

    let discountAmount = 0;
    let couponStatus: 'valid' | 'invalid' | undefined;
    let couponMessage: string | undefined;
    if (couponCode) {
      const validation = await this.couponService.validateCoupon(
        couponCode,
        userId,
        selectedAmount,
      );
      if (validation.valid) {
        discountAmount = validation.discount;
        couponStatus = 'valid';
      } else {
        couponStatus = 'invalid';
        couponMessage = validation.reason || '优惠券不可用';
      }
    }

    const shippingFee = selectedAmount >= 99 ? 0 : 10;
    const finalAmount = Math.max(0, selectedAmount - discountAmount + shippingFee);

    return {
      totalItems,
      selectedItems,
      totalAmount,
      selectedAmount,
      discountAmount,
      shippingFee,
      finalAmount,
      ...(couponCode && { couponStatus, couponMessage }),
    };
  }

  /**
   * Get invalid cart items (items where product is inactive or deleted).
   */
  async getInvalidItems(userId: string) {
    return this.prisma.cartItem.findMany({
      where: {
        userId,
        OR: [
          { item: { isActive: false } },
          { item: { isDeleted: true } },
        ],
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            mainImage: true,
            isActive: true,
            isDeleted: true,
          },
        },
      },
    });
  }

  /**
   * Batch delete cart items.
   */
  async batchDelete(userId: string, cartItemIds: string[]) {
    return this.prisma.cartItem.deleteMany({
      where: {
        id: { in: cartItemIds },
        userId,
      },
    });
  }

  /**
   * Move cart items to favorites.
   */
  async moveToFavorites(userId: string, cartItemIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { id: { in: cartItemIds }, userId },
        select: { itemId: true },
      });

      for (const ci of cartItems) {
        await tx.favorite.upsert({
          where: {
            userId_itemId: { userId, itemId: ci.itemId },
          },
          create: { userId, itemId: ci.itemId },
          update: {},
        });
      }

      await tx.cartItem.deleteMany({
        where: { id: { in: cartItemIds }, userId },
      });

      return { moved: cartItems.length };
    });
  }

  /**
   * Update item SKU (color/size). Validates new SKU stock.
   */
  async updateItemSku(
    userId: string,
    cartItemId: string,
    color?: string,
    size?: string,
  ) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException("购物车商品不存在");
    }

    const newColor = color ?? cartItem.color;
    const newSize = size ?? cartItem.size;

    // Validate stock for new SKU
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: cartItem.itemId },
    });
    if (!item) {
      throw new NotFoundException("商品不存在");
    }
    if (item.stock < cartItem.quantity) {
      throw new BadRequestException("新规格库存不足");
    }

    // Check if same SKU already exists in cart
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        itemId: cartItem.itemId,
        color: newColor,
        size: newSize,
        id: { not: cartItemId },
      },
    });

    if (existing) {
      // Merge quantities
      return this.prisma.$transaction(async (tx) => {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: cartItem.quantity } },
        });
        await tx.cartItem.delete({ where: { id: cartItemId } });
        return { merged: true };
      });
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { color: newColor, size: newSize },
    });
  }
}
