import { Module, forwardRef } from "@nestjs/common";

import { EncryptionModule } from "../../common/encryption/encryption.module";
import { PrismaModule } from "../../common/prisma/prisma.module";

import { BrandPortalModule } from "./brand-portal/brand-portal.module";
import { BrandsController } from "./brands.controller";
import { BrandsService } from "./brands.service";

@Module({
  imports: [
    PrismaModule,
    EncryptionModule,
    forwardRef(() => BrandPortalModule),
  ],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
