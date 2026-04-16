/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module, forwardRef } from "@nestjs/common";

import { GatewayModule } from "../../../common/gateway/gateway.module";
import { PrismaModule } from "../../../common/prisma/prisma.module";

import { OrderEventNotificationListener } from "./listeners/order-event.listener";
import { PaymentNotificationListener } from "./listeners/payment-event.listener";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./services/notification.service";
import { PushNotificationService } from "./services/push-notification.service";
import { StockNotificationModule } from "./stock/stock-notification.module";

@Module({
  imports: [PrismaModule, forwardRef(() => GatewayModule), StockNotificationModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationTemplateService,
    PushNotificationService,
    PaymentNotificationListener,
    OrderEventNotificationListener,
  ],
  exports: [NotificationService, NotificationTemplateService, PushNotificationService, StockNotificationModule],
})
export class NotificationModule {}
