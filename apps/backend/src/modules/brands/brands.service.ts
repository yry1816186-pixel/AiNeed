import { Injectable } from "@nestjs/common";
import { Prisma, PriceRange, ClothingCategory } from "@prisma/client";

import { EncryptionService } from "../../common/encryption/encryption.service";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface CreateBrandDto {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  categories?: string[];
  priceRange?: PriceRange;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateBrandDto {
  name?: string;
  logo?: string;
  description?: string;
  website?: string;
  categories?: string[];
  priceRange?: PriceRange;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export interface BrandWithPII {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  categories: string[];
  priceRange: PriceRange;
  productCount: number;
  isActive: boolean;
  contactEmail?: string | null;
  contactPhone?: string | null;
  verified: boolean;
}

export interface BrandWithStats {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  categories: string[];
  priceRange: PriceRange;
  productCount: number;
  isActive: boolean;
}

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async getAllBrands(
    options: {
      category?: ClothingCategory;
      priceRange?: PriceRange;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { category, priceRange, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.BrandWhereInput = { isActive: true };
    if (priceRange) {where.priceRange = priceRange;}
    if (category) {where.categories = { has: category };}

    const [brands, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        include: {
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.brand.count({ where }),
    ]);

    return {
      items: brands.map((brand) => ({
        ...brand,
        productCount: brand._count.products,
        _count: undefined,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBrandBySlug(slug: string): Promise<BrandWithStats | null> {
    const brand = await this.prisma.brand.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    if (!brand) {return null;}

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo,
      description: brand.description,
      website: brand.website,
      categories: brand.categories,
      priceRange: brand.priceRange,
      productCount: brand._count.products,
      isActive: brand.isActive,
    };
  }

  async getBrandProducts(
    brandSlug: string,
    options: {
      category?: ClothingCategory;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: "price" | "createdAt" | "viewCount";
      sortOrder?: "asc" | "desc";
      page?: number;
      limit?: number;
    } = {},
  ) {
    const {
      category,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = options;
    const skip = (page - 1) * limit;

    const brand = await this.prisma.brand.findUnique({
      where: { slug: brandSlug },
    });

    if (!brand) {
      return null;
    }

    const where: Prisma.ClothingItemWhereInput = { brandId: brand.id, isActive: true };
    if (category) {where.category = category;}
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {where.price = { ...where.price, gte: minPrice };}
      if (maxPrice !== undefined) {where.price = { ...where.price, lte: maxPrice };}
    }

    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    return {
      brand: {
        id: brand.id,
        name: brand.name,
        logo: brand.logo,
        description: brand.description,
      },
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFeaturedBrands(limit: number = 10) {
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: { where: { isActive: true, isFeatured: true } } },
        },
      },
      orderBy: {
        products: {
          _count: "desc",
        },
      },
      take: limit,
    });

    return brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo,
      description: brand.description,
      featuredProductCount: brand._count.products,
    }));
  }

  async getBrandsByCategory(category: ClothingCategory) {
    return this.prisma.brand.findMany({
      where: {
        isActive: true,
        categories: { has: category },
      },
      include: {
        _count: {
          select: { products: { where: { isActive: true, category } } },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async getPriceRangeStats() {
    const stats = await this.prisma.brand.groupBy({
      by: ["priceRange"],
      _count: { id: true },
      where: { isActive: true },
    });

    return stats.map((s) => ({
      priceRange: s.priceRange,
      count: s._count.id,
      label: this.getPriceRangeLabel(s.priceRange),
    }));
  }

  private getPriceRangeLabel(priceRange: PriceRange): string {
    const labels: Record<PriceRange, string> = {
      [PriceRange.budget]: "平价",
      [PriceRange.mid_range]: "中档",
      [PriceRange.premium]: "高端",
      [PriceRange.luxury]: "奢侈",
    };
    return labels[priceRange] || priceRange;
  }

  // ==================== PII Encryption Methods ====================

  /**
   * Create a new brand with encrypted PII fields
   * @param dto Brand creation data
   * @returns Created brand with decrypted PII fields
   */
  async createBrand(dto: CreateBrandDto): Promise<BrandWithPII> {
    const data: Prisma.BrandCreateInput = {
      name: dto.name,
      slug: dto.slug,
      logo: dto.logo,
      description: dto.description,
      website: dto.website,
      categories: dto.categories || [],
      priceRange: dto.priceRange || PriceRange.mid_range,
    };

    // Encrypt PII fields before storage
    if (dto.contactEmail) {
      data.contactEmail = this.encryptionService.encrypt(dto.contactEmail);
    }
    if (dto.contactPhone) {
      data.contactPhone = this.encryptionService.encrypt(dto.contactPhone);
    }

    const brand = await this.prisma.brand.create({
      data,
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    return this.mapBrandWithPII(brand);
  }

  /**
   * Update a brand with encrypted PII fields
   * @param brandId Brand ID
   * @param dto Update data
   * @returns Updated brand with decrypted PII fields
   */
  async updateBrand(brandId: string, dto: UpdateBrandDto): Promise<BrandWithPII> {
    const data: Prisma.BrandUpdateInput = { ...dto };

    // Encrypt PII fields before storage
    if (dto.contactEmail !== undefined) {
      data.contactEmail = dto.contactEmail
        ? this.encryptionService.encrypt(dto.contactEmail)
        : null;
    }
    if (dto.contactPhone !== undefined) {
      data.contactPhone = dto.contactPhone
        ? this.encryptionService.encrypt(dto.contactPhone)
        : null;
    }

    const brand = await this.prisma.brand.update({
      where: { id: brandId },
      data,
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    return this.mapBrandWithPII(brand);
  }

  /**
   * Get brand by ID with decrypted PII fields (for merchant/admin use only)
   * @param brandId Brand ID
   * @returns Brand with decrypted PII or null
   */
  async getBrandById(brandId: string): Promise<BrandWithPII | null> {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    if (!brand) {
      return null;
    }

    return this.mapBrandWithPII(brand);
  }

  /**
   * Get brand by ID for merchant portal (includes PII)
   * @param brandId Brand ID
   * @param merchantId Merchant ID for authorization
   * @returns Brand with decrypted PII or null
   */
  async getBrandForMerchant(
    brandId: string,
    merchantId: string,
  ): Promise<BrandWithPII | null> {
    // Verify merchant has access to this brand
    const merchant = await this.prisma.brandMerchant.findFirst({
      where: { id: merchantId, brandId, isActive: true },
    });

    if (!merchant) {
      return null;
    }

    return this.getBrandById(brandId);
  }

  /**
   * Map brand entity to response with decrypted PII fields
   */
  private mapBrandWithPII(brand: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    description: string | null;
    website: string | null;
    categories: string[];
    priceRange: PriceRange;
    isActive: boolean;
    contactEmail: string | null;
    contactPhone: string | null;
    verified: boolean;
    _count?: { products: number };
  }): BrandWithPII {
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo,
      description: brand.description,
      website: brand.website,
      categories: brand.categories,
      priceRange: brand.priceRange,
      productCount: brand._count?.products || 0,
      isActive: brand.isActive,
      // Decrypt PII fields for response
      contactEmail: brand.contactEmail
        ? this.encryptionService.decrypt(brand.contactEmail)
        : null,
      contactPhone: brand.contactPhone
        ? this.encryptionService.decrypt(brand.contactPhone)
        : null,
      verified: brand.verified,
    };
  }
}
