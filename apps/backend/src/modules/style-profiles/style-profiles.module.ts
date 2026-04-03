import { Module } from "@nestjs/common";

import { StyleProfilesController } from "./style-profiles.controller";
import { StyleProfilesService } from "./style-profiles.service";

import { AnalyticsModule } from "../analytics/analytics.module";

@Module({
  imports: [AnalyticsModule],
  controllers: [StyleProfilesController],
  providers: [StyleProfilesService],
  exports: [StyleProfilesService],
})
export class StyleProfilesModule {}
