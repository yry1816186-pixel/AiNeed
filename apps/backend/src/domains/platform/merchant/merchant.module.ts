import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../../../../common/prisma/prisma.module";

import { MerchantController } from "./merchant.controller";
import { MerchantAuthGuard } from "./guards/merchant-auth.guard";
import { MerchantService } from "./merchant.service";

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [MerchantController],
  providers: [MerchantService, MerchantAuthGuard],
  exports: [MerchantService],
})
export class MerchantModule {}
