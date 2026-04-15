import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { PaymentModule } from "../payment/payment.module";

import { ConsultantAvailabilityService } from "./consultant-availability.service";
import { ConsultantMatchingService } from "./consultant-matching.service";
import { ConsultantReviewService } from "./consultant-review.service";
import { ConsultantController } from "./consultant.controller";
import { ConsultantService } from "./consultant.service";

@Module({
  imports: [PrismaModule, PaymentModule],
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
