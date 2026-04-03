import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

const logger = new Logger("EnvValidator");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default("3001"),
  
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid database connection URL"),
  
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_PORT: z.string().transform(Number).optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().default("stylemind"),
  MINIO_USE_SSL: z.string().transform(Boolean).default("false"),
  
  QDRANT_URL: z.string().optional(),
  AI_SERVICE_URL: z.string().optional(),
  BODY_ANALYSIS_SERVICE_URL: z.string().optional(),
  
  GLM_API_KEY: z.string().optional(),
  GLM_API_ENDPOINT: z.string().url().optional(),
  GLM_MODEL: z.string().optional(),
  
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_ENDPOINT: z.string().url().optional(),
  OPENAI_MODEL: z.string().optional(),
});

const requiredInProduction = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

@Injectable()
export class EnvValidatorService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.validate();
  }

  validate(): void {
    const env = process.env;
    const nodeEnv = env.NODE_ENV || "development";
    
    const result = envSchema.safeParse(env);
    
    if (!result.success) {
      logger.error("Environment validation failed:");
      result.error.issues.forEach((issue) => {
        logger.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
      
      if (nodeEnv === "production") {
        throw new Error("Environment validation failed in production");
      } else {
        logger.warn("Some environment variables are invalid, using defaults where possible");
      }
    }

    if (nodeEnv === "production") {
      for (const key of requiredInProduction) {
        if (!env[key]) {
          logger.error(`Required environment variable ${key} is not set`);
          throw new Error(`Required environment variable ${key} is not set in production`);
        }
      }
    }

    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
      logger.warn(
        "JWT_SECRET should be at least 32 characters for security. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
      );
    }

    if (env.JWT_SECRET === "change-me-in-production" || env.JWT_SECRET === "your-secret-key") {
      logger.error(
        "FATAL: JWT_SECRET is using a default/placeholder value. " +
        "This is a security risk in production!"
      );
      if (nodeEnv === "production") {
        throw new Error("JWT_SECRET must be changed from default value in production");
      }
    }

    logger.log("Environment validation completed");
  }

  get<T>(key: string, defaultValue?: T): T {
    return this.configService.get<T>(key, defaultValue as T);
  }

  getOrThrow(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
  }
}
