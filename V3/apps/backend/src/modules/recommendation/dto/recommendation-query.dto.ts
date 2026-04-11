import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeRange {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class RecommendationQueryDto {
  @ApiPropertyOptional({ description: '返回数量', default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '场合', example: 'work' })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ description: '风格', example: 'casual' })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({ description: '预算范围', example: '0-500' })
  @IsOptional()
  @IsString()
  budgetRange?: string;

  @ApiPropertyOptional({ description: '排除的服装ID列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeIds?: string[];
}

export class TrendingQueryDto {
  @ApiPropertyOptional({ description: '分类', example: 'top' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '返回数量', default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '时间范围', enum: TimeRange, default: TimeRange.WEEK })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.WEEK;
}

export class TrackInteractionDto {
  @ApiPropertyOptional({ description: '服装ID' })
  @IsString()
  clothingId!: string;

  @ApiPropertyOptional({ description: '交互类型', enum: ['view', 'like', 'favorite', 'purchase', 'skip'] })
  @IsString()
  @IsEnum(['view', 'like', 'favorite', 'purchase', 'skip'])
  interactionType!: 'view' | 'like' | 'favorite' | 'purchase' | 'skip';

  @ApiPropertyOptional({ description: '停留时长(毫秒)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMs?: number;
}
