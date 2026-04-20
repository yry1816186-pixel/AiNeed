import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import Decimal from "decimal.js";
import { ConsultantStatus, BookingStatus, EarningStatus } from "../../../types/prisma-enums";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { PaymentService } from "../../commerce/payment/payment.service";
import { Prisma } from "@prisma/client";

import {
  CreateServiceBookingDto,
  UpdateServiceBookingDto,
  BookingQueryDto,
  BookingStatusDto,
} from "./dto";

@Injectable()
export class ConsultantBookingService {
  private readonly logger = new Logger(ConsultantBookingService.name);

  private static readonly DEPOSIT_RATE = 0.3;
  private static readonly PLATFORM_FEE_RATE = 0.15;
  private static readonly LATE_CANCEL_PENALTY_RATE = 0.2;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService
  ) {}

  async createBooking(userId: string, dto: CreateServiceBookingDto) {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: dto.consultantId },
    });

    if (!consultant) {
      throw new NotFoundException("顾问不存在");
    }

    if (consultant.status !== ConsultantStatus.active) {
      throw new BadRequestException("该顾问暂不可预约");
    }

    if (consultant.userId === userId) {
      throw new BadRequestException("不能预约自己");
    }

    const depositAmount = new Decimal(dto.price)
      .mul(ConsultantBookingService.DEPOSIT_RATE)
      .toFixed(2);
    const finalPaymentAmount = new Decimal(dto.price)
      .mul(1 - ConsultantBookingService.DEPOSIT_RATE)
      .toFixed(2);

    return this.prisma.serviceBooking.create({
      data: {
        userId,
        consultantId: dto.consultantId,
        serviceType: dto.serviceType,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? 60,
        notes: dto.notes,
        price: dto.price,
        currency: dto.currency ?? "CNY",
        status: BookingStatus.pending,
        depositAmount: new Decimal(depositAmount),
        finalPaymentAmount: new Decimal(finalPaymentAmount),
        platformFee: new Decimal(0),
        consultantPayout: new Decimal(0),
      },
      include: {
        consultant: {
          select: {
            id: true,
            studioName: true,
            avatar: true,
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
    });
  }

  async getBookingsByUser(userId: string, query: BookingQueryDto) {
    const { page = 1, pageSize = 20, status, serviceType, consultantId } = query;

    const where: Prisma.ServiceBookingWhereInput = { userId };

    if (status) {
      where.status = status;
    }
    if (serviceType) {
      where.serviceType = serviceType;
    }
    if (consultantId) {
      where.consultantId = consultantId;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.serviceBooking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          consultant: {
            select: {
              id: true,
              studioName: true,
              avatar: true,
              user: {
                select: {
                  id: true,
                  nickname: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.serviceBooking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getBookingById(userId: string, bookingId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        consultant: {
          select: {
            id: true,
            studioName: true,
            avatar: true,
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("预约不存在");
    }

    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: booking.consultantId },
    });
    if (booking.userId !== userId && consultant?.userId !== userId) {
      throw new ForbiddenException("无权查看此预约");
    }

    return booking;
  }

  async updateBooking(userId: string, bookingId: string, dto: UpdateServiceBookingDto) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException("预约不存在");
    }

    const data: Prisma.ServiceBookingUpdateInput = {};

    if (dto.scheduledAt !== undefined) {
      data.scheduledAt = new Date(dto.scheduledAt);
    }
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes;
    }

    if (dto.status !== undefined) {
      if (dto.status === BookingStatusDto.CANCELLED) {
        if (booking.userId !== userId) {
          throw new ForbiddenException("仅预约用户可取消预约");
        }
        if (
          booking.status === BookingStatus.completed ||
          booking.status === BookingStatus.cancelled
        ) {
          throw new BadRequestException("已完成的预约无法取消");
        }
        data.status = BookingStatus.cancelled;
        data.cancelReason = dto.cancelReason;
        data.cancelledAt = new Date();

        if (booking.depositPaidAt) {
          const hoursUntilBooking = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);

          if (hoursUntilBooking >= 24) {
            this.logger.log(`预约 ${bookingId} 提前24h取消，全额退定金 ${booking.depositAmount}`);
            try {
              await this.paymentService.refund(userId, {
                orderId: bookingId,
                amount: Number(booking.depositAmount),
                reason: `顾问预约提前24h取消，全额退定金`,
              });
            } catch (refundErr) {
              const msg = refundErr instanceof Error ? refundErr.message : String(refundErr);
              this.logger.warn(`全额定金退款失败 (booking=${bookingId}): ${msg}`);
            }
          } else {
            const penaltyAmount =
              Number(booking.depositAmount) * ConsultantBookingService.LATE_CANCEL_PENALTY_RATE;
            const refundAmount = Number(booking.depositAmount) - penaltyAmount;
            this.logger.log(
              `预约 ${bookingId} 24h内取消，退定金80%: ${refundAmount}，扣20%: ${penaltyAmount}`
            );
            try {
              await this.paymentService.refund(userId, {
                orderId: bookingId,
                amount: refundAmount,
                reason: `顾问预约24h内取消，退定金80%（扣违约金20%: ${penaltyAmount}）`,
              });
            } catch (refundErr) {
              const msg = refundErr instanceof Error ? refundErr.message : String(refundErr);
              this.logger.warn(`部分定金退款失败 (booking=${bookingId}): ${msg}`);
            }
          }
        }
      } else if (
        dto.status === BookingStatusDto.CONFIRMED ||
        dto.status === BookingStatusDto.IN_PROGRESS ||
        dto.status === BookingStatusDto.COMPLETED ||
        dto.status === BookingStatusDto.NO_SHOW
      ) {
        const consultant = await this.prisma.consultantProfile.findUnique({
          where: { id: booking.consultantId },
        });
        if (consultant?.userId !== userId) {
          throw new ForbiddenException("仅顾问可更新此预约状态");
        }
        data.status = dto.status;
        if (dto.status === BookingStatusDto.COMPLETED) {
          data.completedAt = new Date();
        }
      }
    }

    return this.prisma.serviceBooking.update({
      where: { id: bookingId },
      data,
      include: {
        consultant: {
          select: {
            id: true,
            studioName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getBookingsByConsultant(userId: string, consultantId: string, query: BookingQueryDto) {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });

    if (!consultant) {
      throw new NotFoundException("顾问不存在");
    }

    if (consultant.userId !== userId) {
      throw new ForbiddenException("无权查看此顾问的预约");
    }

    const { page = 1, pageSize = 20, status, serviceType } = query;

    const where: Prisma.ServiceBookingWhereInput = { consultantId };

    if (status) {
      where.status = status;
    }
    if (serviceType) {
      where.serviceType = serviceType;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.serviceBooking.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.serviceBooking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async payDeposit(userId: string, bookingId: string) {
    const booking = await this.getBookingById(userId, bookingId);

    if (booking.status !== BookingStatus.pending) {
      throw new BadRequestException("预约状态不允许支付定金");
    }
    if (booking.depositPaidAt) {
      throw new BadRequestException("定金已支付");
    }

    return {
      bookingId: booking.id,
      amount: Number(booking.depositAmount),
      currency: booking.currency,
      paymentCategory: "consultant_deposit",
    };
  }

  async payFinalPayment(userId: string, bookingId: string) {
    const booking = await this.getBookingById(userId, bookingId);

    if (booking.status !== BookingStatus.completed) {
      throw new BadRequestException("服务未完成，无法支付尾款");
    }
    if (booking.finalPaidAt) {
      throw new BadRequestException("尾款已支付");
    }
    if (!booking.depositPaidAt) {
      throw new BadRequestException("请先支付定金");
    }

    return {
      bookingId: booking.id,
      amount: Number(booking.finalPaymentAmount),
      currency: booking.currency,
      paymentCategory: "consultant_final",
    };
  }

  async confirmDepositPayment(bookingId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException("预约不存在");
    }

    if (booking.depositPaidAt) {
      this.logger.warn(`预约 ${bookingId} 定金已确认，跳过重复操作`);
      return booking;
    }

    return this.prisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        depositPaidAt: new Date(),
        status: BookingStatus.confirmed,
      },
    });
  }

  async confirmFinalPayment(bookingId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException("预约不存在");
    }

    if (booking.finalPaidAt) {
      this.logger.warn(`预约 ${bookingId} 尾款已确认，跳过重复操作`);
      return booking;
    }

    const totalPrice = Number(booking.price);
    const platformFee = totalPrice * ConsultantBookingService.PLATFORM_FEE_RATE;
    const consultantPayout = totalPrice - platformFee;

    const updated = await this.prisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        finalPaidAt: new Date(),
        platformFee: new Decimal(platformFee.toFixed(2)),
        consultantPayout: new Decimal(consultantPayout.toFixed(2)),
      },
    });

    await this.prisma.consultantEarning.create({
      data: {
        consultantId: booking.consultantId,
        bookingId: booking.id,
        userId: booking.userId,
        amount: booking.price,
        platformFee: new Decimal(platformFee.toFixed(2)),
        netAmount: new Decimal(consultantPayout.toFixed(2)),
        status: EarningStatus.pending,
      },
    });

    this.logger.log(
      `预约 ${bookingId} 尾款确认，平台佣金: ${platformFee.toFixed(2)}，顾问结算: ${consultantPayout.toFixed(2)}`
    );

    return updated;
  }
}
