import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ClothingSortOption {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'newest',
  POPULAR = 'popular',
}

export class ClothingQueryDto {
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

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '品牌ID' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ description: '性别', enum: ['male', 'female', 'unisex'] })
  @IsOptional()
  @IsString()
  @IsEnum(['male', 'female', 'unisex'])
  gender?: string;

  @ApiPropertyOptional({ description: '最低价格' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: '最高价格' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: '风格标签(逗号分隔)', example: 'casual,streetwear' })
  @IsOptional()
  @IsString()
  styleTags?: string;

  @ApiPropertyOptional({ description: '颜色(逗号分隔)', example: 'black,white' })
  @IsOptional()
  @IsString()
  colors?: string;

  @ApiPropertyOptional({ description: '季节(逗号分隔)', example: 'spring,summer' })
  @IsOptional()
  @IsString()
  seasons?: string;

  @ApiPropertyOptional({ description: '场合(逗号分隔)', example: 'work,casual' })
  @IsOptional()
  @IsString()
  occasions?: string;

  @ApiPropertyOptional({
    description: '排序方式',
    enum: ClothingSortOption,
    default: ClothingSortOption.NEWEST,
  })
  @IsOptional()
  @IsEnum(ClothingSortOption)
  sort?: ClothingSortOption = ClothingSortOption.NEWEST;
}
