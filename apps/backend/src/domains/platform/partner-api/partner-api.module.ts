import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { RedisModule } from "../../../common/redis/redis.module";
import { AIModule } from "../../ai-core/ai/ai.module";
import { TryOnModule } from "../../ai-core/try-on/try-on.module";
import { ClothingModule } from "../../fashion/clothing/clothing.module";
import { RecommendationsModule } from "../recommendations/recommendations.module";

import { PartnerApiController } from "./partner-api.controller";
import { PartnerApiKeyGuard } from "./guards/partner-api-key.guard";
import { PartnerAuthGuard } from "./guards/partner-auth.guard";
import { PartnerRateLimitGuard } from "./guards/partner-rate-limit.guard";
import { PartnerApiLogService } from "./services/partner-api-log.service";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    RecommendationsModule,
    TryOnModule,
    AIModule,
    ClothingModule,
  ],
  controllers: [PartnerApiController],
  providers: [PartnerApiLogService, PartnerApiKeyGuard, PartnerAuthGuard, PartnerRateLimitGuard],
  exports: [PartnerApiKeyGuard, PartnerAuthGuard, PartnerRateLimitGuard],
})
export class PartnerApiModule {}
