/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from "class-validator";

export class CreateStyleProfileDto {
  @ApiProperty({ description: "风格档案名称", example: "日常通勤" })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ description: "适用场合", example: "work" })
  @IsString()
  @MaxLength(50)
  occasion!: string;

  @ApiProperty({ description: "风格描述", example: "简约干练的职场穿搭风格" })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    description: "风格关键词",
    type: [String],
    example: ["简约", "干练", "职场"],
  })
  @IsArray()
  keywords!: string[];

  @ApiProperty({
    description: "色彩方案",
    type: [String],
    example: ["#000000", "#FFFFFF", "#1A1A2E"],
  })
  @IsArray()
  palette!: string[];

  @ApiPropertyOptional({
    description: "置信度（0-100）",
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @ApiPropertyOptional({
    description: "是否设为默认档案",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: "是否激活",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStyleProfileDto {
  @ApiPropertyOptional({ description: "风格档案名称", example: "周末休闲" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: "适用场合", example: "casual" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  occasion?: string;

  @ApiPropertyOptional({ description: "风格描述", example: "轻松舒适的周末穿搭" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: "风格关键词",
    type: [String],
    example: ["休闲", "舒适", "自然"],
  })
  @IsOptional()
  @IsArray()
  keywords?: string[];

  @ApiPropertyOptional({
    description: "色彩方案",
    type: [String],
    example: ["#F5F5DC", "#8B4513", "#2F4F4F"],
  })
  @IsOptional()
  @IsArray()
  palette?: string[];

  @ApiPropertyOptional({
    description: "置信度（0-100）",
    example: 80,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @ApiPropertyOptional({ description: "是否设为默认档案", example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: "是否激活", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StyleProfileResponseDto {
  @ApiProperty({ description: "风格档案 ID", format: "uuid" })
  id!: string;

  @ApiProperty({ description: "用户 ID", format: "uuid" })
  userId!: string;

  @ApiProperty({ description: "风格档案名称" })
  name!: string;

  @ApiProperty({ description: "适用场合" })
  occasion!: string;

  @ApiProperty({ description: "风格描述" })
  description!: string;

  @ApiProperty({ description: "风格关键词", type: [String] })
  keywords!: string[];

  @ApiProperty({ description: "色彩方案", type: [String] })
  palette!: string[];

  @ApiProperty({ description: "置信度" })
  confidence!: number;

  @ApiProperty({ description: "是否为默认档案" })
  isDefault!: boolean;

  @ApiProperty({ description: "是否激活" })
  isActive!: boolean;

  @ApiProperty({ description: "创建时间" })
  createdAt!: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt!: Date;
}

export class SuccessResponseDto {
  @ApiProperty({ description: "操作是否成功", example: true })
  success!: boolean;
}
