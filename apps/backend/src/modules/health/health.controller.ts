import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Public } from "../auth/decorators/public.decorator";

import { HealthService } from "./health.service";

/**
 * 健康检查响应 DTO
 */
class HealthResponseDto {
  @ApiProperty({ description: "系统状态", example: "ok", enum: ["ok", "error", "degraded"] })
  status!: "ok" | "error" | "degraded";

  @ApiProperty({ description: "时间戳", example: "2026-04-13T12:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ description: "运行时间（秒）", example: 86400 })
  uptime!: number;

  @ApiProperty({ description: "版本号", example: "1.0.0" })
  version!: string;

  @ApiPropertyOptional({ description: "各依赖项检查结果" })
  checks?: Record<string, { status: string; message?: string }>;
}

/**
 * 存活检查响应 DTO
 */
class LivenessResponseDto {
  @ApiProperty({ description: "存活状态", example: "ok" })
  status!: "ok";

  @ApiProperty({ description: "时间戳", example: "2026-04-13T12:00:00.000Z" })
  timestamp!: string;
}

/**
 * 就绪检查响应 DTO
 */
class ReadinessResponseDto {
  @ApiProperty({ description: "就绪状态", example: "ok", enum: ["ok", "error", "degraded"] })
  status!: "ok" | "error" | "degraded";

  @ApiProperty({ description: "时间戳", example: "2026-04-13T12:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ description: "各依赖项检查结果" })
  checks!: Record<string, { status: string; message?: string }>;
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * 完整的健康检查（包含所有依赖）
   * GET /api/v1/health
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: "完整健康检查",
    description: "执行完整的系统健康检查，包括数据库、Redis、存储服务等所有依赖项。",
  })
  @ApiResponse({
    status: 200,
    description: "系统健康状态",
    type: HealthResponseDto,
  })
  async getHealth() {
    const result = await this.healthService.checkHealth();
    if (result.status === "unhealthy") {
      throw new (await import("@nestjs/common")).ServiceUnavailableException(result);
    }
    if (result.status === "degraded") {
      return result;
    }
    return result;
  }

  /**
   * 存活检查（Kubernetes liveness probe）
   * GET /api/v1/health/live
   */
  @Get("live")
  @Public()
  @ApiOperation({
    summary: "存活检查",
    description: "Kubernetes 存活探针，检查应用是否运行。如果返回 200，说明应用存活。",
  })
  @ApiResponse({
    status: 200,
    description: "应用存活",
    type: LivenessResponseDto,
  })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  /**
   * 就绪检查（Kubernetes readiness probe）
   * GET /api/v1/health/ready
   */
  @Get("ready")
  @Public()
  @ApiOperation({
    summary: "就绪检查",
    description: "Kubernetes 就绪探针，检查应用是否准备好接收流量。检查关键依赖项是否可用。",
  })
  @ApiResponse({
    status: 200,
    description: "应用就绪",
    type: ReadinessResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: "应用未就绪（依赖项不可用）",
  })
  async getReadiness() {
    const result = await this.healthService.getReadiness();
    if (!result.ready) {
      throw new (await import("@nestjs/common")).ServiceUnavailableException(result);
    }
    return result;
  }
}
