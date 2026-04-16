import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";

import { CacheKey, CacheTTL } from "../../../common/decorators/cache.decorators";
import { JwtAuthGuard } from "../../../modules/auth/guards/jwt-auth.guard";
import { Public } from "../../../modules/auth/decorators/public.decorator";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";

import { ClothingService } from "./clothing.service";
import {
  GetClothingQueryDto,
  ClothingIdParamDto,
  GetFeaturedQueryDto,
  GetPopularTagsQueryDto,
  ClothingListResponseDto,
  ClothingItemDto,
  ClothingCategoryDto,
  PopularTagDto,
  CreateClothingItemDto,
  UpdateClothingItemDto,
  SearchClothingQueryDto,
} from "./dto";

@ApiTags("clothing")
@Controller("clothing")
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class ClothingController {
  constructor(private clothingService: ClothingService) {}

  @Get()
  @Public()
  @CacheKey("clothing:list")
  @CacheTTL(120)
  @ApiOperation({
    summary: "获取服装列表",
    description:
      "获取服装商品列表，支持按分类、品牌、价格区间、颜色、尺码、标签筛选，支持分页和排序。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: ClothingListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误（无效的分类、价格区间等）",
  })
  async getItems(@Query() query: GetClothingQueryDto) {
    return this.clothingService.getItems({
      category: query.category,
      brandId: query.brandId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      colors: query.colors?.split(",").map((s) => s.trim()).filter(Boolean),
      sizes: query.sizes?.split(",").map((s) => s.trim()).filter(Boolean),
      tags: query.tags?.split(",").map((s) => s.trim()).filter(Boolean),
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get("featured")
  @Public()
  @ApiOperation({
    summary: "获取精选商品",
    description: "获取平台精选推荐的服装商品，通常为热门或高质量商品。",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回数量，默认 10，最大 50",
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: [ClothingItemDto],
  })
  async getFeatured(@Query("limit") limit?: string) {
    return this.clothingService.getFeaturedItems(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get("categories")
  @Public()
  @CacheKey("clothing:categories")
  @CacheTTL(600)
  @ApiOperation({
    summary: "获取服装分类列表",
    description: "获取所有可用的服装分类，包含分类名称、描述和图标。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: [ClothingCategoryDto],
  })
  async getCategories() {
    return this.clothingService.getCategories();
  }

  @Get("tags")
  @Public()
  @ApiOperation({
    summary: "获取热门标签",
    description: "获取平台热门标签列表，按使用次数降序排列。",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回数量，默认 20，最大 100",
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: [PopularTagDto],
  })
  async getPopularTags(@Query("limit") limit?: string) {
    return this.clothingService.getPopularTags(
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取服装统计",
    description: "获取用户的服装统计数据，包括总数、分类分布、季节分布、最常穿/最少穿排行。",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getStats(@Request() req: { user: { id: string } }) {
    return this.clothingService.getStats(req.user.id);
  }

  @Get(":id")
  @Public()
  @CacheKey("clothing:detail")
  @CacheTTL(300)
  @ApiOperation({
    summary: "获取商品详情",
    description: "根据商品 ID 获取详细的商品信息，包括名称、价格、描述、颜色、尺码、库存等。",
  })
  @ApiParam({
    name: "id",
    description: "商品 ID",
    type: String,
    format: "uuid",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: ClothingItemDto,
  })
  @ApiResponse({
    status: 400,
    description: "无效的商品 ID 格式",
  })
  @ApiResponse({
    status: 404,
    description: "商品不存在",
  })
  async getItemById(@Param("id") id: string) {
    return this.clothingService.getItemById(id);
  }

  @Get(":id/related")
  @Public()
  @ApiOperation({ summary: "获取搭配推荐", description: "获取与指定商品搭配的推荐组合" })
  @ApiParam({ name: "id", description: "商品 ID", type: String })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "推荐数量，默认5" })
  async getOutfitRecommendations(
    @Param("id") id: string,
    @Query("limit") limit?: string,
  ) {
    return this.clothingService.getOutfitRecommendations(
      id,
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Get("subcategories")
  @Public()
  @ApiOperation({ summary: "获取子分类列表", description: "获取服装子分类列表，按主分类分组" })
  @ApiQuery({ name: "category", required: false, type: String, description: "主分类筛选" })
  async getSubcategories(@Query("category") category?: string) {
    return this.clothingService.getSubcategories(category);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "brand")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建服装商品", description: "创建一个新的服装商品" })
  @ApiResponse({ status: 201, description: "创建成功", type: ClothingItemDto })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createItem(
    @Request() req: { user: { id: string } },
    @Body() body: CreateClothingItemDto,
  ) {
    return this.clothingService.create(req.user.id, body);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "brand")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新服装商品", description: "根据商品 ID 更新服装商品信息" })
  @ApiParam({ name: "id", description: "商品 ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "更新成功", type: ClothingItemDto })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  async updateItem(
    @Param("id") id: string,
    @Body() body: UpdateClothingItemDto,
  ) {
    return this.clothingService.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "brand")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除服装商品", description: "软删除指定的服装商品" })
  @ApiParam({ name: "id", description: "商品 ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  async deleteItem(@Param("id") id: string) {
    await this.clothingService.remove(id);
    return { success: true };
  }

  @Post("search")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "搜索服装商品", description: "全文搜索服装商品，支持按分类、价格、尺码筛选" })
  @ApiResponse({ status: 200, description: "搜索成功", type: [ClothingItemDto] })
  @ApiResponse({ status: 401, description: "未授权" })
  async searchItems(@Body() body: SearchClothingQueryDto) {
    return this.clothingService.search(body.query, {
      category: body.category,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
      sizes: body.sizes,
    });
  }

  @Post(":id/favorite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "切换收藏状态", description: "切换指定商品的收藏状态（收藏/取消收藏）" })
  @ApiParam({ name: "id", description: "商品 ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "操作成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  async toggleFavorite(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.clothingService.toggleFavorite(req.user.id, id);
  }

  @Post(":id/wear")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "记录穿着次数", description: "将指定商品的穿着/浏览次数加 1" })
  @ApiParam({ name: "id", description: "商品 ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "操作成功", type: ClothingItemDto })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  async incrementWear(@Param("id") id: string) {
    return this.clothingService.incrementWearCount(id);
  }
}
