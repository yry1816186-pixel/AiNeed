import { Injectable, NotFoundException, Logger, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

import type { CreateProductDto, UpdateProductDto } from "./dto";

@Injectable()
export class MerchantProductService {
  private readonly logger = new Logger(MerchantProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProducts(
    brandId: string,
    options: { limit?: number; offset?: number; status?: string } = {}
  ) {
    const { limit = 20, offset = 0, status } = options;

    const where: Prisma.ClothingItemWhereInput = { brandId };
    if (status === "active") {
      where.isActive = true;
    }
    if (status === "inactive") {
      where.isActive = false;
    }

    const [products, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    return { products, total, hasMore: products.length === limit };
  }

  async createProduct(brandId: string, data: CreateProductDto) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    try {
      const product = await this.prisma.clothingItem.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          colors: data.colors,
          sizes: data.sizes,
          price: data.price,
          originalPrice: data.originalPrice,
          currency: data.currency ?? "CNY",
          images: data.images,
          tags: data.tags ?? [],
          isActive: data.isActive ?? true,
          brandId,
        },
      });

      this.logger.log(`Product created: ${product.id} by brand: ${brandId}`);
      return product;
    } catch (error) {
      this.logger.error(
        `Failed to create product: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      throw new BadRequestException("创建商品失败");
    }
  }

  async updateProduct(brandId: string, productId: string, data: UpdateProductDto) {
    const product = await this.prisma.clothingItem.findFirst({
      where: { id: productId, brandId },
    });

    if (!product) {
      throw new NotFoundException("商品不存在或无权操作");
    }

    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      if (data.category !== undefined) {
        updateData.category = data.category;
      }
      if (data.colors !== undefined) {
        updateData.colors = data.colors;
      }
      if (data.sizes !== undefined) {
        updateData.sizes = data.sizes;
      }
      if (data.price !== undefined) {
        updateData.price = data.price;
      }
      if (data.originalPrice !== undefined) {
        updateData.originalPrice = data.originalPrice;
      }
      if (data.images !== undefined) {
        updateData.images = data.images;
      }
      if (data.tags !== undefined) {
        updateData.tags = data.tags;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      return await this.prisma.clothingItem.update({
        where: { id: productId },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update product: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      throw new BadRequestException("更新商品失败");
    }
  }

  async deleteProduct(brandId: string, productId: string) {
    const product = await this.prisma.clothingItem.findFirst({
      where: { id: productId, brandId },
    });

    if (!product) {
      throw new NotFoundException("商品不存在或无权操作");
    }

    try {
      await this.prisma.clothingItem.delete({
        where: { id: productId },
      });

      this.logger.log(`Product deleted: ${productId} by brand: ${brandId}`);
      return { success: true, message: "商品已删除" };
    } catch (error) {
      this.logger.error(
        `Failed to delete product: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      throw new BadRequestException("删除商品失败");
    }
  }
}
