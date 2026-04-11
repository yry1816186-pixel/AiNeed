import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { CacheModule } from "../cache/cache.module";

import { ClothingController } from "./clothing.controller";
import { ClothingService } from "./clothing.service";

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [ClothingController],
  providers: [ClothingService],
  exports: [ClothingService],
})
export class ClothingModule {}
