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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

import { AISafetyService, ValidationContext } from './ai-safety.service';

class ValidateRequestDto {
  @ApiProperty({ description: "LLM 响应文本内容", example: "建议搭配一件白色衬衫和深色西裤" })
  response!: string;

  @ApiPropertyOptional({ description: "验证上下文信息，用于辅助幻觉检测" })
  context?: ValidationContext;
}

class QuickCheckRequestDto {
  @ApiProperty({ description: "待快速检查的 LLM 响应文本", example: "这件衣服适合面试穿" })
  response!: string;
}

@ApiTags("ai-safety")
@ApiBearerAuth()
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
  @ApiOperation({ summary: "验证 LLM 响应是否存在幻觉", description: "对 LLM 生成的响应进行幻觉检测，返回验证结果和置信度评分。" })
  @ApiResponse({ status: 200, description: "验证结果，包含是否检测到幻觉和详细分析" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
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
  @ApiOperation({ summary: "验证并纠正 LLM 响应", description: "对 LLM 响应进行幻觉检测，如检测到幻觉则返回纠正后的内容。" })
  @ApiResponse({ status: 200, description: "验证和纠正结果" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
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
  @ApiOperation({ summary: "快速验证检查", description: "轻量级幻觉快速检查，仅返回是否通过验证的布尔结果。" })
  @ApiResponse({ status: 200, description: "快速检查结果", schema: { type: "object", properties: { isValid: { type: "boolean", description: "是否通过验证" } } } })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
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
  @ApiOperation({ summary: "获取幻觉检测统计", description: "获取幻觉检测的统计数据，包括检测次数、幻觉率等，支持按日期范围筛选。" })
  @ApiQuery({ name: "startDate", required: false, type: String, description: "开始日期（ISO 8601格式）", example: "2024-01-01" })
  @ApiQuery({ name: "endDate", required: false, type: String, description: "结束日期（ISO 8601格式）", example: "2024-12-31" })
  @ApiResponse({ status: 200, description: "幻觉检测统计数据" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
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
