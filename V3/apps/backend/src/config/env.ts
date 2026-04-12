import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsString()
  MINIO_ENDPOINT!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  MINIO_PORT!: number;

  @IsString()
  MINIO_ACCESS_KEY!: string;

  @IsString()
  MINIO_SECRET_KEY!: string;

  @IsString()
  MINIO_BUCKET!: string;

  @IsString()
  @IsOptional()
  ZHIPU_API_KEY!: string;

  @IsString()
  @IsOptional()
  ZHIPU_MODEL!: string;

  @IsString()
  @IsOptional()
  DEEPSEEK_API_KEY!: string;

  @IsString()
  @IsOptional()
  SMS_PROVIDER!: string;

  @IsString()
  @IsOptional()
  ALIYUN_SMS_ACCESS_KEY!: string;

  @IsString()
  @IsOptional()
  ALIYUN_SMS_SECRET_KEY!: string;

  @IsString()
  @IsOptional()
  ALIYUN_SMS_SIGN_NAME!: string;

  @IsString()
  @IsOptional()
  ALIYUN_SMS_TEMPLATE_CODE!: string;

  @IsString()
  @IsOptional()
  QDRANT_URL!: string;

  @IsString()
  @IsOptional()
  EMBEDDING_SERVICE_URL: string = 'http://localhost:8003';

  @IsString()
  @IsOptional()
  EMBEDDING_MODEL: string = 'bge-m3';

  @IsString()
  @IsOptional()
  NEO4J_URL!: string;

  @IsString()
  @IsOptional()
  NEO4J_USER!: string;

  @IsString()
  @IsOptional()
  NEO4J_PASSWORD!: string;

  @IsString()
  @IsOptional()
  ELASTICSEARCH_URL!: string;

  @IsInt()
  @IsOptional()
  APP_PORT!: number;

  @IsString()
  @IsOptional()
  APP_ENV!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN!: string;

  @IsInt()
  @IsOptional()
  RATE_LIMIT_TTL!: number;

  @IsInt()
  @IsOptional()
  RATE_LIMIT_MAX!: number;
}

const WEAK_SECRETS = new Set([
  'your-256-bit-secret-change-in-production',
  'your-jwt-secret-change-in-production',
  'secret',
  'password',
  'changeme',
  'jwt-secret',
  'my-secret',
]);

function validateSecretStrength(key: string, value: string, env: string): void {
  if (WEAK_SECRETS.has(value.toLowerCase())) {
    if (env === 'production') {
      throw new Error(
        `SECURITY: ${key} uses a known weak default value. This is not allowed in production.`,
      );
    }
    logger.warn(
      `WARNING: ${key} uses a weak default value. Change it before deploying to production.`,
    );
  }
  if (value.length < 32 && env === 'production') {
    throw new Error(
      `SECURITY: ${key} must be at least 32 characters in production. Current length: ${value.length}`,
    );
  }
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = new EnvironmentVariables();
  const requiredKeys: (keyof EnvironmentVariables)[] = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'MINIO_ENDPOINT',
    'MINIO_PORT',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'MINIO_BUCKET',
  ];

  for (const key of requiredKeys) {
    if (config[key] === undefined || config[key] === null || config[key] === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    (validatedConfig as unknown as Record<string, unknown>)[key] = config[key];
  }

  const env = String(config.APP_ENV || config.NODE_ENV || 'development');
  validateSecretStrength('JWT_SECRET', String(config.JWT_SECRET || ''), env);

  const optionalKeys: (keyof EnvironmentVariables)[] = [
    'ZHIPU_API_KEY',
    'ZHIPU_MODEL',
    'DEEPSEEK_API_KEY',
    'SMS_PROVIDER',
    'ALIYUN_SMS_ACCESS_KEY',
    'ALIYUN_SMS_SECRET_KEY',
    'ALIYUN_SMS_SIGN_NAME',
    'ALIYUN_SMS_TEMPLATE_CODE',
    'QDRANT_URL',
    'EMBEDDING_SERVICE_URL',
    'EMBEDDING_MODEL',
    'NEO4J_URL',
    'NEO4J_USER',
    'NEO4J_PASSWORD',
    'ELASTICSEARCH_URL',
    'APP_PORT',
    'APP_ENV',
    'CORS_ORIGIN',
    'RATE_LIMIT_TTL',
    'RATE_LIMIT_MAX',
  ];

  for (const key of optionalKeys) {
    if (config[key] !== undefined && config[key] !== null) {
      (validatedConfig as unknown as Record<string, unknown>)[key] = config[key];
    }
  }

  validatedConfig.APP_PORT = Number(validatedConfig.APP_PORT) || 3001;
  validatedConfig.APP_ENV = validatedConfig.APP_ENV || 'development';
  validatedConfig.CORS_ORIGIN = validatedConfig.CORS_ORIGIN || 'http://localhost:3000';
  validatedConfig.RATE_LIMIT_TTL = Number(validatedConfig.RATE_LIMIT_TTL) || 60;
  validatedConfig.RATE_LIMIT_MAX = Number(validatedConfig.RATE_LIMIT_MAX) || 100;
  validatedConfig.QDRANT_URL = validatedConfig.QDRANT_URL || 'http://localhost:6333';
  validatedConfig.EMBEDDING_SERVICE_URL = validatedConfig.EMBEDDING_SERVICE_URL || 'http://localhost:8003';
  validatedConfig.EMBEDDING_MODEL = validatedConfig.EMBEDDING_MODEL || 'bge-m3';

  if (validatedConfig.CORS_ORIGIN === '*' && env === 'production') {
    throw new Error(
      'SECURITY: CORS_ORIGIN=* is not allowed in production. Specify allowed origins.',
    );
  }

  return validatedConfig;
}
