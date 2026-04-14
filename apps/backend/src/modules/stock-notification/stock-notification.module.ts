import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";

import { StockNotificationController } from "./stock-notification.controller";
import { StockNotificationService } from "./stock-notification.service";

@Module({
  imports: [PrismaModule],
  controllers: [StockNotificationController],
  providers: [StockNotificationService],
  exports: [StockNotificationService],
})
export class StockNotificationModule {}
