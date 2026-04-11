import { Module, OnModuleInit } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

import { PaymentEventListener } from "./listeners/payment-event.listener";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuthModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PaymentEventListener],
  exports: [SubscriptionService],
})
export class SubscriptionModule implements OnModuleInit {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async onModuleInit() {
    // 初始化默认会员计划
    await this.subscriptionService.initializePlans();
  }
}
