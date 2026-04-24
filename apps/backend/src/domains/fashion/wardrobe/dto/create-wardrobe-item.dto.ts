import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsArray, IsUrl, MaxLength } from "class-validator";

export class CreateWardrobeItemDto {
  @ApiPropertyOptional({ description: "服装商品 ID，通过商品添加时必填" })
  @IsOptional()
  @IsString()
  clothingId?: string;

  @ApiPropertyOptional({ description: "单品名称，手动录入时必填", example: "白色T恤" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: "分类", example: "tops" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: "颜色", example: "white" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ description: "品牌", example: "UNIQLO" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: "适合季节", example: "summer" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  season?: string;

  @ApiPropertyOptional({ description: "图片地址" })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "自定义标签", example: ["显瘦", "百搭"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
