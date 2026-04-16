import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { RecommendationsModule } from "../../platform/recommendations/recommendations.module";

import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { AIImageService } from "./services/ai-image.service";
import { VisualSearchService } from "./services/visual-search.service";

@Module({
  imports: [PrismaModule, RecommendationsModule],
  controllers: [SearchController],
  providers: [SearchService, VisualSearchService, AIImageService],
  exports: [SearchService, VisualSearchService, AIImageService],
})
export class SearchModule {}
