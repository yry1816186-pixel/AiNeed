import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";

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

  @Get(":id")
  @ApiOperation({
    summary: "获取商品详情",
    description: "根据商品 ID 获取详细的商品信息，包括名称、价格、描述、颜色、尺码等。",
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
}
