/**
 * Recommendations Module - Refactored Architecture
 *
 * This module is organized into submodules by algorithm type:
 * - CollaborativeSubmodule: User behavior-based algorithms
 * - ContentSubmodule: Item attribute-based algorithms
 * - KnowledgeSubmodule: Knowledge graph and theory-based algorithms
 *
 * The RecommendationOrchestrator provides a unified facade for all operations.
 *
 * CIRCULAR DEPENDENCY RESOLVED:
 * Previously had forwardRef(() => AiStylistModule) which created a circular dependency.
 * RecommendationExplainerService now uses its own GLM API client instead of
 * injecting LlmProviderService from AiStylistModule, eliminating the need for
 * AiStylistModule import entirely.
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { RedisModule } from "../../../common/redis/redis.module";
import { AIModule } from "../../ai-core/ai/ai.module";
import { CacheModule } from "../../../modules/cache/cache.module";

import { RecommendationOrchestrator } from "./orchestrator";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";
import { AdvancedRecommendationService } from "./services/advanced-recommendation.service";
import { BehaviorTrackingService } from "./services/behavior-tracking.service";
import { Neo4jService } from "./services/neo4j.service";
import { OutfitCompletionService } from "./services/outfit-completion.service";
import { ProfileEventSubscriberService } from "./services/profile-event-subscriber.service";
import { QdrantService } from "./services/qdrant.service";
import { RecommendationCacheService } from "./services/recommendation-cache.service";
import { RecommendationExplainerService } from "./services/recommendation-explainer.service";
import { RecommendationFeedService } from "./services/recommendation-feed.service";
import { SASRecClientService } from "./services/sasrec-client.service";
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
    // Explainer
    RecommendationExplainerService,
    // Outfit completion
    OutfitCompletionService,
    // Behavior tracking
    BehaviorTrackingService,
    // Profile event subscriber
    ProfileEventSubscriberService,
    // Neo4j knowledge graph
    Neo4jService,
    // Vector search
    QdrantService,
    // Recommendation cache
    RecommendationCacheService,
    // SASRec client
    SASRecClientService,
    // Feed service
    RecommendationFeedService,
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
    // Outfit completion
    OutfitCompletionService,
    // Behavior tracking
    BehaviorTrackingService,
    // Neo4j knowledge graph
    Neo4jService,
    // Vector search
    QdrantService,
    // Recommendation cache
    RecommendationCacheService,
    // SASRec client
    SASRecClientService,
    // Feed service
    RecommendationFeedService,
  ],
})
export class RecommendationsModule {}
