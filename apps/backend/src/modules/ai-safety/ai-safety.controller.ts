/**
 * AI Safety Controller
 *
 * REST API endpoints for AI safety features
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

import { AISafetyService, ValidationContext } from './ai-safety.service';

class ValidateRequestDto {
  response!: string;
  context?: ValidationContext;
}

class QuickCheckRequestDto {
  response!: string;
}

@Controller('ai-safety')
@UseGuards(JwtAuthGuard)
export class AISafetyController {
  constructor(private readonly aiSafetyService: AISafetyService) {}

  /**
   * Validate LLM response for hallucinations
   *
   * POST /api/ai-safety/validate (versioned route: /api/v1/ai-safety/validate)
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: ValidateRequestDto) {
    return this.aiSafetyService.validateResponse(dto.response, dto.context);
  }

  /**
   * Validate and get corrected response
   *
   * POST /api/ai-safety/validate-correct (versioned route: /api/v1/ai-safety/validate-correct)
   */
  @Post('validate-correct')
  @HttpCode(HttpStatus.OK)
  async validateAndCorrect(@Body() dto: ValidateRequestDto) {
    return this.aiSafetyService.validateAndCorrect(dto.response, dto.context);
  }

  /**
   * Quick validation check (lightweight)
   *
   * POST /api/ai-safety/quick-check (versioned route: /api/v1/ai-safety/quick-check)
   */
  @Post('quick-check')
  @HttpCode(HttpStatus.OK)
  async quickCheck(@Body() dto: QuickCheckRequestDto) {
    const isValid = await this.aiSafetyService.quickCheck(dto.response);
    return { isValid };
  }

  /**
   * Get hallucination statistics
   *
   * GET /api/ai-safety/statistics (versioned route: /api/v1/ai-safety/statistics)
   */
  @Get('statistics')
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.aiSafetyService.getStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
