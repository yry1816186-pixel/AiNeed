import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import * as bcrypt from "../../../common/security/bcrypt";


import type {
  MerchantApplyDto,
  CreateProductDto,
  UpdateProductDto,
} from "./dto";

@Injectable()
export class MerchantService {
  private readonly logger = new Logger(MerchantService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 商家入驻申请（使用事务保证数据一致性）
   */
  async applyForMerchant(data: MerchantApplyDto) {
    // D-09: Auto-validation
    this.validateMerchantApplication(data);

    // Check brand name uniqueness
    const brandExists = await this.checkBrandNameUnique(data.brandName);
    if (!brandExists) {
      throw new BadRequestException("品牌名已存在");
    }

    // 检查邮箱是否已存在
    const existing = await this.prisma.brandMerchant.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ForbiddenException("该邮箱已被注册");
    }

    // 生成slug
    const slug = this.generateSlug(data.brandName);

    // 使用事务创建品牌和商家账户
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const brand = await tx.brand.create({
          data: {
            name: data.brandName,
            slug,
            contactEmail: data.email,
            contactPhone: data.phone,
            businessLicense: data.businessLicenseUrl,
            verified: false,
          },
        });

        const merchant = await tx.brandMerchant.create({
          data: {
            brandId: brand.id,
            email: data.email,
            password: await bcrypt.hash(data.password),
            name: data.name,
            role: "admin",
          },
        });

        return { merchantId: merchant.id, brandId: brand.id };
      });

      this.logger.log(`New merchant application: ${data.brandName}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create merchant: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw new BadRequestException("商家注册失败，请稍后重试");
    }
  }

  /**
   * 商家登录
   */
  async login(email: string, password: string) {
    const merchant = await this.prisma.brandMerchant.findUnique({
      where: { email },
      include: { brand: true },
    });

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    const valid = await bcrypt.compare(password, merchant.password);
    if (!valid) {
      throw new ForbiddenException("Invalid password");
    }

    // 更新最后登录时间
    await this.prisma.brandMerchant.update({
      where: { id: merchant.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      merchant: {
        id: merchant.id,
        email: merchant.email,
        name: merchant.name,
        role: merchant.role,
      },
      brand: merchant.brand,
    };
  }

  /**
   * 获取商家数据看板
   */
  async getDashboard(brandId: string, range: { start: Date; end: Date }) {
    const [products, orders, stats] = await Promise.all([
      this.prisma.clothingItem.count({ where: { brandId } }),
      this.getSalesStats(brandId, range),
      this.getProductStats(brandId),
    ]);

    return {
      overview: {
        totalProducts: products,
        totalViews: stats.totalViews,
        totalTryOns: stats.totalTryOns,
        totalFavorites: stats.totalFavorites,
      },
      sales: orders,
      topProducts: await this.getTopProducts(brandId, 5),
    };
  }

  /**
   * 获取商品列表
   */
  async getProducts(
    brandId: string,
    options: { limit?: number; offset?: number; status?: string } = {},
  ) {
    const { limit = 20, offset = 0, status } = options;

    const where: Prisma.ClothingItemWhereInput = { brandId };
    if (status === "active") {where.isActive = true;}
    if (status === "inactive") {where.isActive = false;}

    const [products, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    return { products, total, hasMore: products.length === limit };
  }

  /**
   * 创建商品（使用类型化 DTO）
   */
  async createProduct(brandId: string, data: CreateProductDto) {
    // 验证品牌存在
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    try {
      const product = await this.prisma.clothingItem.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          colors: data.colors,
          sizes: data.sizes,
          price: data.price,
          originalPrice: data.originalPrice,
          currency: data.currency ?? "CNY",
          images: data.images,
          tags: data.tags ?? [],
          isActive: data.isActive ?? true,
          brandId,
        },
      });

      this.logger.log(`Product created: ${product.id} by brand: ${brandId}`);
      return product;
    } catch (error) {
      this.logger.error(
        `Failed to create product: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw new BadRequestException("创建商品失败");
    }
  }

  /**
   * 更新商品（使用类型化 DTO）
   */
  async updateProduct(
    brandId: string,
    productId: string,
    data: UpdateProductDto,
  ) {
    // 验证商品属于该品牌
    const product = await this.prisma.clothingItem.findFirst({
      where: { id: productId, brandId },
    });

    if (!product) {
      throw new NotFoundException("商品不存在或无权操作");
    }

    try {
      // 只更新提供的字段
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) {updateData.name = data.name;}
      if (data.description !== undefined)
        {updateData.description = data.description;}
      if (data.category !== undefined) {updateData.category = data.category;}
      if (data.colors !== undefined) {updateData.colors = data.colors;}
      if (data.sizes !== undefined) {updateData.sizes = data.sizes;}
      if (data.price !== undefined) {updateData.price = data.price;}
      if (data.originalPrice !== undefined)
        {updateData.originalPrice = data.originalPrice;}
      if (data.images !== undefined) {updateData.images = data.images;}
      if (data.tags !== undefined) {updateData.tags = data.tags;}
      if (data.isActive !== undefined) {updateData.isActive = data.isActive;}

      return await this.prisma.clothingItem.update({
        where: { id: productId },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update product: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw new BadRequestException("更新商品失败");
    }
  }

  /**
   * 删除商品
   */
  async deleteProduct(brandId: string, productId: string) {
    // 验证商品属于该品牌
    const product = await this.prisma.clothingItem.findFirst({
      where: { id: productId, brandId },
    });

    if (!product) {
      throw new NotFoundException("商品不存在或无权操作");
    }

    try {
      await this.prisma.clothingItem.delete({
        where: { id: productId },
      });

      this.logger.log(`Product deleted: ${productId} by brand: ${brandId}`);
      return { success: true, message: "商品已删除" };
    } catch (error) {
      this.logger.error(
        `Failed to delete product: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw new BadRequestException("删除商品失败");
    }
  }

  /**
   * 获取结算记录
   */
  async getSettlements(brandId: string) {
    return this.prisma.brandSettlement.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ============ 私有方法 ============

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .slice(0, 50);
  }

  private async getSalesStats(
    brandId: string,
    range: { start: Date; end: Date },
  ) {
    // 获取时间范围内的行为数据来估算销售相关统计
    const behaviorEvents = await this.prisma.userBehaviorEvent.findMany({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        eventType: {
          in: [
            "item_view",
            "add_to_cart",
            "favorite",
            "try_on_start",
            "try_on_complete",
          ],
        },
      },
    });

    // 统计各类事件
    const stats = behaviorEvents.reduce(
      (acc, event) => {
        const type = event.eventType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalViews = stats["item_view"] ?? 0;
    const totalAddToCart = stats["add_to_cart"] ?? 0;
    const totalFavorites = stats["favorite"] ?? 0;
    const totalTryOns =
      (stats["try_on_start"] ?? 0) + (stats["try_on_complete"] ?? 0);

    return {
      totalViews,
      totalAddToCart,
      totalFavorites,
      totalTryOns,
      conversionRate:
        totalViews > 0 ? ((totalAddToCart / totalViews) * 100).toFixed(2) : "0",
      period: range,
    };
  }

  private async getProductStats(brandId: string) {
    const products = await this.prisma.clothingItem.findMany({
      where: { brandId },
      select: { viewCount: true, likeCount: true, id: true },
    });

    // 统计试衣次数
    const productIds = products.map((p) => p.id);
    const tryOnCount = await this.prisma.virtualTryOn.count({
      where: { itemId: { in: productIds } },
    });

    return {
      totalViews: products.reduce((sum, p) => sum + (p.viewCount || 0), 0),
      totalTryOns: tryOnCount,
      totalFavorites: products.reduce((sum, p) => sum + (p.likeCount || 0), 0),
    };
  }

  // FIX: 优化N+1查询，使用单次聚合查询批量获取所有产品的试衣次数
  private async getTopProducts(brandId: string, limit: number) {
    const products = await this.prisma.clothingItem.findMany({
      where: { brandId },
      orderBy: { viewCount: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        price: true,
        viewCount: true,
        likeCount: true,
        images: true,
        category: true,
      },
    });

    // 批量获取所有产品的试衣次数，避免N+1查询
    const productIds = products.map((p) => p.id);
    const tryOnCounts = await this.prisma.virtualTryOn.groupBy({
      by: ["itemId"],
      where: { itemId: { in: productIds } },
      _count: { id: true },
    });

    // 创建itemId到count的映射
    const tryOnMap = new Map(
      tryOnCounts.map((t) => [t.itemId, t._count.id]),
    );

    return products.map((p) => ({
      ...p,
      tryOnCount: tryOnMap.get(p.id) || 0,
    }));
  }

  /**
   * 获取详细的趋势数据（按天）
   */
  async getTrendData(brandId: string, range: { start: Date; end: Date }) {
    const products = await this.prisma.clothingItem.findMany({
      where: { brandId },
      select: { id: true },
    });
    const productIds = products.map((p) => p.id);

    if (productIds.length === 0) {
      return {
        dailyStats: [],
        dailyTryOns: [],
      };
    }

    const dailyStats = await this.prisma.$queryRaw<
      { date: Date; event_type: string; count: bigint }[]
    >`
      SELECT
        DATE(created_at) as date,
        event_type,
        COUNT(*) as count
      FROM user_behavior_events
      WHERE target_id = ANY(${productIds}::uuid[])
        AND created_at >= ${range.start}
        AND created_at <= ${range.end}
      GROUP BY DATE(created_at), event_type
      ORDER BY date ASC
    `;

    const dailyTryOns = await this.prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM virtual_try_on
      WHERE item_id = ANY(${productIds}::uuid[])
        AND created_at >= ${range.start}
        AND created_at <= ${range.end}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return {
      dailyStats: dailyStats.map((s) => ({
        date: s.date,
        eventType: s.event_type,
        count: Number(s.count),
      })),
      dailyTryOns: dailyTryOns.map((t) => ({
        date: t.date,
        count: Number(t.count),
      })),
    };
  }

  /**
   * 获取用户画像分布
   */
  async getAudienceInsights(brandId: string) {
    const productIds = (
      await this.prisma.clothingItem.findMany({
        where: { brandId },
        select: { id: true },
      })
    ).map((p) => p.id);

    // 获取与该品牌产品有交互的用户ID
    const interactions = await this.prisma.userBehaviorEvent.findMany({
      where: {
        targetId: { in: productIds },
        userId: { not: null },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const userIds = interactions
      .map((i) => i.userId)
      .filter(Boolean) as string[];

    if (userIds.length === 0) {
      return {
        totalUsers: 0,
        bodyTypeDistribution: {},
        colorSeasonDistribution: {},
        stylePreferences: {},
      };
    }

    // 获取这些用户的画像
    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: userIds } },
      select: { bodyType: true, colorSeason: true, stylePreferences: true },
    });

    // 统计分布
    const bodyTypeDistribution: Record<string, number> = {};
    const colorSeasonDistribution: Record<string, number> = {};
    const stylePreferences: Record<string, number> = {};

    profiles.forEach((p) => {
      if (p.bodyType) {
        bodyTypeDistribution[p.bodyType] =
          (bodyTypeDistribution[p.bodyType] || 0) + 1;
      }
      if (p.colorSeason) {
        colorSeasonDistribution[p.colorSeason] =
          (colorSeasonDistribution[p.colorSeason] || 0) + 1;
      }
      if (p.stylePreferences && Array.isArray(p.stylePreferences)) {
        (p.stylePreferences as Array<string | { name?: string }>).forEach((s) => {
          const style = typeof s === "string" ? s : s?.name;
          if (style) {
            stylePreferences[style] = (stylePreferences[style] || 0) + 1;
          }
        });
      }
    });

    return {
      totalUsers: userIds.length,
      bodyTypeDistribution,
      colorSeasonDistribution,
      stylePreferences,
    };
  }

  // ==================== Phase 5: Merchant Review + Order Management + Stock ====================

  /**
   * Auto-validation in applyForMerchant per D-09.
   * Validates business license format, phone number, brand name uniqueness.
   */
  private validateMerchantApplication(data: MerchantApplyDto): void {
    const businessLicenseRegex = /^[0-9A-HJ-NP-RTUW-Y]{2}\d{6}[0-9A-HJ-NP-RTUW-Y]{10}$/;
    const phoneRegex = /^1[3-9]\d{9}$/;

    if (!data.businessLicenseUrl || !businessLicenseRegex.test(data.businessLicenseUrl)) {
      throw new BadRequestException("营业执照号格式不正确（应为18位统一社会信用代码）");
    }

    if (!data.phone || !phoneRegex.test(data.phone)) {
      throw new BadRequestException("手机号格式不正确（应为11位手机号码）");
    }
  }

  /**
   * Check brand name uniqueness.
   */
  async checkBrandNameUnique(name: string): Promise<boolean> {
    const existing = await this.prisma.brand.findFirst({
      where: { name },
    });
    return !existing;
  }

  /**
   * Get pending merchant applications (admin).
   */
  async getPendingApplications() {
    return this.prisma.brand.findMany({
      where: { verified: false, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get single application details (admin).
   */
  async getMerchantApplication(brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      include: { merchants: true },
    });
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
    return brand;
  }

  /**
   * Approve merchant application (admin).
   */
  async approveMerchant(brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
    if (brand.verified) {
      throw new BadRequestException("该品牌已通过审核");
    }

    return this.prisma.brand.update({
      where: { id: brandId },
      data: { verified: true, verifiedAt: new Date() },
    });
  }

  /**
   * Reject merchant application (admin).
   */
  async rejectMerchant(brandId: string, reason: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    return this.prisma.brand.update({
      where: { id: brandId },
      data: {
        isActive: false,
        description: `${brand.description || ""}\n[拒绝原因]: ${reason}`,
      },
    });
  }

  /**
   * Get merchant orders with status filter and pagination.
   */
  async getMerchantOrders(
    brandId: string,
    options: { status?: string; page?: number; limit?: number } = {},
  ) {
    const { status, page = 1, limit = 20 } = options;

    const where: Record<string, unknown> = {
      items: {
        some: {
          item: { brandId },
        },
      },
      isDeleted: false,
    };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            where: { item: { brandId } },
          },
          address: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  /**
   * Ship an order (merchant).
   */
  async shipOrder(
    brandId: string,
    orderId: string,
    trackingNumber: string,
    carrier: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { item: true } } },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    // Verify order contains this brand's items
    const hasBrandItems = order.items.some(
      (item) => item.item?.brandId === brandId,
    );
    if (!hasBrandItems) {
      throw new ForbiddenException("该订单不包含您的商品");
    }

    if (order.status !== "paid" && order.status !== "processing") {
      throw new BadRequestException("当前订单状态不允许发货");
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "shipped",
        expressCompany: carrier,
        expressNo: trackingNumber,
        shipTime: new Date(),
      },
    });
  }

  /**
   * Update stock for a merchant's item.
   */
  async updateStock(brandId: string, itemId: string, stock: number) {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException("商品不存在");
    }
    if (item.brandId !== brandId) {
      throw new ForbiddenException("无权操作此商品");
    }

    return this.prisma.clothingItem.update({
      where: { id: itemId },
      data: { stock },
    });
  }

  /**
   * Get low stock items for a merchant.
   */
  async getLowStockItems(brandId: string) {
    return this.prisma.clothingItem.findMany({
      where: {
        brandId,
        isActive: true,
        stock: { lte: this.prisma.clothingItem.fields.lowStockThreshold?.name ? 10 : 10 },
      },
      orderBy: { stock: "asc" },
    });
  }
}
