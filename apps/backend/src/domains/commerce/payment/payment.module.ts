/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { RedisModule } from "../../../common/redis/redis.module";

import { SubscriptionRenewalListener } from "./listeners/subscription-renewal.listener";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { AlipayProvider } from "./providers/alipay.provider";
import { WechatProvider } from "./providers/wechat.provider";


@Module({
  imports: [ConfigModule, EventEmitterModule, ScheduleModule.forRoot(), PrismaModule, RedisModule],
  controllers: [PaymentController],
  providers: [PaymentService, AlipayProvider, WechatProvider, SubscriptionRenewalListener],
  exports: [PaymentService],
})
export class PaymentModule {}
