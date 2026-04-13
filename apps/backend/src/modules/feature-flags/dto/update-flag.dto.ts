import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsObject, IsBoolean, IsOptional } from 'class-validator';

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional({ description: 'Feature flag unique key' })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Flag type',
    enum: ['boolean', 'percentage', 'variant', 'segment'],
  })
  @IsEnum(['boolean', 'percentage', 'variant', 'segment'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Flag value configuration' })
  @IsObject()
  @IsOptional()
  value?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether the flag is enabled' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Evaluation rules' })
  @IsObject()
  @IsOptional()
  rules?: Record<string, any>;
}
