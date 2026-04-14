import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { OrderStatus, Prisma , Order, OrderItem, OrderAddress } from "@prisma/client";
import { Cron } from "@nestjs/schedule";

import { EncryptionService } from "../../common/encryption/encryption.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SoftDeleteService } from "../../common/soft-delete";
import { NotificationService } from "../notification/services/notification.service";
import {
  PaymentMethod as PaymentDtoMethod,
  PaymentProvider as PaymentDtoProvider,
} from "../payment/dto";
import { PaymentService } from "../payment/payment.service";

export interface CreateOrderDto {
  items: {
    itemId: string;
    color: string;
    size: string;
    quantity: number;
  }[];
  addressId: string;
  remark?: string;
}

export interface OrderResponse {
  id: string;
  orderNo: string;
  status: string;
  items: OrderItemResponse[];
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  finalAmount: number;
  shippingAddress: ShippingAddressResponse;
  paymentMethod?: string;
  paymentTime?: Date;
  shipTime?: Date;
  receiveTime?: Date;
  expressCompany?: string;
  expressNo?: string;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemResponse {
  id: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

// FIX-CODE-005: 定义类型安全的Order类型 (修复时间: 2026-03-19)

interface OrderWithRelations extends Order {
  items: OrderItem[];
  address: OrderAddress | null;
}

export interface ShippingAddressResponse {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
}

export interface OrderTrackingTimeline {
  time: Date;
  status: string;
  description?: string;
  trackingNumber?: string;
  carrier?: string;
}

export interface OrderTrackingResponse {
  expressCompany: string;
  expressNo: string;
  status: string;
  timeline: OrderTrackingTimeline[];
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private softDeleteService: SoftDeleteService,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<OrderResponse> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("订单商品不能为空");
    }

    const address = await this.prisma.userAddress.findFirst({
      where: { id: dto.addressId, userId },
    });

    if (!address) {
      throw new NotFoundException("收货地址不存在");
    }

    // 批量查询所有商品（修复 N+1 查询问题）
    const itemIds = dto.items.map((item) => item.itemId);
    const clothingItems = await this.prisma.clothingItem.findMany({
      where: { id: { in: itemIds } },
    });

    // 创建商品 ID 到商品的映射
    const itemMap = new Map(clothingItems.map((item) => [item.id, item]));

    // 验证所有商品并检查库存
    const itemsWithDetails = dto.items.map((item) => {
      const clothingItem = itemMap.get(item.itemId);

      if (!clothingItem) {
        throw new NotFoundException(`商品 ${item.itemId} 不存在`);
      }

      if (!clothingItem.isActive) {
        throw new BadRequestException(`商品 ${clothingItem.name} 已下架`);
      }

      // FIX-BL-010: 库存校验 (修复时间: 2026-03-19)
      if (clothingItem.stock < item.quantity) {
        throw new BadRequestException(
          `商品 ${clothingItem.name} 库存不足，当前库存: ${clothingItem.stock}，需要: ${item.quantity}`
        );
      }

      return {
        ...item,
        clothingItem,
      };
    });

    let totalAmount = 0;
    const orderItems = itemsWithDetails.map((item) => {
      totalAmount += Number(item.clothingItem.price) * item.quantity;
      return {
        itemId: item.itemId,
        itemName: item.clothingItem.name,
        itemImage: item.clothingItem.images[0] || "",
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: Number(item.clothingItem.price),
      };
    });

    const shippingFee = totalAmount >= 99 ? 0 : 10;
    const finalAmount = totalAmount + shippingFee;

    const orderNo = this.generateOrderNo();

    const order = await this.prisma.$transaction(async (tx) => {
      // FIX-BL-010: 扣减库存 (修复时间: 2026-03-19)
      for (const item of itemsWithDetails) {
        const updated = await tx.clothingItem.updateMany({
          where: {
            id: item.itemId,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updated.count === 0) {
          throw new BadRequestException(
            `商品 ${item.clothingItem.name} 库存已被抢光，请重新下单`
          );
        }
      }

      const newOrder = await tx.order.create({
        data: {
          orderNo,
          userId,
          status: OrderStatus.pending,
          totalAmount,
          shippingFee,
          discountAmount: 0,
          finalAmount,
          remark: dto.remark,
          items: {
            create: orderItems,
          },
          address: {
            create: {
              name: address.name,
              phone: address.phone,
              province: address.province,
              city: address.city,
              district: address.district,
              address: address.address,
            },
          },
        },
        include: {
          items: true,
          address: true,
        },
      });

      for (const item of dto.items) {
        await tx.cartItem.deleteMany({
          where: {
            userId,
            itemId: item.itemId,
            color: item.color,
            size: item.size,
          },
        });
      }

      return newOrder;
    });

    this.logger.log(`Order created: ${orderNo} for user ${userId}`);

    return this.mapToOrderResponse(order);
  }

  async findAll(
    userId: string,
    options: { status?: string; page?: number; limit?: number } = {},
  ): Promise<{ items: OrderResponse[]; total: number }> {
    const { status, page = 1, limit = 10 } = options;

    const where: Prisma.OrderWhereInput = { userId, isDeleted: false };
    if (status) {
      where.status = status as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          address: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.mapToOrderResponse(order)),
      total,
    };
  }

  async findOne(userId: string, orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, isDeleted: false },
      include: {
        items: true,
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    return this.mapToOrderResponse(order);
  }

  /**
   * 软删除订单
   */
  async softDeleteOrder(userId: string, orderId: string): Promise<{ success: boolean }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, isDeleted: false },
    });

    if (!order) {
      throw new NotFoundException("订单不存在或已被删除");
    }

    // 只有已取消或已完成的订单才能软删除
    if (!["cancelled", "delivered", "refunded"].includes(order.status)) {
      throw new BadRequestException("只能删除已取消、已送达或已退款的订单");
    }

    const success = await this.softDeleteService.softDelete(
      this.prisma,
      'order',
      orderId,
    );

    return { success };
  }

  async pay(
    userId: string,
    orderId: string,
    paymentMethod: string,
  ): Promise<{ paymentUrl?: string; qrCode?: string }> {
    const order = await this.findOne(userId, orderId);

    if (order.status !== "pending") {
      throw new BadRequestException("订单状态不允许支付");
    }

    const paymentResult = await this.paymentService.createPayment(userId, {
      orderId: order.id,
      amount: Number(order.finalAmount),
      provider:
        paymentMethod === PaymentDtoProvider.WECHAT
          ? PaymentDtoProvider.WECHAT
          : PaymentDtoProvider.ALIPAY,
      method: PaymentDtoMethod.QRCODE,
      subject: `寻裳订单 ${order.orderNo}`,
    });

    if (paymentResult.success) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentMethod,
        },
      });

      return {
        paymentUrl: paymentResult.h5Url,
        qrCode: paymentResult.qrCode,
      };
    }

    throw new BadRequestException(
      paymentResult.error?.message || "支付创建失败",
    );
  }

  async cancel(userId: string, orderId: string): Promise<void> {
    const order = await this.findOne(userId, orderId);

    if (!["pending", "paid"].includes(order.status)) {
      throw new BadRequestException("订单状态不允许取消");
    }

    // FIX-CODE-013: 已支付订单需要发起退款 (修复时间: 2026-03-19)
    if (order.status === "paid") {
      try {
        await this.paymentService.refund(userId, {
          orderId: order.id,
          amount: order.finalAmount,
          reason: "用户取消订单",
        });
        this.logger.log(`Refund initiated for cancelled order: ${orderId}`);
      } catch (error) {
        this.logger.error(`Failed to refund for order ${orderId}: ${error}`);
        throw new BadRequestException("取消订单失败，退款处理异常，请联系客服");
      }
    }

    // FIX-BL-011: 取消订单后恢复库存 (修复时间: 2026-03-19)
    const orderWithItems = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    // Batch stock restoration in a single transaction (fixes N+1)
    await this.prisma.$transaction([
      ...(orderWithItems?.items || []).map(item =>
        this.prisma.clothingItem.update({
          where: { id: item.itemId },
          data: { stock: { increment: item.quantity } },
        })
      ),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.cancelled },
      }),
    ]);

    this.logger.log(`Order cancelled: ${orderId}`);
  }

  async confirm(userId: string, orderId: string): Promise<void> {
    const order = await this.findOne(userId, orderId);

    if (order.status !== "shipped") {
      throw new BadRequestException("订单状态不允许确认收货");
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.delivered,
        receiveTime: new Date(),
      },
    });

    this.logger.log(`Order confirmed: ${orderId}`);
  }

  async getTracking(userId: string, orderId: string): Promise<OrderTrackingResponse> {
    const order = await this.findOne(userId, orderId);

    if (!order.expressCompany || !order.expressNo) {
      throw new BadRequestException("暂无物流信息");
    }

    const timeline: OrderTrackingTimeline[] = [
      {
        time: order.createdAt,
        status: "订单创建",
      },
    ];

    if (order.paymentTime) {
      timeline.push({ time: order.paymentTime, status: "支付成功" });
    }
    if (order.shipTime) {
      timeline.push({ time: order.shipTime, status: "已发货" });
    }
    if (order.receiveTime) {
      timeline.push({ time: order.receiveTime, status: "已签收" });
    }

    return {
      expressCompany: order.expressCompany,
      expressNo: order.expressNo,
      status: order.status,
      timeline,
    };
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    extraData?: Record<string, unknown>,
  ): Promise<void> {
    const updateData: Prisma.OrderUpdateInput = { status };

    if (status === OrderStatus.paid) {
      updateData.paymentTime = new Date();
      updateData.paidAt = new Date();
    }

    if (status === OrderStatus.shipped) {
      updateData.shipTime = new Date();
      if (extraData?.expressCompany) {
        updateData.expressCompany = extraData.expressCompany as string;
      }
      if (extraData?.expressNo) {
        updateData.expressNo = extraData.expressNo as string;
      }
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  private generateOrderNo(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    return `SM${year}${month}${day}${random}`;
  }

  // FIX-CODE-005: 使用类型安全的参数 (修复时间: 2026-03-19)
  private mapToOrderResponse(order: OrderWithRelations): OrderResponse {
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      items: (order.items || []).map((item) => ({
        id: item.id,
        itemId: item.itemId,
        itemName: item.itemName,
        itemImage: item.itemImage,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      totalAmount: Number(order.totalAmount),
      shippingFee: Number(order.shippingFee),
      discountAmount: Number(order.discountAmount),
      finalAmount: Number(order.finalAmount),
      shippingAddress: order.address
        ? {
            name: order.address.name,
            phone: order.address.phone,
            province: order.address.province,
            city: order.address.city,
            district: order.address.district,
            address: order.address.address,
          }
        : {
            name: "",
            phone: "",
            province: "",
            city: "",
            district: "",
            address: "",
          },
      paymentMethod: order.paymentMethod ?? undefined,
      paymentTime: order.paymentTime ?? undefined,
      shipTime: order.shipTime ?? undefined,
      receiveTime: order.receiveTime ?? undefined,
      expressCompany: order.expressCompany ?? undefined,
      expressNo: order.expressNo ?? undefined,
      remark: order.remark ?? undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  // ==================== Phase 5: Enhanced order methods ====================

  /**
   * Confirm receipt (user action). Validates SHIPPED status.
   */
  async confirmReceipt(userId: string, orderId: string): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, isDeleted: false },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }
    if (order.status !== OrderStatus.shipped) {
      throw new BadRequestException("只有已发货的订单才能确认收货");
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.delivered,
        receiveTime: new Date(),
      },
    });

    this.logger.log(`Order receipt confirmed: ${orderId}`);
  }

  /**
   * Enhanced getTracking with structured timeline per D-18.
   */
  async getStructuredTracking(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, isDeleted: false },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }

    const timeline: OrderTrackingTimeline[] = [
      { status: "pending", time: order.createdAt, description: "订单已创建" },
    ];

    if (order.paidAt) {
      timeline.push({ status: "paid", time: order.paidAt, description: "支付成功" });
    }
    if (order.shipTime) {
      timeline.push({
        status: "shipped",
        time: order.shipTime,
        description: "商家已发货",
        trackingNumber: order.expressNo ?? undefined,
        carrier: order.expressCompany ?? undefined,
      });
    }
    if (order.receiveTime) {
      timeline.push({ status: "delivered", time: order.receiveTime, description: "已签收" });
    }

    return {
      expressCompany: order.expressCompany,
      expressNo: order.expressNo,
      status: order.status,
      timeline,
    };
  }

  /**
   * Get orders by tab with pagination.
   * Tabs: all, pending, paid, shipped, completed, refund
   */
  async getOrdersByTab(
    userId: string,
    tab: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const where: Prisma.OrderWhereInput = { userId, isDeleted: false };

    switch (tab) {
      case "pending":
        where.status = OrderStatus.pending;
        break;
      case "paid":
        where.status = { in: [OrderStatus.paid, OrderStatus.processing] };
        break;
      case "shipped":
        where.status = OrderStatus.shipped;
        break;
      case "completed":
        where.status = OrderStatus.delivered;
        break;
      case "refund":
        where.refundRequests = { some: {} };
        break;
      case "all":
      default:
        break;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true, address: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.mapToOrderResponse(order)),
      total,
      page,
      limit,
    };
  }

  /**
   * Auto-confirm cron: daily at midnight.
   * Confirms shipped orders older than 15 days.
   */
  @Cron("0 0 * * *")
  async autoConfirmOrders() {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const result = await this.prisma.order.updateMany({
      where: {
        status: OrderStatus.shipped,
        shipTime: { lt: fifteenDaysAgo },
      },
      data: {
        status: OrderStatus.delivered,
        receiveTime: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(`Auto-confirmed ${result.count} orders older than 15 days`);
    }
  }
}
