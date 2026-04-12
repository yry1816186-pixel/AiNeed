import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class ElasticsearchHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const url = this.configService.get<string>('ELASTICSEARCH_URL');

    if (!url) {
      return this.getStatus(key, false, { message: 'Elasticsearch URL not configured' });
    }

    const client = new Client({ node: url });

    try {
      const result = await client.cluster.health();
      const status = result.status as string;
      if (status === 'green' || status === 'yellow') {
        return this.getStatus(key, true, { clusterStatus: status });
      }
      throw new HealthCheckError(
        'ElasticsearchHealthCheck failed',
        this.getStatus(key, false, { clusterStatus: status }),
      );
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Elasticsearch connection failed';
      throw new HealthCheckError(
        'ElasticsearchHealthCheck failed',
        this.getStatus(key, false, { message }),
      );
    } finally {
      client.close();
    }
  }
}
