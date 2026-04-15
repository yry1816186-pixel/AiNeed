import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNumber,
  Min,
  Max,
} from "class-validator";

export class CreateShareTemplateDto {
  @ApiProperty({ description: "模板名称", example: "简约风格海报" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: "模板描述", example: "适合日常穿搭分享的简约风格海报" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "背景图片URL", example: "https://example.com/bg.jpg" })
  @IsString()
  backgroundImageUrl!: string;

  @ApiProperty({ description: "布局配置", example: { width: 750, height: 1334, elements: [] } })
  @IsObject()
  layoutConfig!: Record<string, any>;

  @ApiPropertyOptional({ description: "是否启用", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShareTemplateDto {
  @ApiPropertyOptional({ description: "模板名称", example: "简约风格海报" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "模板描述", example: "适合日常穿搭分享的简约风格海报" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "背景图片URL", example: "https://example.com/bg.jpg" })
  @IsOptional()
  @IsString()
  backgroundImageUrl?: string;

  @ApiPropertyOptional({ description: "布局配置", example: { width: 750, height: 1334, elements: [] } })
  @IsOptional()
  @IsObject()
  layoutConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: "是否启用", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ShareTemplateQueryDto {
  @ApiPropertyOptional({ description: "是否仅启用的模板", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "页码", example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
