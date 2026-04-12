import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { GENDER_VALUES } from './interfaces/template-config.interface';

@Injectable()
export class AvatarTemplateService {
  private readonly logger = new Logger(AvatarTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(gender?: string, isActive?: boolean) {
    const where: Record<string, unknown> = {};

    if (gender) {
      if (!GENDER_VALUES.includes(gender as (typeof GENDER_VALUES)[number])) {
        throw new NotFoundException({
          code: 'INVALID_GENDER',
          message: `无效的性别筛选值: ${gender}`,
        });
      }
      where.gender = gender;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.avatarTemplate.findMany({
        where,
        select: {
          id: true,
          name: true,
          gender: true,
          thumbnailUrl: true,
          parameters: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.avatarTemplate.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const template = await this.prisma.avatarTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: '形象模板不存在',
      });
    }

    return template;
  }

  async create(dto: CreateTemplateDto) {
    this.logger.log(`创建形象模板: ${dto.name}`);

    const template = await this.prisma.avatarTemplate.create({
      data: {
        name: dto.name,
        gender: dto.gender,
        drawingConfig: dto.drawingConfig as unknown as Prisma.InputJsonValue,
        parameters: dto.parameters as unknown as Prisma.InputJsonValue,
        ...(dto.defaultClothingMap !== undefined && {
          defaultClothingMap: dto.defaultClothingMap as unknown as Prisma.InputJsonValue,
        }),
      },
    });

    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);

    this.logger.log(`更新形象模板: ${id}`);

    const existing = await this.prisma.avatarTemplate.findUnique({
      where: { id },
      select: { drawingConfig: true, parameters: true },
    });

    const mergedDrawingConfig = dto.drawingConfig
      ? { ...((existing?.drawingConfig as Record<string, unknown>) ?? {}), ...dto.drawingConfig }
      : undefined;

    const mergedParameters = dto.parameters
      ? { ...((existing?.parameters as Record<string, unknown>) ?? {}), ...dto.parameters }
      : undefined;

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (mergedDrawingConfig !== undefined) data.drawingConfig = mergedDrawingConfig;
    if (mergedParameters !== undefined) data.parameters = mergedParameters;
    if (dto.defaultClothingMap !== undefined) data.defaultClothingMap = dto.defaultClothingMap;

    const template = await this.prisma.avatarTemplate.update({
      where: { id },
      data: data as Prisma.Args<typeof this.prisma.avatarTemplate, 'update'>['data'],
    });

    return template;
  }

  async remove(id: string) {
    await this.findOne(id);

    this.logger.log(`软删除形象模板: ${id}`);

    const template = await this.prisma.avatarTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return template;
  }
}
