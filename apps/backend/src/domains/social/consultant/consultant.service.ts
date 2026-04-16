import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { PaymentService } from "../../../commerce/payment/payment.service";

import {
  CreateConsultantProfileDto,
  UpdateConsultantProfileDto,
  ConsultantQueryDto,
  CreateServiceBookingDto,
  UpdateServiceBookingDto,
  BookingQueryDto,
  ConsultantStatusDto,
  BookingStatusDto,
} from "./dto";

/** Prisma Json 字段类型断言辅助 */
const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

@Injectable()
export class ConsultantService {
  private readonly logger = new Logger(ConsultantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  // ==================== 顾问档案 ====================

  async createProfile(userId: string, dto: CreateConsultantProfileDto) {
    // 检查是否已存在顾问档案
    const existing = await this.prisma.consultantProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException("该用户已创建顾问档案");
    }

    return this.prisma.consultantProfile.create({
      data: {
        userId,
        studioName: dto.studioName,
        specialties: asJson(dto.specialties),
        yearsOfExperience: dto.yearsOfExperience,
        certifications: asJson(dto.certifications),
        portfolioCases: asJson(dto.portfolioCases || []),
        bio: dto.bio,
        avatar: dto.avatar,
        status: "pending",
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getProfiles(query: ConsultantQueryDto) {
    const { page = 1, pageSize = 20, status, specialty, sortBy = "rating" } = query;

    const where: Prisma.ConsultantProfileWhereInput = {};

    if (status) {
      where.status = status;
    } else {
      // 默认只展示已激活的顾问
      where.status = "active";
    }

    if (specialty) {
      // specialties 是 Json 类型存储的数组，使用 string_contains 过滤
      // 由于 Prisma Json 过滤限制，使用 string_contains 匹配 JSON 字符串中的值
      where.specialties = { string_contains: specialty } as unknown as Prisma.ConsultantProfileWhereInput["specialties"];
    }

    let orderBy: Prisma.ConsultantProfileOrderByWithRelationInput;
    switch (sortBy) {
      case "rating":
        orderBy = { rating: "desc" };
        break;
      case "experience":
        orderBy = { yearsOfExperience: "desc" };
        break;
      case "reviews":
        orderBy = { reviewCount: "desc" };
        break;
      case "latest":
      default:
        orderBy = { createdAt: "desc" };
    }

    const [profiles, total] = await Promise.all([
      this.prisma.consultantProfile.findMany({
        where,
        orderBy,
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
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      this.prisma.consultantProfile.count({ where }),
    ]);

    return {
      data: profiles,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            bookings: true,
            chatRooms: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException("顾问档案不存在");
    }

    return profile;
  }

  async getProfileById(id: string) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            bookings: true,
            chatRooms: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException("顾问档案不存在");
    }

    return profile;
  }

  async updateProfile(userId: string, profileId: string, dto: UpdateConsultantProfileDto) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException("顾问档案不存在");
    }

    if (profile.userId !== userId) {
      throw new ForbiddenException("无权修改此顾问档案");
    }

    const data: Prisma.ConsultantProfileUpdateInput = {};

    if (dto.studioName !== undefined) {data.studioName = dto.studioName;}
    if (dto.specialties !== undefined) {data.specialties = asJson(dto.specialties);}
    if (dto.yearsOfExperience !== undefined) {data.yearsOfExperience = dto.yearsOfExperience;}
    if (dto.certifications !== undefined) {data.certifications = asJson(dto.certifications);}
    if (dto.portfolioCases !== undefined) {data.portfolioCases = asJson(dto.portfolioCases);}
    if (dto.bio !== undefined) {data.bio = dto.bio;}
    if (dto.avatar !== undefined) {data.avatar = dto.avatar;}
    // status 仅管理员可修改，此处暂允许顾问自行设置 inactive
    if (dto.status === ConsultantStatusDto.INACTIVE) {data.status = "inactive";}

    return this.prisma.consultantProfile.update({
      where: { id: profileId },
      data,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });
  }

  // ==================== 服务预约 ====================

  /** 定金比例：30% */
  private static readonly DEPOSIT_RATE = 0.3;
  /** 平台佣金比例：15% */
  private static readonly PLATFORM_FEE_RATE = 0.15;
  /** 24小时内取消扣款比例（定金的20%） */
  private static readonly LATE_CANCEL_PENALTY_RATE = 0.2;

  async createBooking(userId: string, dto: CreateServiceBookingDto) {
    // 验证顾问存在且状态为 active
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: dto.consultantId },
    });

    if (!consultant) {
      throw new NotFoundException("顾问不存在");
    }

    if (consultant.status !== "active") {
      throw new BadRequestException("该顾问暂不可预约");
    }

    // 不允许预约自己
    if (consultant.userId === userId) {
      throw new BadRequestException("不能预约自己");
    }

    // 计算定金和尾款（服务端计算，防止客户端篡改）
    const depositAmount = new Prisma.Decimal(dto.price)
      .mul(ConsultantService.DEPOSIT_RATE)
      .toFixed(2);
    const finalPaymentAmount = new Prisma.Decimal(dto.price)
      .mul(1 - ConsultantService.DEPOSIT_RATE)
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
        status: "pending",
        depositAmount: new Prisma.Decimal(depositAmount),
        finalPaymentAmount: new Prisma.Decimal(finalPaymentAmount),
        platformFee: new Prisma.Decimal(0), // 服务完成时计算
        consultantPayout: new Prisma.Decimal(0), // 服务完成时计算
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

    if (status) {where.status = status;}
    if (serviceType) {where.serviceType = serviceType;}
    if (consultantId) {where.consultantId = consultantId;}

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

    // 仅预约用户或顾问本人可查看
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

    // 状态变更逻辑
    if (dto.status !== undefined) {
      // 取消预约：仅预约用户可操作
      if (dto.status === BookingStatusDto.CANCELLED) {
        if (booking.userId !== userId) {
          throw new ForbiddenException("仅预约用户可取消预约");
        }
        if (booking.status === "completed" || booking.status === "cancelled") {
          throw new BadRequestException("已完成的预约无法取消");
        }
        data.status = "cancelled";
        data.cancelReason = dto.cancelReason;
        data.cancelledAt = new Date();

        // 取消退款逻辑：根据距预约时间决定退款比例
        if (booking.depositPaidAt) {
          const hoursUntilBooking =
            (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);

          if (hoursUntilBooking >= 24) {
            // 提前 24h 取消，全额退定金
            this.logger.log(
              `预约 ${bookingId} 提前24h取消，全额退定金 ${booking.depositAmount}`,
            );
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
            // 24h 内取消，扣定金 20% 给用户补偿，80% 退回
            const penaltyAmount = Number(booking.depositAmount) * ConsultantService.LATE_CANCEL_PENALTY_RATE;
            const refundAmount = Number(booking.depositAmount) - penaltyAmount;
            this.logger.log(
              `预约 ${bookingId} 24h内取消，退定金80%: ${refundAmount}，扣20%: ${penaltyAmount}`,
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
      }
      // 确认/进行中/完成：仅顾问可操作
      else if (
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

  async getBookingsByConsultant(
    userId: string,
    consultantId: string,
    query: BookingQueryDto,
  ) {
    // 验证当前用户是该顾问
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

    if (status) {where.status = status;}
    if (serviceType) {where.serviceType = serviceType;}

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

  // ==================== 分阶段付款 ====================

  /**
   * 支付定金 - 返回支付信息，由 PaymentModule 处理实际支付
   */
  async payDeposit(userId: string, bookingId: string) {
    const booking = await this.getBookingById(userId, bookingId);

    if (booking.status !== "pending") {
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

  /**
   * 支付尾款 - 服务完成后支付
   */
  async payFinalPayment(userId: string, bookingId: string) {
    const booking = await this.getBookingById(userId, bookingId);

    if (booking.status !== "completed") {
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

  /**
   * 确认定金支付 - 支付回调后调用
   */
  async confirmDepositPayment(bookingId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {throw new NotFoundException("预约不存在");}

    if (booking.depositPaidAt) {
      this.logger.warn(`预约 ${bookingId} 定金已确认，跳过重复操作`);
      return booking;
    }

    return this.prisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        depositPaidAt: new Date(),
        status: "confirmed",
      },
    });
  }

  /**
   * 确认尾款支付 - 支付回调后调用，同时计算平台佣金和顾问结算金额
   */
  async confirmFinalPayment(bookingId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {throw new NotFoundException("预约不存在");}

    if (booking.finalPaidAt) {
      this.logger.warn(`预约 ${bookingId} 尾款已确认，跳过重复操作`);
      return booking;
    }

    // 计算平台佣金和顾问结算金额
    const totalPrice = Number(booking.price);
    const platformFee = totalPrice * ConsultantService.PLATFORM_FEE_RATE;
    const consultantPayout = totalPrice - platformFee;

    const updated = await this.prisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        finalPaidAt: new Date(),
        platformFee: new Prisma.Decimal(platformFee.toFixed(2)),
        consultantPayout: new Prisma.Decimal(consultantPayout.toFixed(2)),
      },
    });

    // 创建顾问收入记录
    await this.prisma.consultantEarning.create({
      data: {
        consultantId: booking.consultantId,
        bookingId: booking.id,
        userId: booking.userId,
        amount: booking.price,
        platformFee: new Prisma.Decimal(platformFee.toFixed(2)),
        netAmount: new Prisma.Decimal(consultantPayout.toFixed(2)),
        status: "pending",
      },
    });

    this.logger.log(
      `预约 ${bookingId} 尾款确认，平台佣金: ${platformFee.toFixed(2)}，顾问结算: ${consultantPayout.toFixed(2)}`,
    );

    return updated;
  }

  // ==================== 顾问收入 & 提现 ====================

  /**
   * 获取顾问收入列表和汇总
   */
  async getEarnings(consultantId: string, userId: string) {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });
    if (!consultant) {throw new NotFoundException("顾问不存在");}
    if (consultant.userId !== userId)
      {throw new ForbiddenException("无权查看此顾问收入");}

    const [earnings, totalEarned, pendingAmount, settledAmount] =
      await Promise.all([
        this.prisma.consultantEarning.findMany({
          where: { consultantId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        this.prisma.consultantEarning.aggregate({
          where: { consultantId },
          _sum: { netAmount: true },
        }),
        this.prisma.consultantEarning.aggregate({
          where: { consultantId, status: "pending" },
          _sum: { netAmount: true },
        }),
        this.prisma.consultantEarning.aggregate({
          where: { consultantId, status: "settled" },
          _sum: { netAmount: true },
        }),
      ]);

    return {
      earnings,
      summary: {
        totalEarned: totalEarned._sum.netAmount || 0,
        pendingAmount: pendingAmount._sum.netAmount || 0,
        settledAmount: settledAmount._sum.netAmount || 0,
      },
    };
  }

  /**
   * 申请提现 - 校验可提现余额后创建提现记录
   */
  async requestWithdrawal(
    consultantId: string,
    userId: string,
    amount: number,
    bankInfo: {
      bankName: string;
      bankAccount: string;
      accountHolder: string;
    },
  ) {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });
    if (!consultant) {throw new NotFoundException("顾问不存在");}
    if (consultant.userId !== userId)
      {throw new ForbiddenException("无权操作");}

    // 查询可提现余额（pending 状态的收入）
    const pendingAmount = await this.prisma.consultantEarning.aggregate({
      where: { consultantId, status: "pending" },
      _sum: { netAmount: true },
    });

    const available = Number(pendingAmount._sum.netAmount || 0);
    if (amount > available) {
      throw new BadRequestException(
        `可提现金额不足，当前可提现: ${available}`,
      );
    }

    if (amount <= 0) {
      throw new BadRequestException("提现金额必须大于0");
    }

    const withdrawal = await this.prisma.consultantWithdrawal.create({
      data: {
        consultantId,
        userId,
        amount: new Prisma.Decimal(amount),
        status: "pending",
        bankName: bankInfo.bankName,
        bankAccount: bankInfo.bankAccount,
        accountHolder: bankInfo.accountHolder,
      },
    });

    this.logger.log(
      `顾问 ${consultantId} 申请提现 ${amount}，提现ID: ${withdrawal.id}`,
    );

    return withdrawal;
  }

  // ==================== 入驻审核 ====================

  /**
   * 审核顾问档案 - 管理员操作
   */
  async reviewProfile(
    adminUserId: string,
    profileId: string,
    dto: { status: "active" | "rejected"; rejectReason?: string },
  ) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {throw new NotFoundException("顾问档案不存在");}
    if (profile.status !== "pending")
      {throw new BadRequestException("仅待审核档案可审核");}

    const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (adminUser?.role !== "admin") {
      throw new ForbiddenException("仅管理员可审核顾问档案");
    }

    return this.prisma.consultantProfile.update({
      where: { id: profileId },
      data: {
        status: dto.status === "active" ? "active" : "suspended",
      },
    });
  }

  // ==================== 案例展示 ====================

  /**
   * 获取顾问服务案例 - 含 before/after 对比图和评价摘要
   */
  async getConsultantCases(consultantId: string) {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });

    if (!consultant) {throw new NotFoundException("顾问不存在");}

    const completedBookings = await this.prisma.serviceBooking.findMany({
      where: {
        consultantId,
        status: "completed",
      },
      include: {
        review: {
          select: {
            rating: true,
            content: true,
            tags: true,
            beforeImages: true,
            afterImages: true,
            isAnonymous: true,
            user: {
              select: { nickname: true, avatar: true },
            },
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 20,
    });

    return completedBookings
      .filter((booking) => booking.review)
      .map((booking) => ({
        bookingId: booking.id,
        serviceType: booking.serviceType,
        beforeImages: booking.review!.beforeImages,
        afterImages: booking.review!.afterImages,
        rating: booking.review!.rating,
        reviewExcerpt: booking.review!.content
          ? booking.review!.content.substring(0, 100)
          : null,
        reviewTags: booking.review!.tags,
        clientName: booking.review!.isAnonymous
          ? "匿名用户"
          : booking.review!.user.nickname,
        price: Number(booking.price),
        completedAt: booking.completedAt,
      }));
  }
}
