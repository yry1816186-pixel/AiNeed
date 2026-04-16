/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { AuthModule } from "../../../domains/identity/auth/auth.module";

import { AddressController } from "./address.controller";
import { AddressService } from "./address.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
