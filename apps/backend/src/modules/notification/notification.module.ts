import { Module, forwardRef } from "@nestjs/common";

import { GatewayModule } from "../../common/gateway/gateway.module";
import { PrismaModule } from "../../common/prisma/prisma.module";

import { PaymentNotificationListener } from "./listeners/payment-event.listener";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./services/notification.service";

@Module({
  imports: [PrismaModule, forwardRef(() => GatewayModule)],
  controllers: [NotificationController],
  providers: [NotificationService, PaymentNotificationListener],
  exports: [NotificationService],
})
export class NotificationModule {}
