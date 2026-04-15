import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RefundType, RefundRequestStatus, OrderStatus } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { PaymentService } from "../payment/payment.service";

import { CreateRefundRequestDto } from "./dto";

@Injectable()
export class RefundRequestService {
  private readonly logger = new Logger(RefundRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a refund request. Validates order ownership and status.
   * Amount is auto-calculated from order items.
   */
  async create(userId: string, dto: CreateRefundRequestDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException("订单不存在");
    }
    if (order.userId !== userId) {
      throw new BadRequestException("无权操作此订单");
    }

    const allowedStatuses: OrderStatus[] = [
      OrderStatus.paid,
      OrderStatus.shipped,
      OrderStatus.delivered,
    ];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException("当前订单状态不支持退款申请");
    }

    // Check for existing PENDING refund requests
    const existingPending = await this.prisma.refundRequest.findFirst({
      where: { orderId: dto.orderId, status: RefundRequestStatus.PENDING },
    });
    if (existingPending) {
      throw new BadRequestException("该订单已有待处理的退款申请");
    }

    // Auto-calculate refund amount from order items
    const amount = Number(order.finalAmount);

    // 校验退款金额不超过订单实际支付金额
    if (amount <= 0) {
      throw new BadRequestException("订单金额无效，无法申请退款");
    }

    // 检查该订单已有退款的总金额
    const existingRefunds = await this.prisma.refundRequest.findMany({
      where: {
        orderId: dto.orderId,
        status: { in: [RefundRequestStatus.PENDING, RefundRequestStatus.APPROVED, RefundRequestStatus.PROCESSING, RefundRequestStatus.COMPLETED] },
      },
      select: { amount: true },
    });
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + Number(r.amount), 0);
    if (totalRefunded + amount > Number(order.finalAmount)) {
      throw new BadRequestException(
        `退款金额超出订单支付金额，订单金额: ¥${order.finalAmount}，已退款: ¥${totalRefunded.toFixed(2)}，本次申请: ¥${amount.toFixed(2)}`,
      );
    }

    const refundRequest = await this.prisma.refundRequest.create({
      data: {
        orderId: dto.orderId,
        userId,
        type: dto.type as RefundType,
        reason: dto.reason,
        description: dto.description,
        images: dto.images ?? [],
        amount,
        status: RefundRequestStatus.PENDING,
      },
    });

    this.logger.log(`Refund request created: ${refundRequest.id} for order ${dto.orderId}`);
    return refundRequest;
  }

  /**
   * Approve a refund request (admin/merchant).
   */
  async approve(refundRequestId: string, adminNote?: string) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });
    if (!request) {
      throw new NotFoundException("退款申请不存在");
    }
    if (request.status !== RefundRequestStatus.PENDING) {
      throw new BadRequestException("当前状态不允许审批");
    }

    return this.prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: RefundRequestStatus.APPROVED,
        adminNote,
      },
    });
  }

  /**
   * Reject a refund request (admin/merchant).
   */
  async reject(refundRequestId: string, adminNote: string) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });
    if (!request) {
      throw new NotFoundException("退款申请不存在");
    }
    if (request.status !== RefundRequestStatus.PENDING) {
      throw new BadRequestException("当前状态不允许拒绝");
    }

    return this.prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: RefundRequestStatus.REJECTED,
        adminNote,
      },
    });
  }

  /**
   * Add tracking number for return-refund (user action after approval).
   */
  async addTrackingNumber(
    refundRequestId: string,
    userId: string,
    trackingNumber: string,
  ) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });
    if (!request) {
      throw new NotFoundException("退款申请不存在");
    }
    if (request.userId !== userId) {
      throw new BadRequestException("无权操作此退款申请");
    }
    if (request.type !== RefundType.RETURN_REFUND) {
      throw new BadRequestException("仅退货退款类型需要填写物流单号");
    }
    if (request.status !== RefundRequestStatus.APPROVED) {
      throw new BadRequestException("退款申请未通过审批，无法填写物流单号");
    }

    return this.prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        trackingNumber,
        status: RefundRequestStatus.PROCESSING,
      },
    });
  }

  /**
   * Complete the refund process. Calls PaymentService.refund.
   * Status machine:
   * - REFUND_ONLY: APPROVED -> COMPLETED
   * - RETURN_REFUND: PROCESSING -> COMPLETED
   */
  async completeRefund(refundRequestId: string) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });
    if (!request) {
      throw new NotFoundException("退款申请不存在");
    }

    const validStatuses: RefundRequestStatus[] = [];
    if (request.type === RefundType.REFUND_ONLY) {
      validStatuses.push(RefundRequestStatus.APPROVED);
    } else {
      validStatuses.push(RefundRequestStatus.PROCESSING);
    }

    if (!validStatuses.includes(request.status)) {
      throw new BadRequestException("当前状态无法完成退款");
    }

    // Call PaymentService to process the actual refund
    await this.paymentService.refund(request.userId, {
      orderId: request.orderId,
      amount: Number(request.amount),
      reason: request.reason,
    });

    // 退款成功后恢复库存
    const orderWithItems = await this.prisma.order.findUnique({
      where: { id: request.orderId },
      include: { items: true },
    });

    if (orderWithItems && orderWithItems.items.length > 0) {
      await this.prisma.$transaction(
        orderWithItems.items.map((item) =>
          this.prisma.clothingItem.update({
            where: { id: item.itemId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
      );
      this.logger.log(`Stock restored for order ${request.orderId} after refund ${refundRequestId}`);
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: RefundRequestStatus.COMPLETED,
        processedAt: new Date(),
      },
    });

    this.eventEmitter.emit("REFUND_COMPLETED", {
      refundRequestId,
      orderId: request.orderId,
      userId: request.userId,
      amount: Number(request.amount),
    });

    this.logger.log(`Refund completed: ${refundRequestId}`);
    return updated;
  }

  /**
   * Get user's refund requests with optional order filter.
   */
  async getUserRefundRequests(userId: string, orderId?: string) {
    const where: Record<string, unknown> = { userId };
    if (orderId) {
      where.orderId = orderId;
    }

    return this.prisma.refundRequest.findMany({
      where,
      include: {
        order: {
          select: {
            orderNo: true,
            status: true,
            items: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get all refund requests for an order (merchant/admin).
   */
  async getOrderRefundRequests(orderId: string) {
    return this.prisma.refundRequest.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
  }
}
