import { Injectable } from '@nestjs/common';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { StorageHealthIndicator } from './indicators/storage.health';
import { QdrantHealthIndicator } from './indicators/qdrant.health';
import { Neo4jHealthIndicator } from './indicators/neo4j.health';
import { ElasticsearchHealthIndicator } from './indicators/elasticsearch.health';
import { ExternalHealthIndicator } from './indicators/external.health';

export type HealthStatus = 'ok' | 'degraded' | 'unhealthy';

export interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, unknown>;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly storageHealth: StorageHealthIndicator,
    private readonly qdrantHealth: QdrantHealthIndicator,
    private readonly neo4jHealth: Neo4jHealthIndicator,
    private readonly elasticsearchHealth: ElasticsearchHealthIndicator,
    private readonly externalHealth: ExternalHealthIndicator,
  ) {}

  async checkFull(): Promise<HealthResponse> {
    const result = await this.healthCheckService.check([
      () => this.databaseHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
      () => this.storageHealth.isHealthy('storage'),
      () => this.qdrantHealth.isHealthy('qdrant'),
      () => this.neo4jHealth.isHealthy('neo4j'),
      () => this.elasticsearchHealth.isHealthy('elasticsearch'),
      () => this.externalHealth.isHealthy('external'),
    ]);

    return this.buildResponse(result);
  }

  async checkReadiness(): Promise<HealthResponse> {
    const result = await this.healthCheckService.check([
      () => this.databaseHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
      () => this.storageHealth.isHealthy('storage'),
    ]);

    return this.buildResponse(result);
  }

  checkLiveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  private buildResponse(result: HealthCheckResult): HealthResponse {
    const status = this.mapStatus(result.status);
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.0.1',
      checks: result.info ?? result.error ?? {},
    };
  }

  private mapStatus(terminusStatus: string): HealthStatus {
    switch (terminusStatus) {
      case 'ok':
        return 'ok';
      case 'error':
        return 'unhealthy';
      case 'shutting_down':
        return 'degraded';
      default:
        return 'unhealthy';
    }
  }
}
