/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { SoftDeleteModule } from "../../../common/soft-delete/soft-delete.module";
import { AuthModule } from "../../../domains/identity/auth/auth.module";
import { NotificationModule } from "../../../domains/platform/notification/notification.module";
import { PaymentModule } from "../payment/payment.module";

import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

@Module({
  imports: [PrismaModule, SoftDeleteModule, AuthModule, PaymentModule, NotificationModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
