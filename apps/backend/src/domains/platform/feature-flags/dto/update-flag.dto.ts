/* eslint-disable @typescript-eslint/no-explicit-any */
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether the flag is enabled' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Evaluation rules' })
  @IsObject()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: Record<string, any>;
}
