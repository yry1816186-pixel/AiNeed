import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";

import { CustomizationController } from "./customization.controller";
import { CustomizationService } from "./customization.service";
import { PODService } from "./pod/pod-service";

@Module({
  imports: [PrismaModule],
  controllers: [CustomizationController],
  providers: [CustomizationService, PODService],
  exports: [CustomizationService],
})
export class CustomizationModule {}
