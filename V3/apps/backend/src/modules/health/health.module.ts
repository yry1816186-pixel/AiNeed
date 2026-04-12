import { Module, FactoryProvider } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { StorageHealthIndicator } from './indicators/storage.health';
import { QdrantHealthIndicator } from './indicators/qdrant.health';
import { Neo4jHealthIndicator } from './indicators/neo4j.health';
import { ElasticsearchHealthIndicator } from './indicators/elasticsearch.health';
import { ExternalHealthIndicator } from './indicators/external.health';
import { SHARED_REDIS_CLIENT } from '../../common/providers/shared-redis.provider';
import { PrismaModule } from '../../prisma/prisma.module';

const sharedRedisProvider: FactoryProvider<Redis> = {
  provide: SHARED_REDIS_CLIENT,
  useFactory: (configService: ConfigService): Redis => {
    const url = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    return new Redis(url);
  },
  inject: [ConfigService],
};

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [
    sharedRedisProvider,
    HealthService,
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    StorageHealthIndicator,
    QdrantHealthIndicator,
    Neo4jHealthIndicator,
    ElasticsearchHealthIndicator,
    ExternalHealthIndicator,
  ],
  exports: [sharedRedisProvider, SHARED_REDIS_CLIENT],
})
export class HealthModule {}
