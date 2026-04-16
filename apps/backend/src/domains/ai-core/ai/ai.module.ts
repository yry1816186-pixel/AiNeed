/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../../common/prisma/prisma.module";

import { AIController } from "./ai.controller";
import { AIIntegrationService } from "./services/ai-integration.service";
import { CloudCommunicationService } from "./services/cloud-communication.service";
import { StyleUnderstandingService } from "./services/style-understanding.service";

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AIController],
  providers: [
    AIIntegrationService,
    CloudCommunicationService,
    StyleUnderstandingService,
  ],
  exports: [
    AIIntegrationService,
    CloudCommunicationService,
    StyleUnderstandingService,
  ],
})
export class AIModule {}
