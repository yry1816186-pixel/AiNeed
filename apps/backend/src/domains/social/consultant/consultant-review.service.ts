import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { CreateReviewDto, ReviewQueryDto } from "./dto";

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const RANKING_WEIGHTS = {
  rating: 0.40,
  orderCount: 0.20,
  responseSpeed: 0.20,
  matchScore: 0.20,
} as const;

@Injectable()
export class ConsultantReviewService {
  private readonly logger = new Logger(ConsultantReviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    // Verify booking exists and is completed
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {throw new NotFoundException("预约不存在");}
    if (booking.userId !== userId) {throw new ForbiddenException("仅预约用户可评价");}
    if (booking.status !== "completed") {throw new BadRequestException("仅已完成的预约可评价");}

    // Check if already reviewed
    const existing = await this.prisma.consultantReview.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) {throw new BadRequestException("该预约已评价");}

    // Create review
    const review = await this.prisma.consultantReview.create({
      data: {
        bookingId: dto.bookingId,
        userId,
        consultantId: booking.consultantId,
        rating: dto.rating,
        content: dto.content,
        tags: asJson(dto.tags || []),
        beforeImages: asJson(dto.beforeImages || []),
        afterImages: asJson(dto.afterImages || []),
        isAnonymous: dto.isAnonymous ?? false,
      },
    });

    // Update consultant rating statistics
    await this.updateConsultantRating(booking.consultantId);

    return review;
  }

  async getReviews(query: ReviewQueryDto) {
    const { consultantId, page = 1, pageSize = 20, sortBy = "latest" } = query;

    const where: Prisma.ConsultantReviewWhereInput = {};
    if (consultantId) {where.consultantId = consultantId;}

    let orderBy: Prisma.ConsultantReviewOrderByWithRelationInput;
    switch (sortBy) {
      case "highest":
        orderBy = { rating: "desc" };
        break;
      case "lowest":
        orderBy = { rating: "asc" };
        break;
      case "latest":
      default:
        orderBy = { createdAt: "desc" };
    }

    const [reviews, total] = await Promise.all([
      this.prisma.consultantReview.findMany({
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
        },
      }),
      this.prisma.consultantReview.count({ where }),
    ]);

    // Anonymize reviews where isAnonymous is true
    const sanitized = reviews.map((review) => ({
      ...review,
      user: review.isAnonymous
        ? { id: "anonymous", nickname: "匿名用户", avatar: null }
        : review.user,
    }));

    return {
      data: sanitized,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getConsultantRanking(consultantId: string): Promise<number> {
    const consultant = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
      include: {
        _count: { select: { bookings: true } },
      },
    });

    if (!consultant) {return 0;}

    // Rating dimension (40%)
    const ratingScore = Number(consultant.rating) / 5;

    // Order count dimension (20%) - new consultant protection
    const orderCount = consultant._count.bookings;
    const avgOrderCount = await this.getAverageOrderCount();
    const orderScore =
      orderCount < 5
        ? Math.min(orderCount / 5, 1) * 0.5 + 0.5
        : Math.min(orderCount / avgOrderCount, 1);

    // Response speed dimension (20%)
    const responseSpeed = consultant.responseTimeAvg ?? 60;
    const responseScore = Math.max(0, 1 - responseSpeed / 120);

    // Match score dimension (20%) - use rating as proxy
    const matchScore = ratingScore;

    const totalScore =
      ratingScore * RANKING_WEIGHTS.rating +
      orderScore * RANKING_WEIGHTS.orderCount +
      responseScore * RANKING_WEIGHTS.responseSpeed +
      matchScore * RANKING_WEIGHTS.matchScore;

    return Math.round(totalScore * 100);
  }

  private async updateConsultantRating(consultantId: string) {
    const stats = await this.prisma.consultantReview.aggregate({
      where: { consultantId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.consultantProfile.update({
      where: { id: consultantId },
      data: {
        rating: new Prisma.Decimal(stats._avg.rating ?? 0).toFixed(1),
        reviewCount: stats._count,
      },
    });
  }

  private async getAverageOrderCount(): Promise<number> {
    const result = await this.prisma.consultantProfile.aggregate({
      _avg: { reviewCount: true },
    });
    return result._avg.reviewCount ?? 10;
  }
}
