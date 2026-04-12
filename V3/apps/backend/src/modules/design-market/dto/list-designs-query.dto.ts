import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum MarketSortOption {
  NEWEST = 'newest',
  POPULAR = 'popular',
}

export class ListDesignsQueryDto {
  @ApiPropertyOptional({
    description: '排序方式',
    enum: MarketSortOption,
    default: MarketSortOption.NEWEST,
  })
  @IsOptional()
  @IsEnum(MarketSortOption)
  sort?: MarketSortOption = MarketSortOption.NEWEST;

  @ApiPropertyOptional({ description: '产品类型筛选' })
  @IsOptional()
  @IsString()
  product_type?: string;

  @ApiPropertyOptional({ description: '标签筛选' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
