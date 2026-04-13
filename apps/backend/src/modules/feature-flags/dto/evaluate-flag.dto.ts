import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class EvaluateFlagDto {
  @ApiProperty({ description: 'Feature flag key to evaluate', example: 'new_ui_design' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiPropertyOptional({ description: 'User ID for evaluation', example: 'user-123' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional attributes for evaluation',
    example: { userSegment: 'vip_user' },
  })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;
}
