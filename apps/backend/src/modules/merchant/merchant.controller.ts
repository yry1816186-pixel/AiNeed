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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";

import {
  MerchantApplyDto,
  MerchantLoginDto,
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from "./dto";
import { MerchantAuthGuard } from "./guards/merchant-auth.guard";
import { MerchantService } from "./merchant.service";

@ApiTags("merchant")
@Controller("merchant")
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  /**
   * 商家入驻申请（公开）
   */
  @Post("apply")
  @ApiOperation({ summary: "商家入驻申请", description: "提交商家入驻申请，无需认证" })
  @ApiResponse({ status: 201, description: "申请提交成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  async apply(@Body() data: MerchantApplyDto) {
    return this.merchantService.applyForMerchant(data);
  }

  /**
   * 商家登录（公开）
   */
  @Post("login")
  @ApiOperation({ summary: "商家登录", description: "商家账号登录，返回 JWT Token，无需认证" })
  @ApiResponse({ status: 200, description: "登录成功" })
  @ApiResponse({ status: 401, description: "邮箱或密码错误" })
  async login(@Body() data: MerchantLoginDto) {
    return this.merchantService.login(data.email, data.password);
  }

  /**
   * 获取数据看板
   */
  @Get("dashboard")
  @UseGuards(MerchantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取数据看板", description: "获取商家数据看板，包含销售、流量等关键指标" })
  @ApiResponse({ status: 200, description: "成功返回看板数据" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "start", required: false, description: "开始日期，默认30天前", type: String })
  @ApiQuery({ name: "end", required: false, description: "结束日期，默认今天", type: String })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取商品列表", description: "分页获取商家商品列表，支持按状态筛选" })
  @ApiResponse({ status: 200, description: "成功返回商品列表" })
  @ApiResponse({ status: 401, description: "未授权" })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建商品", description: "创建新商品" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新商品", description: "更新指定商品信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  @ApiParam({ name: "id", description: "商品ID (UUID)" })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除商品", description: "删除指定商品" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  @ApiParam({ name: "id", description: "商品ID (UUID)" })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取结算记录", description: "获取商家结算记录列表" })
  @ApiResponse({ status: 200, description: "成功返回结算记录" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getSettlements(@Request() req: { merchant: { brandId: string } }) {
    return this.merchantService.getSettlements(req.merchant.brandId);
  }

  /**
   * 获取趋势数据
   */
  @Get("trends")
  @UseGuards(MerchantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取趋势数据", description: "获取商家销售趋势数据" })
  @ApiResponse({ status: 200, description: "成功返回趋势数据" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "start", required: false, description: "开始日期，默认30天前", type: String })
  @ApiQuery({ name: "end", required: false, description: "结束日期，默认今天", type: String })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取用户画像洞察", description: "获取商家受众用户画像洞察数据" })
  @ApiResponse({ status: 200, description: "成功返回用户画像洞察" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getAudience(@Request() req: { merchant: { brandId: string } }) {
    return this.merchantService.getAudienceInsights(req.merchant.brandId);
  }
}
