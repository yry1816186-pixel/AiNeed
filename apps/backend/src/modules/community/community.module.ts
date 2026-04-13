import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from '../../common/prisma/prisma.module';
import { StorageModule } from '../../common/storage/storage.module';
import { RedisModule } from '../../common/redis/redis.module';
import { QueueModule } from '../queue/queue.module';

import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { ContentModerationService, CONTENT_MODERATION_QUEUE } from './content-moderation.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    RedisModule,
    forwardRef(() => QueueModule),
    BullModule.registerQueue({ name: CONTENT_MODERATION_QUEUE }),
  ],
  controllers: [CommunityController],
  providers: [CommunityService, ContentModerationService],
  exports: [CommunityService, ContentModerationService],
})
export class CommunityModule {}
