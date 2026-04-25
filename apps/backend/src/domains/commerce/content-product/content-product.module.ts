import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { PaymentModule } from "../payment/payment.module";
import { SubscriptionModule } from "../subscription/subscription.module";

import { ContentProductController } from "./content-product.controller";
import { ContentProductService } from "./content-product.service";

@Module({
  imports: [PaymentModule, PrismaModule, SubscriptionModule],
  controllers: [ContentProductController],
  providers: [ContentProductService],
  exports: [ContentProductService],
})
export class ContentProductModule {}
