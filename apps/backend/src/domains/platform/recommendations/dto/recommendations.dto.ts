import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ClothingCategory } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsArray,
  IsIn,
  ValidateNested,
} from "class-validator";

/**
 * 获取推荐查询参数 DTO
 */
export class GetRecommendationsQueryDto {
  @ApiPropertyOptional({
    enum: ClothingCategory,
    description: "服装分类筛选",
  })
  @IsOptional()
  @IsEnum(ClothingCategory)
  category?: ClothingCategory;

  @ApiPropertyOptional({
    description: "场合筛选（如：daily、work、party、date）",
    example: "daily",
  })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({
    description: "季节筛选（spring、summer、autumn、winter）",
    example: "spring",
  })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional({
    description: "返回数量，默认20",
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

export class SubmitFeedbackDto {
  @ApiProperty({
    description: "服装ID",
  })
  @IsString()
  clothingId!: string;

  @ApiProperty({
    description: "反馈类型",
    enum: ["like", "dislike", "ignore"],
  })
  @IsIn(["like", "dislike", "ignore"])
  action!: "like" | "dislike" | "ignore";

  @ApiPropertyOptional({
    description: "推荐来源ID",
  })
  @IsOptional()
  @IsString()
  recommendationId?: string;

  @ApiPropertyOptional({
    description: "反馈原因",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubmitBatchFeedbackDto {
  @ApiProperty({
    description: "批量反馈列表",
    type: [SubmitFeedbackDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitFeedbackDto)
  items!: SubmitFeedbackDto[];
}

export class GetCompleteTheLookQueryDto {
  @ApiPropertyOptional({
    description: "返回数量，默认3",
    default: 3,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 3;
}

/**
 * 获取高级推荐查询参数 DTO
 */
export class GetAdvancedRecommendationsQueryDto {
  @ApiPropertyOptional({
    description: "场合筛选",
    example: "work",
  })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({
    description: "季节筛选",
    example: "spring",
  })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional({
    description: "返回数量，默认20",
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

/**
 * 获取场合推荐查询参数 DTO
 */
export class GetOccasionRecommendationsQueryDto {
  @ApiPropertyOptional({
    description: "场合类型（daily、interview、date、party、workout、travel）",
    example: "interview",
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: "返回数量，默认10",
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

/**
 * 获取热门趋势查询参数 DTO
 */
export class GetTrendingQueryDto {
  @ApiPropertyOptional({
    description: "返回数量，默认20",
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

/**
 * 发现页面查询参数 DTO
 */
export class GetDiscoverQueryDto {
  @ApiPropertyOptional({
    description: "返回数量，默认20",
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

export class GetFeedDto {
  @ApiPropertyOptional({
    description: "Feed 分类",
    enum: ["daily", "occasion", "trending", "explore"],
    default: "daily",
  })
  @IsOptional()
  @IsString()
  @IsIn(["daily", "occasion", "trending", "explore"])
  category?: string = "daily";

  @ApiPropertyOptional({
    description: "子分类（commute, date, sport, interview, casual, travel）",
  })
  @IsOptional()
  @IsString()
  subCategory?: string;

  @ApiPropertyOptional({
    description: "页码，默认1",
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "每页数量，默认10",
    default: 10,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;
}

export class FeedItemDto {
  @ApiProperty({ description: "商品ID" })
  id!: string;

  @ApiProperty({ description: "主图URL" })
  mainImage!: string;

  @ApiPropertyOptional({ description: "品牌信息", type: Object })
  brand!: { id: string; name: string } | null;

  @ApiProperty({ description: "价格" })
  price!: number;

  @ApiPropertyOptional({ description: "原价" })
  originalPrice?: number;

  @ApiProperty({ description: "风格标签", type: [String] })
  styleTags!: string[];

  @ApiProperty({ description: "色彩和谐度", type: Object })
  colorHarmony!: { score: number; colors: string[] };

  @ApiProperty({ description: "推荐理由" })
  matchReason!: string;

  @ApiProperty({ description: "分类" })
  category!: string;
}

export class FeedResponseDto {
  @ApiProperty({ description: "Feed项目列表", type: [FeedItemDto] })
  items!: FeedItemDto[];

  @ApiProperty({ description: "总数" })
  total!: number;

  @ApiProperty({ description: "是否有更多" })
  hasMore!: boolean;
}
