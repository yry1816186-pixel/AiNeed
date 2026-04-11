import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DesignSortOption {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  MOST_LIKED = 'most_liked',
  MOST_PURCHASED = 'most_purchased',
}

export class DesignQueryDto {
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

  @ApiPropertyOptional({ description: '产品类型', example: 'tshirt' })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiPropertyOptional({ description: '状态', example: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '标签(逗号分隔)', example: '国潮,原创' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: '排序方式',
    enum: DesignSortOption,
    default: DesignSortOption.NEWEST,
  })
  @IsOptional()
  @IsEnum(DesignSortOption)
  sort?: DesignSortOption = DesignSortOption.NEWEST;
}
