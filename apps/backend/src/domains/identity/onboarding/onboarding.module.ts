import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { ColdStartService } from "../../platform/recommendations/services/cold-start.service";

import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, ColdStartService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
