import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";

import { MerchantAuthGuard } from "../../merchant/guards/merchant-auth.guard";
import { BrandsService } from "../brands.service";

import { BrandPortalService } from "./brand-portal.service";
import { ScanStatisticsQueryDto, ProductDataUpdateDto } from "./dto";

@ApiTags("brand-portal")
@ApiBearerAuth()
@UseGuards(MerchantAuthGuard)
@Controller("brand-portal")
export class BrandPortalController {
  constructor(
    private brandPortalService: BrandPortalService,
    private brandsService: BrandsService,
  ) {}

  @Get("dashboard")
  @ApiOperation({ summary: "品牌数据看板", description: "获取品牌管理看板概览数据" })
  @ApiResponse({ status: 200, description: "看板数据" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getDashboard(
    @Request() req: { merchant: { brandId: string } },
  ) {
    return this.brandPortalService.getBrandDashboard(req.merchant.brandId);
  }

  @Get("products")
  @ApiOperation({ summary: "商品数据管理", description: "获取品牌商品列表" })
  @ApiResponse({ status: 200, description: "商品列表" })
  async getProducts(
    @Request() req: { merchant: { brandId: string } },
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.brandPortalService.getProductDataManagement(
      req.merchant.brandId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Put("products/:productId")
  @ApiOperation({ summary: "更新商品详细数据", description: "更新商品的尺码表、材质说明、搭配建议" })
  @ApiParam({ name: "productId", description: "商品ID" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  async updateProductData(
    @Request() req: { merchant: { brandId: string } },
    @Param("productId") productId: string,
    @Body() dto: ProductDataUpdateDto,
  ) {
    return this.brandPortalService.updateProductData(
      req.merchant.brandId,
      productId,
      {
        materialNotes: dto.materialNotes,
        stylingTips: dto.stylingTips,
      },
    );
  }

  @Get("scan-statistics")
  @ApiOperation({ summary: "扫码统计", description: "获取品牌二维码扫码统计数据" })
  @ApiResponse({ status: 200, description: "扫码统计" })
  async getScanStatistics(
    @Request() req: { merchant: { brandId: string } },
    @Query() query: ScanStatisticsQueryDto,
  ) {
    return this.brandPortalService.getScanStatistics(
      req.merchant.brandId,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  @Get("user-preferences")
  @ApiOperation({ summary: "用户偏好分析", description: "分析扫码用户的风格偏好和画像数据" })
  @ApiResponse({ status: 200, description: "用户偏好数据" })
  async getUserPreferences(
    @Request() req: { merchant: { brandId: string } },
  ) {
    return this.brandPortalService.getUserPreferenceAnalysis(req.merchant.brandId);
  }

  @Get("qr-codes")
  @ApiOperation({ summary: "品牌二维码列表", description: "获取品牌的所有二维码" })
  @ApiResponse({ status: 200, description: "二维码列表" })
  async getQRCodes(
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
}
