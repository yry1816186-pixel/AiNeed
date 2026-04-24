import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsArray, IsBoolean, IsUrl, MaxLength } from "class-validator";

export class UpdateWardrobeItemDto {
  @ApiPropertyOptional({ description: "单品名称", example: "白色T恤" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: "分类", example: "tops" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: "子分类", example: "t-shirt" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional({ description: "品牌", example: "UNIQLO" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: "图片地址" })
  @IsOptional()
  @IsUrl()
  imageUri?: string;

  @ApiPropertyOptional({ description: "缩略图地址" })
  @IsOptional()
  @IsUrl()
  thumbnailUri?: string;

  @ApiPropertyOptional({ description: "颜色列表", example: ["white", "black"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ description: "风格标签", example: ["casual", "street"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  style?: string[];

  @ApiPropertyOptional({ description: "适合季节", example: ["spring", "summer"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seasons?: string[];

  @ApiPropertyOptional({ description: "场合标签", example: ["work", "date"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  occasions?: string[];

  @ApiPropertyOptional({ description: "自定义标签", example: ["显瘦", "百搭"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "是否收藏" })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
