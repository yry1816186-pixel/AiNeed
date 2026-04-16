/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from "@nestjs/common";

import { ClothingModule } from "./clothing/clothing.module";
import { BrandsModule } from "./brands/brands.module";
import { SearchModule } from "./search/search.module";
import { WeatherModule } from "./weather/weather.module";
import { StyleAssessmentModule } from "./style-assessment/style-assessment.module";
import { WardrobeModule } from "./wardrobe/wardrobe.module";

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
