import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { RedisModule } from "../../common/redis/redis.module";

import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { AlipayProvider } from "./providers/alipay.provider";
import { WechatProvider } from "./providers/wechat.provider";


@Module({
  imports: [ConfigModule, EventEmitterModule, PrismaModule, RedisModule],
  controllers: [PaymentController],
  providers: [PaymentService, AlipayProvider, WechatProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
