/**
 * Environment Variable Validation
 *
 * This module provides validation for critical environment variables
 * to ensure security requirements are met before the application starts.
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');
type EnvConfig = Record<string, string | undefined>;

/**
 * Validation result for environment variables
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if running in production environment
 */
function isProduction(nodeEnv?: string): boolean {
  return nodeEnv === 'production';
}

/**
 * Validate JWT secret key strength
 */
function validateJwtSecret(
  secret: string | undefined,
  name: string,
  nodeEnv?: string,
): string[] {
  const errors: string[] = [];

  if (!secret) {
    errors.push(`${name} is not set`);
    return errors;
  }

  // Check for placeholder values
  const placeholderPatterns = [
    /your-.*-here/i,
    /<.*>/,
    /change.*production/i,
    /xuno-dev-secret/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(secret)) {
      errors.push(`${name} contains a placeholder value - please set a real secret`);
      return errors;
    }
  }

  // Production-specific validation
  if (isProduction(nodeEnv)) {
    if (secret.length < 64) {
      errors.push(`${name} must be at least 64 characters in production (current: ${secret.length})`);
    }

    // Check for weak patterns
    const weakPatterns = [
      /^[a-zA-Z0-9]{1,20}$/,  // Simple alphanumeric
      /^(password|secret|key|token)/i,  // Common prefixes
      /123456/,  // Sequential numbers
      /qwerty/i,  // Common patterns
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(secret)) {
        errors.push(`${name} appears to be weak or predictable in production`);
        break;
      }
    }
  }

  return errors;
}

/**
 * Validate database credentials
 */
function validateDatabaseCredentials(
  url: string | undefined,
  password: string | undefined,
  nodeEnv: string | undefined,
  warnings: string[],
): string[] {
  const errors: string[] = [];

  if (!url && !password) {
    errors.push('DATABASE_URL or POSTGRES_PASSWORD must be set');
    return errors;
  }

  // Check for placeholder values in URL
  if (url) {
    const placeholderPatterns = [
      /your-.*-here/i,
      /<.*>/,
    ];

    for (const pattern of placeholderPatterns) {
      if (pattern.test(url)) {
        errors.push('DATABASE_URL contains a placeholder value - please set real credentials');
        return errors;
      }
    }

    // Check for weak default credentials
    if (url.includes('postgres:postgres@')) {
      if (isProduction(nodeEnv)) {
        errors.push('DATABASE_URL uses default postgres password - not allowed in production');
      } else {
        warnings.push('DATABASE_URL uses default postgres password - consider using a stronger password');
      }
    }
  }

  // Check password placeholder
  if (password) {
    const placeholderPatterns = [
      /your-.*-here/i,
      /<.*>/,
    ];

    for (const pattern of placeholderPatterns) {
      if (pattern.test(password)) {
        errors.push('POSTGRES_PASSWORD contains a placeholder value - please set a real password');
        break;
      }
    }
  }

  return errors;
}

/**
 * Validate Redis configuration
 */
function validateRedisConfig(
  url: string | undefined,
  password: string | undefined,
  nodeEnv: string | undefined,
  warnings: string[],
): string[] {
  const errors: string[] = [];

  if (!url) {
    errors.push('REDIS_URL must be set');
    return errors;
  }

  // Check for placeholder values
  const placeholderPatterns = [
    /your-.*-here/i,
    /<.*>/,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(url)) {
      errors.push('REDIS_URL contains a placeholder value - please set real credentials');
      return errors;
    }
  }

  // Check if Redis has password
  const hasPasswordInUrl = url.includes(':@') === false && url.match(/:[^:@]+@/);
  const hasPassword = password || hasPasswordInUrl;

  if (isProduction(nodeEnv) && !hasPassword) {
    errors.push('Redis must have a password configured in production (set REDIS_PASSWORD or include in REDIS_URL)');
  } else if (!hasPassword) {
    warnings.push('Redis has no password configured - consider adding REDIS_PASSWORD for better security');
  }

  return errors;
}

/**
 * Validate MinIO/S3 credentials
 */
function validateStorageCredentials(
  accessKey: string | undefined,
  secretKey: string | undefined,
  nodeEnv: string | undefined,
  warnings: string[],
): string[] {
  const errors: string[] = [];

  // Check for placeholder values
  const placeholderPatterns = [
    /your-.*-here/i,
    /<.*>/,
  ];

  if (accessKey) {
    for (const pattern of placeholderPatterns) {
      if (pattern.test(accessKey)) {
        errors.push('MINIO_ACCESS_KEY contains a placeholder value - please set real credentials');
        return errors;
      }
    }
  }

  if (secretKey) {
    for (const pattern of placeholderPatterns) {
      if (pattern.test(secretKey)) {
        errors.push('MINIO_SECRET_KEY contains a placeholder value - please set real credentials');
        return errors;
      }
    }
  }

  // Check for default credentials
  if (accessKey === 'minioadmin' && secretKey === 'minioadmin') {
    if (isProduction(nodeEnv)) {
      errors.push('MinIO is using default credentials (minioadmin:minioadmin) - not allowed in production');
    } else {
      warnings.push('MinIO is using default credentials - consider changing for better security');
    }
  }

  return errors;
}

/**
 * Validate API keys (GLM, OpenAI, etc.)
 */
function validateApiKeys(env: EnvConfig, warnings: string[]): string[] {
  const errors: string[] = [];
  const glmApiKey = env.GLM_API_KEY;
  const openaiApiKey = env.OPENAI_API_KEY;
  const aiStylistApiKey = env.AI_STYLIST_API_KEY;

  // Check for placeholder values
  const placeholderPatterns = [
    /your-.*-here/i,
    /<.*>/,
  ];

  if (glmApiKey) {
    for (const pattern of placeholderPatterns) {
      if (pattern.test(glmApiKey)) {
        errors.push('GLM_API_KEY contains a placeholder value - please set a real API key or remove it');
        return errors;
      }
    }
  }

  if (openaiApiKey) {
    for (const pattern of placeholderPatterns) {
      if (pattern.test(openaiApiKey)) {
        warnings.push('OPENAI_API_KEY contains a placeholder value');
        break;
      }
    }
  }

  // At least one LLM API key should be configured
  if (!glmApiKey && !openaiApiKey && !aiStylistApiKey) {
    warnings.push('No LLM API key configured (GLM_API_KEY, OPENAI_API_KEY, or AI_STYLIST_API_KEY) - AI features may not work');
  }

  return errors;
}

/**
 * Main validation function - validates all critical environment variables
 */
export function validateEnvironment(env: EnvConfig = process.env): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeEnv = env.NODE_ENV;

  logger.log('Validating environment variables...');

  // Validate JWT secrets
  errors.push(...validateJwtSecret(env.JWT_SECRET, 'JWT_SECRET', nodeEnv));

  if (env.JWT_REFRESH_SECRET) {
    errors.push(...validateJwtSecret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET', nodeEnv));
  }

  // Validate CSRF secret
  errors.push(...validateJwtSecret(env.CSRF_SECRET, 'CSRF_SECRET', nodeEnv));

  // Validate database credentials
  errors.push(
    ...validateDatabaseCredentials(
      env.DATABASE_URL,
      env.POSTGRES_PASSWORD,
      nodeEnv,
      warnings,
    ),
  );

  // Validate Redis configuration
  errors.push(
    ...validateRedisConfig(
      env.REDIS_URL,
      env.REDIS_PASSWORD,
      nodeEnv,
      warnings,
    ),
  );

  // Validate storage credentials
  errors.push(
    ...validateStorageCredentials(
      env.MINIO_ACCESS_KEY,
      env.MINIO_SECRET_KEY,
      nodeEnv,
      warnings,
    ),
  );

  // Validate API keys
  errors.push(...validateApiKeys(env, warnings));

  // Log results
  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach(err => logger.error(`  - ${err}`));
  }

  if (warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    warnings.forEach(warn => logger.warn(`  - ${warn}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    logger.log('Environment validation passed');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * NestJS factory function for environment validation
 * Use this in app.module.ts to validate on startup
 */
export function envValidationFactory(config: Record<string, any>) {
  const result = validateEnvironment(config as EnvConfig);

  // In production, fail fast on errors
  if (isProduction(config.NODE_ENV) && !result.valid) {
    throw new Error(`Environment validation failed:\n${result.errors.join('\n')}`);
  }

  // In development, just warn
  if (!result.valid) {
    logger.warn('Environment has validation errors - some features may not work correctly');
  }

  return config;
}
