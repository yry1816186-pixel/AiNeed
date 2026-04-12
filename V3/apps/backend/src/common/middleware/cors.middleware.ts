import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface CorsOriginConfig {
  development: string[];
  staging: string[];
  production: string[];
}

const CORS_ORIGINS: CorsOriginConfig = {
  development: ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:19006'],
  staging: ['https://staging.aineed.com', 'https://staging-app.aineed.com'],
  production: ['https://aineed.com', 'https://app.aineed.com'],
};

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const env = process.env.APP_ENV ?? 'development';
    const allowedOrigins = CORS_ORIGINS[env as keyof CorsOriginConfig] ?? CORS_ORIGINS.development;
    const origin = request.get('origin');

    if (origin && allowedOrigins.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      response.setHeader('Access-Control-Allow-Origin', '*');
    }

    response.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Max-Age', '86400');

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  }
}
