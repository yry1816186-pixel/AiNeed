import { Module } from "@nestjs/common";

import { AIModule } from "./ai/ai.module";
import { AISafetyModule } from "./ai-safety/ai-safety.module";
import { AiStylistModule } from "./ai-stylist/ai-stylist.module";
import { PhotosModule } from "./photos/photos.module";
import { TryOnModule } from "./try-on/try-on.module";

@Module({
  imports: [AiStylistModule, TryOnModule, AIModule, AISafetyModule, PhotosModule],
  exports: [AiStylistModule, TryOnModule, AIModule, AISafetyModule, PhotosModule],
})
export class AiCoreModule {}
