import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
import { ClothingCategory, PriceRange } from "@prisma/client";

import { MerchantAuthGuard } from "../../../domains/platform/merchant/guards/merchant-auth.guard";

import { BrandsService } from "./brands.service";
import { GenerateQRCodeDto, BatchGenerateQRCodeDto } from "./dto/qr-code.dto";

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

  // ==================== QR Code Scan (Public) ====================

  @Get("qr-codes/:code")
  @ApiOperation({ summary: "扫码获取商品信息（公开）", description: "扫描品牌二维码获取关联的商品数据，无需认证" })
  @ApiParam({ name: "code", description: "二维码编码" })
  @ApiResponse({ status: 200, description: "商品信息" })
  @ApiResponse({ status: 404, description: "二维码不存在" })
  async scanQRCode(
    @Param("code") code: string,
  ) {
    const qrCode = await this.brandsService.getQRCodeByCode(code);
    if (!qrCode?.isActive) {
      return { success: false, error: "二维码无效或已停用" };
    }
    return {
      success: true,
      brand: qrCode.brand,
      product: qrCode.payload,
      qrCodeId: qrCode.id,
    };
  }

  @Post("qr-codes/:code/scan")
  @ApiOperation({ summary: "记录扫码并导入衣橱", description: "记录扫码事件，已登录用户可自动导入到衣橱" })
  @ApiParam({ name: "code", description: "二维码编码" })
  @ApiResponse({ status: 200, description: "扫码成功" })
  async recordScanAndImport(
    @Param("code") code: string,
    @Body() body: { userId?: string; platform?: string },
  ) {
    const qrCode = await this.brandsService.getQRCodeByCode(code);
    if (!qrCode?.isActive) {
      return { success: false, error: "二维码无效或已停用" };
    }

    await this.brandsService.recordScan(qrCode.id, body.userId, body.platform);

    return {
      success: true,
      imported: !!body.userId,
      product: qrCode.payload,
    };
  }

  // ==================== QR Code Management (Merchant Auth) ====================

  @Post("qr-codes")
  @UseGuards(MerchantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "生成品牌二维码（商家）", description: "为品牌商品生成专属二维码" })
  @ApiResponse({ status: 201, description: "二维码生成成功" })
  async generateQRCode(
    @Request() req: { merchant: { brandId: string } },
    @Body() dto: GenerateQRCodeDto,
  ) {
    return this.brandsService.generateQRCode(req.merchant.brandId, dto.productId, {
      productName: dto.productName,
      sku: dto.sku,
      color: dto.color,
      size: dto.size,
      material: dto.material,
      price: dto.price,
    });
  }

  @Get("manage/qr-codes")
  @UseGuards(MerchantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取品牌二维码列表（商家）" })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  async getBrandQRCodes(
    @Request() req: { merchant: { brandId: string } },
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.brandsService.getBrandQRCodes(
      req.merchant.brandId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Patch("manage/qr-codes/:id/deactivate")
  @UseGuards(MerchantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "停用二维码（商家）" })
  @ApiParam({ name: "id", description: "二维码ID" })
  async deactivateQRCode(
    @Request() req: { merchant: { brandId: string } },
    @Param("id") qrCodeId: string,
  ) {
    return this.brandsService.deactivateQRCode(qrCodeId, req.merchant.brandId);
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
