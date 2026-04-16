/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module, forwardRef } from "@nestjs/common";

import { BrandsModule } from "../brands.module";
import { BrandsService } from "../brands.service";

import { BrandPortalController } from "./brand-portal.controller";
import { BrandPortalService } from "./brand-portal.service";

@Module({
  imports: [forwardRef(() => BrandsModule)],
  controllers: [BrandPortalController],
  providers: [BrandPortalService, BrandsService],
  exports: [BrandPortalService],
})
export class BrandPortalModule {}
