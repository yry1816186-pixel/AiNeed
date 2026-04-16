/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ClothingCategory } from '../../../../types/prisma-enums';
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class GetClothingQueryDto {
  @ApiPropertyOptional({
    enum: ClothingCategory,
    description: "服装分类筛选",
  })
  @IsOptional()
  @IsEnum(ClothingCategory)
  category?: ClothingCategory;

  @ApiPropertyOptional({
    description: "品牌 ID 筛选",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({
    description: "最低价格筛选（元）",
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: "最高价格筛选（元）",
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: "颜色筛选，多个颜色用逗号分隔",
  })
  @IsOptional()
  @IsString()
  colors?: string;

  @ApiPropertyOptional({
    description: "尺码筛选，多个尺码用逗号分隔",
  })
  @IsOptional()
  @IsString()
  sizes?: string;

  @ApiPropertyOptional({
    description: "标签筛选，多个标签用逗号分隔",
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: "页码，从 1 开始",
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "每页数量",
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ["price", "createdAt", "viewCount", "likeCount"],
    description: "排序字段",
  })
  @IsOptional()
  @IsEnum(["price", "createdAt", "viewCount", "likeCount"])
  sortBy?: "price" | "createdAt" | "viewCount" | "likeCount";

  @ApiPropertyOptional({
    enum: ["asc", "desc"],
    description: "排序方向",
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

export class ClothingIdParamDto {
  @ApiProperty({
    description: "商品 ID",
    format: "uuid",
  })
  @IsUUID()
  id!: string;
}

export class GetFeaturedQueryDto {
  @ApiPropertyOptional({
    description: "返回数量",
    default: 10,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class GetPopularTagsQueryDto {
  @ApiPropertyOptional({
    description: "返回数量",
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ClothingItemDto {
  @ApiProperty({
    description: "商品 ID",
    format: "uuid",
  })
  id!: string;

  @ApiProperty({
    description: "商品名称",
  })
  name!: string;

  @ApiPropertyOptional({
    description: "商品描述",
  })
  description?: string;

  @ApiProperty({
    description: "商品分类",
    enum: ClothingCategory,
  })
  category!: ClothingCategory;

  @ApiPropertyOptional({
    description: "商品子分类",
  })
  subcategory?: string;

  @ApiProperty({
    description: "商品价格（元）",
    type: Number,
  })
  price!: number;

  @ApiPropertyOptional({
    description: "原价（元）",
    type: Number,
  })
  originalPrice?: number;

  @ApiPropertyOptional({
    description: "品牌 ID",
    format: "uuid",
  })
  brandId?: string;

  @ApiPropertyOptional({
    description: "品牌名称",
  })
  brandName?: string;

  @ApiPropertyOptional({
    description: "商品图片 URL 列表",
    type: [String],
  })
  images?: string[];

  @ApiPropertyOptional({
    description: "可用颜色列表",
    type: [String],
  })
  colors?: string[];

  @ApiPropertyOptional({
    description: "可用尺码列表",
    type: [String],
  })
  sizes?: string[];

  @ApiPropertyOptional({
    description: "商品标签",
    type: [String],
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: "浏览次数",
    type: Number,
  })
  viewCount?: number;

  @ApiPropertyOptional({
    description: "收藏次数",
    type: Number,
  })
  likeCount?: number;
}

export class ClothingCategoryDto {
  @ApiProperty({
    description: "分类标识",
    enum: ClothingCategory,
  })
  category!: ClothingCategory;

  @ApiProperty({
    description: "分类名称",
  })
  name!: string;

  @ApiPropertyOptional({
    description: "分类描述",
  })
  description?: string;

  @ApiPropertyOptional({
    description: "分类图标",
  })
  icon?: string;

  @ApiPropertyOptional({
    description: "该分类下的商品数量",
    type: Number,
  })
  count?: number;
}

export class PopularTagDto {
  @ApiProperty({
    description: "标签名称",
  })
  name!: string;

  @ApiProperty({
    description: "使用次数",
    type: Number,
  })
  count!: number;
}

export class ClothingListResponseDto {
  @ApiProperty({
    description: "商品列表",
    type: [ClothingItemDto],
  })
  items!: ClothingItemDto[];

  @ApiProperty({
    description: "总数",
    type: Number,
  })
  total!: number;

  @ApiProperty({
    description: "当前页码",
    type: Number,
  })
  page!: number;

  @ApiProperty({
    description: "每页数量",
    type: Number,
  })
  limit!: number;

  @ApiProperty({
    description: "总页数",
    type: Number,
  })
  totalPages!: number;
}

export class CreateClothingItemDto {
  @ApiProperty({
    description: "商品名称",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: "商品分类",
    enum: ClothingCategory,
  })
  @IsEnum(ClothingCategory)
  category!: ClothingCategory;

  @ApiPropertyOptional({
    description: "商品子分类",
  })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({
    description: "品牌 ID",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty({
    description: "商品价格（元）",
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    description: "原价（元）",
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({
    description: "商品描述",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "主图 URL",
  })
  @IsOptional()
  @IsString()
  mainImage?: string;

  @ApiPropertyOptional({
    description: "商品图片 URL 列表",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: "可用颜色列表",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({
    description: "可用尺码列表",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiPropertyOptional({
    description: "商品标签",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: "外部链接",
  })
  @IsOptional()
  @IsString()
  externalUrl?: string;
}

export class UpdateClothingItemDto {
  @ApiPropertyOptional({
    description: "商品名称",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "商品分类",
    enum: ClothingCategory,
  })
  @IsOptional()
  @IsEnum(ClothingCategory)
  category?: ClothingCategory;

  @ApiPropertyOptional({
    description: "商品子分类",
  })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({
    description: "品牌 ID",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({
    description: "商品价格（元）",
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: "原价（元）",
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({
    description: "商品描述",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "主图 URL",
  })
  @IsOptional()
  @IsString()
  mainImage?: string;

  @ApiPropertyOptional({
    description: "商品图片 URL 列表",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: "可用颜色列表",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({
    description: "可用尺码列表",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiPropertyOptional({
    description: "商品标签",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: "外部链接",
  })
  @IsOptional()
  @IsString()
  externalUrl?: string;
}

export class SearchClothingQueryDto {
  @ApiProperty({
    description: "搜索关键词",
  })
  @IsString()
  query!: string;

  @ApiPropertyOptional({
    description: "按分类筛选",
    enum: ClothingCategory,
  })
  @IsOptional()
  @IsEnum(ClothingCategory)
  category?: ClothingCategory;

  @ApiPropertyOptional({
    description: "最低价格筛选（元）",
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: "最高价格筛选（元）",
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: "按尺码筛选",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];
}
