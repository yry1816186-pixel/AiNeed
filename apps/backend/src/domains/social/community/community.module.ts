import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { RedisModule } from "../../../common/redis/redis.module";
import { StorageModule } from "../../../common/storage/storage.module";
import { AdminCommunityController } from "../../platform/admin/admin-community.controller";

import { CommunityController } from "./community.controller";
import { CommunityService } from "./community.service";
import { CommunityPostService } from "./community-post.service";
import { CommunityCommentService } from "./community-comment.service";
import { CommunityLikeService } from "./community-like.service";
import { CommunitySocialService } from "./community-social.service";
import { CommunityTrendingService } from "./community-trending.service";
import { CommunityFeedService } from "./community-feed.service";
import { ContentModerationProcessor } from "./content-moderation.processor";
import { ContentModerationService, CONTENT_MODERATION_QUEUE } from "./content-moderation.service";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    RedisModule,
    BullModule.registerQueue({ name: CONTENT_MODERATION_QUEUE }),
  ],
  controllers: [CommunityController, AdminCommunityController],
  providers: [
    CommunityService,
    CommunityPostService,
    CommunityCommentService,
    CommunityLikeService,
    CommunitySocialService,
    CommunityTrendingService,
    CommunityFeedService,
    ContentModerationService,
    ContentModerationProcessor,
  ],
  exports: [CommunityService, ContentModerationService],
})
export class CommunityModule {}
