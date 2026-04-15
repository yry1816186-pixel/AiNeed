import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { PhotosModule } from "../photos/photos.module";
import { RecommendationsModule } from "../recommendations/recommendations.module";
import { ContentSubmodule } from "../recommendations/submodules";

import { PosterController } from "./poster.controller";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { PosterGeneratorService } from "./services/poster-generator.service";
import { ProfileCompletenessService } from "./services/profile-completeness.service";
import { ProfileEventEmitter } from "./services/profile-event-emitter.service";
import { SharePosterService } from "./services/share-poster.service";
import { UserProfileService } from "./services/user-profile.service";

@Module({
  imports: [
    PrismaModule,
    PhotosModule,
    RecommendationsModule,
    ContentSubmodule,
    AnalyticsModule,
  ],
  controllers: [ProfileController, PosterController],
  providers: [ProfileService, UserProfileService, PosterGeneratorService, ProfileCompletenessService, SharePosterService, ProfileEventEmitter],
  exports: [ProfileService, UserProfileService, PosterGeneratorService, ProfileCompletenessService, SharePosterService, ProfileEventEmitter],
})
export class ProfileModule {}
