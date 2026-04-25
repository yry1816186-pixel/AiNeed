import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { PrismaModule } from "../../../common/prisma/prisma.module";

import { StudioCommissionController } from "./studio-commission.controller";
import { StudioCommissionService } from "./studio-commission.service";

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: "commission-billing" })],
  controllers: [StudioCommissionController],
  providers: [StudioCommissionService],
  exports: [StudioCommissionService],
})
export class StudioCommissionModule {}
