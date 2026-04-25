import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { PaymentModule } from "../payment/payment.module";
import { SubscriptionModule } from "../subscription/subscription.module";

import { CAPSULE_WARDROBE_QUEUE, CapsuleWardrobeProcessor } from "./capsule-wardrobe.processor";
import { ContentProductController } from "./content-product.controller";
import { ContentProductService } from "./content-product.service";

@Module({
  imports: [
    PaymentModule,
    PrismaModule,
    SubscriptionModule,
    BullModule.registerQueue({
      name: CAPSULE_WARDROBE_QUEUE,
    }),
  ],
  controllers: [ContentProductController],
  providers: [ContentProductService, CapsuleWardrobeProcessor],
  exports: [ContentProductService],
})
export class ContentProductModule {}
