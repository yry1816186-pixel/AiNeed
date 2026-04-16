import { Module } from '@nestjs/common';
import { AiStylistModule } from './ai-stylist/ai-stylist.module';
import { TryOnModule } from './try-on/try-on.module';
import { AIModule } from './ai/ai.module';
import { AISafetyModule } from './ai-safety/ai-safety.module';
import { PhotosModule } from './photos/photos.module';

@Module({
  imports: [AiStylistModule, TryOnModule, AIModule, AISafetyModule, PhotosModule],
  exports: [AiStylistModule, TryOnModule, AiModule, AiSafetyModule, PhotosModule],
})
export class AiCoreModule {}
