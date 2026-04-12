import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsEnum,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OutfitImageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class OutfitItemDto {
  @ApiProperty({ description: '服装名称', example: '红色V领毛衣' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ description: '颜色', example: '红色' })
  @IsString()
  @MaxLength(50)
  color!: string;

  @ApiProperty({
    description: '服装类别',
    example: 'top',
    enum: ['top', 'bottom', 'outer', 'shoes', 'accessory', 'dress'],
  })
  @IsEnum(['top', 'bottom', 'outer', 'shoes', 'accessory', 'dress'])
  category!: string;
}

export class GenerateOutfitImageDto {
  @ApiProperty({
    description: '搭配方案数据',
    type: () => OutfitItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OutfitItemDto)
  items!: OutfitItemDto[];

  @ApiProperty({ description: '场合', example: '简约通勤' })
  @IsString()
  @MaxLength(100)
  occasion!: string;

  @ApiPropertyOptional({ description: '风格提示', example: '简约优雅' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  styleTips?: string;
}
