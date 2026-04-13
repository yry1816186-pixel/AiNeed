import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { StorageService } from "../../common/storage/storage.service";

interface ReadinessCheckResult {
  name: string;
  passed: boolean;
  message: string;
}

@Injectable()
export class SystemReadinessService implements OnModuleInit {
  private readonly logger = new Logger(SystemReadinessService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private storage: StorageService,
    private configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log("Running system readiness checks...");
    const results = await this.runAllChecks();

    const failed = results.filter((r) => !r.passed);
    const passed = results.filter((r) => r.passed);

    for (const result of passed) {
      this.logger.log(`[PASS] ${result.name}: ${result.message}`);
    }
    for (const result of failed) {
      this.logger.error(`[FAIL] ${result.name}: ${result.message}`);
    }

    if (failed.length > 0) {
      const isProduction = this.configService.get<string>("NODE_ENV") === "production";
      const summary = `System readiness check failed: ${failed.length}/${results.length} checks failed (${failed.map((f) => f.name).join(", ")})`;

      if (isProduction) {
        this.logger.error(summary);
        throw new Error(summary);
      } else {
        this.logger.warn(`${summary} - Continuing in development mode`);
      }
    } else {
      this.logger.log(`All ${results.length} readiness checks passed`);
    }
  }

  private async runAllChecks(): Promise<ReadinessCheckResult[]> {
    return Promise.all([
      this.checkEnvVariables(),
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMinioConfig(),
      this.checkMLService(),
    ]);
  }

  private async checkEnvVariables(): Promise<ReadinessCheckResult> {
    const requiredVars = [
      "DATABASE_URL",
      "REDIS_URL",
      "MINIO_ENDPOINT",
      "MINIO_ACCESS_KEY",
      "MINIO_SECRET_KEY",
      "JWT_SECRET",
    ];

    const missing = requiredVars.filter(
      (varName) => !this.configService.get<string>(varName),
    );

    if (missing.length > 0) {
      return {
        name: "Environment Variables",
        passed: false,
        message: `Missing required env vars: ${missing.join(", ")}`,
      };
    }

    return {
      name: "Environment Variables",
      passed: true,
      message: `All ${requiredVars.length} required env vars are set`,
    };
  }

  private async checkDatabase(): Promise<ReadinessCheckResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          controller.signal.addEventListener("abort", () =>
            reject(new Error("Timeout after 3s")),
          ),
        ),
      ]);
      clearTimeout(timeout);

      return {
        name: "Database",
        passed: true,
        message: "Connection established",
      };
    } catch (error) {
      return {
        name: "Database",
        passed: false,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  private async checkRedis(): Promise<ReadinessCheckResult> {
    try {
      const client = this.redis.getClient();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      await Promise.race([
        client.ping(),
        new Promise((_, reject) =>
          controller.signal.addEventListener("abort", () =>
            reject(new Error("Timeout after 3s")),
          ),
        ),
      ]);
      clearTimeout(timeout);

      return {
        name: "Redis",
        passed: true,
        message: "Connection established",
      };
    } catch (error) {
      return {
        name: "Redis",
        passed: false,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  private async checkMinioConfig(): Promise<ReadinessCheckResult> {
    const endpoint = this.configService.get<string>("MINIO_ENDPOINT");
    const accessKey = this.configService.get<string>("MINIO_ACCESS_KEY");
    const secretKey = this.configService.get<string>("MINIO_SECRET_KEY");
    const bucket = this.configService.get<string>("MINIO_BUCKET", "xuno");

    if (!endpoint || !accessKey || !secretKey) {
      return {
        name: "MinIO",
        passed: false,
        message: "Missing MinIO configuration (MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY)",
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      await Promise.race([
        this.storage.getFileUrl("__readiness_check__", 1),
        new Promise((_, reject) =>
          controller.signal.addEventListener("abort", () =>
            reject(new Error("Timeout after 3s")),
          ),
        ),
      ]);
      clearTimeout(timeout);

      return {
        name: "MinIO",
        passed: true,
        message: `Configured (endpoint: ${endpoint}, bucket: ${bucket})`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return {
        name: "MinIO",
        passed: false,
        message: `Config present but service unreachable: ${msg}`,
      };
    }
  }

  private async checkMLService(): Promise<ReadinessCheckResult> {
    const mlServiceUrl = this.configService.get<string>(
      "ML_SERVICE_URL",
      "http://localhost:8001",
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${mlServiceUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          name: "ML Service",
          passed: false,
          message: `Returned status ${response.status}`,
        };
      }

      return {
        name: "ML Service",
        passed: true,
        message: `Reachable at ${mlServiceUrl}`,
      };
    } catch (error) {
      return {
        name: "ML Service",
        passed: false,
        message: `Unreachable at ${mlServiceUrl}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}
