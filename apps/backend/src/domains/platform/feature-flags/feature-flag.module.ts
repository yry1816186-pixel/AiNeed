import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { RedisModule } from '../../../../common/redis/redis.module';
import { AuthModule } from '../../identity/auth/auth.module';

import { FeatureFlagController } from './feature-flag.controller';
import { FeatureFlagGuard } from './feature-flag.guard';
import { FeatureFlagProcessor } from './feature-flag.processor';
import { FeatureFlagService } from './feature-flag.service';

const FEATURE_FLAG_QUEUE = 'feature_flag_evaluations';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    BullModule.registerQueue({ name: FEATURE_FLAG_QUEUE }),
  ],
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService, FeatureFlagGuard, FeatureFlagProcessor],
  exports: [FeatureFlagService, FeatureFlagGuard],
})
export class FeatureFlagModule {}
