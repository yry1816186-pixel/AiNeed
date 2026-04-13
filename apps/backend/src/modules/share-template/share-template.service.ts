import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import {
  PaginatedResponse,
  createPaginatedResponse,
  normalizePaginationParams,
} from "../../common/types/api-response.types";

import {
  CreateShareTemplateDto,
  UpdateShareTemplateDto,
  ShareTemplateQueryDto,
} from "./dto/share-template.dto";

@Injectable()
export class ShareTemplateService {
  private readonly logger = new Logger(ShareTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(dto: CreateShareTemplateDto) {
    return this.prisma.shareTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        backgroundImageUrl: dto.backgroundImageUrl,
        layoutConfig: dto.layoutConfig,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getTemplates(
    query: ShareTemplateQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, pageSize = 20 } = normalizePaginationParams(query);

    const where: Prisma.ShareTemplateWhereInput = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.shareTemplate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.shareTemplate.count({ where }),
    ]);

    return createPaginatedResponse(items, total, page, pageSize);
  }

  async getTemplateById(templateId: string) {
    const template = await this.prisma.shareTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException("分享模板不存在");
    }

    return template;
  }

  async updateTemplate(templateId: string, dto: UpdateShareTemplateDto) {
    const existing = await this.prisma.shareTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundException("分享模板不存在");
    }

    return this.prisma.shareTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        description: dto.description,
        backgroundImageUrl: dto.backgroundImageUrl,
        layoutConfig: dto.layoutConfig,
        isActive: dto.isActive,
      },
    });
  }

  async deleteTemplate(templateId: string) {
    const existing = await this.prisma.shareTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundException("分享模板不存在");
    }

    await this.prisma.shareTemplate.delete({ where: { id: templateId } });
    return { success: true };
  }
}
