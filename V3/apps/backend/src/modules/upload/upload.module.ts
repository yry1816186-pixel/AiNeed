import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import {
  IStorageProvider,
  STORAGE_PROVIDER_TOKEN,
} from './providers/storage-provider.interface';
import { MinioProvider } from './providers/minio.provider';
import { LocalProvider } from './providers/local.provider';

const storageProviderFactory = {
  provide: STORAGE_PROVIDER_TOKEN,
  useFactory: (configService: ConfigService): IStorageProvider => {
    const env = configService.get<string>('APP_ENV', 'development');
    if (env === 'development') {
      const useMinio = configService.get<string>('MINIO_ENDPOINT');
      if (useMinio) {
        return new MinioProvider(configService);
      }
      return new LocalProvider();
    }
    return new MinioProvider(configService);
  },
  inject: [ConfigService],
};

@Module({
  controllers: [UploadController],
  providers: [UploadService, storageProviderFactory],
  exports: [UploadService],
})
export class UploadModule {}
