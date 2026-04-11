import {
  IsString,
  IsUUID,
  IsOptional,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToWardrobeDto {
  @ApiProperty({ description: '服装ID' })
  @IsUUID()
  clothing_id!: string;

  @ApiPropertyOptional({ description: '自定义名称' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  custom_name?: string;

  @ApiPropertyOptional({ description: '图片URL' })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string;
}
