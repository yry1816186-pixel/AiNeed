import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from "@nestjs/swagger";
import { ClothingCategory, PriceRange } from "@prisma/client";

import { BrandsService } from "./brands.service";

@ApiTags("brands")
@Controller("brands")
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: "获取所有品牌列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiQuery({ name: "category", enum: ClothingCategory, required: false })
  @ApiQuery({ name: "priceRange", enum: PriceRange, required: false })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  async getAllBrands(
    @Query("category") category?: ClothingCategory,
    @Query("priceRange") priceRange?: PriceRange,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.brandsService.getAllBrands({
      category,
      priceRange,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get("featured")
  @ApiOperation({ summary: "获取推荐品牌" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiQuery({ name: "limit", type: Number, required: false })
  async getFeaturedBrands(@Query("limit") limit?: string) {
    return this.brandsService.getFeaturedBrands(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get("price-ranges")
  @ApiOperation({ summary: "获取价格区间统计" })
  @ApiResponse({ status: 200, description: "获取成功" })
  async getPriceRangeStats() {
    return this.brandsService.getPriceRangeStats();
  }

  @Get("category/:category")
  @ApiOperation({ summary: "按分类获取品牌" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiParam({ name: "category", enum: ClothingCategory, description: "服装分类" })
  async getBrandsByCategory(@Param("category") category: ClothingCategory) {
    return this.brandsService.getBrandsByCategory(category);
  }

  @Get(":slug")
  @ApiOperation({ summary: "获取品牌详情" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "品牌不存在" })
  @ApiParam({ name: "slug", description: "品牌标识" })
  async getBrandBySlug(@Param("slug") slug: string) {
    return this.brandsService.getBrandBySlug(slug);
  }

  @Get(":slug/products")
  @ApiOperation({ summary: "获取品牌商品" })
  @ApiQuery({ name: "category", enum: ClothingCategory, required: false })
  @ApiQuery({ name: "minPrice", type: Number, required: false })
  @ApiQuery({ name: "maxPrice", type: Number, required: false })
  @ApiQuery({
    name: "sortBy",
    enum: ["price", "createdAt", "viewCount"],
    required: false,
  })
  @ApiQuery({ name: "sortOrder", enum: ["asc", "desc"], required: false })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  async getBrandProducts(
    @Param("slug") slug: string,
    @Query("category") category?: ClothingCategory,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("sortBy") sortBy?: "price" | "createdAt" | "viewCount",
    @Query("sortOrder") sortOrder?: "asc" | "desc",
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.brandsService.getBrandProducts(slug, {
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      sortOrder,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
