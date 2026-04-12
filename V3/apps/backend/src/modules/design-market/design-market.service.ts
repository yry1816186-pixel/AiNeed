import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  type IContentReviewProvider,
  CONTENT_REVIEW_PROVIDER,
} from './providers/content-review.interface';
import {
  ListDesignsQueryDto,
  MarketSortOption,
} from './dto/list-designs-query.dto';
import { ReportDesignDto } from './dto/report-design.dto';

interface CustomDesignDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  findUnique(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  count(args: Record<string, unknown>): Promise<number>;
}

interface DesignLikeDelegate {
  findUnique(args: Record<string, unknown>): Promise<unknown>;
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  create(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
  count(args: Record<string, unknown>): Promise<number>;
}

interface DesignReportDelegate {
  create(args: Record<string, unknown>): Promise<unknown>;
  findFirst(args: Record<string, unknown>): Promise<unknown>;
}

interface UserDelegate {
  findUnique(args: Record<string, unknown>): Promise<unknown>;
}

interface PrismaDelegates {
  customDesign: CustomDesignDelegate;
  designLike: DesignLikeDelegate;
  designReport: DesignReportDelegate;
  user: UserDelegate;
}

@Injectable()
export class DesignMarketService {
  private readonly logger = new Logger(DesignMarketService.name);
  private readonly db: PrismaDelegates;

  constructor(
    prisma: PrismaService,
    @Inject(CONTENT_REVIEW_PROVIDER)
    private readonly contentReviewProvider: IContentReviewProvider,
  ) {
    this.db = prisma as unknown as PrismaDelegates;
  }

  async listDesigns(query: ListDesignsQueryDto, userId?: string) {
    const {
      sort = MarketSortOption.NEWEST,
      product_type,
      tag,
      keyword,
      page = 1,
      limit = 20,
    } = query;

    const where: Record<string, unknown> = {
      isPublic: true,
      status: 'published',
    };

    if (product_type) {
      where.productType = product_type;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { tags: { has: keyword } },
      ];
    }

    const orderBy =
      sort === MarketSortOption.POPULAR
        ? { likesCount: 'desc' as const }
        : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.db.customDesign.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, nickname: true, avatarUrl: true },
          },
        },
      }),
      this.db.customDesign.count({ where }),
    ]);

    const itemsArray = items as Array<Record<string, unknown>>;

    let likedDesignIds = new Set<string>();
    if (userId && itemsArray.length > 0) {
      const designIds = itemsArray.map((item) => item.id as string);
      const likes = await this.db.designLike.findMany({
        where: {
          userId,
          designId: { in: designIds },
        },
        select: { designId: true },
      });
      likedDesignIds = new Set((likes as Array<Record<string, unknown>>).map((l) => l.designId as string));
    }

    const enrichedItems = itemsArray.map((item) => ({
      id: item.id,
      name: item.name,
      previewImageUrl: item.previewImageUrl,
      productType: item.productType,
      likesCount: item.likesCount,
      downloadsCount: item.downloadsCount,
      tags: item.tags,
      createdAt: item.createdAt,
      designer: item.user,
      isLiked: likedDesignIds.has(item.id as string),
    }));

    return {
      items: enrichedItems,
      total,
      page,
      limit,
    };
  }

  async getDesignDetail(designId: string, userId?: string) {
    const design = await this.db.customDesign.findUnique({
      where: { id: designId },
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
      },
    });

    if (!design) {
      throw new NotFoundException('设计不存在');
    }

    const designRecord = design as Record<string, unknown>;
    if (designRecord.status !== 'published' && designRecord.isPublic !== true) {
      throw new NotFoundException('设计不存在');
    }

    const isLiked = userId
      ? !!(await this.db.designLike.findUnique({
          where: {
            userId_designId: { userId, designId },
          },
        }))
      : false;

    return {
      id: designRecord.id,
      name: designRecord.name,
      designData: designRecord.designData,
      patternImageUrl: designRecord.patternImageUrl,
      previewImageUrl: designRecord.previewImageUrl,
      productType: designRecord.productType,
      likesCount: designRecord.likesCount,
      downloadsCount: designRecord.downloadsCount,
      tags: designRecord.tags,
      status: designRecord.status,
      createdAt: designRecord.createdAt,
      updatedAt: designRecord.updatedAt,
      designer: designRecord.user,
      isLiked,
    };
  }

  async toggleLike(designId: string, userId: string) {
    const design = await this.db.customDesign.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new NotFoundException('设计不存在');
    }

    const designRecord = design as Record<string, unknown>;
    if (designRecord.status !== 'published') {
      throw new BadRequestException('该设计不可点赞');
    }

    const existing = await this.db.designLike.findUnique({
      where: {
        userId_designId: { userId, designId },
      },
    });

    let isLiked: boolean;
    let likesCount: number;

    if (existing) {
      await this.db.designLike.delete({
        where: {
          userId_designId: { userId, designId },
        },
      });

      const updated = await this.db.customDesign.update({
        where: { id: designId },
        data: { likesCount: { decrement: 1 } },
      });

      isLiked = false;
      likesCount = Math.max(0, (updated as Record<string, unknown>).likesCount as number);
      this.logger.log(`User ${userId} unliked design ${designId}`);
    } else {
      await this.db.designLike.create({
        data: { userId, designId },
      });

      const updated = await this.db.customDesign.update({
        where: { id: designId },
        data: { likesCount: { increment: 1 } },
      });

      isLiked = true;
      likesCount = (updated as Record<string, unknown>).likesCount as number;
      this.logger.log(`User ${userId} liked design ${designId}`);
    }

    return { isLiked, likesCount };
  }

  async reportDesign(designId: string, userId: string, dto: ReportDesignDto) {
    const design = await this.db.customDesign.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new NotFoundException('设计不存在');
    }

    const existingReport = await this.db.designReport.findFirst({
      where: {
        reporterId: userId,
        designId,
        status: 'pending',
      },
    });

    if (existingReport) {
      throw new ConflictException('您已举报过该设计，请等待审核');
    }

    const designRecord = design as Record<string, unknown>;
    const reviewResult = await this.contentReviewProvider.review({
      designId,
      name: designRecord.name as string,
      designData: designRecord.designData as Record<string, unknown>,
      patternImageUrl: designRecord.patternImageUrl as string | null,
      tags: designRecord.tags as string[],
    });

    const reportStatus =
      reviewResult.verdict === 'rejected' ? 'auto_rejected' : 'pending';

    const report = await this.db.designReport.create({
      data: {
        reporterId: userId,
        designId,
        reason: dto.reason,
        description: dto.description ?? null,
        reviewResult: reviewResult as unknown as Record<string, unknown>,
        status: reportStatus,
      },
    });

    if (reviewResult.verdict === 'rejected') {
      await this.db.customDesign.update({
        where: { id: designId },
        data: { status: 'rejected', isPublic: false },
      });
      this.logger.warn(`Design ${designId} auto-rejected due to report review`);
    }

    this.logger.log(
      `User ${userId} reported design ${designId}, verdict: ${reviewResult.verdict}`,
    );

    return {
      reportId: (report as Record<string, unknown>).id,
      status: reportStatus,
      reviewResult: reviewResult.verdict === 'rejected' ? reviewResult : null,
    };
  }

  async downloadDesign(designId: string, userId: string) {
    const design = await this.db.customDesign.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new NotFoundException('设计不存在');
    }

    const designRecord = design as Record<string, unknown>;
    if (designRecord.status !== 'published') {
      throw new BadRequestException('该设计不可下载');
    }

    const updated = await this.db.customDesign.update({
      where: { id: designId },
      data: { downloadsCount: { increment: 1 } },
    });

    const updatedRecord = updated as Record<string, unknown>;

    this.logger.log(`User ${userId} downloaded design ${designId}`);

    return {
      designData: designRecord.designData,
      patternImageUrl: designRecord.patternImageUrl,
      downloadsCount: updatedRecord.downloadsCount as number,
    };
  }

  async publishDesign(designId: string, userId: string) {
    const design = await this.db.customDesign.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new NotFoundException('设计不存在');
    }

    const designRecord = design as Record<string, unknown>;
    if (designRecord.userId !== userId) {
      throw new BadRequestException('只能发布自己的设计');
    }

    const currentStatus = designRecord.status as string;
    if (currentStatus === 'published') {
      throw new BadRequestException('设计已发布');
    }

    if (!designRecord.previewImageUrl) {
      throw new BadRequestException('请先上传预览图');
    }

    await this.db.customDesign.update({
      where: { id: designId },
      data: { status: 'under_review' },
    });

    const reviewResult = await this.contentReviewProvider.review({
      designId,
      name: designRecord.name as string,
      designData: designRecord.designData as Record<string, unknown>,
      patternImageUrl: designRecord.patternImageUrl as string | null,
      tags: designRecord.tags as string[],
    });

    let newStatus: string;
    switch (reviewResult.verdict) {
      case 'approved':
        newStatus = 'published';
        break;
      case 'suspicious':
        newStatus = 'under_review';
        break;
      case 'rejected':
        newStatus = 'rejected';
        break;
    }

    await this.db.customDesign.update({
      where: { id: designId },
      data: {
        status: newStatus,
        isPublic: reviewResult.verdict === 'approved',
      },
    });

    this.logger.log(
      `Design ${designId} publish review: ${reviewResult.verdict} -> status: ${newStatus}`,
    );

    return {
      designId,
      status: newStatus,
      reviewResult: reviewResult.verdict !== 'approved' ? reviewResult : null,
    };
  }
}
