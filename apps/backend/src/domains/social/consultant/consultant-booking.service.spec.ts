/* eslint-disable @typescript-eslint/no-require-imports */
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { PaymentService } from "../../commerce/payment/payment.service";

import { ConsultantBookingService } from "./consultant-booking.service";
import { CreateServiceBookingDto, BookingQueryDto, BookingStatusDto, ServiceTypeDto } from "./dto";

describe("ConsultantBookingService", () => {
  let service: ConsultantBookingService;
  let prismaService: jest.Mocked<PrismaService>;
  let paymentService: jest.Mocked<PaymentService>;

  const mockPrismaService = {
    consultantProfile: {
      findUnique: jest.fn(),
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
    price: new (require("@prisma/client").Prisma.Decimal)(299),
    currency: "CNY",
    status: "pending",
    depositAmount: new (require("@prisma/client").Prisma.Decimal)(89.7),
    finalPaymentAmount: new (require("@prisma/client").Prisma.Decimal)(209.3),
    platformFee: new (require("@prisma/client").Prisma.Decimal)(0),
    consultantPayout: new (require("@prisma/client").Prisma.Decimal)(0),
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
        ConsultantBookingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get<ConsultantBookingService>(ConsultantBookingService);
    prismaService = module.get(PrismaService);
    paymentService = module.get(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(mockConsultantProfile);
      mockPrismaService.serviceBooking.create.mockResolvedValue(mockBooking);

      const result = await service.createBooking(userId, dto);

      expect(result.status).toBe("pending");
      expect(mockPrismaService.serviceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            consultantId: dto.consultantId,
          }),
        })
      );
    });

    it("当顾问不存在时应该抛出 NotFoundException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(null);

      await expect(service.createBooking(userId, dto)).rejects.toThrow(NotFoundException);
      await expect(service.createBooking(userId, dto)).rejects.toThrow("顾问不存在");
    });

    it("当顾问状态非 active 时应该抛出 BadRequestException", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        ...mockConsultantProfile,
        status: "suspended",
      });

      await expect(service.createBooking(userId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.createBooking(userId, dto)).rejects.toThrow("该顾问暂不可预约");
    });

    it("不允许预约自己", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue({
        ...mockConsultantProfile,
        userId: "user_client",
      });

      await expect(service.createBooking(userId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.createBooking(userId, dto)).rejects.toThrow("不能预约自己");
    });

    it("应该正确计算定金和尾款", async () => {
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(mockConsultantProfile);
      mockPrismaService.serviceBooking.create.mockResolvedValue(mockBooking);

      await service.createBooking(userId, { ...dto, price: 1000 });

      expect(mockPrismaService.serviceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            depositAmount: expect.anything(),
            finalPaymentAmount: expect.anything(),
          }),
        })
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

      expect(mockPrismaService.serviceBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "pending",
          }),
        })
      );
    });

    it("应该支持分页", async () => {
      mockPrismaService.serviceBooking.findMany.mockResolvedValue([]);
      mockPrismaService.serviceBooking.count.mockResolvedValue(50);

      const result = await service.getBookingsByUser("user_client", {
        page: 2,
        pageSize: 10,
      });

      expect(result.meta.page).toBe(2);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalPages).toBe(5);
    });
  });

  describe("updateBooking", () => {
    const userId = "user_client";
    const bookingId = "booking_1";

    it("预约用户应该能取消预约", async () => {
      const confirmedBooking = { ...mockBooking, status: "confirmed" };
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(confirmedBooking);
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...confirmedBooking,
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
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it("已完成的预约不能取消", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: "completed",
      });

      await expect(
        service.updateBooking(userId, bookingId, {
          status: BookingStatusDto.CANCELLED,
        })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateBooking(userId, bookingId, {
          status: BookingStatusDto.CANCELLED,
        })
      ).rejects.toThrow("已完成的预约无法取消");
    });

    it("顾问应该能确认预约", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(mockConsultantProfile);
      mockPrismaService.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        status: "confirmed",
      });

      const result = await service.updateBooking("user_consultant", bookingId, {
        status: BookingStatusDto.CONFIRMED,
      });

      expect(result.status).toBe("confirmed");
    });

    it("提前24h取消应该全额退定金", async () => {
      const futureBooking = {
        ...mockBooking,
        status: "confirmed",
        depositPaidAt: new Date(),
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        depositAmount: new (require("@prisma/client").Prisma.Decimal)(89.7),
      };
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(futureBooking);
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
        })
      );
    });

    it("未支付定金时取消不应触发退款", async () => {
      const noDepositBooking = {
        ...mockBooking,
        status: "pending",
        depositPaidAt: null,
      };
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(noDepositBooking);
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

  describe("payDeposit", () => {
    it("应该返回定金支付信息", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(mockConsultantProfile);

      const result = await service.payDeposit("user_client", "booking_1");

      expect(result.paymentCategory).toBe("consultant_deposit");
      expect(result.amount).toBe(89.7);
    });

    it("非 pending 状态不能支付定金", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: "confirmed",
      });
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(mockConsultantProfile);

      await expect(service.payDeposit("user_client", "booking_1")).rejects.toThrow(
        BadRequestException
      );
      await expect(service.payDeposit("user_client", "booking_1")).rejects.toThrow(
        "预约状态不允许支付定金"
      );
    });

    it("定金已支付时应该抛出 BadRequestException", async () => {
      mockPrismaService.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        depositPaidAt: new Date(),
      });
      mockPrismaService.consultantProfile.findUnique.mockResolvedValue(mockConsultantProfile);

      await expect(service.payDeposit("user_client", "booking_1")).rejects.toThrow(
        BadRequestException
      );
      await expect(service.payDeposit("user_client", "booking_1")).rejects.toThrow("定金已支付");
    });
  });
});
