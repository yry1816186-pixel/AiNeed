import { Module } from "@nestjs/common";

import { WardrobeCollectionModule } from "./collection/wardrobe-collection.module";
import { FavoritesModule } from "./favorites/favorites.module";

@Module({
  imports: [WardrobeCollectionModule, FavoritesModule],
  exports: [WardrobeCollectionModule, FavoritesModule],
})
export class WardrobeModule {}
