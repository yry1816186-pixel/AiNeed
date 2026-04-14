import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UrlsConfig {
  constructor(private configService: ConfigService) {}

  get backendUrl(): string {
    return this.configService.get<string>('BACKEND_URL', 'http://localhost:3001');
  }

  get frontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  get aiServiceUrl(): string {
    return this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8001');
  }

  get virtualTryonUrl(): string {
    return this.configService.get<string>('VIRTUAL_TRYON_URL', 'http://localhost:8002');
  }

  get redisUrl(): string {
    return this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
  }

  get qdrantUrl(): string {
    return this.configService.get<string>('QDRANT_URL', 'http://localhost:6333');
  }

  get minioUrl(): string {
    return this.configService.get<string>('MINIO_ENDPOINT', 'localhost:9000');
  }

  get wechatNotifyUrl(): string {
    return `${this.backendUrl}/api/v1/payment/callback/wechat`;
  }

  get alipayNotifyUrl(): string {
    return `${this.backendUrl}/api/v1/payment/callback/alipay`;
  }

  getPasswordResetUrl(token: string): string {
    return `${this.frontendUrl}/reset-password?token=${token}`;
  }

  get corsOrigins(): string[] {
    const origins = this.configService.get<string>('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001');
    return origins.split(',').map(o => o.trim());
  }

  get allowedImageDomains(): string[] {
    return [
      'localhost:3000',
      'localhost:3001',
      'localhost:9000',
      this.configService.get<string>('MINIO_ENDPOINT', 'localhost:9000'),
    ];
  }
}
