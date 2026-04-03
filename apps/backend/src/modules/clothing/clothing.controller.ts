import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { ClothingCategory } from "@prisma/client";

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
export class ClothingController {
  constructor(private clothingService: ClothingService) {}

  @Get()
  @ApiOperation({
    summary: "获取服装列表",
    description:
      "获取服装商品列表，支持按分类、品牌、价格区间、颜色、尺码、标签筛选，支持分页和排序。",
  })
  @ApiQuery({
    name: "category",
    required: false,
    enum: ClothingCategory,
    description: "服装分类筛选",
  })
  @ApiQuery({
    name: "brandId",
    required: false,
    type: String,
    description: "品牌 ID 筛选",
    format: "uuid",
  })
  @ApiQuery({
    name: "minPrice",
    required: false,
    type: Number,
    description: "最低价格筛选（元）",
    example: 100,
  })
  @ApiQuery({
    name: "maxPrice",
    required: false,
    type: Number,
    description: "最高价格筛选（元）",
    example: 1000,
  })
  @ApiQuery({
    name: "colors",
    required: false,
    type: String,
    description: "颜色筛选，多个颜色用逗号分隔",
    example: "black,white,blue",
  })
  @ApiQuery({
    name: "sizes",
    required: false,
    type: String,
    description: "尺码筛选，多个尺码用逗号分隔",
    example: "S,M,L,XL",
  })
  @ApiQuery({
    name: "tags",
    required: false,
    type: String,
    description: "标签筛选，多个标签用逗号分隔",
    example: "春季,商务,休闲",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "页码，从 1 开始，默认 1",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "每页数量，默认 20，最大 100",
    example: 20,
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    enum: ["price", "createdAt", "viewCount", "likeCount"],
    description: "排序字段，默认 createdAt",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    enum: ["asc", "desc"],
    description: "排序方向，默认 desc",
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
  async getItems(
    @Query("category") category?: ClothingCategory,
    @Query("brandId") brandId?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("colors") colors?: string,
    @Query("sizes") sizes?: string,
    @Query("tags") tags?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: "price" | "createdAt" | "viewCount" | "likeCount",
    @Query("sortOrder") sortOrder?: "asc" | "desc",
  ) {
    return this.clothingService.getItems({
      category,
      brandId,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      colors: colors?.split(",").filter(Boolean),
      sizes: sizes?.split(",").filter(Boolean),
      tags: tags?.split(",").filter(Boolean),
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
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
