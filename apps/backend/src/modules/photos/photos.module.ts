import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { MalwareScannerService } from "../../common/security/malware-scanner.service";
import { PhotosController } from "./photos.controller";
import { PhotosService } from "./photos.service";
import { AccessoryRecommendationService } from "./services/accessory-recommendation.service";
import { AiAnalysisService } from "./services/ai-analysis.service";
import { BodyImageAnalysisService } from "./services/body-image-analysis.service";
import { BodyShapeAnalyzer } from "./services/body-shape-analyzer.service";
import { ColorSeasonAnalyzer } from "./services/color-season-analyzer.service";
import { FaceShapeAnalyzer } from "./services/face-shape-analyzer.service";
import { HairAnalysisService } from "./services/hair-analysis.service";
import { MakeupAnalysisService } from "./services/makeup-analysis.service";

@Module({
  imports: [ConfigModule],
  controllers: [PhotosController],
  providers: [
    PhotosService,
    MalwareScannerService,
    AiAnalysisService,
    BodyShapeAnalyzer,
    ColorSeasonAnalyzer,
    FaceShapeAnalyzer,
    MakeupAnalysisService,
    HairAnalysisService,
    AccessoryRecommendationService,
    BodyImageAnalysisService,
  ],
  exports: [
    PhotosService,
    AiAnalysisService,
    BodyShapeAnalyzer,
    ColorSeasonAnalyzer,
    FaceShapeAnalyzer,
    MakeupAnalysisService,
    HairAnalysisService,
    AccessoryRecommendationService,
    BodyImageAnalysisService,
  ],
})
export class PhotosModule {}
