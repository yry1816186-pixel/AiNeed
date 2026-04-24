import { Module } from "@nestjs/common";

import { BrandsModule } from "./brands/brands.module";
import { ClothingModule } from "./clothing/clothing.module";
import { SearchModule } from "./search/search.module";
import { StyleAssessmentModule } from "./style-assessment/style-assessment.module";
import { WardrobeModule } from "./wardrobe/wardrobe.module";
import { WeatherModule } from "./weather/weather.module";

@Module({
  imports: [
    ClothingModule,
    BrandsModule,
    SearchModule,
    WeatherModule,
    StyleAssessmentModule,
    WardrobeModule,
  ],
})
export class FashionModule {}
