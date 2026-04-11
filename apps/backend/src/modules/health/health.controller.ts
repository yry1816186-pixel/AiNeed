import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

import { Public } from "../auth/decorators/public.decorator";

import { HealthService } from "./health.service";

/**
 * 健康检查响应 DTO
 */
class HealthResponseDto {
  status!: "ok" | "error" | "degraded";
  timestamp!: string;
  uptime!: number;
  version!: string;
  checks?: Record<string, { status: string; message?: string }>;
}

/**
 * 存活检查响应 DTO
 */
class LivenessResponseDto {
  status!: "ok";
  timestamp!: string;
}

/**
 * 就绪检查响应 DTO
 */
class ReadinessResponseDto {
  status!: "ok" | "error" | "degraded";
  timestamp!: string;
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
    return this.healthService.checkHealth();
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
    return this.healthService.getReadiness();
  }
}
