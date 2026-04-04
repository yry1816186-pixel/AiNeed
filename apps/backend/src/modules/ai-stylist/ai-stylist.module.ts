import { Module } from "@nestjs/common";

import { CircuitBreakerModule } from "../../common/circuit-breaker";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { RedisModule } from "../../common/redis/redis.module";
import { AIModule } from "../ai/ai.module";
import { PhotosModule } from "../photos/photos.module";
import { RecommendationsModule } from "../recommendations/recommendations.module";

import { AgentToolsService } from "./agent-tools.service";
import { AiStylistController } from "./ai-stylist.controller";
import { AiStylistService } from "./ai-stylist.service";
import { AiStylistSessionService } from "./services/session.service";
import { AiStylistChatService } from "./services/chat.service";
import { AiStylistContextService } from "./services/context.service";
import { AiStylistRecommendationService } from "./services/recommendation.service";
import { DecisionEngineService } from "./decision-engine.service";
import { LlmProviderService } from "./llm-provider.service";
import { NlSlotExtractorService } from "./nl-slot-extractor.service";
import { SystemContextService } from "./system-context.service";

@Module({
  imports: [RecommendationsModule, PhotosModule, AIModule, RedisModule, CircuitBreakerModule, PrismaModule],
  controllers: [AiStylistController],
  providers: [
    AiStylistService,
    AiStylistSessionService,
    AiStylistChatService,
    AiStylistContextService,
    AiStylistRecommendationService,
    AgentToolsService,
    DecisionEngineService,
    LlmProviderService,
    NlSlotExtractorService,
    SystemContextService,
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
  ],
})
export class AiStylistModule {}
