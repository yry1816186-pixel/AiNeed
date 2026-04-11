import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { QueueService } from './queue.service';


class UserProfileDto {
  @IsOptional()
  @IsString()
  bodyType?: string;

  @IsOptional()
  @IsString()
  skinTone?: string;

  @IsOptional()
  @IsString()
  colorSeason?: string;

  @IsOptional()
  @IsString({ each: true })
  stylePreferences?: string[];
}

class CreateStyleAnalysisDto {
  @IsString()
  userInput!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserProfileDto)
  userProfile?: UserProfileDto;
}

class CreateVirtualTryOnDto {
  @IsString()
  photoId!: string;

  @IsString()
  itemId!: string;

  @IsOptional()
  @IsString()
  category?: string;
}

class CreateWardrobeMatchDto {
  @IsString({ each: true })
  wardrobeItems!: string[];

  @IsOptional()
  @IsString()
  targetStyle?: string;

  @IsOptional()
  @IsString()
  occasion?: string;

  @IsOptional()
  @IsString()
  season?: string;
}

class CreateRecommendationDto {
  @IsString()
  userInput!: string;

  @IsOptional()
  userProfile?: Record<string, any>;

  @IsOptional()
  @IsString()
  occasion?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;
}

@ApiTags('AI Task Queue')
@ApiBearerAuth()
@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('style-analysis')
  @ApiOperation({ summary: 'Create a style analysis task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createStyleAnalysis(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStyleAnalysisDto,
  ) {
    return this.queueService.addStyleAnalysisTask(
      userId,
      dto.userInput,
      dto.userProfile,
    );
  }

  @Post('virtual-tryon')
  @ApiOperation({ summary: 'Create a virtual try-on task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createVirtualTryOn(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVirtualTryOnDto,
  ) {
    return this.queueService.addVirtualTryOnTask(
      userId,
      dto.photoId,
      dto.itemId,
      dto.category,
    );
  }

  @Post('wardrobe-match')
  @ApiOperation({ summary: 'Create a wardrobe match task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createWardrobeMatch(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWardrobeMatchDto,
  ) {
    return this.queueService.addWardrobeMatchTask(
      userId,
      dto.wardrobeItems,
      dto.targetStyle,
      dto.occasion,
      dto.season,
    );
  }

  @Post('recommendation')
  @ApiOperation({ summary: 'Create a recommendation task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createRecommendation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRecommendationDto,
  ) {
    return this.queueService.addRecommendationTask(
      userId,
      dto.userInput,
      dto.userProfile,
      dto.occasion,
      dto.category,
      dto.topK,
    );
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get job status' })
  @ApiResponse({ status: 200, description: 'Job status retrieved' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.queueService.getJobStatus(jobId);
    if (!job) {
      return { error: 'Job not found', statusCode: 404 };
    }
    return job;
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get user jobs' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved' })
  async getUserJobs(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.queueService.getUserJobs(userId, parsedLimit);
  }

  @Delete('jobs/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel job' })
  async cancelJob(
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    const cancelled = await this.queueService.cancelJob(jobId, userId);
    if (!cancelled) {
      return { error: 'Cannot cancel job', statusCode: 400 };
    }
    return { message: 'Job cancelled successfully', jobId };
  }

  @Post('jobs/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiResponse({ status: 200, description: 'Job retried' })
  @ApiResponse({ status: 400, description: 'Cannot retry job' })
  async retryJob(
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    const retried = await this.queueService.retryJob(jobId, userId);
    if (!retried) {
      return { error: 'Cannot retry job', statusCode: 400 };
    }
    return { message: 'Job retried successfully', jobId };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }
}
