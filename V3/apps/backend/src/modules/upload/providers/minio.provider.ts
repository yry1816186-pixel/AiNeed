import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import {
  IStorageProvider,
  StorageUploadResult,
} from './storage-provider.interface';

@Injectable()
export class MinioProvider implements IStorageProvider, OnModuleInit {
  private readonly logger = new Logger(MinioProvider.name);
  private client: Minio.Client;
  private bucket: string;
  private endpoint: string;
  private port: number;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    this.port = this.configService.get<number>('MINIO_PORT', 9000);
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'aineed-uploads');

    this.client = new Minio.Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: false,
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  async onModuleInit(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created bucket: ${this.bucket}`);
    }
  }

  async upload(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<StorageUploadResult> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    return {
      url: this.getUrl(key),
      key,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  getUrl(key: string): string {
    return `http://${this.endpoint}:${this.port}/${this.bucket}/${key}`;
  }
}
