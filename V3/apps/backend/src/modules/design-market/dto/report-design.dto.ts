import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportReason {
  INAPPROPRIATE = 'inappropriate',
  COPYRIGHT = 'copyright',
  SPAM = 'spam',
  VIOLENCE = 'violence',
  OTHER = 'other',
}

export class ReportDesignDto {
  @ApiProperty({ description: '举报原因', enum: ReportReason })
  @IsEnum(ReportReason)
  reason!: ReportReason;

  @ApiPropertyOptional({ description: '举报描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
