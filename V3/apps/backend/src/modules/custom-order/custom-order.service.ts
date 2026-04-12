import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCustomOrderDto, ProductType } from './dto/create-custom-order.dto';
import { IPOD_PROVIDER } from './providers/pod-provider.interface';
import type { IPODProvider } from './providers/pod-provider.interface';

const PLATFORM_MARKUP_RATE = 2.5;

const PRODUCT_TYPE_BASE_COST: Record<string, number> = {
  [ProductType.TSHIRT]: 3000,
  [ProductType.HOODIE]: 6000,
  [ProductType.HAT]: 2000,
  [ProductType.BAG]: 3500,
  [ProductType.PHONE_CASE]: 1500,
};

@Injectable()
export class CustomOrderService {
  private readonly logger = new Logger(CustomOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IPOD_PROVIDER) private readonly podProvider: IPODProvider,
  ) {}

  async create(userId: string, dto: CreateCustomOrderDto) {
    const design = await this.prisma.customDesign.findUnique({
      where: { id: dto.design_id },
    });
    if (!design) {
      throw new NotFoundException('设计不存在');
    }
    if (design.userId !== userId) {
      throw new BadRequestException('无权使用该设计下单');
    }

    const template = await this.prisma.productTemplate.findFirst({
      where: {
        productType: dto.product_type,
        material: dto.material,
        isActive: true,
      },
    });

    const baseCost = template
      ? template.baseCost
      : PRODUCT_TYPE_BASE_COST[dto.product_type] ?? 3000;

    const unitPrice = Math.round(baseCost * PLATFORM_MARKUP_RATE);
    const quantity = dto.quantity ?? 1;
    const totalPrice = unitPrice * quantity;

    const order = await this.prisma.customOrder.create({
      data: {
        userId,
        designId: dto.design_id,
        productType: dto.product_type,
        material: dto.material,
        size: dto.size,
        quantity,
        unitPrice,
        totalPrice,
        status: 'pending',
        shippingAddress: dto.shipping_address as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`用户 ${userId} 创建定制订单 ${order.id}, 总价=${totalPrice}`);
    return this.toResponse(order);
  }

  async findAll(userId: string, status?: string) {
    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.customOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customOrder.count({ where }),
    ]);

    return {
      items: items.map((o) => this.toResponse(o)),
      total,
    };
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id: orderId },
      include: {
        design: {
          select: {
            name: true,
            previewImageUrl: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }

    const timeline = this.buildTimeline(order);

    return {
      ...this.toResponse(order),
      timeline,
      designName: order.design.name,
      designThumbnail: order.design.previewImageUrl,
    };
  }

  async cancel(userId: string, orderId: string) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== 'pending') {
      throw new BadRequestException('仅待付款订单可取消');
    }

    const updated = await this.prisma.customOrder.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    });

    this.logger.log(`用户 ${userId} 取消订单 ${orderId}`);
    return this.toResponse(updated);
  }

  async pay(userId: string, orderId: string) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== 'pending') {
      throw new BadRequestException('仅待付款订单可支付');
    }

    const podResult = await this.podProvider.submitOrder({
      designId: order.designId,
      productType: order.productType,
      material: order.material,
      size: order.size,
      quantity: order.quantity,
      shippingAddress: order.shippingAddress as Record<string, unknown>,
    });

    const updated = await this.prisma.customOrder.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        podOrderId: podResult.podOrderId,
        paymentInfo: {
          method: 'mock',
          paidAt: new Date().toISOString(),
          estimatedDays: podResult.estimatedDays,
        },
      },
    });

    this.logger.log(
      `用户 ${userId} 支付订单 ${orderId}, podOrderId=${podResult.podOrderId}`,
    );
    return this.toResponse(updated);
  }

  async track(userId: string, orderId: string) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (!order.podOrderId) {
      throw new BadRequestException('订单尚未提交生产，暂无物流信息');
    }

    const [podStatus, trackingInfo] = await Promise.all([
      this.podProvider.getOrderStatus(order.podOrderId),
      this.podProvider.getTracking(order.podOrderId),
    ]);

    const statusMap: Record<string, string> = {
      confirmed: 'paid',
      producing: 'producing',
      quality_check: 'producing',
      shipped: 'shipped',
      delivered: 'completed',
      cancelled: 'cancelled',
      pending: 'paid',
    };

    const mappedStatus = statusMap[podStatus] ?? order.status;

    if (mappedStatus !== order.status && mappedStatus === 'shipped') {
      await this.prisma.customOrder.update({
        where: { id: orderId },
        data: {
          status: 'shipped',
          trackingNumber: trackingInfo.trackingNumber,
        },
      });
    } else if (mappedStatus === 'completed' && order.status !== 'completed') {
      await this.prisma.customOrder.update({
        where: { id: orderId },
        data: { status: 'completed' },
      });
    }

    return {
      orderId: order.id,
      status: mappedStatus,
      tracking: trackingInfo,
    };
  }

  private buildTimeline(order: {
    status: string;
    createdAt: Date;
    updatedAt: Date;
    paymentInfo: unknown;
  }) {
    const paymentInfo = order.paymentInfo as Record<string, unknown> | null;
    const paidAt = (paymentInfo?.paidAt as string) ?? null;

    return {
      submittedAt: order.createdAt.toISOString(),
      paidAt,
      producingAt: paidAt ? new Date(new Date(paidAt).getTime() + 60 * 60 * 1000).toISOString() : null,
      shippedAt: order.status === 'shipped' || order.status === 'completed'
        ? order.updatedAt.toISOString()
        : null,
      completedAt: order.status === 'completed'
        ? order.updatedAt.toISOString()
        : null,
      cancelledAt: order.status === 'cancelled'
        ? order.updatedAt.toISOString()
        : null,
    };
  }

  private toResponse(order: {
    id: string;
    userId: string;
    designId: string;
    productType: string;
    material: string;
    size: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    status: string;
    podOrderId: string | null;
    trackingNumber: string | null;
    shippingAddress: unknown;
    paymentInfo: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: order.id,
      userId: order.userId,
      designId: order.designId,
      productType: order.productType,
      material: order.material,
      size: order.size,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      totalPrice: order.totalPrice,
      status: order.status,
      podOrderId: order.podOrderId,
      trackingNumber: order.trackingNumber,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
