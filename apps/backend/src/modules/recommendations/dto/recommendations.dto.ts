import { ApiPropertyOptional } from "@nestjs/swagger";
import { ClothingCategory } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

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
