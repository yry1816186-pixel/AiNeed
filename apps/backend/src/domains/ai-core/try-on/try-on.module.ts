/* eslint-disable @typescript-eslint/no-explicit-any */
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { GatewayModule } from "../../../common/gateway/gateway.module";
import { LoggingModule } from "../../../common/logging/logging.module";
import { StorageModule } from "../../../common/storage/storage.module";
import { QueueModule } from "../../platform/queue/queue.module";
import { QueueName } from "../../platform/queue/queue-config";

import { DoubaoSeedreamProvider } from "./services/doubao-seedream.provider";
import { GlmTryOnProvider } from "./services/glm-tryon.provider";
import { LocalPreviewTryOnProvider } from "./services/local-preview.provider";
import { TryOnOrchestratorService } from "./services/tryon-orchestrator.service";
import { TryOnController } from "./try-on.controller";
import { TryOnService } from "./try-on.service";
import { VirtualTryOnProcessor } from "./virtual-tryon.processor";

@Module({
  imports: [
    ConfigModule,
    StorageModule,
    LoggingModule,
    GatewayModule,
    QueueModule,
    BullModule.registerQueue({ name: QueueName.VIRTUAL_TRYON }),
  ],
  controllers: [TryOnController],
  providers: [
    TryOnService,
    TryOnOrchestratorService,
    DoubaoSeedreamProvider,
    GlmTryOnProvider,
    LocalPreviewTryOnProvider,
    VirtualTryOnProcessor,
  ],
  exports: [TryOnService, TryOnOrchestratorService],
})
export class TryOnModule {}
