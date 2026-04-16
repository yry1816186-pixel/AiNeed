/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../../../../common/prisma/prisma.service";

export interface AuditLogParams {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQueryFilters {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId ?? null,
          details: params.details ? (params.details as Prisma.InputJsonValue) : undefined,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to create audit log: ${message}`);
    }
  }

  async query(filters: AuditLogQueryFilters) {
    const {
      page = 1,
      pageSize = 20,
      userId,
      action,
      resource,
      startDate,
      endDate,
    } = filters;

    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = { contains: action, mode: "insensitive" };
    }

    if (resource) {
      where.resource = resource;
    }

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) {createdAt.gte = startDate;}
      if (endDate) {createdAt.lte = endDate;}
      where.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, nickname: true, email: true, role: true },
          },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
