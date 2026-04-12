import { Module } from '@nestjs/common';
import { OutfitImageController } from './outfit-image.controller';
import { OutfitImageService } from './outfit-image.service';
import { LlmModule } from '../stylist/services/llm.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [LlmModule, UploadModule],
  controllers: [OutfitImageController],
  providers: [OutfitImageService],
  exports: [OutfitImageService],
})
export class OutfitImageModule {}
