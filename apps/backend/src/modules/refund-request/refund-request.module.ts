import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { PaymentModule } from "../payment/payment.module";

import { RefundRequestController } from "./refund-request.controller";
import { RefundRequestService } from "./refund-request.service";

@Module({
  imports: [PrismaModule, forwardRef(() => PaymentModule)],
  controllers: [RefundRequestController],
  providers: [RefundRequestService],
  exports: [RefundRequestService],
})
export class RefundRequestModule {}
