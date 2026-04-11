import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsJsonObject,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDesignDto {
  @ApiProperty({ description: '设计名称', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: '设计数据(JSON: 图案位置/缩放/旋转/文字等)',
    type: 'object',
  })
  @IsJsonObject()
  designData!: Record<string, unknown>;

  @ApiProperty({ description: '产品类型', example: 'tshirt' })
  @IsString()
  productType!: string;

  @ApiPropertyOptional({ description: '产品模板ID' })
  @IsOptional()
  @IsUUID()
  productTemplateId?: string;

  @ApiPropertyOptional({ description: '图案图片URL' })
  @IsOptional()
  @IsString()
  patternImageUrl?: string;

  @ApiPropertyOptional({ description: '标签', type: [String], example: ['国潮', '原创'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '定价(分)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
}
