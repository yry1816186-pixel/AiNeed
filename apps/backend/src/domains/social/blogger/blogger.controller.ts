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
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { OptionalAuthGuard } from "../../../identity/auth/guards/optional-auth.guard";

import { BloggerDashboardService } from "./blogger-dashboard.service";
import { BloggerProductService } from "./blogger-product.service";
import {
  CreateBloggerProductDto,
  UpdateBloggerProductDto,
  BloggerProductQueryDto,
  DashboardQueryDto,
  PurchaseBloggerProductDto,
} from "./dto/blogger.dto";
import { BloggerGuard } from "./guards/blogger.guard";

@ApiTags("blogger")
@Controller("blogger")
export class BloggerController {
  constructor(
    private readonly bloggerProductService: BloggerProductService,
    private readonly bloggerDashboardService: BloggerDashboardService,
  ) {}

  @Post("products")
  @UseGuards(AuthGuard("jwt"), BloggerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建博主商品" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 403, description: "无博主权限" })
  async createProduct(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateBloggerProductDto,
  ) {
    return this.bloggerProductService.createProduct(req.user.id, dto);
  }

  @Put("products/:id")
  @UseGuards(AuthGuard("jwt"), BloggerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新博主商品" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 403, description: "无博主权限" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  @ApiParam({ name: "id", description: "商品ID" })
  async updateProduct(
    @Request() req: { user: { id: string } },
    @Param("id") productId: string,
    @Body() dto: UpdateBloggerProductDto,
  ) {
    return this.bloggerProductService.updateProduct(req.user.id, productId, dto);
  }

  @Delete("products/:id")
  @UseGuards(AuthGuard("jwt"), BloggerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除博主商品" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 403, description: "无博主权限" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  @ApiParam({ name: "id", description: "商品ID" })
  async deleteProduct(
    @Request() req: { user: { id: string } },
    @Param("id") productId: string,
  ) {
    return this.bloggerProductService.deleteProduct(req.user.id, productId);
  }

  @Get("products")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取博主商品列表" })
  @ApiResponse({ status: 200, description: "成功返回商品列表" })
  async getProducts(@Query() query: BloggerProductQueryDto) {
    return this.bloggerProductService.getProducts(query);
  }

  @Get("products/:id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取博主商品详情" })
  @ApiResponse({ status: 200, description: "成功返回商品详情" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  @ApiParam({ name: "id", description: "商品ID" })
  async getProductById(@Param("id") productId: string) {
    return this.bloggerProductService.getProductById(productId);
  }

  @Post("products/:id/purchase")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "购买博主商品" })
  @ApiResponse({ status: 201, description: "购买成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "id", description: "商品ID" })
  async purchaseProduct(
    @Request() req: { user: { id: string } },
    @Param("id") productId: string,
    @Body() dto: PurchaseBloggerProductDto,
  ) {
    return this.bloggerProductService.purchaseProduct(req.user.id, dto);
  }

  @Get("dashboard")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取博主数据看板" })
  @ApiResponse({ status: 200, description: "成功返回看板数据" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getDashboard(
    @Request() req: { user: { id: string } },
    @Query() query: DashboardQueryDto,
  ) {
    return this.bloggerDashboardService.getDashboard(req.user.id, query.period);
  }

  @Get("dashboard/trend/:metric")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取博主趋势数据" })
  @ApiResponse({ status: 200, description: "成功返回趋势数据" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "metric", description: "指标名称" })
  async getTrendData(
    @Request() req: { user: { id: string } },
    @Param("metric") metric: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.bloggerDashboardService.getTrendData(req.user.id, metric as "views" | "likes" | "bookmarks" | "followers" | "revenue", query.period);
  }

  @Get("users/:id/products")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取指定博主的商品列表" })
  @ApiResponse({ status: 200, description: "成功返回商品列表" })
  @ApiParam({ name: "id", description: "博主用户ID" })
  async getBloggerProducts(@Param("id") bloggerId: string) {
    return this.bloggerProductService.getBloggerProducts(bloggerId);
  }
}
