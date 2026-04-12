import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateBespokeOrderDto,
  SendMessageDto,
  CreateQuoteDto,
  CreateReviewDto,
  CancelOrderDto,
  BespokeOrderStatus,
  BespokeQuoteStatus,
} from './dto/bespoke.dto';
import {
  formatOrder,
  formatOrderWithStudio,
  formatQuote,
  type OrderRow,
  type OrderWithStudioRow,
  type QuoteRow,
} from './bespoke-orders.formatter';

const VALID_TRANSITIONS: Record<BespokeOrderStatus, BespokeOrderStatus[]> = {
  submitted: ['quoted', 'cancelled'],
  quoted: ['paid', 'cancelled'],
  paid: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

@Injectable()
export class BespokeOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateBespokeOrderDto) {
    const studio = await this.prisma.bespokeStudio.findUnique({
      where: { id: dto.studioId },
    });

    if (!studio || !studio.isActive) {
      throw new NotFoundException('工作室不存在或已下线');
    }

    const statusHistory = [
      {
        status: 'submitted',
        at: new Date().toISOString(),
        by: userId,
        note: '提交定制需求',
      },
    ];

    const order = await this.prisma.bespokeOrder.create({
      data: {
        userId,
        studioId: dto.studioId,
        status: 'submitted',
        title: dto.title,
        description: dto.description,
        referenceImages: dto.referenceImages ?? [],
        budgetRange: dto.budgetRange,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        measurements: dto.measurements ?? undefined,
        statusHistory,
      },
    });

    await this.prisma.bespokeStudio.update({
      where: { id: dto.studioId },
      data: { orderCount: { increment: 1 } },
    });

    return formatOrder(order as OrderRow);
  }

  async getOrders(
    userId: string,
    page = 1,
    limit = 20,
    status?: string,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const where = {
      userId,
      ...(status ? { status } : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.bespokeOrder.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          studio: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              city: true,
              specialties: true,
              rating: true,
            },
          },
        },
      }),
      this.prisma.bespokeOrder.count({ where }),
    ]);

    return {
      items: orders.map((o) => formatOrderWithStudio(o as OrderWithStudioRow)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.bespokeOrder.findUnique({
      where: { id: orderId },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            city: true,
            specialties: true,
            rating: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.userId !== userId) {
      const studio = await this.prisma.bespokeStudio.findFirst({
        where: { id: order.studioId, userId },
      });
      if (!studio) {
        throw new ForbiddenException('无权查看此订单');
      }
    }

    return formatOrderWithStudio(order as OrderWithStudioRow);
  }

  async cancelOrder(userId: string, orderId: string, dto: CancelOrderDto) {
    const order = await this.prisma.bespokeOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('无权操作此订单');
    }

    this.validateTransition(order.status as BespokeOrderStatus, 'cancelled');

    const statusHistory = [
      ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
      {
        status: 'cancelled',
        at: new Date().toISOString(),
        by: userId,
        note: dto.cancelReason ?? '用户取消',
      },
    ];

    const updated = await this.prisma.bespokeOrder.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason,
        statusHistory,
      },
    });

    return formatOrder(updated as OrderRow);
  }

  async getMessages(
    userId: string,
    orderId: string,
    page = 1,
    limit = 50,
  ) {
    const order = await this.prisma.bespokeOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    await this.assertOrderAccess(userId, order);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [messages, total] = await Promise.all([
      this.prisma.bespokeMessage.findMany({
        where: { orderId },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { id: true, nickname: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.bespokeMessage.count({ where: { orderId } }),
    ]);

    return {
      items: messages.map((m) => ({
        id: m.id,
        orderId: m.orderId,
        senderId: m.senderId,
        content: m.content,
        messageType: m.messageType,
        attachments: m.attachments,
        isRead: m.isRead,
        createdAt: m.createdAt.toISOString(),
        sender: m.sender
          ? {
              id: m.sender.id,
              nickname: m.sender.nickname,
              avatarUrl: m.sender.avatarUrl,
            }
          : undefined,
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async sendMessage(userId: string, orderId: string, dto: SendMessageDto) {
    const order = await this.prisma.bespokeOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('订单已取消，无法发送消息');
    }

    await this.assertOrderAccess(userId, order);

    const message = await this.prisma.bespokeMessage.create({
      data: {
        orderId,
        senderId: userId,
        content: dto.content,
        messageType: dto.messageType ?? 'text',
        attachments: dto.attachments ?? [],
      },
      include: {
        sender: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
    });

    return {
      id: message.id,
      orderId: message.orderId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      attachments: message.attachments,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender
        ? {
            id: message.sender.id,
            nickname: message.sender.nickname,
            avatarUrl: message.sender.avatarUrl,
          }
        : undefined,
    };
  }

  async createQuote(userId: string, orderId: string, dto: CreateQuoteDto) {
    const order = await this.prisma.bespokeOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const studio = await this.prisma.bespokeStudio.findFirst({
      where: { id: order.studioId, userId },
    });

    if (!studio) {
      throw new ForbiddenException('只有工作室所有者才能发送报价');
    }

    if (order.status !== 'submitted' && order.status !== 'quoted') {
      throw new BadRequestException('当前订单状态不允许报价');
    }

    const quote = await this.prisma.bespokeQuote.create({
      data: {
        orderId,
        studioId: studio.id,
        totalPrice: dto.totalPrice,
        items: dto.items as unknown as import('@prisma/client').Prisma.InputJsonValue,
        estimatedDays: dto.estimatedDays,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
      },
    });

    if (order.status === 'submitted') {
      const statusHistory = [
        ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
        {
          status: 'quoted',
          at: new Date().toISOString(),
          by: userId,
          note: '工作室发送报价',
        },
      ];

      await this.prisma.bespokeOrder.update({
        where: { id: orderId },
        data: { status: 'quoted', statusHistory },
      });
    }

    return formatQuote(quote as QuoteRow);
  }

  async getQuotes(userId: string, orderId: string) {
    const order = await this.prisma.bespokeOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    await this.assertOrderAccess(userId, order);

    const quotes = await this.prisma.bespokeQuote.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return quotes.map((q) => formatQuote(q as QuoteRow));
  }

  async acceptQuote(userId: string, quoteId: string) {
    const quote = await this.prisma.bespokeQuote.findUnique({
      where: { id: quoteId },
      include: { order: true },
    });

    if (!quote) {
      throw new NotFoundException('报价不存在');
    }

    if (quote.order.userId !== userId) {
      throw new ForbiddenException('只有订单所有者才能接受报价');
    }

    if (quote.status !== 'pending') {
      throw new BadRequestException('该报价已处理，无法再次操作');
    }

    if (quote.order.status !== 'quoted') {
      throw new BadRequestException('当前订单状态不允许接受报价');
    }

    if (quote.validUntil && new Date() > quote.validUntil) {
      throw new BadRequestException('报价已过期');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedQuote = await tx.bespokeQuote.update({
        where: { id: quoteId },
        data: { status: 'accepted' as BespokeQuoteStatus },
      });

      await tx.bespokeQuote.updateMany({
        where: {
          orderId: quote.orderId,
          id: { not: quoteId },
          status: 'pending',
        },
        data: { status: 'rejected' as BespokeQuoteStatus },
      });

      const statusHistory = [
        ...(Array.isArray(quote.order.statusHistory)
          ? quote.order.statusHistory
          : []),
        {
          status: 'paid',
          at: new Date().toISOString(),
          by: userId,
          note: '用户接受报价',
        },
      ];

      await tx.bespokeOrder.update({
        where: { id: quote.orderId },
        data: { status: 'paid', statusHistory },
      });

      return updatedQuote;
    });

    return formatQuote(result as QuoteRow);
  }

  async rejectQuote(userId: string, quoteId: string) {
    const quote = await this.prisma.bespokeQuote.findUnique({
      where: { id: quoteId },
      include: { order: true },
    });

    if (!quote) {
      throw new NotFoundException('报价不存在');
    }

    if (quote.order.userId !== userId) {
      throw new ForbiddenException('只有订单所有者才能拒绝报价');
    }

    if (quote.status !== 'pending') {
      throw new BadRequestException('该报价已处理，无法再次操作');
    }

    const updated = await this.prisma.bespokeQuote.update({
      where: { id: quoteId },
      data: { status: 'rejected' as BespokeQuoteStatus },
    });

    return formatQuote(updated as QuoteRow);
  }

  async createReview(userId: string, orderId: string, dto: CreateReviewDto) {
    const order = await this.prisma.bespokeOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('只有订单所有者才能评价');
    }

    if (order.status !== 'completed') {
      throw new BadRequestException('只有已完成的订单才能评价');
    }

    const existingReview = await this.prisma.bespokeReview.findUnique({
      where: { orderId },
    });

    if (existingReview) {
      throw new BadRequestException('该订单已评价');
    }

    const review = await this.prisma.bespokeReview.create({
      data: {
        orderId,
        userId,
        studioId: order.studioId,
        rating: dto.rating,
        content: dto.content,
        images: dto.images ?? [],
        isAnonymous: String(dto.isAnonymous) === 'true',
      },
    });

    await this.updateStudioRating(order.studioId);

    return {
      id: review.id,
      orderId: review.orderId,
      userId: review.userId,
      studioId: review.studioId,
      rating: review.rating,
      content: review.content,
      images: review.images,
      isAnonymous: review.isAnonymous,
      createdAt: review.createdAt.toISOString(),
    };
  }

  async getStudioOrders(
    userId: string,
    page = 1,
    limit = 20,
    status?: string,
  ) {
    const studio = await this.prisma.bespokeStudio.findFirst({
      where: { userId, isActive: true },
    });

    if (!studio) {
      throw new ForbiddenException('您不是工作室主理人');
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const where = {
      studioId: studio.id,
      ...(status ? { status } : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.bespokeOrder.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, nickname: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.bespokeOrder.count({ where }),
    ]);

    return {
      items: orders.map((o) => ({
        ...formatOrder(o as OrderRow),
        customer: o.user
          ? { id: o.user.id, nickname: o.user.nickname, avatarUrl: o.user.avatarUrl }
          : undefined,
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async updateOrderStatus(
    userId: string,
    orderId: string,
    newStatus: BespokeOrderStatus,
    note?: string,
  ) {
    const order = await this.prisma.bespokeOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const studio = await this.prisma.bespokeStudio.findFirst({
      where: { id: order.studioId, userId },
    });

    if (!studio) {
      throw new ForbiddenException('只有工作室主理人才能更新订单状态');
    }

    this.validateTransition(order.status as BespokeOrderStatus, newStatus);

    const statusHistory = [
      ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
      {
        status: newStatus,
        at: new Date().toISOString(),
        by: userId,
        note: note ?? `工作室更新状态为${newStatus}`,
      },
    ];

    const updateData: Record<string, unknown> = {
      status: newStatus,
      statusHistory,
    };

    if (newStatus === 'completed') {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.bespokeOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    return formatOrder(updated as OrderRow);
  }

  private validateTransition(
    from: BespokeOrderStatus,
    to: BespokeOrderStatus,
  ): void {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new BadRequestException(
        `订单状态不能从 "${from}" 变更为 "${to}"`,
      );
    }
  }

  private async assertOrderAccess(
    userId: string,
    order: { userId: string; studioId: string },
  ): Promise<void> {
    if (order.userId === userId) return;

    const studio = await this.prisma.bespokeStudio.findFirst({
      where: { id: order.studioId, userId },
    });

    if (!studio) {
      throw new ForbiddenException('无权访问此订单');
    }
  }

  private async updateStudioRating(studioId: string): Promise<void> {
    const stats = await this.prisma.bespokeReview.aggregate({
      where: { studioId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.bespokeStudio.update({
      where: { id: studioId },
      data: {
        rating: stats._avg.rating ?? 0,
        reviewCount: stats._count.rating,
      },
    });
  }
}
