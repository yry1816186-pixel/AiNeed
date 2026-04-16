import { BullModule } from '@nestjs/bullmq';
import { Module, Logger, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { GatewayModule } from '../../../../common/gateway/gateway.module';
import { AIModule } from '../../ai-core/ai/ai.module';
import { CommunityModule } from '../../../modules/community/community.module';
import { TryOnModule } from '../../ai-core/try-on/try-on.module';

import { QueueName } from './queue-config';
import { QueueMonitorService } from './queue-monitor.service';
import { QueueController } from './queue.controller';
import {
  QueueProcessor,
  StyleAnalysisProcessor,
  VirtualTryOnProcessor,
  WardrobeMatchProcessor,
  ContentModerationProcessor,
} from './queue.processor';
import { QueueService } from './queue.service';


const logger = new Logger('QueueModule');

@Module({
  imports: [
    // Import GatewayModule to access NotificationService
    GatewayModule,
    AIModule,
    forwardRef(() => CommunityModule),
    forwardRef(() => TryOnModule),
    // Register BullMQ with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
        // Parse Redis URL if it's in the format redis://host:port
        let host = 'localhost';
        let port = 6379;
        let password: string | undefined;

        try {
          const url = new URL(redisUrl);
          host = url.hostname || 'localhost';
          port = parseInt(url.port) || 6379;
          password = url.password || undefined;
        } catch (error) {
          // If URL parsing fails, use defaults
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(
            `Failed to parse REDIS_URL '${redisUrl}': ${errorMessage}. Using default connection settings (localhost:6379).`,
          );
        }

        return {
          connection: {
            host,
            port,
            password,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: {
              count: 100,
              age: 24 * 3600, // 24 hours
            },
            removeOnFail: {
              count: 50,
              age: 7 * 24 * 3600, // 7 days
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    // Register individual queues - all queues from QueueName enum
    BullModule.registerQueue(
      { name: QueueName.AI_TASKS },
      { name: QueueName.STYLE_ANALYSIS },
      { name: QueueName.VIRTUAL_TRYON },
      { name: QueueName.WARDROBE_MATCH },
      { name: QueueName.BODY_ANALYSIS },
      { name: QueueName.PHOTO_PROCESSING },
      { name: QueueName.AI_GENERATION },
      { name: QueueName.NOTIFICATION },
      { name: QueueName.DATA_EXPORT },
      { name: QueueName.CONTENT_MODERATION },
    ),
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    QueueMonitorService,
    QueueProcessor,
    StyleAnalysisProcessor,
    VirtualTryOnProcessor,
    WardrobeMatchProcessor,
    ContentModerationProcessor,
  ],
  exports: [QueueService, QueueMonitorService],
})
export class QueueModule {}
