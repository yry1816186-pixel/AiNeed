import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

import { WardrobeSection } from "../../../../types/prisma-enums";

export class CuratedWardrobeQueryDto {
  @ApiPropertyOptional({
    description: "分区筛选",
    enum: WardrobeSection,
  })
  @IsOptional()
  @IsEnum(WardrobeSection)
  section?: WardrobeSection;

  @ApiPropertyOptional({ description: "分类筛选", example: "tops" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "季节筛选", example: "summer" })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional({
    description: "排序方式",
    enum: ["newest", "oldest", "most_worn"],
    default: "newest",
  })
  @IsOptional()
  @IsString()
  sort?: "newest" | "oldest" | "most_worn";

  @ApiPropertyOptional({ description: "页码，默认 1", minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量，默认 20", minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
