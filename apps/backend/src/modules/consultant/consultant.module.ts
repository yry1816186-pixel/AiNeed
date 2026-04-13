import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";

import { ConsultantController } from "./consultant.controller";
import { ConsultantService } from "./consultant.service";

@Module({
  imports: [PrismaModule],
  controllers: [ConsultantController],
  providers: [ConsultantService],
  exports: [ConsultantService],
})
export class ConsultantModule {}
