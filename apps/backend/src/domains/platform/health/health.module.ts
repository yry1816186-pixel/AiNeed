import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { RedisModule } from "../../../common/redis/redis.module";
import { StorageModule } from "../../../common/storage/storage.module";

import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, StorageModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
