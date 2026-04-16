/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from '@nestjs/common';
import { AiStylistModule } from './ai-stylist/ai-stylist.module';
import { TryOnModule } from './try-on/try-on.module';
import { AiModule } from './ai/ai.module';
import { AiSafetyModule } from './ai-safety/ai-safety.module';
import { PhotosModule } from './photos/photos.module';

@Module({
  imports: [AiStylistModule, TryOnModule, AiModule, AiSafetyModule, PhotosModule],
  exports: [AiStylistModule, TryOnModule, AiModule, AiSafetyModule, PhotosModule],
})
export class AiCoreModule {}
