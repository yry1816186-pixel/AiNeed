import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomizationType, CustomizationStatus, Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class CustomizationService {
  constructor(private prisma: PrismaService) {}

  async createRequest(
    userId: string,
    data: {
      type: CustomizationType;
      title?: string;
      description: string;
      referenceImages?: string[];
      preferences?: Record<string, any>;
    },
  ) {
    return this.prisma.customizationRequest.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        description: data.description,
        referenceImages: data.referenceImages || [],
        preferences: data.preferences || {},
        status: CustomizationStatus.draft,
      },
    });
  }

  async submitRequest(requestId: string, userId: string) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在");
    }

    return this.prisma.customizationRequest.update({
      where: { id: requestId },
      data: { status: CustomizationStatus.submitted },
    });
  }

  async getUserRequests(
    userId: string,
    status?: CustomizationStatus,
    page: number = 1,
    limit: number = 10,
  ) {
    const where: Prisma.CustomizationRequestWhereInput = { userId };
    if (status) {where.status = status;}

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.customizationRequest.findMany({
        where,
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.customizationRequest.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRequestById(requestId: string, userId: string) {
    return this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId },
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async updateRequest(
    requestId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      referenceImages?: string[];
      preferences?: Record<string, any>;
    },
  ) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId, status: CustomizationStatus.draft },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在或无法修改");
    }

    return this.prisma.customizationRequest.update({
      where: { id: requestId },
      data,
    });
  }

  async selectQuote(requestId: string, userId: string, quoteId: string) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在");
    }

    const quote = await this.prisma.customizationQuote.findUnique({
      where: { id: quoteId, requestId },
    });

    if (!quote) {
      throw new NotFoundException("报价不存在");
    }

    return this.prisma.customizationRequest.update({
      where: { id: requestId },
      data: {
        selectedQuoteId: quoteId,
        status: CustomizationStatus.confirmed,
      },
    });
  }

  async cancelRequest(requestId: string, userId: string) {
    const request = await this.prisma.customizationRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: {
          in: [CustomizationStatus.draft, CustomizationStatus.submitted],
        },
      },
    });

    if (!request) {
      throw new NotFoundException("定制需求不存在或无法取消");
    }

    return this.prisma.customizationRequest.update({
      where: { id: requestId },
      data: { status: CustomizationStatus.cancelled },
    });
  }
}
