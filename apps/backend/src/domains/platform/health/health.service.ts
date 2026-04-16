import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";
import { StorageService } from "../../../../common/storage/storage.service";

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    storage: ComponentHealth;
    mlService: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: "up" | "down";
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private storage: StorageService,
    private configService: ConfigService,
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const [database, redis, storage, mlService] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
      this.checkMLService(),
    ]);

    const allChecks = [database, redis, storage, mlService];
    const downCount = allChecks.filter((c) => c.status === "down").length;
    const upCount = allChecks.filter((c) => c.status === "up").length;

    let status: "healthy" | "unhealthy" | "degraded";
    if (downCount === 0) {
      status = "healthy";
    } else if (upCount > 0) {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || "1.0.0",
      checks: {
        database,
        redis,
        storage,
        mlService,
      },
    };
  }

  async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "up",
        latency: Date.now() - start,
        message: "Database connection is healthy",
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error}`);
      return {
        status: "down",
        latency: Date.now() - start,
        message: "Database connection failed",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.redis.set("__health_check__", "ok");
      const value = await this.redis.get("__health_check__");
      await this.redis.del("__health_check__");

      if (value !== "ok") {
        throw new Error("Redis read/write verification failed");
      }

      return {
        status: "up",
        latency: Date.now() - start,
        message: "Redis connection is healthy",
      };
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error}`);
      return {
        status: "down",
        latency: Date.now() - start,
        message: "Redis connection failed",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  async checkStorage(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.storage.getFileUrl("__health_check__", 1);

      return {
        status: "up",
        latency: Date.now() - start,
        message: "Storage service is healthy",
      };
    } catch (error) {
      this.logger.error(`Storage health check failed: ${error}`);
      return {
        status: "down",
        latency: Date.now() - start,
        message: "Storage service connection failed",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  async checkMLService(): Promise<ComponentHealth> {
    const start = Date.now();
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
          status: "down",
          latency: Date.now() - start,
          message: `ML service returned status ${response.status}`,
          details: { url: mlServiceUrl },
        };
      }

      return {
        status: "up",
        latency: Date.now() - start,
        message: "ML service is healthy",
        details: { url: mlServiceUrl },
      };
    } catch (error) {
      this.logger.error(`ML service health check failed: ${error}`);
      return {
        status: "down",
        latency: Date.now() - start,
        message: "ML service connection failed",
        details: {
          url: mlServiceUrl,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  getLiveness(): { status: string; timestamp: string } {
    return {
      status: "alive",
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<{
    ready: boolean;
    checks: Record<string, boolean>;
  }> {
    const [db, redis, storage, mlService] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
      this.checkMLService(),
    ]);

    const checks = {
      database: db.status === "up",
      redis: redis.status === "up",
      storage: storage.status === "up",
      mlService: mlService.status === "up",
    };

    const coreReady = checks.database && checks.redis && checks.storage;

    return {
      ready: coreReady,
      checks,
    };
  }
}
