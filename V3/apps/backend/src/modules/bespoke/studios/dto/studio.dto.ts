import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  Min,
  Max,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum StudioSortOption {
  RATING_DESC = 'rating_desc',
  REVIEW_COUNT_DESC = 'review_count_desc',
  ORDER_COUNT_DESC = 'order_count_desc',
  NEWEST = 'newest',
}

export const STUDIO_SPECIALTIES = [
  '西装',
  '旗袍',
  '汉服',
  '街头',
  '改造',
] as const;

export const STUDIO_SERVICE_TYPES = [
  '量身定制',
  '面料选购',
  '改衣',
  '设计咨询',
] as const;

export const STUDIO_PRICE_RANGES = [
  '1000-3000',
  '3000-8000',
  '8000+',
] as const;

export class StudioQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '城市筛选' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '专长筛选(逗号分隔)', example: '西装,旗袍' })
  @IsOptional()
  @IsString()
  specialties?: string;

  @ApiPropertyOptional({ description: '服务类型筛选(逗号分隔)', example: '量身定制,面料选购' })
  @IsOptional()
  @IsString()
  serviceTypes?: string;

  @ApiPropertyOptional({ description: '价格区间', enum: STUDIO_PRICE_RANGES })
  @IsOptional()
  @IsString()
  @IsEnum(STUDIO_PRICE_RANGES)
  priceRange?: string;

  @ApiPropertyOptional({ description: '是否仅显示已认证' })
  @IsOptional()
  @Type(() => Boolean)
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: '排序方式',
    enum: StudioSortOption,
    default: StudioSortOption.RATING_DESC,
  })
  @IsOptional()
  @IsEnum(StudioSortOption)
  sort?: StudioSortOption = StudioSortOption.RATING_DESC;
}

export class CreateStudioDto {
  @ApiPropertyOptional({ description: '工作室名称' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'URL友好标识' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: '封面图 URL' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: '工作室描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '所在城市' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '详细地址' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '专长', example: ['西装', '旗袍'] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  specialties!: string[];

  @ApiPropertyOptional({ description: '服务类型', example: ['量身定制', '面料选购'] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  serviceTypes!: string[];

  @ApiPropertyOptional({ description: '价格区间', enum: STUDIO_PRICE_RANGES })
  @IsOptional()
  @IsString()
  @IsEnum(STUDIO_PRICE_RANGES)
  priceRange?: string;

  @ApiPropertyOptional({ description: '作品集图片URLs' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  portfolioImages?: string[];
}

export class UpdateStudioDto {
  @ApiPropertyOptional({ description: '工作室名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: '封面图 URL' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: '工作室描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '所在城市' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '详细地址' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '专长' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: '服务类型' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  serviceTypes?: string[];

  @ApiPropertyOptional({ description: '价格区间' })
  @IsOptional()
  @IsString()
  @IsEnum(STUDIO_PRICE_RANGES)
  priceRange?: string;

  @ApiPropertyOptional({ description: '作品集图片URLs' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  portfolioImages?: string[];

  @ApiPropertyOptional({ description: '是否营业' })
  @IsOptional()
  isActive?: boolean;
}
