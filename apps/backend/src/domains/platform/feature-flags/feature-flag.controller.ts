import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { Public } from '../../identity/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';

import { CreateFeatureFlagDto } from './dto/create-flag.dto';
import { EvaluateFlagDto } from './dto/evaluate-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-flag.dto';
import { FeatureFlagService } from './feature-flag.service';

@ApiTags('feature-flags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feature-flags')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @ApiOperation({ summary: 'List all feature flags (admin)' })
  @ApiResponse({ status: 200, description: 'List of feature flags' })
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('type') type?: string,
    @Query('enabled') enabled?: string,
  ) {
    return this.featureFlagService.findAll({
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      type,
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
    });
  }

  @Get('client')
  @Public()
  @ApiOperation({ summary: 'Get all enabled flags for mobile client (public)' })
  @ApiResponse({ status: 200, description: 'Lightweight flag list for client' })
  async getAllFlagsForClient() {
    return this.featureFlagService.getAllFlagsForClient();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a feature flag by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Feature flag ID' })
  @ApiResponse({ status: 200, description: 'Feature flag details' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async findOne(@Param('id') id: string) {
    return this.featureFlagService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a feature flag (admin)' })
  @ApiResponse({ status: 201, description: 'Feature flag created' })
  async create(@Body() dto: CreateFeatureFlagDto) {
    return this.featureFlagService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a feature flag (admin)' })
  @ApiParam({ name: 'id', description: 'Feature flag ID' })
  @ApiResponse({ status: 200, description: 'Feature flag updated' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.featureFlagService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a feature flag (admin)' })
  @ApiParam({ name: 'id', description: 'Feature flag ID' })
  @ApiResponse({ status: 200, description: 'Feature flag deleted' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async remove(@Param('id') id: string) {
    return this.featureFlagService.remove(id);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate a feature flag for the current user' })
  @ApiResponse({ status: 200, description: 'Evaluation result' })
  async evaluate(@Body() dto: EvaluateFlagDto, @Request() req: Request) {
    const userId = dto.userId ?? req.user?.id;
    return this.featureFlagService.evaluate(dto.key, userId, dto.attributes);
  }
}
