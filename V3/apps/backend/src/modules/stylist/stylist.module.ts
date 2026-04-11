import { Module } from '@nestjs/common';
import { StylistController } from './stylist.controller';
import { StylistService } from './stylist.service';
import { LlmModule } from './services/llm.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [LlmModule, KnowledgeModule],
  controllers: [StylistController],
  providers: [StylistService],
  exports: [StylistService],
})
export class StylistModule {}
