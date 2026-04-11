import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RecommendationRedisProvider implements OnModuleDestroy {
  private readonly logger = new Logger(RecommendationRedisProvider.name);
  readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(redisUrl);

    this.client.on('connect', () => {
      this.logger.log('Redis connected for recommendation module');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', String(err));
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.log('Redis connection closed for recommendation module');
    } catch (error) {
      this.logger.error('Error closing Redis connection', String(error));
    }
  }
}
