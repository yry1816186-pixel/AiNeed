import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingController } from './embedding.controller';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';
import {
  EMBEDDING_PROVIDER_TOKEN,
  IEmbeddingProvider,
} from './providers/embedding-provider.interface';
import { ApiEmbeddingProvider } from './providers/api-embedding.provider';
import { MockEmbeddingProvider } from './providers/mock-embedding.provider';

const EmbeddingProviderFactory = {
  provide: EMBEDDING_PROVIDER_TOKEN,
  useFactory: (configService: ConfigService): IEmbeddingProvider => {
    const env = configService.get<string>('APP_ENV') ?? 'development';
    if (env === 'development' || env === 'test') {
      return new MockEmbeddingProvider();
    }
    return new ApiEmbeddingProvider(configService);
  },
  inject: [ConfigService],
};

@Module({
  controllers: [EmbeddingController],
  providers: [EmbeddingService, QdrantService, EmbeddingProviderFactory],
  exports: [EmbeddingService, QdrantService],
})
export class EmbeddingModule {}
