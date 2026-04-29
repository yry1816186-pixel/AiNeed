import { Module } from "@nestjs/common";

import { CircuitBreakerModule } from "../../../common/circuit-breaker";
import { PrismaModule } from "../../../common/prisma/prisma.module";
import { RedisModule } from "../../../common/redis/redis.module";
import { WeatherModule } from "../../fashion/weather/weather.module";
import { RecommendationsModule } from "../../platform/recommendations/recommendations.module";
import { AIModule } from "../ai/ai.module";
import { PhotosModule } from "../photos/photos.module";

import { AgentToolsService } from "./agent-tools.service";
import { AiStylistController } from "./ai-stylist.controller";
import { AiStylistService } from "./ai-stylist.service";
import { BodyPositiveFilter } from "./body-positive.filter";
import { CalendarPlanController } from "./calendar-plan.controller";
import { CalendarPlanService } from "./services/calendar-plan.service";
import { DecisionEngineService } from "./decision-engine.service";
import { DialogStateService } from "./dialog-state.service";
import { LlmProviderService } from "./llm-provider.service";
import { NlSlotExtractorService } from "./nl-slot-extractor.service";
import { AiFallbackService } from "./services/ai-fallback.service";
import { AiStylistChatService } from "./services/chat.service";
import { AiStylistContextService } from "./services/context.service";
import { ItemReplacementService } from "./services/item-replacement.service";
import { OutfitPlanService } from "./services/outfit-plan.service";
import { PresetQuestionsService } from "./services/preset-questions.service";
import { ProfileEventSubscriberService } from "./services/profile-event-subscriber.service";
import { AiStylistRecommendationService } from "./services/recommendation.service";
import { SessionArchiveService } from "./services/session-archive.service";
import { AiStylistSessionService } from "./services/session.service";
import { TtsFallbackService } from "./services/tts-fallback.service";
import { WeatherIntegrationService } from "./services/weather-integration.service";
import { SystemContextService } from "./system-context.service";
import { EdgeTTSService } from "./tts.service";

@Module({
  imports: [
    RecommendationsModule,
    PhotosModule,
    AIModule,
    RedisModule,
    CircuitBreakerModule,
    PrismaModule,
    WeatherModule,
  ],
  controllers: [AiStylistController, CalendarPlanController],
  providers: [
    AiStylistService,
    CalendarPlanService,
    AiStylistSessionService,
    AiStylistChatService,
    AiStylistContextService,
    AiStylistRecommendationService,
    ProfileEventSubscriberService,
    AgentToolsService,
    BodyPositiveFilter,
    DecisionEngineService,
    DialogStateService,
    LlmProviderService,
    NlSlotExtractorService,
    SystemContextService,
    OutfitPlanService,
    ItemReplacementService,
    SessionArchiveService,
    PresetQuestionsService,
    WeatherIntegrationService,
    AiFallbackService,
    TtsFallbackService,
    EdgeTTSService,
  ],
  providers: [
    AiStylistService,
    CalendarPlanService,
    AiStylistSessionService,
    AiStylistChatService,
    AiStylistContextService,
    AiStylistRecommendationService,
    ProfileEventSubscriberService,
    AgentToolsService,
    BodyPositiveFilter,
    DecisionEngineService,
    DialogStateService,
    LlmProviderService,
    NlSlotExtractorService,
    SystemContextService,
    OutfitPlanService,
    ItemReplacementService,
    SessionArchiveService,
    PresetQuestionsService,
    WeatherIntegrationService,
    AiFallbackService,
    TtsFallbackService,
  ],
  exports: [
    AiStylistService,
    AiStylistSessionService,
    AiStylistChatService,
    AiStylistContextService,
    AiStylistRecommendationService,
    AgentToolsService,
    BodyPositiveFilter,
    DecisionEngineService,
    DialogStateService,
    LlmProviderService,
    SystemContextService,
    OutfitPlanService,
    ItemReplacementService,
    SessionArchiveService,
    PresetQuestionsService,
    WeatherIntegrationService,
    AiFallbackService,
    TtsFallbackService,
  ],
  exports: [
    AiStylistService,
    AiStylistSessionService,
    AiStylistChatService,
    AiStylistContextService,
    AiStylistRecommendationService,
    AgentToolsService,
    BodyPositiveFilter,
    DecisionEngineService,
    DialogStateService,
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
