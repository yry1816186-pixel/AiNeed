import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from "@nestjs/common";

import {
  MerchantApplyDto,
  MerchantLoginDto,
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from "./dto";
import { MerchantAuthGuard } from "./guards/merchant-auth.guard";
import { MerchantService } from "./merchant.service";

@Controller("merchant")
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  /**
   * 商家入驻申请（公开）
   */
  @Post("apply")
  async apply(@Body() data: MerchantApplyDto) {
    return this.merchantService.applyForMerchant(data);
  }

  /**
   * 商家登录（公开）
   */
  @Post("login")
  async login(@Body() data: MerchantLoginDto) {
    return this.merchantService.login(data.email, data.password);
  }

  /**
   * 获取数据看板
   */
  @Get("dashboard")
  @UseGuards(MerchantAuthGuard)
  async getDashboard(
    @Request() req: { merchant: { brandId: string } },
    @Query("start") start?: string,
    @Query("end") end?: string,
  ) {
    // 安全解析日期，防止无效输入
    const parseDate = (
      dateStr: string | undefined,
      defaultDate: Date,
    ): Date => {
      if (!dateStr) {return defaultDate;}
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? defaultDate : parsed;
    };

    const range = {
      start: parseDate(start, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      end: parseDate(end, new Date()),
    };

    // 确保 start <= end
    if (range.start > range.end) {
      [range.start, range.end] = [range.end, range.start];
    }

    return this.merchantService.getDashboard(req.merchant.brandId, range);
  }

  /**
   * 获取商品列表
   */
  @Get("products")
  @UseGuards(MerchantAuthGuard)
  async getProducts(
    @Request() req: { merchant: { brandId: string } },
    @Query() query: ProductQueryDto,
  ) {
    return this.merchantService.getProducts(req.merchant.brandId, {
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      status: query.status,
    });
  }

  /**
   * 创建商品
   */
  @Post("products")
  @UseGuards(MerchantAuthGuard)
  async createProduct(
    @Request() req: { merchant: { brandId: string } },
    @Body() data: CreateProductDto,
  ) {
    return this.merchantService.createProduct(req.merchant.brandId, data);
  }

  /**
   * 更新商品
   */
  @Put("products/:id")
  @UseGuards(MerchantAuthGuard)
  async updateProduct(
    @Request() req: { merchant: { brandId: string } },
    @Param("id", ParseUUIDPipe) productId: string,
    @Body() data: UpdateProductDto,
  ) {
    return this.merchantService.updateProduct(
      req.merchant.brandId,
      productId,
      data,
    );
  }

  /**
   * 删除商品
   */
  @Delete("products/:id")
  @UseGuards(MerchantAuthGuard)
  async deleteProduct(
    @Request() req: { merchant: { brandId: string } },
    @Param("id", ParseUUIDPipe) productId: string,
  ) {
    return this.merchantService.deleteProduct(req.merchant.brandId, productId);
  }

  /**
   * 获取结算记录
   */
  @Get("settlements")
  @UseGuards(MerchantAuthGuard)
  async getSettlements(@Request() req: { merchant: { brandId: string } }) {
    return this.merchantService.getSettlements(req.merchant.brandId);
  }

  /**
   * 获取趋势数据
   */
  @Get("trends")
  @UseGuards(MerchantAuthGuard)
  async getTrends(
    @Request() req: { merchant: { brandId: string } },
    @Query("start") start?: string,
    @Query("end") end?: string,
  ) {
    const parseDate = (
      dateStr: string | undefined,
      defaultDate: Date,
    ): Date => {
      if (!dateStr) {return defaultDate;}
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? defaultDate : parsed;
    };

    const range = {
      start: parseDate(start, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      end: parseDate(end, new Date()),
    };

    if (range.start > range.end) {
      [range.start, range.end] = [range.end, range.start];
    }

    return this.merchantService.getTrendData(req.merchant.brandId, range);
  }

  /**
   * 获取用户画像洞察
   */
  @Get("audience")
  @UseGuards(MerchantAuthGuard)
  async getAudience(@Request() req: { merchant: { brandId: string } }) {
    return this.merchantService.getAudienceInsights(req.merchant.brandId);
  }
}
