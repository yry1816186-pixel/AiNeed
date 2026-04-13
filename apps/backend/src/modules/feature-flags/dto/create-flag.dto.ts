import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsObject, IsBoolean, IsOptional } from 'class-validator';

export class CreateFeatureFlagDto {
  @ApiProperty({ description: 'Feature flag unique key', example: 'new_ui_design' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ description: 'Display name', example: 'New UI Design' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Description', example: 'Enable the new UI design for selected users' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Flag type',
    enum: ['boolean', 'percentage', 'variant', 'segment'],
    example: 'boolean',
  })
  @IsEnum(['boolean', 'percentage', 'variant', 'segment'])
  type!: string;

  @ApiProperty({
    description: 'Flag value configuration',
    example: { enabled: true },
  })
  @IsObject()
  value!: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether the flag is enabled', example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Evaluation rules',
    example: { segments: ['vip_user', 'paid_user'] },
  })
  @IsObject()
  @IsOptional()
  rules?: Record<string, any>;
}
