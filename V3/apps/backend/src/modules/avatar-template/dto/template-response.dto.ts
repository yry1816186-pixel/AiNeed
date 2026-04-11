import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GENDER_VALUES } from '../interfaces/template-config.interface';

export class TemplateListItemDto {
  @ApiProperty({ description: '模板ID' })
  id!: string;

  @ApiProperty({ description: '模板名称' })
  name!: string;

  @ApiProperty({ description: '性别', enum: GENDER_VALUES })
  gender!: string;

  @ApiPropertyOptional({ description: '缩略图URL' })
  thumbnailUrl?: string;

  @ApiProperty({ description: '可调参数定义' })
  parameters!: Record<string, unknown>;
}

export class TemplateDetailDto extends TemplateListItemDto {
  @ApiProperty({ description: 'Skia绘制配置' })
  drawingConfig!: Record<string, unknown>;

  @ApiPropertyOptional({ description: '默认服装映射' })
  defaultClothingMap?: Record<string, unknown>;

  @ApiProperty({ description: '是否激活' })
  isActive!: boolean;

  @ApiProperty({ description: '排序序号' })
  sortOrder!: number;

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;
}

export class TemplateListResponseDto {
  @ApiProperty({ description: '模板列表', type: [TemplateListItemDto] })
  items!: TemplateListItemDto[];

  @ApiProperty({ description: '总数' })
  total!: number;
}

export class TemplateQueryDto {
  @ApiPropertyOptional({ description: '性别筛选', enum: GENDER_VALUES })
  gender?: string;

  @ApiPropertyOptional({ description: '是否激活' })
  isActive?: boolean;
}
