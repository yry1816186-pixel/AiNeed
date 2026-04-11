import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsIn,
  IsObject,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  IsArray,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GENDER_VALUES } from '../interfaces/template-config.interface';

class HeadConfigDto {
  @ApiProperty({ description: '头部SVG路径' })
  @IsString()
  path!: string;

  @ApiProperty({ description: '头部宽度' })
  @IsNumber()
  @Min(1)
  width!: number;

  @ApiProperty({ description: '头部高度' })
  @IsNumber()
  @Min(1)
  height!: number;
}

class ComponentDto {
  @ApiProperty({ description: '组件ID' })
  @IsString()
  componentId!: string;

  @ApiProperty({ description: 'X偏移' })
  @IsNumber()
  offsetX!: number;

  @ApiProperty({ description: 'Y偏移' })
  @IsNumber()
  offsetY!: number;
}

class HairConfigDto {
  @ApiProperty({ description: '发型SVG路径' })
  @IsString()
  svgPath!: string;

  @ApiProperty({ description: 'z-index层级' })
  @IsNumber()
  zIndex!: number;
}

class BodyConfigDto {
  @ApiProperty({ description: '身体SVG路径' })
  @IsString()
  path!: string;

  @ApiProperty({ description: '身体宽度' })
  @IsNumber()
  @Min(1)
  width!: number;

  @ApiProperty({ description: '身体高度' })
  @IsNumber()
  @Min(1)
  height!: number;
}

class ClothingSlotDto {
  @ApiProperty({ description: 'X坐标' })
  @IsNumber()
  x!: number;

  @ApiProperty({ description: 'Y坐标' })
  @IsNumber()
  y!: number;

  @ApiProperty({ description: '宽度' })
  @IsNumber()
  @Min(1)
  width!: number;

  @ApiProperty({ description: '高度' })
  @IsNumber()
  @Min(1)
  height!: number;

  @ApiProperty({ description: 'z-index层级' })
  @IsNumber()
  zIndex!: number;
}

class ClothingSlotsDto {
  @ApiProperty({ description: '上衣插槽', type: ClothingSlotDto })
  @ValidateNested()
  @Type(() => ClothingSlotDto)
  top!: ClothingSlotDto;

  @ApiProperty({ description: '下装插槽', type: ClothingSlotDto })
  @ValidateNested()
  @Type(() => ClothingSlotDto)
  bottom!: ClothingSlotDto;

  @ApiProperty({ description: '鞋子插槽', type: ClothingSlotDto })
  @ValidateNested()
  @Type(() => ClothingSlotDto)
  shoes!: ClothingSlotDto;

  @ApiProperty({ description: '外套插槽', type: ClothingSlotDto })
  @ValidateNested()
  @Type(() => ClothingSlotDto)
  outerwear!: ClothingSlotDto;
}

class DrawingConfigDto {
  @ApiProperty({ description: '头部配置', type: HeadConfigDto })
  @ValidateNested()
  @Type(() => HeadConfigDto)
  head!: HeadConfigDto;

  @ApiProperty({ description: '眼睛组件列表', type: [ComponentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComponentDto)
  eyes!: ComponentDto[];

  @ApiProperty({ description: '嘴巴组件', type: ComponentDto })
  @ValidateNested()
  @Type(() => ComponentDto)
  mouth!: ComponentDto;

  @ApiProperty({ description: '鼻子组件', type: ComponentDto })
  @ValidateNested()
  @Type(() => ComponentDto)
  nose!: ComponentDto;

  @ApiProperty({ description: '发型配置', type: HairConfigDto })
  @ValidateNested()
  @Type(() => HairConfigDto)
  hair!: HairConfigDto;

  @ApiProperty({ description: '身体配置', type: BodyConfigDto })
  @ValidateNested()
  @Type(() => BodyConfigDto)
  body!: BodyConfigDto;

  @ApiProperty({ description: '服装插槽配置', type: ClothingSlotsDto })
  @ValidateNested()
  @Type(() => ClothingSlotsDto)
  clothingSlots!: ClothingSlotsDto;
}

class NumericParameterDto {
  @ApiProperty({ description: '最小值' })
  @IsNumber()
  min!: number;

  @ApiProperty({ description: '最大值' })
  @IsNumber()
  max!: number;

  @ApiProperty({ description: '默认值' })
  @IsNumber()
  default!: number;

  @ApiProperty({ description: '参数标签' })
  @IsString()
  label!: string;
}

class OptionParameterDto {
  @ApiProperty({ description: '选项列表' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  options!: string[];

  @ApiProperty({ description: '默认选项' })
  @IsString()
  default!: string;

  @ApiProperty({ description: '参数标签' })
  @IsString()
  label!: string;
}

class TemplateParametersDto {
  @ApiProperty({ description: '脸型参数', type: NumericParameterDto })
  @ValidateNested()
  @Type(() => NumericParameterDto)
  faceShape!: NumericParameterDto;

  @ApiProperty({ description: '眼型参数', type: OptionParameterDto })
  @ValidateNested()
  @Type(() => OptionParameterDto)
  eyeType!: OptionParameterDto;

  @ApiProperty({ description: '肤色参数', type: OptionParameterDto })
  @ValidateNested()
  @Type(() => OptionParameterDto)
  skinTone!: OptionParameterDto;

  @ApiProperty({ description: '发型参数', type: OptionParameterDto })
  @ValidateNested()
  @Type(() => OptionParameterDto)
  hairId!: OptionParameterDto;
}

export class CreateTemplateDto {
  @ApiProperty({ description: '模板名称', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: '性别', enum: GENDER_VALUES })
  @IsString()
  @IsIn(GENDER_VALUES as unknown as string[])
  gender!: string;

  @ApiProperty({ description: 'Skia绘制配置', type: DrawingConfigDto })
  @ValidateNested()
  @Type(() => DrawingConfigDto)
  drawingConfig!: DrawingConfigDto;

  @ApiProperty({ description: '可调参数定义', type: TemplateParametersDto })
  @ValidateNested()
  @Type(() => TemplateParametersDto)
  parameters!: TemplateParametersDto;

  @ApiPropertyOptional({ description: '默认服装颜色+类型映射' })
  @IsOptional()
  @IsObject()
  defaultClothingMap?: Record<string, unknown>;
}
