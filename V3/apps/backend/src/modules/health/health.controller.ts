import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthResponse } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '完整健康检查', description: '检查所有依赖服务(PostgreSQL/Redis/MinIO/Qdrant)的健康状态' })
  @ApiResponse({ status: 200, description: '返回所有服务健康状态' })
  async checkFull(): Promise<HealthResponse> {
    return this.healthService.checkFull();
  }

  @Get('live')
  @ApiOperation({ summary: '存活探针', description: 'K8s存活探针，检查应用是否运行' })
  @ApiResponse({ status: 200, description: '应用存活' })
  checkLiveness(): { status: 'ok' } {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: '就绪探针', description: 'K8s就绪探针，检查应用是否准备好接收流量' })
  @ApiResponse({ status: 200, description: '应用就绪' })
  @ApiResponse({ status: 503, description: '应用未就绪' })
  async checkReadiness(): Promise<HealthResponse> {
    return this.healthService.checkReadiness();
  }
}
