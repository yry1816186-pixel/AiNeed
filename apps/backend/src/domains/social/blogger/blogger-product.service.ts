import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { NotificationService } from "../../../platform/notification/services/notification.service";

import type {
  CreateBloggerProductDto,
  UpdateBloggerProductDto,
  BloggerProductQueryDto,
  PurchaseBloggerProductDto,
} from "./dto/blogger.dto";

const DEFAULT_COMMISSION_RATE = 0.2;

@Injectable()
export class BloggerProductService {
  private readonly logger = new Logger(BloggerProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createProduct(bloggerId: string, dto: CreateBloggerProductDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: bloggerId },
      select: { bloggerLevel: true },
    });

    if (!user?.bloggerLevel) {
      throw new ForbiddenException("Only bloggers can create products");
    }

    if (dto.type === "digital_scheme") {
      if (dto.price < 0.01 || dto.price > 99) {
        throw new BadRequestException("Digital scheme price must be between 0.01 and 99");
      }
    }

    if (dto.type === "physical_product" && !dto.relatedItemId) {
      throw new BadRequestException("Physical product requires relatedItemId");
    }

    const product = await this.prisma.bloggerProduct.create({
      data: {
        bloggerId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        images: dto.images,
        relatedItemId: dto.relatedItemId,
        status: "active",
      },
    });

    this.logger.log(`Blogger ${bloggerId} created product ${product.id}`);
    return product;
  }

  async updateProduct(bloggerId: string, productId: string, dto: UpdateBloggerProductDto) {
    const product = await this.prisma.bloggerProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.bloggerId !== bloggerId) {
      throw new ForbiddenException("You can only update your own products");
    }

    const updateData: Prisma.BloggerProductUpdateInput = {};
    if (dto.title !== undefined) {updateData.title = dto.title;}
    if (dto.description !== undefined) {updateData.description = dto.description;}
    if (dto.price !== undefined) {updateData.price = dto.price;}
    if (dto.images !== undefined) {updateData.images = dto.images;}
    if (dto.status !== undefined) {updateData.status = dto.status;}

    return this.prisma.bloggerProduct.update({
      where: { id: productId },
      data: updateData,
    });
  }

  async deleteProduct(bloggerId: string, productId: string) {
    const product = await this.prisma.bloggerProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.bloggerId !== bloggerId) {
      throw new ForbiddenException("You can only delete your own products");
    }

    return this.prisma.bloggerProduct.update({
      where: { id: productId },
      data: { status: "removed" },
    });
  }

  async getProducts(query: BloggerProductQueryDto) {
    const where: Prisma.BloggerProductWhereInput = {};

    if (query.bloggerId) {where.bloggerId = query.bloggerId;}
    if (query.type) {where.type = query.type;}
    if (query.status) {where.status = query.status;}

    const [items, total] = await Promise.all([
      this.prisma.bloggerProduct.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit ?? 20,
        skip: query.cursor ? 1 : 0,
        ...(query.cursor ? { cursor: { id: query.cursor } } : {}),
      }),
      this.prisma.bloggerProduct.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        hasMore: items.length === (query.limit ?? 20),
        nextCursor: items.length > 0 ? items[items.length - 1]!.id : undefined,
      },
    };
  }

  async getProductById(productId: string) {
    const product = await this.prisma.bloggerProduct.findUnique({
      where: { id: productId },
      include: {
        blogger: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            bloggerLevel: true,
            bloggerBadge: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  async purchaseProduct(userId: string, dto: PurchaseBloggerProductDto) {
    const product = await this.prisma.bloggerProduct.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.status !== "active") {
      throw new BadRequestException("Product is not available for purchase");
    }

    if (product.bloggerId === userId) {
      throw new BadRequestException("Cannot purchase your own product");
    }

    const updatedProduct = await this.prisma.bloggerProduct.update({
      where: { id: dto.productId },
      data: { salesCount: { increment: 1 } },
    });

    const price = Number(product.price);
    const commission = price * DEFAULT_COMMISSION_RATE;
    const bloggerRevenue = price - commission;

    try {
      await this.notificationService.send(product.bloggerId, {
        type: "blogger_product_sold",
        title: "商品售出通知",
        content: `您的商品「${product.title}」已被购买，收入 ¥${bloggerRevenue.toFixed(2)}`,
        targetType: "blogger_product",
        targetId: product.id,
      });
    } catch (error) {
      this.logger.error(`Failed to send product sold notification: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    this.logger.log(`User ${userId} purchased product ${dto.productId} from blogger ${product.bloggerId}`);

    return {
      productId: product.id,
      title: product.title,
      price,
      commission,
      bloggerRevenue,
      salesCount: updatedProduct.salesCount,
    };
  }

  async getBloggerProducts(bloggerId: string) {
    return this.prisma.bloggerProduct.findMany({
      where: { bloggerId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
  }
}
