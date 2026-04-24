import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { OrderStatus } from "../../../types/prisma-enums";

@Injectable()
export class MerchantOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async getMerchantOrders(
    brandId: string,
    options: { status?: string; page?: number; limit?: number } = {}
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

  async shipOrder(brandId: string, orderId: string, trackingNumber: string, carrier: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { item: true } } },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    const hasBrandItems = order.items.some(
      (item: { item?: { brandId: string | null } | null }) => item.item?.brandId === brandId
    );
    if (!hasBrandItems) {
      throw new ForbiddenException("该订单不包含您的商品");
    }

    if (order.status !== OrderStatus.paid && order.status !== OrderStatus.processing) {
      throw new BadRequestException("当前订单状态不允许发货");
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.shipped,
        expressCompany: carrier,
        expressNo: trackingNumber,
        shipTime: new Date(),
      },
    });
  }

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
