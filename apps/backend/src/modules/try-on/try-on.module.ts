import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { StorageModule } from "../../common/storage/storage.module";
import { CatVTONProvider } from "./services/catvton.provider";
import { DiffusionTryOnService } from "./services/diffusion-tryon.service";
import { IDMVTONProvider } from "./services/idm-vton.provider";
import { IDMVTONService } from "./services/idm-vton.service";
import { KolorsProvider } from "./services/kolors.provider";
import { LocalPreviewTryOnProvider } from "./services/local-preview.provider";
import { TryOnOrchestratorService } from "./services/tryon-orchestrator.service";
import { TryOnController } from "./try-on.controller";
import { TryOnService } from "./try-on.service";

@Module({
  imports: [ConfigModule, StorageModule],
  controllers: [TryOnController],
  providers: [
    TryOnService,
    TryOnOrchestratorService,
    CatVTONProvider,
    KolorsProvider,
    LocalPreviewTryOnProvider,
    DiffusionTryOnService,
    IDMVTONProvider,
    IDMVTONService,
  ],
  exports: [
    TryOnService,
    TryOnOrchestratorService,
    DiffusionTryOnService,
    IDMVTONService,
  ],
})
export class TryOnModule {}
