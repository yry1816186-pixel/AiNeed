/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from "@nestjs/common";

import { CircuitBreakerModule } from "../../../common/circuit-breaker";
import { PrismaModule } from "../../../common/prisma/prisma.module";
import { RedisModule } from "../../../common/redis/redis.module";
import { AIModule } from "../ai/ai.module";
import { PhotosModule } from "../photos/photos.module";
import { RecommendationsModule } from "../../platform/recommendations/recommendations.module";
import { WeatherModule } from "../../fashion/weather/weather.module";

import { AgentToolsService } from "./agent-tools.service";
import { AiStylistController } from "./ai-stylist.controller";
import { AiStylistService } from "./ai-stylist.service";
import { DecisionEngineService } from "./decision-engine.service";
import { LlmProviderService } from "./llm-provider.service";
import { NlSlotExtractorService } from "./nl-slot-extractor.service";
import { AiStylistChatService } from "./services/chat.service";
import { AiStylistContextService } from "./services/context.service";
import { ItemReplacementService } from "./services/item-replacement.service";
import { OutfitPlanService } from "./services/outfit-plan.service";
import { PresetQuestionsService } from "./services/preset-questions.service";
import { ProfileEventSubscriberService } from "./services/profile-event-subscriber.service";
import { AiStylistRecommendationService } from "./services/recommendation.service";
import { SessionArchiveService } from "./services/session-archive.service";
import { AiStylistSessionService } from "./services/session.service";
import { WeatherIntegrationService } from "./services/weather-integration.service";
import { SystemContextService } from "./system-context.service";

@Module({
  imports: [RecommendationsModule, PhotosModule, AIModule, RedisModule, CircuitBreakerModule, PrismaModule, WeatherModule],
  controllers: [AiStylistController],
  providers: [
    AiStylistService,
    AiStylistSessionService,
    AiStylistChatService,
    AiStylistContextService,
    AiStylistRecommendationService,
    ProfileEventSubscriberService,
    AgentToolsService,
    DecisionEngineService,
    LlmProviderService,
    NlSlotExtractorService,
    SystemContextService,
    OutfitPlanService,
    ItemReplacementService,
    SessionArchiveService,
    PresetQuestionsService,
    WeatherIntegrationService,
  ],
  exports: [
    AiStylistService,
    AiStylistSessionService,
    AiStylistChatService,
    AiStylistContextService,
    AiStylistRecommendationService,
    AgentToolsService,
    DecisionEngineService,
    LlmProviderService,
    SystemContextService,
    OutfitPlanService,
    ItemReplacementService,
    SessionArchiveService,
    PresetQuestionsService,
    WeatherIntegrationService,
  ],
})
export class AiStylistModule {}
