/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from "class-validator";

// ==================== 灵感衣橱分类 DTO ====================

export class CreateWardrobeCollectionDto {
  @ApiProperty({ description: "分类名称", example: "日常穿搭" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: "图标标识", example: "shirt" })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: "封面图片URL", example: "https://example.com/cover.jpg" })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ description: "排序序号", example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "是否为默认分类", example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateWardrobeCollectionDto {
  @ApiPropertyOptional({ description: "分类名称", example: "日常穿搭" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "图标标识", example: "shirt" })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: "封面图片URL", example: "https://example.com/cover.jpg" })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ description: "排序序号", example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "是否为默认分类", example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class WardrobeCollectionQueryDto {
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

// ==================== 分类项 DTO ====================

export enum CollectionItemType {
  POST = "post",
  OUTFIT = "outfit",
  TRY_ON = "try_on",
}

export class CreateCollectionItemDto {
  @ApiProperty({ description: "项目类型", example: "outfit", enum: CollectionItemType })
  @IsEnum(CollectionItemType)
  itemType!: CollectionItemType;

  @ApiProperty({ description: "项目ID", example: "item-001" })
  @IsString()
  itemId!: string;

  @ApiPropertyOptional({ description: "排序序号", example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BatchCreateCollectionItemsDto {
  @ApiProperty({ description: "分类项列表", type: [CreateCollectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCollectionItemDto)
  items!: CreateCollectionItemDto[];
}

export class UpdateCollectionItemDto {
  @ApiPropertyOptional({ description: "排序序号", example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CollectionItemQueryDto {
  @ApiPropertyOptional({ description: "项目类型筛选", example: "outfit", enum: CollectionItemType })
  @IsOptional()
  @IsEnum(CollectionItemType)
  itemType?: CollectionItemType;

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

export class ReorderCollectionItemsDto {
  @ApiProperty({ description: "重新排序的项目ID列表", example: ["item-1", "item-2", "item-3"] })
  @IsArray()
  @IsString({ each: true })
  itemIds!: string[];
}
