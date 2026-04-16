/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";

import { AdminAuditService } from "./admin-audit.service";

export interface ReviewQueueFilters {
  page?: number;
  pageSize?: number;
  contentType?: string;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class ContentReviewService {
  private readonly logger = new Logger(ContentReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  async getReviewQueue(filters: ReviewQueueFilters) {
    const {
      page = 1,
      pageSize = 20,
      contentType,
      priority,
      startDate,
      endDate,
    } = filters;

    const where: Prisma.CommunityPostWhereInput = {
      isDeleted: false,
      moderationStatus: { in: ["pending", "flagged"] },
    };

    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) {createdAt.gte = startDate;}
      if (endDate) {createdAt.lte = endDate;}
      where.createdAt = createdAt;
    }

    if (priority === "high") {
      where.reportCount = { gt: 0 };
    }

    const orderBy: Prisma.CommunityPostOrderByWithRelationInput = {
      reportCount: "desc" as const,
    };

    const [items, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        orderBy: [orderBy, { createdAt: "asc" as const }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          _count: {
            select: { likes: true, comments: true, reports: true },
          },
        },
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async reviewContent(
    id: string,
    reviewerId: string,
    action: "approve" | "reject" | "delete",
    note?: string,
  ) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
    });

    if (!post || post.isDeleted) {
      return null;
    }

    if (action === "delete") {
      await this.prisma.communityPost.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } else {
      const newStatus = action === "approve" ? "approved" : "rejected";
      await this.prisma.communityPost.update({
        where: { id },
        data: { moderationStatus: newStatus },
      });
    }

    await this.prisma.contentModerationLog.create({
      data: {
        contentType: "post",
        contentId: id,
        action: action === "delete" ? "manual_delete" : `manual_${action}`,
        reason: note ?? undefined,
        moderatorId: reviewerId,
      },
    });

    await this.auditService.log({
      userId: reviewerId,
      action: `content.${action}`,
      resource: "community_post",
      resourceId: id,
      details: { note: note ?? null, previousStatus: post.moderationStatus },
    });

    return { success: true };
  }

  async batchReview(
    ids: string[],
    reviewerId: string,
    action: "approve" | "reject" | "delete",
    note?: string,
  ) {
    const results = { processed: 0, failed: 0 };

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const id of ids) {
        try {
          const post = await tx.communityPost.findUnique({ where: { id } });
          if (!post || post.isDeleted) {
            results.failed++;
            continue;
          }

          if (action === "delete") {
            await tx.communityPost.update({
              where: { id },
              data: { isDeleted: true, deletedAt: new Date() },
            });
          } else {
            const newStatus = action === "approve" ? "approved" : "rejected";
            await tx.communityPost.update({
              where: { id },
              data: { moderationStatus: newStatus },
            });
          }

          await tx.contentModerationLog.create({
            data: {
              contentType: "post",
              contentId: id,
              action: action === "delete" ? "manual_delete" : `manual_${action}`,
              reason: note ?? undefined,
              moderatorId: reviewerId,
            },
          });

          results.processed++;
        } catch {
          results.failed++;
        }
      }
    });

    await this.auditService.log({
      userId: reviewerId,
      action: `content.batch_${action}`,
      resource: "community_post",
      details: { ids, note: note ?? null, processed: results.processed, failed: results.failed },
    });

    return results;
  }

  async getReviewStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      pendingCount,
      flaggedCount,
      reviewedToday,
      reviewedThisWeek,
      reviewedThisMonth,
      approvedCount,
      rejectedCount,
    ] = await Promise.all([
      this.prisma.communityPost.count({
        where: { moderationStatus: "pending", isDeleted: false },
      }),
      this.prisma.communityPost.count({
        where: { moderationStatus: "flagged", isDeleted: false },
      }),
      this.prisma.contentModerationLog.count({
        where: {
          action: { in: ["manual_approve", "manual_reject", "manual_delete"] },
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.contentModerationLog.count({
        where: {
          action: { in: ["manual_approve", "manual_reject", "manual_delete"] },
          createdAt: { gte: weekStart },
        },
      }),
      this.prisma.contentModerationLog.count({
        where: {
          action: { in: ["manual_approve", "manual_reject", "manual_delete"] },
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.contentModerationLog.count({
        where: { action: "manual_approve", createdAt: { gte: monthStart } },
      }),
      this.prisma.contentModerationLog.count({
        where: { action: "manual_reject", createdAt: { gte: monthStart } },
      }),
    ]);

    const totalReviewed = approvedCount + rejectedCount;
    const approvalRate = totalReviewed > 0 ? approvedCount / totalReviewed : 0;
    const rejectionRate = totalReviewed > 0 ? rejectedCount / totalReviewed : 0;

    return {
      pending: pendingCount,
      flagged: flaggedCount,
      reviewedToday,
      reviewedThisWeek,
      reviewedThisMonth,
      approvalRate,
      rejectionRate,
    };
  }
}
