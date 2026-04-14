import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { ConsultantReviewService } from "./consultant-review.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateReviewDto } from "./dto";

describe("ConsultantReviewService", () => {
  let service: ConsultantReviewService;
  let prisma: {
    serviceBooking: { findUnique: jest.Mock };
    consultantReview: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
    consultantProfile: {
      findUnique: jest.Mock;
      update: jest.Mock;
      aggregate: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      serviceBooking: { findUnique: jest.fn() },
      consultantReview: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      consultantProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultantReviewService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ConsultantReviewService>(ConsultantReviewService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createReview", () => {
    const userId = "user-001";
    const dto: CreateReviewDto = {
      bookingId: "booking-001",
      rating: 5,
      content: "非常专业",
      tags: ["专业", "审美在线"],
    };

    it("should create review for completed booking", async () => {
      prisma.serviceBooking.findUnique.mockResolvedValue({
        id: "booking-001",
        userId,
        consultantId: "consultant-001",
        status: "completed",
      });
      prisma.consultantReview.findUnique.mockResolvedValue(null);
      prisma.consultantReview.create.mockResolvedValue({
        id: "review-001",
        ...dto,
        userId,
        consultantId: "consultant-001",
      });
      prisma.consultantReview.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: 1,
      });
      prisma.consultantProfile.update.mockResolvedValue({});

      const result = await service.createReview(userId, dto);

      expect(result).toBeDefined();
      expect(prisma.consultantReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: dto.bookingId,
            userId,
            rating: dto.rating,
          }),
        }),
      );
    });

    it("should throw when booking is not completed", async () => {
      prisma.serviceBooking.findUnique.mockResolvedValue({
        id: "booking-001",
        userId,
        consultantId: "consultant-001",
        status: "pending",
      });

      await expect(service.createReview(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw when booking already reviewed", async () => {
      prisma.serviceBooking.findUnique.mockResolvedValue({
        id: "booking-001",
        userId,
        consultantId: "consultant-001",
        status: "completed",
      });
      prisma.consultantReview.findUnique.mockResolvedValue({
        id: "existing-review",
      });

      await expect(service.createReview(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw when user is not the booking owner", async () => {
      prisma.serviceBooking.findUnique.mockResolvedValue({
        id: "booking-001",
        userId: "other-user",
        consultantId: "consultant-001",
        status: "completed",
      });

      await expect(service.createReview(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw when booking does not exist", async () => {
      prisma.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(service.createReview(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getReviews", () => {
    it("should return paginated reviews with anonymous display", async () => {
      const reviews = [
        {
          id: "review-001",
          isAnonymous: true,
          user: { id: "user-001", nickname: "Real Name", avatar: "avatar.jpg" },
          rating: 5,
          content: "Great",
          tags: ["专业"],
          beforeImages: [],
          afterImages: [],
        },
        {
          id: "review-002",
          isAnonymous: false,
          user: { id: "user-002", nickname: "Visible User", avatar: "avatar2.jpg" },
          rating: 4,
          content: "Good",
          tags: ["耐心"],
          beforeImages: [],
          afterImages: [],
        },
      ];

      prisma.consultantReview.findMany.mockResolvedValue(reviews);
      prisma.consultantReview.count.mockResolvedValue(2);

      const result = await service.getReviews({
        consultantId: "consultant-001",
        page: 1,
        pageSize: 20,
        sortBy: "latest",
      });

      expect(result.data).toHaveLength(2);
      // Anonymous review should hide user info
      expect(result.data[0]!.user.nickname).toBe("匿名用户");
      expect(result.data[0]!.user.id).toBe("anonymous");
      // Non-anonymous should show real info
      expect(result.data[1]!.user.nickname).toBe("Visible User");
      expect(result.meta.total).toBe(2);
    });
  });

  describe("getConsultantRanking", () => {
    it("should return 0 for non-existent consultant", async () => {
      prisma.consultantProfile.findUnique.mockResolvedValue(null);

      const score = await service.getConsultantRanking("nonexistent");
      expect(score).toBe(0);
    });

    it("should return ranking score 0-100 for existing consultant", async () => {
      prisma.consultantProfile.findUnique.mockResolvedValue({
        id: "consultant-001",
        rating: 4.5,
        responseTimeAvg: 30,
        _count: { bookings: 10 },
      });
      prisma.consultantProfile.aggregate.mockResolvedValue({
        _avg: { reviewCount: 10 },
      });

      const score = await service.getConsultantRanking("consultant-001");

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("updateConsultantRating", () => {
    it("should update consultant rating and reviewCount after review", async () => {
      // Indirectly tested via createReview, but verify the aggregate + update calls
      prisma.serviceBooking.findUnique.mockResolvedValue({
        id: "booking-001",
        userId: "user-001",
        consultantId: "consultant-001",
        status: "completed",
      });
      prisma.consultantReview.findUnique.mockResolvedValue(null);
      prisma.consultantReview.create.mockResolvedValue({ id: "review-001" });
      prisma.consultantReview.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: 3,
      });
      prisma.consultantProfile.update.mockResolvedValue({});

      await service.createReview("user-001", {
        bookingId: "booking-001",
        rating: 5,
      });

      expect(prisma.consultantProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "consultant-001" },
          data: expect.objectContaining({
            reviewCount: 3,
          }),
        }),
      );
    });
  });
});
