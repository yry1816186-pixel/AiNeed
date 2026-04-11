import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const VALID_BUDGET_RANGES = [
  '0-500',
  '500-1000',
  '1000-3000',
  '3000-5000',
  '5000-10000',
  '10000+',
];

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: '风格标签', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  styleTags?: string[];

  @ApiPropertyOptional({ description: '场合标签', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  occasionTags?: string[];

  @ApiPropertyOptional({ description: '颜色偏好', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  colorPreferences?: string[];

  @ApiPropertyOptional({
    description: '预算范围',
    enum: VALID_BUDGET_RANGES,
  })
  @IsOptional()
  @IsString()
  @IsIn(VALID_BUDGET_RANGES)
  @MaxLength(20)
  budgetRange?: string;
}
