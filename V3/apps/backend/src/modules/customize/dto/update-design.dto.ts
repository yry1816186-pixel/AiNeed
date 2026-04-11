import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsJsonObject,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDesignDto {
  @ApiPropertyOptional({ description: '设计名称', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: '设计数据(JSON)', type: 'object' })
  @IsOptional()
  @IsJsonObject()
  designData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '产品类型' })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiPropertyOptional({ description: '产品模板ID' })
  @IsOptional()
  @IsUUID()
  productTemplateId?: string;

  @ApiPropertyOptional({ description: '图案图片URL' })
  @IsOptional()
  @IsString()
  patternImageUrl?: string;

  @ApiPropertyOptional({ description: '预览图URL' })
  @IsOptional()
  @IsString()
  previewImageUrl?: string;

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '定价(分)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: '是否公开' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: '状态', example: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;
}
