import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StudioQueryDto, StudioSortOption, CreateStudioDto, UpdateStudioDto } from './dto/studio.dto';

interface StudioRow {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  city: string | null;
  address: string | null;
  specialties: string[];
  serviceTypes: string[];
  priceRange: string | null;
  portfolioImages: string[];
  rating: unknown;
  reviewCount: number;
  orderCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; nickname: string | null; avatarUrl: string | null } | null;
}

interface ReviewRow {
  id: string;
  orderId: string;
  userId: string;
  studioId: string;
  rating: number;
  content: string | null;
  images: string[];
  isAnonymous: boolean;
  createdAt: Date;
  user?: { id: string; nickname: string | null; avatarUrl: string | null } | null;
}

interface WhereCondition {
  isActive?: boolean;
  city?: { contains: string; mode: 'insensitive' };
  specialties?: { hasSome: string[] };
  serviceTypes?: { hasSome: string[] };
  priceRange?: string;
  isVerified?: boolean;
  AND?: WhereCondition[];
}

type OrderByClause = Record<string, string>;

@Injectable()
export class StudiosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: StudioQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);
    const orderBy = this.buildOrderByClause(query.sort ?? StudioSortOption.RATING_DESC);

    const [items, total] = await Promise.all([
      this.prisma.bespokeStudio.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      }),
      this.prisma.bespokeStudio.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: (items as StudioRow[]).map((item) => this.serializeStudio(item)),
      meta: { total, page, limit, totalPages },
    };
  }

  async findOne(id: string) {
    const studio = await this.prisma.bespokeStudio.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    if (!studio) {
      throw new NotFoundException(`Studio with id ${id} not found`);
    }

    return this.serializeStudioDetail(studio as StudioRow);
  }

  async create(userId: string, dto: CreateStudioDto) {
    const existing = await this.prisma.bespokeStudio.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Studio slug "${dto.slug}" already exists`);
    }

    const existingUserStudio = await this.prisma.bespokeStudio.findFirst({
      where: { userId, isActive: true },
    });

    if (existingUserStudio) {
      throw new ConflictException('You already have an active studio');
    }

    const studio = await this.prisma.bespokeStudio.create({
      data: {
        userId,
        name: dto.name,
        slug: dto.slug,
        logoUrl: dto.logoUrl ?? null,
        coverImageUrl: dto.coverImageUrl ?? null,
        description: dto.description ?? null,
        city: dto.city ?? null,
        address: dto.address ?? null,
        specialties: dto.specialties ?? [],
        serviceTypes: dto.serviceTypes ?? [],
        priceRange: dto.priceRange ?? null,
        portfolioImages: dto.portfolioImages ?? [],
      },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    return this.serializeStudioDetail(studio as StudioRow);
  }

  async update(userId: string, id: string, dto: UpdateStudioDto) {
    const studio = await this.prisma.bespokeStudio.findUnique({ where: { id } });

    if (!studio) {
      throw new NotFoundException(`Studio with id ${id} not found`);
    }

    if (studio.userId !== userId) {
      throw new ForbiddenException('Only the studio owner can update this studio');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = dto.coverImageUrl;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.specialties !== undefined) data.specialties = dto.specialties;
    if (dto.serviceTypes !== undefined) data.serviceTypes = dto.serviceTypes;
    if (dto.priceRange !== undefined) data.priceRange = dto.priceRange;
    if (dto.portfolioImages !== undefined) data.portfolioImages = dto.portfolioImages;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.bespokeStudio.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    return this.serializeStudioDetail(updated as StudioRow);
  }

  async getReviews(studioId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const studio = await this.prisma.bespokeStudio.findUnique({ where: { id: studioId } });
    if (!studio) {
      throw new NotFoundException(`Studio with id ${studioId} not found`);
    }

    const [items, total] = await Promise.all([
      this.prisma.bespokeReview.findMany({
        where: { studioId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      }),
      this.prisma.bespokeReview.count({ where: { studioId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: (items as ReviewRow[]).map((r) => this.serializeReview(r)),
      meta: { total, page, limit, totalPages },
    };
  }

  async getMyStudio(userId: string) {
    const studio = await this.prisma.bespokeStudio.findFirst({
      where: { userId, isActive: true },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    if (!studio) {
      throw new NotFoundException('You do not have an active studio');
    }

    return this.serializeStudioDetail(studio as StudioRow);
  }

  private buildWhereClause(query: StudioQueryDto): WhereCondition {
    const conditions: WhereCondition[] = [{ isActive: true }];

    if (query.city) {
      conditions.push({ city: { contains: query.city, mode: 'insensitive' } });
    }

    if (query.specialties) {
      const tags = query.specialties.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        conditions.push({ specialties: { hasSome: tags } });
      }
    }

    if (query.serviceTypes) {
      const types = query.serviceTypes.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        conditions.push({ serviceTypes: { hasSome: types } });
      }
    }

    if (query.priceRange) {
      conditions.push({ priceRange: query.priceRange });
    }

    if (query.isVerified !== undefined) {
      conditions.push({ isVerified: query.isVerified });
    }

    return conditions.length === 1
      ? conditions[0]
      : { AND: conditions };
  }

  private buildOrderByClause(sort: StudioSortOption): OrderByClause {
    switch (sort) {
      case StudioSortOption.RATING_DESC:
        return { rating: 'desc' };
      case StudioSortOption.REVIEW_COUNT_DESC:
        return { reviewCount: 'desc' };
      case StudioSortOption.ORDER_COUNT_DESC:
        return { orderCount: 'desc' };
      case StudioSortOption.NEWEST:
      default:
        return { createdAt: 'desc' };
    }
  }

  private serializeStudio(item: StudioRow) {
    return {
      id: item.id,
      userId: item.userId,
      name: item.name,
      slug: item.slug,
      logoUrl: item.logoUrl,
      coverImageUrl: item.coverImageUrl,
      description: item.description,
      city: item.city,
      address: item.address,
      specialties: item.specialties,
      serviceTypes: item.serviceTypes,
      priceRange: item.priceRange,
      portfolioImages: item.portfolioImages,
      rating: item.rating != null ? Number(item.rating) : 0,
      reviewCount: item.reviewCount,
      orderCount: item.orderCount,
      isVerified: item.isVerified,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      owner: item.user
        ? { id: item.user.id, nickname: item.user.nickname, avatarUrl: item.user.avatarUrl }
        : undefined,
    };
  }

  private serializeStudioDetail(item: StudioRow) {
    return {
      ...this.serializeStudio(item),
      owner: item.user
        ? { id: item.user.id, nickname: item.user.nickname, avatarUrl: item.user.avatarUrl }
        : { id: item.userId, nickname: null, avatarUrl: null },
    };
  }

  private serializeReview(r: ReviewRow) {
    return {
      id: r.id,
      orderId: r.orderId,
      userId: r.userId,
      studioId: r.studioId,
      rating: r.rating,
      content: r.content,
      images: r.images,
      isAnonymous: r.isAnonymous,
      createdAt: r.createdAt,
      user: r.isAnonymous
        ? undefined
        : r.user
          ? { id: r.user.id, nickname: r.user.nickname, avatarUrl: r.user.avatarUrl }
          : undefined,
    };
  }
}
