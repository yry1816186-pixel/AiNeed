/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';

export class UserProfileDto {
  @ApiPropertyOptional({ description: 'User body type' })
  @IsOptional()
  @IsString()
  bodyType?: string;

  @ApiPropertyOptional({ description: 'User skin tone' })
  @IsOptional()
  @IsString()
  skinTone?: string;

  @ApiPropertyOptional({ description: 'User color season' })
  @IsOptional()
  @IsString()
  colorSeason?: string;

  @ApiPropertyOptional({ description: 'User style preferences', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stylePreferences?: string[];

  @ApiPropertyOptional({ description: 'User occasion preferences', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  occasionPreferences?: string[];
}

export class CreateStyleAnalysisDto {
  @ApiProperty({ description: 'User style description input' })
  @IsString()
  userInput!: string;

  @ApiPropertyOptional({ description: 'User profile for personalization' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserProfileDto)
  userProfile?: UserProfileDto;
}

export class CreateVirtualTryOnDto {
  @ApiProperty({ description: 'User photo ID' })
  @IsString()
  photoId!: string;

  @ApiProperty({ description: 'Clothing item ID to try on' })
  @IsString()
  itemId!: string;

  @ApiPropertyOptional({ description: 'Clothing category' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class CreateWardrobeMatchDto {
  @ApiProperty({ description: 'List of wardrobe item IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  wardrobeItems!: string[];

  @ApiPropertyOptional({ description: 'Target style for matching' })
  @IsOptional()
  @IsString()
  targetStyle?: string;

  @ApiPropertyOptional({ description: 'Occasion for matching' })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ description: 'Season for matching' })
  @IsOptional()
  @IsString()
  season?: string;
}

export class CreateRecommendationDto {
  @ApiProperty({ description: 'User style description input' })
  @IsString()
  userInput!: string;

  @ApiPropertyOptional({ description: 'User profile for personalization' })
  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userProfile?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Occasion filter' })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Number of recommendations', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;
}

export class CreateImageAnalysisDto {
  @ApiProperty({ description: 'Path to the image file' })
  @IsString()
  imagePath!: string;

  @ApiPropertyOptional({
    description: 'Type of analysis',
    enum: ['full', 'color', 'style', 'body'],
    default: 'full',
  })
  @IsOptional()
  @IsEnum(['full', 'color', 'style', 'body'])
  analysisType?: 'full' | 'color' | 'style' | 'body';
}

export class CreateBodyAnalysisDto {
  @ApiProperty({ description: 'Path to the body image file' })
  @IsString()
  imagePath!: string;
}

export class JobStatusResponseDto {
  @ApiProperty({ description: 'Job ID' })
  jobId!: string;

  @ApiProperty({ description: 'Job status', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'timeout'] })
  status!: string;

  @ApiPropertyOptional({ description: 'Job result data' })
  result?: unknown;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Processing timestamp' })
  processedAt?: string;

  @ApiPropertyOptional({ description: 'Processing duration in milliseconds' })
  duration?: number;
}

export class TaskCreatedResponseDto {
  @ApiProperty({ description: 'Job ID' })
  jobId!: string;

  @ApiProperty({ description: 'Initial job status' })
  status!: string;

  @ApiProperty({ description: 'Estimated wait time in seconds' })
  estimatedWaitTime!: number;

  @ApiProperty({ description: 'Status message' })
  message!: string;
}
