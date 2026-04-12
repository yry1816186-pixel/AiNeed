import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { DesignQueryDto, DesignSortOption } from './dto/design-query.dto';

interface CustomDesignDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  findFirst(args: Record<string, unknown>): Promise<unknown | null>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
  count(args: Record<string, unknown>): Promise<number>;
}

interface ProductTemplateDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
}

interface PrismaDelegates {
  customDesign: CustomDesignDelegate;
  productTemplate: ProductTemplateDelegate;
}

@Injectable()
export class CustomizeService {
  private readonly logger = new Logger(CustomizeService.name);
  private readonly db: PrismaDelegates;

  constructor(prisma: PrismaService) {
    this.db = prisma as unknown as PrismaDelegates;
  }

  async create(userId: string, dto: CreateDesignDto) {
    const design = await this.db.customDesign.create({
      data: {
        userId,
        name: dto.name,
        designData: dto.designData as Record<string, unknown>,
        patternImageUrl: dto.patternImageUrl ?? null,
        productType: dto.productType,
        productTemplateId: dto.productTemplateId ?? null,
        tags: dto.tags ?? [],
        price: dto.price ?? null,
        isPublic: false,
        status: 'draft',
      },
    });

    this.logger.log(`User ${userId} created design ${(design as Record<string, unknown>).id as string}`);
    return design;
  }

  async findAll(userId: string, query: DesignQueryDto) {
    const {
      productType,
      status,
      tags,
      sort = DesignSortOption.NEWEST,
      page = 1,
      limit = 20,
    } = query;

    const where = {
      userId,
      ...(productType && { productType }),
      ...(status && { status }),
      ...(tags && {
        tags: { hasSome: tags.split(',').map((t) => t.trim()).filter(Boolean) },
      }),
    };

    const orderBy = this.buildOrderBy(sort);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.db.customDesign.findMany({ where, orderBy, skip, take: limit }),
      this.db.customDesign.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, meta: { total, page, limit, totalPages } };
  }

  async findOne(userId: string, id: string) {
    const design = await this.db.customDesign.findUnique({ where: { id } });

    if (!design) {
      throw new NotFoundException('设计不存在');
    }

    const designRecord = design as Record<string, unknown>;
    if (designRecord.userId !== userId && !designRecord.isPublic) {
      throw new ForbiddenException('无权查看此设计');
    }

    return design;
  }

  async update(userId: string, id: string, dto: UpdateDesignDto) {
    await this.findOneOrThrow(id, userId);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.designData !== undefined) data.designData = dto.designData;
    if (dto.productType !== undefined) data.productType = dto.productType;
    if (dto.productTemplateId !== undefined) data.productTemplateId = dto.productTemplateId;
    if (dto.patternImageUrl !== undefined) data.patternImageUrl = dto.patternImageUrl;
    if (dto.previewImageUrl !== undefined) data.previewImageUrl = dto.previewImageUrl;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.db.customDesign.update({
      where: { id },
      data,
    });

    this.logger.log(`User ${userId} updated design ${id}`);
    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOneOrThrow(id, userId);
    await this.db.customDesign.delete({ where: { id } });
    this.logger.log(`User ${userId} deleted design ${id}`);
  }

  async generatePreview(userId: string, id: string) {
    const design = await this.findOneOrThrow(id, userId);
    const designRecord = design as Record<string, unknown>;

    if (!designRecord.patternImageUrl && !designRecord.designData) {
      throw new BadRequestException('设计缺少图案数据，无法生成预览');
    }

    const previewUrl = await this.renderPreview(
      designRecord.designData as Record<string, unknown>,
      designRecord.productType as string,
      designRecord.productTemplateId as string | null,
    );

    const updated = await this.db.customDesign.update({
      where: { id },
      data: { previewImageUrl: previewUrl },
    });

    this.logger.log(`User ${userId} generated preview for design ${id}`);
    return updated;
  }

  async publish(userId: string, id: string) {
    const design = await this.findOneOrThrow(id, userId);
    const designRecord = design as Record<string, unknown>;

    if (!designRecord.previewImageUrl) {
      throw new BadRequestException('请先生成预览图再发布');
    }

    if (designRecord.isPublic) {
      throw new BadRequestException('设计已发布');
    }

    const updated = await this.db.customDesign.update({
      where: { id },
      data: { isPublic: true, status: 'published' },
    });

    this.logger.log(`User ${userId} published design ${id}`);
    return updated;
  }

  async getProductTemplates(productType?: string) {
    const where = {
      isActive: true,
      ...(productType && { productType }),
    };

    const templates = await this.db.productTemplate.findMany({
      where,
      orderBy: { productType: 'asc' as const },
    });

    return templates;
  }

  private async findOneOrThrow(id: string, userId: string) {
    const design = await this.db.customDesign.findUnique({ where: { id } });

    if (!design) {
      throw new NotFoundException('设计不存在');
    }

    const designRecord = design as Record<string, unknown>;
    if (designRecord.userId !== userId) {
      throw new ForbiddenException('无权操作此设计');
    }

    return design;
  }

  private buildOrderBy(sort: DesignSortOption) {
    switch (sort) {
      case DesignSortOption.NEWEST:
        return { createdAt: 'desc' as const };
      case DesignSortOption.OLDEST:
        return { createdAt: 'asc' as const };
      case DesignSortOption.MOST_LIKED:
        return { likesCount: 'desc' as const };
      case DesignSortOption.MOST_PURCHASED:
        return { purchasesCount: 'desc' as const };
      default:
        return { createdAt: 'desc' as const };
    }
  }

  private async renderPreview(
    _designData: Record<string, unknown>,
    productType: string,
    productTemplateId: string | null,
  ): Promise<string> {
    if (productTemplateId) {
      const template = await this.db.productTemplate.findUnique({
        where: { id: productTemplateId },
      });
      if (template) {
        const templateRecord = template as Record<string, unknown>;
        this.logger.log(
          `Rendering preview for product type ${productType} with template ${templateRecord.id as string}`,
        );
      }
    }

    return `previews/${productType}/${Date.now()}.png`;
  }
}
