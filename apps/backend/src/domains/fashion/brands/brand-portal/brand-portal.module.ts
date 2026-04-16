/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from "@nestjs/common";

import { EncryptionModule } from "../../../../common/encryption/encryption.module";
import { PrismaModule } from "../../../../common/prisma/prisma.module";

import { BrandsService } from "../brands.service";

import { BrandPortalController } from "./brand-portal.controller";
import { BrandPortalService } from "./brand-portal.service";

@Module({
  imports: [PrismaModule, EncryptionModule],
  controllers: [BrandPortalController],
  providers: [BrandPortalService, BrandsService],
  exports: [BrandPortalService],
})
export class BrandPortalModule {}
