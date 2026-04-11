import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsIn,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  IsArray,
  IsNumber,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GENDER_VALUES } from '../interfaces/template-config.interface';

class UpdateHeadConfigDto {
  @ApiPropertyOptional({ description: '头部SVG路径' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: '头部宽度' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ description: '头部高度' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;
}

class UpdateComponentDto {
  @ApiPropertyOptional({ description: '组件ID' })
  @IsOptional()
  @IsString()
  componentId?: string;

  @ApiPropertyOptional({ description: 'X偏移' })
  @IsOptional()
  @IsNumber()
  offsetX?: number;

  @ApiPropertyOptional({ description: 'Y偏移' })
  @IsOptional()
  @IsNumber()
  offsetY?: number;
}

class UpdateHairConfigDto {
  @ApiPropertyOptional({ description: '发型SVG路径' })
  @IsOptional()
  @IsString()
  svgPath?: string;

  @ApiPropertyOptional({ description: 'z-index层级' })
  @IsOptional()
  @IsNumber()
  zIndex?: number;
}

class UpdateBodyConfigDto {
  @ApiPropertyOptional({ description: '身体SVG路径' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: '身体宽度' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ description: '身体高度' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;
}

class UpdateClothingSlotDto {
  @ApiPropertyOptional({ description: 'X坐标' })
  @IsOptional()
  @IsNumber()
  x?: number;

  @ApiPropertyOptional({ description: 'Y坐标' })
  @IsOptional()
  @IsNumber()
  y?: number;

  @ApiPropertyOptional({ description: '宽度' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ description: '高度' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ description: 'z-index层级' })
  @IsOptional()
  @IsNumber()
  zIndex?: number;
}

class UpdateClothingSlotsDto {
  @ApiPropertyOptional({ description: '上衣插槽', type: UpdateClothingSlotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateClothingSlotDto)
  top?: UpdateClothingSlotDto;

  @ApiPropertyOptional({ description: '下装插槽', type: UpdateClothingSlotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateClothingSlotDto)
  bottom?: UpdateClothingSlotDto;

  @ApiPropertyOptional({ description: '鞋子插槽', type: UpdateClothingSlotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateClothingSlotDto)
  shoes?: UpdateClothingSlotDto;

  @ApiPropertyOptional({ description: '外套插槽', type: UpdateClothingSlotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateClothingSlotDto)
  outerwear?: UpdateClothingSlotDto;
}

class UpdateDrawingConfigDto {
  @ApiPropertyOptional({ description: '头部配置', type: UpdateHeadConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateHeadConfigDto)
  head?: UpdateHeadConfigDto;

  @ApiPropertyOptional({ description: '眼睛组件列表', type: [UpdateComponentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateComponentDto)
  eyes?: UpdateComponentDto[];

  @ApiPropertyOptional({ description: '嘴巴组件', type: UpdateComponentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateComponentDto)
  mouth?: UpdateComponentDto;

  @ApiPropertyOptional({ description: '鼻子组件', type: UpdateComponentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateComponentDto)
  nose?: UpdateComponentDto;

  @ApiPropertyOptional({ description: '发型配置', type: UpdateHairConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateHairConfigDto)
  hair?: UpdateHairConfigDto;

  @ApiPropertyOptional({ description: '身体配置', type: UpdateBodyConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBodyConfigDto)
  body?: UpdateBodyConfigDto;

  @ApiPropertyOptional({ description: '服装插槽配置', type: UpdateClothingSlotsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateClothingSlotsDto)
  clothingSlots?: UpdateClothingSlotsDto;
}

class UpdateNumericParameterDto {
  @ApiPropertyOptional({ description: '最小值' })
  @IsOptional()
  @IsNumber()
  min?: number;

  @ApiPropertyOptional({ description: '最大值' })
  @IsOptional()
  @IsNumber()
  max?: number;

  @ApiPropertyOptional({ description: '默认值' })
  @IsOptional()
  @IsNumber()
  default?: number;

  @ApiPropertyOptional({ description: '参数标签' })
  @IsOptional()
  @IsString()
  label?: string;
}

class UpdateOptionParameterDto {
  @ApiPropertyOptional({ description: '选项列表' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: '默认选项' })
  @IsOptional()
  @IsString()
  default?: string;

  @ApiPropertyOptional({ description: '参数标签' })
  @IsOptional()
  @IsString()
  label?: string;
}

class UpdateTemplateParametersDto {
  @ApiPropertyOptional({ description: '脸型参数', type: UpdateNumericParameterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNumericParameterDto)
  faceShape?: UpdateNumericParameterDto;

  @ApiPropertyOptional({ description: '眼型参数', type: UpdateOptionParameterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOptionParameterDto)
  eyeType?: UpdateOptionParameterDto;

  @ApiPropertyOptional({ description: '肤色参数', type: UpdateOptionParameterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOptionParameterDto)
  skinTone?: UpdateOptionParameterDto;

  @ApiPropertyOptional({ description: '发型参数', type: UpdateOptionParameterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOptionParameterDto)
  hairId?: UpdateOptionParameterDto;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: '模板名称', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: '性别', enum: GENDER_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(GENDER_VALUES as unknown as string[])
  gender?: string;

  @ApiPropertyOptional({ description: 'Skia绘制配置', type: UpdateDrawingConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDrawingConfigDto)
  drawingConfig?: UpdateDrawingConfigDto;

  @ApiPropertyOptional({ description: '可调参数定义', type: UpdateTemplateParametersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTemplateParametersDto)
  parameters?: UpdateTemplateParametersDto;

  @ApiPropertyOptional({ description: '默认服装颜色+类型映射' })
  @IsOptional()
  @IsObject()
  defaultClothingMap?: Record<string, unknown>;
}
