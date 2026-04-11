import { IsString, IsOptional, IsArray, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum KnowledgeCategory {
  COLOR = 'color',
  BODY_TYPE = 'body_type',
  OCCASION = 'occasion',
  SEASON = 'season',
  STYLE = 'style',
  FABRIC = 'fabric',
  TREND = 'trend',
}

export class QueryColorHarmonyDto {
  @ApiProperty({ description: '颜色名称', example: 'red' })
  @IsString()
  color: string;
}

export class QueryColorConflictDto {
  @ApiProperty({ description: '颜色名称', example: 'red' })
  @IsString()
  color: string;
}

export class QueryBodyTypeDto {
  @ApiProperty({ description: '体型类型', example: 'hourglass' })
  @IsString()
  type: string;
}

export class QueryOccasionDto {
  @ApiProperty({ description: '场合名称', example: 'work' })
  @IsString()
  occasion: string;
}

export class QueryStyleCompatibilityDto {
  @ApiProperty({ description: '风格A', example: 'minimalist' })
  @IsString()
  styleA: string;

  @ApiProperty({ description: '风格B', example: 'streetwear' })
  @IsString()
  styleB: string;
}

export class KnowledgeQueryDto {
  @ApiPropertyOptional({ description: '知识类别', enum: KnowledgeCategory })
  @IsOptional()
  @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @ApiPropertyOptional({ description: '颜色列表', example: ['red', 'blue'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ description: '体型类型', example: 'hourglass' })
  @IsOptional()
  @IsString()
  bodyType?: string;

  @ApiPropertyOptional({ description: '场合', example: 'work' })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ description: '季节', example: 'spring' })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional({ description: '风格', example: 'minimalist' })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({ description: '最小强度阈值', example: 0.5 })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  minStrength?: number;
}
