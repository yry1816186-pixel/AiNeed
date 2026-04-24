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
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";

import { CurrentUser } from "../../../domains/identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../domains/identity/auth/guards/jwt-auth.guard";

import { CreateWardrobeItemDto } from "./dto/create-wardrobe-item.dto";
import { CuratedWardrobeQueryDto } from "./dto/curated-wardrobe-query.dto";
import { UpdateWardrobeItemDto } from "./dto/update-wardrobe-item.dto";
import { CuratedWardrobeService } from "./curated-wardrobe.service";
import { WardrobeService } from "./wardrobe.service";

@ApiTags("Wardrobe")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("wardrobe")
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  })
)
export class WardrobeController {
  constructor(
    private readonly wardrobeService: WardrobeService,
    private readonly curatedWardrobeService: CuratedWardrobeService
  ) {}

  // ==================== Curated Wardrobe Endpoints ====================

  @Get("curated")
  @ApiOperation({
    summary: "获取策展衣橱",
    description: "获取用户策展衣橱的三个分区：保存的搭配、心愿单、已购商品",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getCuratedWardrobe(@CurrentUser("id") userId: string) {
    return this.curatedWardrobeService.getCuratedWardrobe(userId);
  }

  @Get("curated/wishlist")
  @ApiOperation({
    summary: "获取心愿单列表",
    description: "分页获取心愿单中的商品，支持按分类、季节筛选",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码，默认 1" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "每页数量，默认 20" })
  @ApiQuery({ name: "category", required: false, type: String, description: "分类筛选" })
  @ApiQuery({ name: "season", required: false, type: String, description: "季节筛选" })
  async getWishlist(
    @CurrentUser("id") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("season") season?: string
  ) {
    return this.curatedWardrobeService.getWishlistedItems(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      category,
      season,
    });
  }

  @Post("curated/wishlist/:itemId")
  @ApiOperation({
    summary: "添加到心愿单",
    description: "将商品添加到策展衣橱心愿单",
  })
  @ApiResponse({ status: 201, description: "添加成功" })
  @ApiResponse({ status: 400, description: "商品不存在或已下架" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "itemId", description: "商品 ID", type: String, format: "uuid" })
  async addToWishlist(@CurrentUser("id") userId: string, @Param("itemId") itemId: string) {
    return this.curatedWardrobeService.moveToWishlist(userId, itemId);
  }

  @Delete("curated/wishlist/:itemId")
  @ApiOperation({
    summary: "从心愿单移除",
    description: "从策展衣橱心愿单中移除商品",
  })
  @ApiResponse({ status: 200, description: "移除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "itemId", description: "商品 ID", type: String, format: "uuid" })
  async removeFromWishlist(@CurrentUser("id") userId: string, @Param("itemId") itemId: string) {
    await this.curatedWardrobeService.removeFromWishlist(userId, itemId);
    return { success: true };
  }

  @Get("curated/purchased")
  @ApiOperation({
    summary: "获取已购商品列表",
    description: "分页获取通过订单购买的商品，支持按分类、季节筛选",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码，默认 1" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "每页数量，默认 20" })
  async getPurchased(
    @CurrentUser("id") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.curatedWardrobeService.getPurchasedItems(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get("curated/stats")
  @ApiOperation({
    summary: "获取策展衣橱统计",
    description: "获取各分区数量统计及风格分布",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getCuratedStats(@CurrentUser("id") userId: string) {
    return this.curatedWardrobeService.getSectionStats(userId);
  }

  // ==================== Original Wardrobe Endpoints ====================

  @Get()
  @ApiOperation({
    summary: "获取衣橱列表",
    description: "分页获取当前用户的衣橱单品列表，支持按分类、季节、颜色筛选",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码，默认 1" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "每页数量，默认 20" })
  @ApiQuery({ name: "category", required: false, type: String, description: "分类筛选" })
  @ApiQuery({ name: "season", required: false, type: String, description: "季节筛选" })
  @ApiQuery({ name: "color", required: false, type: String, description: "颜色筛选" })
  async listItems(
    @CurrentUser("id") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("season") season?: string,
    @Query("color") color?: string
  ) {
    return this.wardrobeService.findAll(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      category,
      season,
      color,
    });
  }

  @Post()
  @ApiOperation({
    summary: "添加衣橱单品",
    description: "添加单品到衣橱，支持通过服装商品 ID 或手动录入",
  })
  @ApiResponse({ status: 201, description: "添加成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async addItem(@CurrentUser("id") userId: string, @Body() dto: CreateWardrobeItemDto) {
    return this.wardrobeService.create(userId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取衣橱单品详情", description: "根据 ID 获取衣橱中的单品详细信息" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "单品不存在" })
  @ApiParam({ name: "id", description: "衣橱单品 ID", type: String, format: "uuid" })
  async getItem(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.wardrobeService.findOne(userId, id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新衣橱单品", description: "更新衣橱中指定单品的信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "单品不存在" })
  @ApiParam({ name: "id", description: "衣橱单品 ID", type: String, format: "uuid" })
  async updateItem(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateWardrobeItemDto
  ) {
    return this.wardrobeService.update(userId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "移除衣橱单品", description: "从衣橱中移除指定单品" })
  @ApiResponse({ status: 200, description: "移除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "单品不存在" })
  @ApiParam({ name: "id", description: "衣橱单品 ID", type: String, format: "uuid" })
  async removeItem(@CurrentUser("id") userId: string, @Param("id") id: string) {
    await this.wardrobeService.remove(userId, id);
    return { success: true };
  }
}
