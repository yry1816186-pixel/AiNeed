import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import neo4j from 'neo4j-driver';

@Injectable()
export class Neo4jHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const url = this.configService.get<string>('NEO4J_URL');
    const user = this.configService.get<string>('NEO4J_USER');
    const password = this.configService.get<string>('NEO4J_PASSWORD');

    if (!url || !user || !password) {
      return this.getStatus(key, false, { message: 'Neo4j credentials not configured' });
    }

    const driver = neo4j.driver(url, neo4j.auth.basic(user, password));
    const session = driver.session();

    try {
      await session.run('RETURN 1 AS health');
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Neo4j connection failed';
      throw new HealthCheckError(
        'Neo4jHealthCheck failed',
        this.getStatus(key, false, { message }),
      );
    } finally {
      await session.close();
      await driver.close();
    }
  }
}
