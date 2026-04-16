import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../common/prisma/prisma.module';
import { RedisModule } from '../../../common/redis/redis.module';
import { StorageModule } from '../../../common/storage/storage.module';
import { AdminCommunityController } from '../../platform/admin/admin-community.controller';

import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { ContentModerationService, CONTENT_MODERATION_QUEUE } from './content-moderation.service';
import { ContentModerationProcessor } from './content-moderation.processor';


@Module({
  imports: [
    PrismaModule,
    StorageModule,
    RedisModule,
    BullModule.registerQueue({ name: CONTENT_MODERATION_QUEUE }),
  ],
  controllers: [CommunityController, AdminCommunityController],
  providers: [CommunityService, ContentModerationService, ContentModerationProcessor],
  exports: [CommunityService, ContentModerationService],
})
export class CommunityModule {}
