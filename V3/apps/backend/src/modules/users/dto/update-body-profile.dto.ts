import {
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBodyProfileDto {
  @ApiPropertyOptional({ description: '体型', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bodyType?: string;

  @ApiPropertyOptional({ description: '色彩季型', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorSeason?: string;

  @ApiPropertyOptional({ description: '身体测量数据(JSONB)' })
  @IsOptional()
  @IsObject()
  measurements?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '分析结果(JSONB)' })
  @IsOptional()
  @IsObject()
  analysisResult?: Record<string, unknown>;
}
