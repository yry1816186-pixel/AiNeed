/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../../common/prisma/prisma.module";

import { WardrobeCollectionController } from "./wardrobe-collection.controller";
import { WardrobeCollectionService } from "./wardrobe-collection.service";

@Module({
  imports: [PrismaModule],
  controllers: [WardrobeCollectionController],
  providers: [WardrobeCollectionService],
  exports: [WardrobeCollectionService],
})
export class WardrobeCollectionModule {}
