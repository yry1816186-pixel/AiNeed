import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';
import { SHARED_REDIS_CLIENT } from '../../../common/providers/shared-redis.provider';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(SHARED_REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const response = await this.redis.ping();
      if (response === 'PONG') {
        return this.getStatus(key, true);
      }
      throw new HealthCheckError(
        'RedisHealthCheck failed',
        this.getStatus(key, false, { message: `Unexpected PING response: ${response}` }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Redis connection failed';
      throw new HealthCheckError(
        'RedisHealthCheck failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
