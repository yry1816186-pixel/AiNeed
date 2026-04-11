import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWardrobeItemDto {
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
