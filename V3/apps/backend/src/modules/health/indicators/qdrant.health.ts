import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantHealthIndicator extends HealthIndicator {
  private readonly client: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    super();
    const url = this.configService.get<string>('QDRANT_URL', 'http://localhost:6333');
    this.client = new QdrantClient({ url });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.client.getCollections();
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Qdrant connection failed';
      throw new HealthCheckError(
        'QdrantHealthCheck failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
