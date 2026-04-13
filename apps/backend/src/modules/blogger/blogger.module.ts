import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { RedisModule } from "../../common/redis/redis.module";
import { NotificationModule } from "../notification/notification.module";

import { BloggerController } from "./blogger.controller";
import { BloggerScoreService } from "./blogger-score.service";
import { BloggerProductService } from "./blogger-product.service";
import { BloggerDashboardService } from "./blogger-dashboard.service";

@Module({
  imports: [PrismaModule, RedisModule, NotificationModule],
  controllers: [BloggerController],
  providers: [BloggerScoreService, BloggerProductService, BloggerDashboardService],
  exports: [BloggerScoreService, BloggerProductService],
})
export class BloggerModule {}
