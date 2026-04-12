import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { GatewayModule } from "../../common/gateway/gateway.module";
import { LoggingModule } from "../../common/logging/logging.module";
import { StorageModule } from "../../common/storage/storage.module";
import { QueueModule } from "../queue/queue.module";

import { CloudTryOnProvider } from "./services/cloud-tryon.provider";
import { LocalPreviewTryOnProvider } from "./services/local-preview.provider";
import { TryOnOrchestratorService } from "./services/tryon-orchestrator.service";
import { TryOnController } from "./try-on.controller";
import { TryOnService } from "./try-on.service";

@Module({
  imports: [
    ConfigModule,
    StorageModule,
    LoggingModule,
    forwardRef(() => GatewayModule),
    forwardRef(() => QueueModule),
  ],
  controllers: [TryOnController],
  providers: [
    TryOnService,
    TryOnOrchestratorService,
    CloudTryOnProvider,
    LocalPreviewTryOnProvider,
  ],
  exports: [TryOnService, TryOnOrchestratorService],
})
export class TryOnModule {}
