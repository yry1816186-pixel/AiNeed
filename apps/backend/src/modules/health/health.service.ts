import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { StorageService } from "../../common/storage/storage.service";

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    storage: ComponentHealth;
    openai?: ComponentHealth;
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
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    const [database, redis, storage] = checks;

    // 计算整体状态
    const allChecks = [database, redis, storage];
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
      },
    };
  }

  async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      // 执行简单查询测试连接
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
      // 执行 PING 命令测试连接
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
      // 检查存储服务是否可用（通过获取一个不存在的文件的 URL）
      // 这不会抛出错误，因为我们只是检查客户端是否正确配置
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

  /**
   * 简单的存活检查（不检查依赖）
   */
  getLiveness(): { status: string; timestamp: string } {
    return {
      status: "alive",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 就绪检查（检查是否可以接收流量）
   */
  async getReadiness(): Promise<{
    ready: boolean;
    checks: Record<string, boolean>;
  }> {
    const [db, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    const checks = {
      database: db.status === "up",
      redis: redis.status === "up",
      storage: storage.status === "up",
    };

    return {
      ready: Object.values(checks).every((v) => v),
      checks,
    };
  }
}
