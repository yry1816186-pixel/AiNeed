import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { CuratedWardrobeService } from "./curated-wardrobe.service";
import { WardrobeCollectionModule } from "./collection/wardrobe-collection.module";
import { FavoritesModule } from "./favorites/favorites.module";
import { WardrobeController } from "./wardrobe.controller";
import { WardrobeService } from "./wardrobe.service";

@Module({
  imports: [PrismaModule, WardrobeCollectionModule, FavoritesModule],
  controllers: [WardrobeController],
  providers: [WardrobeService, CuratedWardrobeService],
  exports: [WardrobeCollectionModule, FavoritesModule, CuratedWardrobeService],
})
export class WardrobeModule {}
