import { Module } from "@nestjs/common";

import { StorageModule } from "../../common/storage/storage.module";
import { ProfileModule } from "../identity/profile/profile.module";
import { AiStylistModule } from "../ai-core/ai-stylist/ai-stylist.module";
import { TryOnModule } from "../ai-core/try-on/try-on.module";
import { StyleQuizModule } from "../fashion/style-assessment/quiz/style-quiz.module";

import { MobileUserController } from "./controllers/user.controller";
import { MobileStylistController } from "./controllers/stylist.controller";
import { MobileTryOnController } from "./controllers/tryon.controller";
import { MobileStyleQuizController } from "./controllers/style-quiz.controller";

@Module({
  imports: [ProfileModule, AiStylistModule, TryOnModule, StyleQuizModule, StorageModule],
  controllers: [
    MobileUserController,
    MobileStylistController,
    MobileTryOnController,
    MobileStyleQuizController,
  ],
  providers: [],
  exports: [],
})
export class MobileApiModule {}
