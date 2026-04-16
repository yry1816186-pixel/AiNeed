import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { MalwareScannerService } from '../../../common/security/malware-scanner.service";
import { OnboardingModule } from '../../../domains/identity/onboarding/onboarding.module";
import { QueueModule } from '../../../domains/platform/queue/queue.module";

import { PhotoQualityController } from "./photo-quality.controller";
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
import { PhotoQualityValidator } from "./services/photo-quality-validator.service";
import { PhotoQualityService } from "./services/photo-quality.service";

@Module({
  imports: [ConfigModule, OnboardingModule, QueueModule],
  controllers: [PhotosController, PhotoQualityController],
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
    PhotoQualityService,
    PhotoQualityValidator,
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
    PhotoQualityService,
    PhotoQualityValidator,
  ],
})
export class PhotosModule {}
