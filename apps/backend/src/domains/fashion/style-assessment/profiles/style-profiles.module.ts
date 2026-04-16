import { Module } from "@nestjs/common";

import { AnalyticsModule } from "../../../../domains/platform/analytics/analytics.module";

import { StyleProfilesController } from "./style-profiles.controller";
import { StyleProfilesService } from "./style-profiles.service";


@Module({
  imports: [AnalyticsModule],
  controllers: [StyleProfilesController],
  providers: [StyleProfilesService],
  exports: [StyleProfilesService],
})
export class StyleProfilesModule {}
