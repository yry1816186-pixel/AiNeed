import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { PhotosModule } from "../photos/photos.module";
import { RecommendationsModule } from "../recommendations/recommendations.module";
import { ContentSubmodule } from "../recommendations/submodules";

import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { UserProfileService } from "./services/user-profile.service";

@Module({
  imports: [
    PrismaModule,
    PhotosModule,
    RecommendationsModule,
    ContentSubmodule,
    AnalyticsModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService, UserProfileService],
  exports: [ProfileService, UserProfileService],
})
export class ProfileModule {}
