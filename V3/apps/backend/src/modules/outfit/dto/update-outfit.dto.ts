import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOutfitDto {
  @ApiPropertyOptional({ description: '搭配名称' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: '搭配描述' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: '场合标签' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  occasion?: string;

  @ApiPropertyOptional({ description: '季节标签' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  season?: string;

  @ApiPropertyOptional({ description: '风格标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  style_tags?: string[];

  @ApiPropertyOptional({ description: '是否公开' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
