/* eslint-disable @typescript-eslint/no-require-imports */
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { PaymentService } from "../../commerce/payment/payment.service";

import { ConsultantService } from "./consultant.service";
import {
  CreateConsultantProfileDto,
  UpdateConsultantProfileDto,
  ConsultantQueryDto,
  CreateServiceBookingDto,
  UpdateServiceBookingDto,
  BookingQueryDto,
  ConsultantStatusDto,
  BookingStatusDto,
  ServiceTypeDto,
} from "./dto";

describe("ConsultantService", () => {
  let service: ConsultantService;
  let prismaService: jest.Mocked<PrismaService>;
  let paymentService: jest.Mocked<PaymentService>;

  const mockPrismaService = {
    consultantProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    serviceBooking: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    consultantEarning: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    consultantWithdrawal: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    contentModerationLog: {
      create: jest.fn(),
    },
  };

  const mockPaymentService = {
    refund: jest.fn(),
  };

  const mockConsultantProfile = {
    id: "consultant_1",
    userId: "user_consultant",
    studioName: "风尚造型工作室",
    specialties: ["色彩搭配", "日常穿搭"],
    yearsOfExperience: 5,
    certifications: [{ name: "高级形象设计师" }],
    portfolioCases: [],
    bio: "10年时尚行业经验",
    avatar: "https://example.com/avatar.jpg",
    status: "active",
    rating: 4.8,
    reviewCount: 20,
    createdAt: new Date(),
    user: { id: "user_consultant", nickname: "顾问A", avatar: null },
  };

  const mockBooking = {
    id: "booking_1",
    userId: "user_client",
    consultantId: "consultant_1",
    serviceType: "styling_consultation",
    scheduledAt: new Date("2026-05-01T14:00:00.000Z"),
    durationMinutes: 60,
    notes: "希望了解职场穿搭建议",
    price: new (require("@prisma/client").Prisma).Decimal(299),
    currency: "CNY",
    status: "pending",
    depositAmount: new (require("@prisma/client").Prisma).Decimal(89.7),
    finalPaymentAmount: new (require("@prisma/client").Prisma).Decimal(209.3),
    platformFee: new (require("@prisma/client").Prisma).Decimal(0),
    consultantPayout: new (require("@prisma/client").Prisma).Decimal(0),
    depositPaidAt: null,
    finalPaidAt: null,
    cancelReason: null,
    cancelledAt: null,
    completedAt: null,
    createdAt: new Date(),
    consultant: {
      id: "consultant_1",
      studioName: "风尚造型工作室",
      avatar: null,
      user: { id: "user_consultant", nickname: "顾问A" },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultantService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get<ConsultantService>(ConsultantService);
    prismaService = module.get(PrismaService);
    paymentService = module.get(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createProfile", () => {
    const userId = "user_new";
    const dto: CreateConsultantProfileDto = {
      studioName: "新工作室",
      specialties: ["色彩搭配"],
      yearsOfExperience: 3,
      certifications: [{ name: "形象设计师" }],
      portfolioCases: [],
      bio: "3年经验",
    };

    it("应该成功创建顾问档案", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.consultantProfile.create.mockResolvedValue({
        ...mockConsultantProfile,
        userId,
        studioName: dto.studioName,
        status: "pending",
      });

      const result = await service.createProfile(userId, dto);

      expect(result.status).toBe("pending");
      expect(mockPrismaService.consultantProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            studioName: dto.studioName,
            status: "pending",
          }),
        }),
      );
    });

    it("当用户已有顾问档案时应该抛出 BadRequestException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(service.createProfile(userId, dto)).rejects.toThrow(
        "该用户已创建顾问档案",
      );
    });
  });

  describe("getProfiles", () => {
    it("默认应该只返回 active 状态的顾问", async () => {
      mockPrismaService.consultantProfile.findMany.mockResolvedValue([
        mockConsultantProfile,
      ]);
      mockPrismaService.consultantProfile.count.mockResolvedValue(1);

      const result = await service.getProfiles({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(
        mockPrismaService.consultantProfile.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "active" }),
        }),
      );
    });

    it("应该支持按状态筛选", async () => {
      mockPrismaService.consultantProfile.findMany.mockResolvedValue([]);
      mockPrismaService.consultantProfile.count.mockResolvedValue(0);

      await service.getProfiles({ status: ConsultantStatusDto.PENDING });

      expect(
        mockPrismaService.consultantProfile.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "pending" }),
        }),
      );
    });

    it("应该支持按评分排序", async () => {
      mockPrismaService.consultantProfile.findMany.mockResolvedValue([]);
      mockPrismaService.consultantProfile.count.mockResolvedValue(0);

      await service.getProfiles({ sortBy: "rating" });

      expect(
        mockPrismaService.consultantProfile.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { rating: "desc" },
        }),
      );
    });

    it("应该支持按经验排序", async () => {
      mockPrismaService.consultantProfile.findMany.mockResolvedValue([]);
      mockPrismaService.consultantProfile.count.mockResolvedValue(0);

      await service.getProfiles({ sortBy: "experience" });

      expect(
        mockPrismaService.consultantProfile.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { yearsOfExperience: "desc" },
        }),
      );
    });

    it("应该支持按评价数排序", async () => {
      mockPrismaService.consultantProfile.findMany.mockResolvedValue([]);
      mockPrismaService.consultantProfile.count.mockResolvedValue(0);

      await service.getProfiles({ sortBy: "reviews" });

      expect(
        mockPrismaService.consultantProfile.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { reviewCount: "desc" },
        }),
      );
    });

    it("应该支持按专长筛选", async () => {
      mockPrismaService.consultantProfile.findMany.mockResolvedValue([]);
      mockPrismaService.consultantProfile.count.mockResolvedValue(0);

      await service.getProfiles({ specialty: "色彩搭配" });

      expect(
        mockPrismaService.consultantProfile.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            specialties: expect.anything(),
          }),
        }),
      );
    });

    it("应该支持分页", async () => {
      mockPrismaService.consultantProfile.findMany.mockResolvedValue([]);
      mockPrismaService.consultantProfile.count.mockResolvedValue(50);

      const result = await service.getProfiles({ page: 2, pageSize: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalPages).toBe(5);
    });
  });

  describe("getProfileByUserId", () => {
    it("应该返回顾问档案", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      const result = await service.getProfileByUserId("user_consultant");

      expect(result.id).toBe("consultant_1");
    });

    it("当档案不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getProfileByUserId("nonexistent"),
      ).rejects.toThrow("顾问档案不存在");
    });
  });

  describe("getProfileById", () => {
    it("应该返回顾问档案", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      const result = await service.getProfileById("consultant_1");

      expect(result.id).toBe("consultant_1");
    });

    it("当档案不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getProfileById("nonexistent"),
      ).rejects.toThrow("顾问档案不存在");
    });
  });

  describe("updateProfile", () => {
    const userId = "user_consultant";
    const profileId = "consultant_1";

    it("应该成功更新顾问档案", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.consultantProfile.update.mockResolvedValue({
        ...mockConsultantProfile,
        studioName: "新名称",
      });

      const result = await service.updateProfile(userId, profileId, {
        studioName: "新名称",
      } as UpdateConsultantProfileDto);

      expect(result.studioName).toBe("新名称");
    });

    it("当档案不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile(userId, "nonexistent", {
          studioName: "新名称",
        } as UpdateConsultantProfileDto),
      ).rejects.toThrow("顾问档案不存在");
    });

    it("当非本人修改时应该抛出 ForbiddenException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.updateProfile("other_user", profileId, {
          studioName: "新名称",
        } as UpdateConsultantProfileDto),
      ).rejects.toThrow("无权修改此顾问档案");
    });

    it("应该允许顾问自行设置为 inactive 状态", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.consultantProfile.update.mockResolvedValue({
        ...mockConsultantProfile,
        status: "inactive",
      });

      const result = await service.updateProfile(userId, profileId, {
        status: ConsultantStatusDto.INACTIVE,
      } as UpdateConsultantProfileDto);

      expect(result.status).toBe("inactive");
    });
  });

  describe("createBooking", () => {
    const userId = "user_client";
    const dto: CreateServiceBookingDto = {
      consultantId: "consultant_1",
      serviceType: ServiceTypeDto.STYLING_CONSULTATION,
      scheduledAt: "2026-05-01T14:00:00.000Z",
      price: 299,
    };

    it("应该成功创建预约", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.serviceBooking.create.mockResolvedValue(mockBooking);

      const result = await service.createBooking(userId, dto);

      expect(result.status).toBe("pending");
      expect(mockPrismaService.serviceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            consultantId: dto.consultantId,
            depositAmount: expect.anything(),
            finalPaymentAmount: expect.anything(),
          }),
        }),
      );
    });

    it("当顾问不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);

      await expect(service.createBooking(userId, dto)).rejects.toThrow(
        "顾问不存在",
      );
    });

    it("当顾问状态非 active 时应该抛出 BadRequestException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        ...mockConsultantProfile,
        status: "suspended",
      });

      await expect(service.createBooking(userId, dto)).rejects.toThrow(
        "该顾问暂不可预约",
      );
    });

    it("不允许预约自己", async () => {
      const selfDto = { ...dto, consultantId: "consultant_self" };
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        ...mockConsultantProfile,
        userId: "user_client",
      });

      await expect(
        service.createBooking("user_client", selfDto),
      ).rejects.toThrow("不能预约自己");
    });

    it("应该正确计算定金和尾款", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.serviceBooking.create.mockResolvedValue(mockBooking);

      await service.createBooking(userId, { ...dto, price: 1000 });

      expect(mockPrismaService.serviceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            depositAmount: expect.anything(),
            finalPaymentAmount: expect.anything(),
          }),
        }),
      );
    });
  });

  describe("getBookingsByUser", () => {
    it("应该返回用户的预约列表", async () => {
      mockPrismaService.serviceBooking.findMany.mockResolvedValue([mockBooking]);
      mockPrismaService.serviceBooking.count.mockResolvedValue(1);

      const result = await service.getBookingsByUser("user_client", {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("应该支持按状态筛选", async () => {
      mockPrismaService.serviceBooking.findMany.mockResolvedValue([]);
      mockPrismaService.serviceBooking.count.mockResolvedValue(0);

      await service.getBookingsByUser("user_client", {
        status: BookingStatusDto.PENDING,
      });

      expect(
        mockPrismaService.serviceBooking.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "pending",
          }),
        }),
      );
    });

    it("应该支持按服务类型筛选", async () => {
      mockPrismaService.serviceBooking.findMany.mockResolvedValue([]);
      mockPrismaService.serviceBooking.count.mockResolvedValue(0);

      await service.getBookingsByUser("user_client", {
        serviceType: ServiceTypeDto.STYLING_CONSULTATION,
      });

      expect(
        mockPrismaService.serviceBooking.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceType: "styling_consultation",
          }),
        }),
      );
    });
  });

  describe("getBookingById", () => {
    it("预约用户应该能查看预约详情", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      const result = await service.getBookingById("user_client", "booking_1");

      expect(result.id).toBe("booking_1");
    });

    it("顾问本人应该能查看预约详情", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      const result = await service.getBookingById(
        "user_consultant",
        "booking_1",
      );

      expect(result.id).toBe("booking_1");
    });

    it("当预约不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(
        service.getBookingById("user_client", "nonexistent"),
      ).rejects.toThrow("预约不存在");
    });

    it("非预约用户和非顾问本人应该抛出 ForbiddenException", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.getBookingById("other_user", "booking_1"),
      ).rejects.toThrow("无权查看此预约");
    });
  });

  describe("updateBooking - 取消预约", () => {
    const userId = "user_client";
    const bookingId = "booking_1";

    it("预约用户应该能取消预约", async () => {
      const pendingBooking = { ...mockBooking, status: "confirmed" };
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(
        pendingBooking,
      );
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...pendingBooking,
        status: "cancelled",
      });

      const result = await service.updateBooking(userId, bookingId, {
        status: BookingStatusDto.CANCELLED,
        cancelReason: "时间冲突",
      });

      expect(result.status).toBe("cancelled");
    });

    it("非预约用户不能取消预约", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.updateBooking("other_user", bookingId, {
          status: BookingStatusDto.CANCELLED,
        }),
      ).rejects.toThrow("仅预约用户可取消预约");
    });

    it("已完成的预约不能取消", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: "completed",
      });

      await expect(
        service.updateBooking(userId, bookingId, {
          status: BookingStatusDto.CANCELLED,
        }),
      ).rejects.toThrow("已完成的预约无法取消");
    });

    it("提前24h取消应该全额退定金", async () => {
      const futureBooking = {
        ...mockBooking,
        status: "confirmed",
        depositPaidAt: new Date(),
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        depositAmount: new (require("@prisma/client").Prisma).Decimal(89.7),
      };
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(
        futureBooking,
      );
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...futureBooking,
        status: "cancelled",
      });
      mockPaymentService.refund.mockResolvedValue({ success: true });

      await service.updateBooking(userId, bookingId, {
        status: BookingStatusDto.CANCELLED,
      });

      expect(mockPaymentService.refund).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          amount: 89.7,
        }),
      );
    });

    it("24h内取消应该扣20%违约金", async () => {
      const nearBooking = {
        ...mockBooking,
        status: "confirmed",
        depositPaidAt: new Date(),
        scheduledAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        depositAmount: new (require("@prisma/client").Prisma).Decimal(100),
      };
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(nearBooking);
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...nearBooking,
        status: "cancelled",
      });
      mockPaymentService.refund.mockResolvedValue({ success: true });

      await service.updateBooking(userId, bookingId, {
        status: BookingStatusDto.CANCELLED,
      });

      expect(mockPaymentService.refund).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          amount: 80,
        }),
      );
    });

    it("退款失败时不应阻塞取消操作", async () => {
      const nearBooking = {
        ...mockBooking,
        status: "confirmed",
        depositPaidAt: new Date(),
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        depositAmount: new (require("@prisma/client").Prisma).Decimal(89.7),
      };
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(nearBooking);
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...nearBooking,
        status: "cancelled",
      });
      mockPaymentService.refund.mockRejectedValue(new Error("退款渠道异常"));

      const result = await service.updateBooking(userId, bookingId, {
        status: BookingStatusDto.CANCELLED,
      });

      expect(result.status).toBe("cancelled");
    });

    it("未支付定金时取消不应触发退款", async () => {
      const noDepositBooking = {
        ...mockBooking,
        status: "pending",
        depositPaidAt: null,
      };
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(
        noDepositBooking,
      );
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...noDepositBooking,
        status: "cancelled",
      });

      await service.updateBooking(userId, bookingId, {
        status: BookingStatusDto.CANCELLED,
      });

      expect(mockPaymentService.refund).not.toHaveBeenCalled();
    });
  });

  describe("updateBooking - 顾问操作", () => {
    const consultantUserId = "user_consultant";
    const bookingId = "booking_1";

    it("顾问应该能确认预约", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        status: "confirmed",
      });

      const result = await service.updateBooking(consultantUserId, bookingId, {
        status: BookingStatusDto.CONFIRMED,
      });

      expect(result.status).toBe("confirmed");
    });

    it("顾问应该能完成预约", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        status: "completed",
        completedAt: new Date(),
      });

      const result = await service.updateBooking(consultantUserId, bookingId, {
        status: BookingStatusDto.COMPLETED,
      });

      expect(result.status).toBe("completed");
    });

    it("非顾问不能更新预约状态", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.updateBooking("other_user", bookingId, {
          status: BookingStatusDto.CONFIRMED,
        }),
      ).rejects.toThrow("仅顾问可更新此预约状态");
    });
  });

  describe("getBookingsByConsultant", () => {
    it("应该返回顾问的预约列表", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.serviceBooking.findMany.mockResolvedValue([mockBooking]);
      mockPrismaService.serviceBooking.count.mockResolvedValue(1);

      const result = await service.getBookingsByConsultant(
        "user_consultant",
        "consultant_1",
        {},
      );

      expect(result.data).toHaveLength(1);
    });

    it("当顾问不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getBookingsByConsultant("user_consultant", "nonexistent", {}),
      ).rejects.toThrow("顾问不存在");
    });

    it("非顾问本人不能查看预约列表", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.getBookingsByConsultant("other_user", "consultant_1", {}),
      ).rejects.toThrow("无权查看此顾问的预约");
    });
  });

  describe("payDeposit", () => {
    it("应该返回定金支付信息", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      const result = await service.payDeposit("user_client", "booking_1");

      expect(result.paymentCategory).toBe("consultant_deposit");
      expect(result.amount).toBe(89.7);
    });

    it("非 pending 状态不能支付定金", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: "confirmed",
      });
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.payDeposit("user_client", "booking_1"),
      ).rejects.toThrow("预约状态不允许支付定金");
    });

    it("定金已支付时应该抛出 BadRequestException", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        depositPaidAt: new Date(),
      });
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.payDeposit("user_client", "booking_1"),
      ).rejects.toThrow("定金已支付");
    });
  });

  describe("payFinalPayment", () => {
    it("服务完成后应该返回尾款支付信息", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: "completed",
        depositPaidAt: new Date(),
      });
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      const result = await service.payFinalPayment("user_client", "booking_1");

      expect(result.paymentCategory).toBe("consultant_final");
    });

    it("服务未完成时不能支付尾款", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.payFinalPayment("user_client", "booking_1"),
      ).rejects.toThrow("服务未完成，无法支付尾款");
    });

    it("定金未支付时不能支付尾款", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: "completed",
        depositPaidAt: null,
      });
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.payFinalPayment("user_client", "booking_1"),
      ).rejects.toThrow("请先支付定金");
    });

    it("尾款已支付时应该抛出 BadRequestException", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: "completed",
        depositPaidAt: new Date(),
        finalPaidAt: new Date(),
      });
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.payFinalPayment("user_client", "booking_1"),
      ).rejects.toThrow("尾款已支付");
    });
  });

  describe("confirmDepositPayment", () => {
    it("应该确认定金支付", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        depositPaidAt: new Date(),
        status: "confirmed",
      });

      const result = await service.confirmDepositPayment("booking_1");

      expect(result.status).toBe("confirmed");
    });

    it("当预约不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmDepositPayment("nonexistent"),
      ).rejects.toThrow("预约不存在");
    });

    it("定金已确认时应该跳过重复操作", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        depositPaidAt: new Date(),
      });

      const result = await service.confirmDepositPayment("booking_1");

      expect(mockPrismaService.serviceBooking.update).not.toHaveBeenCalled();
    });
  });

  describe("confirmFinalPayment", () => {
    it("应该确认尾款支付并计算佣金", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        price: { toNumber: () => 299 },
      });
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        finalPaidAt: new Date(),
      });
      mockPrismaService.consultantEarning.create.mockResolvedValue({});

      const result = await service.confirmFinalPayment("booking_1");

      expect(mockPrismaService.consultantEarning.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            consultantId: mockBooking.consultantId,
            platformFee: expect.anything(),
            netAmount: expect.anything(),
          }),
        }),
      );
    });

    it("当预约不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmFinalPayment("nonexistent"),
      ).rejects.toThrow("预约不存在");
    });

    it("尾款已确认时应该跳过重复操作", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        finalPaidAt: new Date(),
      });

      const result = await service.confirmFinalPayment("booking_1");

      expect(mockPrismaService.serviceBooking.update).not.toHaveBeenCalled();
    });
  });

  describe("getEarnings", () => {
    it("应该返回顾问收入列表和汇总", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.consultantEarning.findMany.mockResolvedValue([]);
      mockPrismaService.consultantEarning.aggregate.mockResolvedValue({
        _sum: { netAmount: 1000 },
      });

      const result = await service.getEarnings(
        "consultant_1",
        "user_consultant",
      );

      expect(result).toHaveProperty("earnings");
      expect(result).toHaveProperty("summary");
    });

    it("当顾问不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getEarnings("nonexistent", "user_consultant"),
      ).rejects.toThrow("顾问不存在");
    });

    it("非顾问本人不能查看收入", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );

      await expect(
        service.getEarnings("consultant_1", "other_user"),
      ).rejects.toThrow("无权查看此顾问收入");
    });
  });

  describe("requestWithdrawal", () => {
    const bankInfo = {
      bankName: "工商银行",
      bankAccount: "6222000000001",
      accountHolder: "张三",
    };

    it("应该成功申请提现", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.consultantEarning.aggregate.mockResolvedValue({
        _sum: { netAmount: 5000 },
      });
      mockPrismaService.consultantWithdrawal.create.mockResolvedValue({
        id: "withdrawal_1",
        consultantId: "consultant_1",
        amount: 1000,
        status: "pending",
      });

      const result = await service.requestWithdrawal(
        "consultant_1",
        "user_consultant",
        1000,
        bankInfo,
      );

      expect(result.status).toBe("pending");
    });

    it("可提现金额不足时应该抛出 BadRequestException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.consultantEarning.aggregate.mockResolvedValue({
        _sum: { netAmount: 500 },
      });

      await expect(
        service.requestWithdrawal(
          "consultant_1",
          "user_consultant",
          1000,
          bankInfo,
        ),
      ).rejects.toThrow("可提现金额不足");
    });

    it("提现金额必须大于0", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.consultantEarning.aggregate.mockResolvedValue({
        _sum: { netAmount: 5000 },
      });

      await expect(
        service.requestWithdrawal(
          "consultant_1",
          "user_consultant",
          0,
          bankInfo,
        ),
      ).rejects.toThrow("提现金额必须大于0");
    });
  });

  describe("reviewProfile", () => {
    it("管理员应该能审核通过顾问档案", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        ...mockConsultantProfile,
        status: "pending",
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "admin_1",
        role: "admin",
      });
      mockPrismaService.consultantProfile.update.mockResolvedValue({
        ...mockConsultantProfile,
        status: "active",
      });

      const result = await service.reviewProfile("admin_1", "consultant_1", {
        status: "active",
      });

      expect(result.status).toBe("active");
    });

    it("管理员应该能拒绝顾问档案", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        ...mockConsultantProfile,
        status: "pending",
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "admin_1",
        role: "admin",
      });
      mockPrismaService.consultantProfile.update.mockResolvedValue({
        ...mockConsultantProfile,
        status: "suspended",
      });

      const result = await service.reviewProfile("admin_1", "consultant_1", {
        status: "rejected",
        rejectReason: "资质不符",
      });

      expect(result.status).toBe("suspended");
    });

    it("非管理员不能审核", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        ...mockConsultantProfile,
        status: "pending",
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "user_1",
        role: "user",
      });

      await expect(
        service.reviewProfile("user_1", "consultant_1", { status: "active" }),
      ).rejects.toThrow("仅管理员可审核顾问档案");
    });

    it("非 pending 状态的档案不能审核", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        ...mockConsultantProfile,
        status: "active",
      });

      await expect(
        service.reviewProfile("admin_1", "consultant_1", { status: "active" }),
      ).rejects.toThrow("仅待审核档案可审核");
    });
  });

  describe("getConsultantCases", () => {
    it("应该返回顾问案例列表", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.serviceBooking.findMany.mockResolvedValue([
        {
          id: "booking_1",
          serviceType: "styling_consultation",
          price: { toNumber: () => 299 },
          completedAt: new Date(),
          review: {
            rating: 5,
            content: "非常专业的建议",
            tags: ["专业", "实用"],
            beforeImages: ["before.jpg"],
            afterImages: ["after.jpg"],
            isAnonymous: false,
            user: { nickname: "用户A", avatar: null },
          },
        },
      ]);

      const result = await service.getConsultantCases("consultant_1");

      expect(result).toHaveLength(1);
      expect(result[0]!.rating).toBe(5);
      expect(result[0]!.clientName).toBe("用户A");
    });

    it("匿名用户应该显示为匿名用户", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(
        mockConsultantProfile,
      );
      mockPrismaService.serviceBooking.findMany.mockResolvedValue([
        {
          id: "booking_1",
          serviceType: "styling_consultation",
          price: { toNumber: () => 299 },
          completedAt: new Date(),
          review: {
            rating: 4,
            content: "不错",
            tags: [],
            beforeImages: [],
            afterImages: [],
            isAnonymous: true,
            user: { nickname: "用户B", avatar: null },
          },
        },
      ]);

      const result = await service.getConsultantCases("consultant_1");

      expect(result[0]!.clientName).toBe("匿名用户");
    });

    it("当顾问不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getConsultantCases("nonexistent"),
      ).rejects.toThrow("顾问不存在");
    });
  });
});
