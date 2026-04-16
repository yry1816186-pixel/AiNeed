import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { PrismaModule } from "../../../../common/prisma/prisma.module";
import { RedisModule } from "../../../../common/redis/redis.module";
import { AuthModule } from "../../identity/auth/auth.module";

import { AnalyticsController } from "./controllers/analytics.controller";
import { BehaviorTrackerService } from "./services/behavior-tracker.service";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, RedisModule, AuthModule],
  controllers: [AnalyticsController],
  providers: [BehaviorTrackerService],
  exports: [BehaviorTrackerService],
})
export class AnalyticsModule {}
