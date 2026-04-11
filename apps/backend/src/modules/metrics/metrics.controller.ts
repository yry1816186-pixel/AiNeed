import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { register } from 'prom-client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns Prometheus metrics in text format',
  })
  async getMetrics(): Promise<string> {
    return await register.metrics();
  }
}
