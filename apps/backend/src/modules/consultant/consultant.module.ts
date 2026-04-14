import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";

import { ConsultantController } from "./consultant.controller";
import { ConsultantService } from "./consultant.service";
import { ConsultantMatchingService } from "./consultant-matching.service";
import { ConsultantAvailabilityService } from "./consultant-availability.service";
import { ConsultantReviewService } from "./consultant-review.service";

@Module({
  imports: [PrismaModule],
  controllers: [ConsultantController],
  providers: [
    ConsultantService,
    ConsultantMatchingService,
    ConsultantAvailabilityService,
    ConsultantReviewService,
  ],
  exports: [ConsultantService],
})
export class ConsultantModule {}
