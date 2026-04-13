import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";

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

  constructor(private readonly prisma: PrismaService) {}

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

    if (dto.studioName !== undefined) data.studioName = dto.studioName;
    if (dto.specialties !== undefined) data.specialties = asJson(dto.specialties);
    if (dto.yearsOfExperience !== undefined) data.yearsOfExperience = dto.yearsOfExperience;
    if (dto.certifications !== undefined) data.certifications = asJson(dto.certifications);
    if (dto.portfolioCases !== undefined) data.portfolioCases = asJson(dto.portfolioCases);
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    // status 仅管理员可修改，此处暂允许顾问自行设置 inactive
    if (dto.status === ConsultantStatusDto.INACTIVE) data.status = "inactive";

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

    if (status) where.status = status;
    if (serviceType) where.serviceType = serviceType;
    if (consultantId) where.consultantId = consultantId;

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
        if (!consultant || consultant.userId !== userId) {
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

    if (status) where.status = status;
    if (serviceType) where.serviceType = serviceType;

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
}
