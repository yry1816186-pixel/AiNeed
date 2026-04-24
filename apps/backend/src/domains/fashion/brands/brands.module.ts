import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { EncryptionModule } from "../../../common/encryption/encryption.module";
import { PrismaModule } from "../../../common/prisma/prisma.module";

import { BrandPortalModule } from "./brand-portal/brand-portal.module";
import { BrandsController } from "./brands.controller";
import { BrandsService } from "./brands.service";

@Module({
  imports: [PrismaModule, EncryptionModule, BrandPortalModule, JwtModule.register({})],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
