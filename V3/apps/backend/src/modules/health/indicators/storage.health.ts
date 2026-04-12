import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageHealthIndicator extends HealthIndicator {
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'aineed');
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
      useSSL: false,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.minioClient.listBuckets();
      return this.getStatus(key, true, { bucket: this.bucket });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MinIO connection failed';
      throw new HealthCheckError(
        'StorageHealthCheck failed',
        this.getStatus(key, false, { message, bucket: this.bucket }),
      );
    }
  }
}
