import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { Glm5Provider } from './providers/glm5.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { MockProvider } from './providers/mock.provider';

@Module({
  providers: [LlmService, Glm5Provider, DeepSeekProvider, MockProvider],
  exports: [LlmService],
})
export class LlmModule {}
