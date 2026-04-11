/**
 * Recommendations Module - Refactored Architecture
 *
 * This module is organized into submodules by algorithm type:
 * - CollaborativeSubmodule: User behavior-based algorithms
 * - ContentSubmodule: Item attribute-based algorithms
 * - KnowledgeSubmodule: Knowledge graph and theory-based algorithms
 *
 * The RecommendationOrchestrator provides a unified facade for all operations.
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { RedisModule } from "../../common/redis/redis.module";
import { AIModule } from "../ai/ai.module";
import { CacheModule } from "../cache/cache.module";

import { RecommendationOrchestrator } from "./orchestrator";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";
import { AdvancedRecommendationService } from "./services/advanced-recommendation.service";
import { RecommendationExplainerService } from "./services/recommendation-explainer.service";
import { UnifiedRecommendationEngine } from "./services/unified-recommendation.engine";
import {
  CollaborativeSubmodule,
  ContentSubmodule,
  KnowledgeSubmodule,
} from "./submodules";

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AIModule,
    RedisModule,
    CacheModule,
    // Algorithm submodules
    CollaborativeSubmodule,
    ContentSubmodule,
    KnowledgeSubmodule,
  ],
  controllers: [RecommendationsController],
  providers: [
    // Facade
    RecommendationOrchestrator,
    // Main service (backwards compatible)
    RecommendationsService,
    // Advanced service
    AdvancedRecommendationService,
    // Unified engine
    UnifiedRecommendationEngine,
    // Explainer (not covered by submodules)
    RecommendationExplainerService,
  ],
  exports: [
    // Primary exports - use orchestrator for new code
    RecommendationOrchestrator,
    RecommendationsService,
    // Advanced exports
    AdvancedRecommendationService,
    UnifiedRecommendationEngine,
    // Explainer
    RecommendationExplainerService,
  ],
})
export class RecommendationsModule {}
