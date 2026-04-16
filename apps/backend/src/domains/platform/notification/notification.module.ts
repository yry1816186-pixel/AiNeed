import { Module, forwardRef } from "@nestjs/common";

import { GatewayModule } from "../../../../common/gateway/gateway.module";
import { PrismaModule } from "../../../../common/prisma/prisma.module";

import { OrderEventNotificationListener } from "./listeners/order-event.listener";
import { PaymentNotificationListener } from "./listeners/payment-event.listener";
import { NotificationController } from "./notification.controller";
import { NotificationTemplateService } from "./services/notification-template.service";
import { NotificationService } from "./services/notification.service";
import { PushNotificationService } from "./services/push-notification.service";

@Module({
  imports: [PrismaModule, forwardRef(() => GatewayModule)],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationTemplateService,
    PushNotificationService,
    PaymentNotificationListener,
    OrderEventNotificationListener,
  ],
  exports: [NotificationService, NotificationTemplateService, PushNotificationService],
})
export class NotificationModule {}
