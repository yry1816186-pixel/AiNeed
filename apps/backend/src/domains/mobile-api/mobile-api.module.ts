import { Module } from "@nestjs/common";

import { RedisModule } from "../../common/redis/redis.module";
import { StorageModule } from "../../common/storage/storage.module";
import { AiStylistModule } from "../ai-core/ai-stylist/ai-stylist.module";
import { TryOnModule } from "../ai-core/try-on/try-on.module";
import { StyleQuizModule } from "../fashion/style-assessment/quiz/style-quiz.module";
import { ProfileModule } from "../identity/profile/profile.module";

import { DemoCacheController } from "./controllers/demo-cache.controller";
import { MobileStyleQuizController } from "./controllers/style-quiz.controller";
import { MobileStylistController } from "./controllers/stylist.controller";
import { MobileTryOnController } from "./controllers/tryon.controller";
import { MobileUserController } from "./controllers/user.controller";
import { DemoCacheService } from "./services/demo-cache.service";

@Module({
  imports: [
    ProfileModule,
    AiStylistModule,
    TryOnModule,
    StyleQuizModule,
    StorageModule,
    RedisModule,
  ],
  controllers: [
    MobileUserController,
    MobileStylistController,
    MobileTryOnController,
    MobileStyleQuizController,
    DemoCacheController,
  ],
  providers: [DemoCacheService],
  exports: [],
})
export class MobileApiModule {}
