/**
 * Content-Based Filtering Submodule
 * Handles content-based recommendations:
 * - Vector similarity
 * - Color matching
 * - Multimodal fusion
 * - Transformer encoder
 * - SASRec (Self-Attentive Sequential Recommendation)
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../../../common/prisma/prisma.module";
import { AIModule } from "../../../ai/ai.module";
import { ColorMatchingService } from "../../services/color-matching.service";
import { MultimodalFusionService } from "../../services/multimodal-fusion.service";
import { SASRecService } from "../../services/sasrec.service";
import { TransformerEncoderService } from "../../services/transformer-encoder.service";
import { VectorSimilarityService } from "../../services/vector-similarity.service";

@Module({
  imports: [ConfigModule, PrismaModule, AIModule],
  providers: [
    VectorSimilarityService,
    ColorMatchingService,
    MultimodalFusionService,
    TransformerEncoderService,
    SASRecService,
  ],
  exports: [
    VectorSimilarityService,
    ColorMatchingService,
    MultimodalFusionService,
    TransformerEncoderService,
    SASRecService,
  ],
})
export class ContentSubmodule {}
