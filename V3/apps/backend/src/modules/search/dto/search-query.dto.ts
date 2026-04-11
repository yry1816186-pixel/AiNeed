import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SearchType {
  ALL = 'all',
  CLOTHING = 'clothing',
  POSTS = 'posts',
  USERS = 'users',
}

export class SearchQueryDto {
  @ApiProperty({ description: '搜索关键词' })
  @IsString()
  q: string = '';

  @ApiPropertyOptional({ description: '搜索类型', enum: SearchType, default: SearchType.ALL })
  @IsOptional()
  @IsEnum(SearchType)
  type: SearchType = SearchType.ALL;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @ApiPropertyOptional({ description: '颜色过滤' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  colors: string[] = [];

  @ApiPropertyOptional({ description: '风格过滤' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  styles: string[] = [];

  @ApiPropertyOptional({ description: '价位范围' })
  @IsOptional()
  @IsString()
  priceRange: string = '';

  @ApiPropertyOptional({ description: '品牌过滤' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  brands: string[] = [];
}

export class SuggestQueryDto {
  @ApiProperty({ description: '搜索前缀' })
  @IsString()
  q: string = '';

  @ApiPropertyOptional({ description: '返回数量', default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 5;
}
