import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { RedisModule } from "../../../common/redis/redis.module";
import { NotificationModule } from "../../../platform/notification/notification.module";

import { BloggerDashboardService } from "./blogger-dashboard.service";
import { BloggerProductService } from "./blogger-product.service";
import { BloggerScoreService } from "./blogger-score.service";
import { BloggerController } from "./blogger.controller";

@Module({
  imports: [PrismaModule, RedisModule, NotificationModule],
  controllers: [BloggerController],
  providers: [BloggerScoreService, BloggerProductService, BloggerDashboardService],
  exports: [BloggerScoreService, BloggerProductService],
})
export class BloggerModule {}
