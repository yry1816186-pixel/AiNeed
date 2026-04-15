import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Type, Transform, plainToInstance } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  IsBoolean,
  validateSync as classValidateSync,
} from 'class-validator';

const logger = new Logger('EnvConfig');

export enum NodeEnv {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export class EnvironmentConfig {
  @IsEnum(NodeEnv)
  @Transform(({ value }) => value || 'development')
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10) || 3001)
  PORT: number = 3001;

  @IsString()
  @Transform(({ value }) => value || 'xuno-backend')
  SERVICE_NAME: string = 'xuno-backend';

  @IsString()
  @MinLength(1)
  DATABASE_URL: string = '';

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsString()
  @MinLength(64)
  JWT_SECRET: string = '';

  @IsOptional()
  @IsString()
  @MinLength(64)
  JWT_REFRESH_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  CSRF_SECRET?: string;

  @IsOptional()
  @IsString()
  @MinLength(64)
  ENCRYPTION_KEY?: string;

  @IsOptional()
  @IsString()
  MINIO_ENDPOINT?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  MINIO_PORT?: number;

  @IsOptional()
  @IsString()
  MINIO_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  MINIO_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  MINIO_BUCKET?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  MINIO_USE_SSL?: boolean;

  @IsOptional()
  @IsString()
  QDRANT_URL?: string;

  @IsOptional()
  @IsString()
  QDRANT_API_KEY?: string;

  @IsOptional()
  @IsString()
  AI_SERVICE_URL?: string;

  @IsOptional()
  @IsString()
  VIRTUAL_TRYON_URL?: string;

  @IsOptional()
  @IsString()
  BODY_ANALYSIS_SERVICE_URL?: string;

  @IsOptional()
  @IsString()
  GLM_API_KEY?: string;

  @IsOptional()
  @IsString()
  GLM_API_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  GLM_MODEL?: string;

  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsOptional()
  @IsString()
  OPENAI_API_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  OPENAI_MODEL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;

  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  TEST_ACCOUNT_ENABLED?: boolean;

  @IsOptional()
  @IsString()
  ALIPAY_APP_ID?: string;

  @IsOptional()
  @IsString()
  ALIPAY_PRIVATE_KEY?: string;

  @IsOptional()
  @IsString()
  ALIPAY_PUBLIC_KEY?: string;

  @IsOptional()
  @IsString()
  WECHAT_APP_ID?: string;

  @IsOptional()
  @IsString()
  WECHAT_MCH_ID?: string;

  @IsOptional()
  @IsString()
  WECHAT_API_KEY?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  config: EnvironmentConfig | null;
  errors: string[];
  warnings: string[];
}

function validateProductionConstraints(
  config: EnvironmentConfig,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.NODE_ENV !== NodeEnv.PRODUCTION) {
    return { errors, warnings };
  }

  if (config.JWT_SECRET.length < 64) {
    errors.push(
      `JWT_SECRET must be at least 64 characters in production (current: ${config.JWT_SECRET.length})`,
    );
  }

  if (config.JWT_REFRESH_SECRET && config.JWT_REFRESH_SECRET.length < 64) {
    errors.push(
      `JWT_REFRESH_SECRET must be at least 64 characters in production (current: ${config.JWT_REFRESH_SECRET.length})`,
    );
  }

  if (!config.CSRF_SECRET || config.CSRF_SECRET.length < 32) {
    errors.push('CSRF_SECRET must be at least 32 characters in production');
  }

  if (!config.ENCRYPTION_KEY || config.ENCRYPTION_KEY.length < 64) {
    errors.push('ENCRYPTION_KEY must be at least 64 characters in production');
  }

  if (config.DATABASE_URL.includes('postgres:postgres@')) {
    errors.push(
      'DATABASE_URL uses default postgres password - not allowed in production',
    );
  }

  if (config.DATABASE_URL.includes(':xuno-dev-postgres@')) {
    errors.push(
      'DATABASE_URL uses development password - not allowed in production',
    );
  }

  if (!config.REDIS_PASSWORD && config.REDIS_URL && !config.REDIS_URL.match(/:[^:@]+@/)) {
    errors.push('Redis must have a password configured in production');
  }

  if (
    config.MINIO_ACCESS_KEY === 'minioadmin' &&
    config.MINIO_SECRET_KEY === 'minioadmin'
  ) {
    errors.push(
      'MinIO is using default credentials (minioadmin:minioadmin) - not allowed in production',
    );
  }

  if (!config.MINIO_USE_SSL) {
    warnings.push('MinIO is not using SSL in production - consider enabling MINIO_USE_SSL');
  }

  if (!config.SENTRY_DSN) {
    warnings.push('SENTRY_DSN is not configured - error monitoring will be unavailable');
  }

  if (config.TEST_ACCOUNT_ENABLED) {
    errors.push('TEST_ACCOUNT_ENABLED must be false in production');
  }

  return { errors, warnings };
}

function validateDevelopmentWarnings(
  config: EnvironmentConfig,
): { warnings: string[] } {
  const warnings: string[] = [];

  if (config.NODE_ENV !== NodeEnv.DEVELOPMENT) {
    return { warnings };
  }

  if (!config.GLM_API_KEY && !config.OPENAI_API_KEY) {
    warnings.push(
      'No LLM API key configured (GLM_API_KEY, OPENAI_API_KEY) - AI features may not work',
    );
  }

  if (
    config.MINIO_ACCESS_KEY === 'minioadmin' &&
    config.MINIO_SECRET_KEY === 'minioadmin'
  ) {
    warnings.push('MinIO is using default credentials - consider changing for better security');
  }

  return { warnings };
}

export function validateConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): ConfigValidationResult {
  const config = plainToInstance(EnvironmentConfig, env, {
    enableImplicitConversion: true,
    excludeExtraneousValues: false,
  });

  const errors: string[] = [];
  const warnings: string[] = [];

  const validationErrors = classValidateSync(config, {
    skipMissingProperties: true,
    whitelist: false,
    forbidNonWhitelisted: false,
  });
  for (const error of validationErrors) {
    for (const [_constraintKey, constraintMsg] of Object.entries(
      error.constraints || {},
    )) {
      errors.push(`${error.property}: ${constraintMsg}`);
    }
  }

  const prodResult = validateProductionConstraints(config);
  errors.push(...prodResult.errors);
  warnings.push(...prodResult.warnings);

  const devResult = validateDevelopmentWarnings(config);
  warnings.push(...devResult.warnings);

  if (errors.length > 0) {
    logger.error('Environment config validation failed:');
    errors.forEach((err) => logger.error(`  - ${err}`));
  }

  if (warnings.length > 0) {
    logger.warn('Environment config validation warnings:');
    warnings.forEach((w) => logger.warn(`  - ${w}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    logger.log('Environment config validation passed');
  }

  return {
    valid: errors.length === 0,
    config: errors.length === 0 ? config : null,
    errors,
    warnings,
  };
}

export function createConfig() {
  return ConfigModule.forRoot({
    isGlobal: true,
    validate: (env: Record<string, string | undefined>) => {
      const result = validateConfig(env);

      if (!result.valid) {
        if (env.NODE_ENV === 'production') {
          throw new Error(
            `Environment validation failed:\n${result.errors.join('\n')}`,
          );
        }
        logger.warn(
          'Environment has validation errors - some features may not work correctly',
        );
      }

      return env;
    },
  });
}
