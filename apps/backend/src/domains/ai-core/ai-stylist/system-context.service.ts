import { cpus } from "os";

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from '../../../common/prisma/prisma.service";
import { RedisService } from '../../../common/redis/redis.service";

export interface GitInfo {
  branch: string;
  lastCommit: string;
  lastCommitAuthor: string;
  lastCommitDate: string;
  lastCommitMessage: string;
  isCleanWorkingTree: boolean;
  changedFiles: number;
  totalCommits: string;
  remoteUrl?: string;
}

export interface DatabaseStats {
  totalUsers: number;
  totalClothingItems: number;
  activeClothingItems: number;
  totalBrands: number;
  totalCategories: number;
  totalSessions: number;
  activeSessions: number;
  totalTryOns: number;
  completedTryOns: number;
  totalPhotos: number;
  analyzedPhotos: number;
  totalFeedbackRecords: number;
  recentUsers24h: number;
  recentTryOns24h: number;
}

export interface ServiceHealthStatus {
  backend: { status: "up" | "down" | "degraded"; uptimeMs: number; version: string };
  postgresql: { status: "up" | "down"; latencyMs: number };
  redis: { status: "up" | "down"; latencyMs: number; connectedClients?: number };
  minio: { status: "up" | "down" | "unknown"; latencyMs: number };
  qdrant: { status: "up" | "down" | "unknown"; latencyMs: number };
  llmProvider: { provider: string; model: string; status: "configured" | "not_configured" };
}

export interface SystemResources {
  nodeVersion: string;
  platform: string;
  arch: string;
  memoryUsageMb: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage: number;
  uptimeSeconds: number;
  processId: number;
  cwd: string;
}

export interface ProjectFileInfo {
  totalTypeScriptFiles: number;
  totalPythonFiles: number;
  backendModuleCount: number;
  mlServiceCount: number;
  packageJsonDeps: number;
  prismaModels: number;
}

export interface SystemContextResult {
  timestamp: string;
  environment: string;
  git: GitInfo;
  database: DatabaseStats;
  services: ServiceHealthStatus;
  resources: SystemResources;
  projectFiles: ProjectFileInfo;
}

@Injectable()
export class SystemContextService implements OnModuleInit {
  private readonly logger = new Logger(SystemContextService.name);
  private startTime: number;
  private cachedContext: SystemContextResult | null = null;
  private cacheExpiry: number = 0;
  private readonly cacheTtlMs = 30_000;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {
    this.startTime = Date.now();
  }

  onModuleInit(): void {
    this.logger.log("SystemContextService initialized - AI can now query local environment");
  }

  async getFullContext(refresh = false): Promise<SystemContextResult> {
    const now = Date.now();
    if (!refresh && this.cachedContext && now < this.cacheExpiry) {
      return this.cachedContext;
    }

    const [git, database, services, resources, projectFiles] =
      await Promise.all([
        this.getGitInfo(),
        this.getDatabaseStats(),
        this.getServiceHealthStatus(),
        this.getSystemResources(),
        this.getProjectFileInfo(),
      ]);

    const context: SystemContextResult = {
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>("NODE_ENV", "development"),
      git,
      database,
      services,
      resources,
      projectFiles,
    };

    this.cachedContext = context;
    this.cacheExpiry = now + this.cacheTtlMs;
    return context;
  }

  async getGitInfo(): Promise<GitInfo> {
    const defaultInfo: GitInfo = {
      branch: "unknown",
      lastCommit: "unknown",
      lastCommitAuthor: "unknown",
      lastCommitDate: "unknown",
      lastCommitMessage: "no git info available",
      isCleanWorkingTree: true,
      changedFiles: 0,
      totalCommits: "0",
    };

    try {
      const { execSync } = await import("child_process");
      const cwd = this.configService.get<string>("PROJECT_ROOT", "C:\\xuno");

      const runCmd = (cmd: string): string => {
        try {
          return execSync(cmd, {
            cwd,
            encoding: "utf-8",
            timeout: 5000,
          }).trim();
        } catch {
          return "";
        }
      };

      const branch =
        runCmd('git rev-parse --abbrev-ref HEAD') || "unknown";
      const lastCommit = runCmd("git rev-parse --short HEAD") || "unknown";
      const lastCommitAuthor =
        runCmd('git log -1 --format="%an"') || "unknown";
      const lastCommitDate =
        runCmd('git log -1 --format="%ai"') || "unknown";
      const lastCommitMessage =
        runCmd('git log -1 --format="%s"') || "no commits";
      const statusOutput = runCmd("git status --porcelain");
      const changedFiles = statusOutput
        ? statusOutput.split("\n").filter(Boolean).length
        : 0;
      const totalCommits = runCmd('git rev-list --count HEAD') || "0";
      const remoteUrl = runCmd("git config --get remote.origin.url") || undefined;

      return {
        branch,
        lastCommit,
        lastCommitAuthor,
        lastCommitDate,
        lastCommitMessage,
        isCleanWorkingTree: changedFiles === 0,
        changedFiles,
        totalCommits,
        remoteUrl,
      };
    } catch (error) {
      this.logger.warn(`Failed to get Git info: ${error instanceof Error ? error.message : String(error)}`);
      return defaultInfo;
    }
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    const defaults: DatabaseStats = {
      totalUsers: 0,
      totalClothingItems: 0,
      activeClothingItems: 0,
      totalBrands: 0,
      totalCategories: 0,
      totalSessions: 0,
      activeSessions: 0,
      totalTryOns: 0,
      completedTryOns: 0,
      totalPhotos: 0,
      analyzedPhotos: 0,
      totalFeedbackRecords: 0,
      recentUsers24h: 0,
      recentTryOns24h: 0,
    };

    try {
      const yesterday = new Date(Date.now() - 86400000);

      const [
        totalUsers,
        totalClothingItems,
        activeClothingItems,
        totalBrands,
        totalCategories,
        totalSessions,
        activeSessions,
        totalTryOns,
        completedTryOns,
        totalPhotos,
        analyzedPhotos,
        totalFeedbackRecords,
        recentUsers24h,
        recentTryOns24h,
      ] = await Promise.all([
        this.prisma.user.count().catch(() => 0),
        this.prisma.clothingItem.count().catch(() => 0),
        this.prisma.clothingItem.count({ where: { isActive: true } }).catch(() => 0),
        this.prisma.brand.count().catch(() => 0),
        this.prisma.clothingItem
          .findMany({ select: { category: true }, distinct: ["category"] })
          .then((r: { category: unknown }[]) => r.length)
          .catch(() => 0),
        this.prisma.aiStylistSession.count().catch(() => 0),
        this.prisma.aiStylistSession
          .count({ where: { expiresAt: { gt: new Date() } } })
          .catch(() => 0),
        this.prisma.virtualTryOn.count().catch(() => 0),
        this.prisma.virtualTryOn
          .count({ where: { status: "completed" } })
          .catch(() => 0),
        this.prisma.userPhoto.count().catch(() => 0),
        this.prisma.userPhoto
          .count({ where: { analysisStatus: "completed" } })
          .catch(() => 0),
        this.prisma.rankingFeedback.count().catch(() => 0),
        this.prisma.user
          .count({ where: { createdAt: { gte: yesterday } } })
          .catch(() => 0),
        this.prisma.virtualTryOn
          .count({ where: { createdAt: { gte: yesterday } } })
          .catch(() => 0),
      ]);

      return {
        totalUsers,
        totalClothingItems,
        activeClothingItems,
        totalBrands,
        totalCategories,
        totalSessions,
        activeSessions,
        totalTryOns,
        completedTryOns,
        totalPhotos,
        analyzedPhotos,
        totalFeedbackRecords,
        recentUsers24h,
        recentTryOns24h,
      };
    } catch (error) {
      this.logger.warn(`Failed to get database stats: ${error instanceof Error ? error.message : String(error)}`);
      return defaults;
    }
  }

  async getServiceHealthStatus(): Promise<ServiceHealthStatus> {
    const uptimeMs = Date.now() - this.startTime;
    let version = "unknown";
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const pkgPath = path.join(process.cwd(), "..", "..", "package.json");
      const pkgContent = await fs.readFile(pkgPath, "utf-8").catch(() => null);
      if (pkgContent) {
        const parsed = JSON.parse(pkgContent);
        version = parsed.version || "unknown";
      }
    } catch {
      // keep default
    }

    let postgresqlLatency = -1;
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      postgresqlLatency = Date.now() - start;
    } catch {
      // keep -1
    }

    let redisLatency = -1;
    let redisConnectedClients: number | undefined;
    try {
      const start = Date.now();
      const client = this.redisService.getClient();
      await client.ping();
      redisLatency = Date.now() - start;
      try {
        const info = (await client.info("clients"));
        if (typeof info === "string") {
          const match = info.match(/connected_clients:(\d+)/);
          if (match?.[1]) {redisConnectedClients = parseInt(match[1], 10);}
        }
      } catch {
        // optional field, ignore
      }
    } catch {
      // keep -1
    }

    let minioLatency = -1;
    const minioEndpoint =
      this.configService.get<string>("MINIO_ENDPOINT", "localhost:9000") ||
      "localhost:9000";
    try {
      const start = Date.now();
      const response = await fetch(
        `http://${minioEndpoint}/minio/health/live`,
        { signal: AbortSignal.timeout(3000) },
      );
      minioLatency = response.ok ? Date.now() - start : -1;
    } catch {
      // keep -1
    }

    let qdrantLatency = -1;
    const qdrantHost =
      this.configService.get<string>("QDRANT_HOST", "localhost") ||
      "localhost";
    const qdrantPort = this.configService.get<number>("QDRANT_PORT", 6333);
    try {
      const start = Date.now();
      const response = await fetch(
        `http://${qdrantHost}:${qdrantPort}/`,
        { signal: AbortSignal.timeout(3000) },
      );
      qdrantLatency = response.ok ? Date.now() - start : -1;
    } catch {
      // keep -1
    }

    const llmKey = this.configService.get<string>("GLM_API_KEY", "") ||
      this.configService.get<string>("DEEPSEEK_API_KEY", "") ||
      this.configService.get<string>("AI_STYLIST_API_KEY", "");
    const llmProviderName = this.configService.get<string>(
      "AI_STYLIST_MODEL",
      this.configService.get<string>("GLM_MODEL", "glm-5"),
    );

    return {
      backend: {
        status: "up",
        uptimeMs,
        version: version,
      },
      postgresql: {
        status: postgresqlLatency >= 0 ? "up" : "down",
        latencyMs: Math.max(0, postgresqlLatency),
      },
      redis: {
        status: redisLatency >= 0 ? "up" : "down",
        latencyMs: Math.max(0, redisLatency),
        connectedClients: redisConnectedClients,
      },
      minio: {
        status: minioLatency >= 0 ? "up" : "down",
        latencyMs: Math.max(0, minioLatency),
      },
      qdrant: {
        status: qdrantLatency >= 0 ? "up" : "down",
        latencyMs: Math.max(0, qdrantLatency),
      },
      llmProvider: {
        provider: llmKey ? "configured" : "none",
        model: llmProviderName,
        status: llmKey ? "configured" : "not_configured",
      },
    };
  }

  async getSystemResources(): Promise<SystemResources> {
    const memUsage = process.memoryUsage();
    cpus();

    let cpuUsage = 0;
    try {
      const startUsage = process.cpuUsage();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const endUsage = process.cpuUsage(startUsage);
      const totalMs = endUsage.user + endUsage.system;
      cpuUsage = Math.round((totalMs / 100000) * 100) / 100;
    } catch {
      cpuUsage = -1;
    }

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsageMb: {
        rss: Math.round(memUsage.rss / 1024 / 1024 * 10) / 10,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 10) / 10,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 10) / 10,
        external: Math.round(memUsage.external / 1024 / 1024 * 10) / 10,
      },
      cpuUsage,
      uptimeSeconds: Math.round(process.uptime()),
      processId: process.pid,
      cwd: process.cwd(),
    };
  }

  async getProjectFileInfo(): Promise<ProjectFileInfo> {
    const defaults: ProjectFileInfo = {
      totalTypeScriptFiles: 0,
      totalPythonFiles: 0,
      backendModuleCount: 0,
      mlServiceCount: 0,
      packageJsonDeps: 0,
      prismaModels: 0,
    };

    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const rootDir = this.configService.get<string>("PROJECT_ROOT", "C:\\xuno");

      const [tsFiles, pythonFiles, backendModules, mlServices] =
        await Promise.all([
          this.countFiles(rootDir, "**/*.ts").catch(() => 0),
          this.countFiles(rootDir, "**/*.py").catch(() => 0),
          fs.readdir(path.join(rootDir, "apps/backend/src/modules"))
            .then((dirs) => dirs.length)
            .catch(() => 0),
          fs.readdir(path.join(rootDir, "ml/services"))
            .then((dirs) => dirs.length)
            .catch(() => 0),
        ]);

      let packageJsonDeps = 0;
      try {
        const pkgContent = await fs.readFile(
          path.join(rootDir, "package.json"),
          "utf-8",
        );
        const pkg = JSON.parse(pkgContent);
        packageJsonDeps =
          Object.keys(pkg.dependencies || {}).length +
          Object.keys(pkg.devDependencies || {}).length;
      } catch {
        // skip
      }

      let prismaModels = 0;
      try {
        const schemaPath = path.join(
          rootDir,
          "apps/backend/prisma/schema.prisma",
        );
        const schema = await fs.readFile(schemaPath, "utf-8");
        const modelMatches = schema.match(/^model\s+\w+/gm);
        prismaModels = modelMatches?.length || 0;
      } catch {
        // skip
      }

      return {
        totalTypeScriptFiles: tsFiles,
        totalPythonFiles: pythonFiles,
        backendModuleCount: backendModules,
        mlServiceCount: mlServices,
        packageJsonDeps,
        prismaModels,
      };
    } catch (error) {
      this.logger.warn(`Failed to get project file info: ${error instanceof Error ? error.message : String(error)}`);
      return defaults;
    }
  }

  private async countFiles(
    rootDir: string,
    pattern: string,
  ): Promise<number> {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");

      const walk = async (dir: string): Promise<string[]> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const results: string[] = [];
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (
              !entry.name.startsWith(".") &&
              entry.name !== "node_modules" &&
              entry.name !== "dist"
            ) {
              results.push(...(await walk(fullPath)));
            }
          } else {
            results.push(fullPath);
          }
        }
        return results;
      }

      const allFiles = await walk(rootDir);
      const ext = pattern.includes(".ts") ? ".ts" : ".py";
      return allFiles.filter((f) => f.endsWith(ext)).length;
    } catch {
      return 0;
    }
  }

  getContextSummaryForPrompt(): Promise<string> {
    return this.getFullContext().then((ctx) => {
      const parts: string[] = [
        `## 系统环境快照 (${ctx.timestamp})`,
        ``,
        `### 项目信息`,
        `- 分支: ${ctx.git.branch} | 最近提交: ${ctx.git.lastCommit} (${ctx.git.lastCommitMessage.slice(0, 60)})`,
        `- 工作区: ${ctx.git.isCleanWorkingTree ? "干净" : `${ctx.git.changedFiles} 个文件未提交`}`,
        `- 环境: ${ctx.environment} | Node.js ${ctx.resources.nodeVersion}`,
        ``,
        `### 数据概况`,
        `- 用户: ${ctx.database.totalUsers} (今日+${ctx.database.recentUsers24h})`,
        `- 服装: ${ctx.database.totalClothingItems} 件 (${ctx.database.activeClothingItems} 活跃)`,
        `- 品牌: ${ctx.database.totalBrands} | 分类: ${ctx.database.totalCategories}`,
        `- 试衣: ${ctx.database.totalTryOns} 次 (${ctx.database.completedTryOns} 完成)`,
        `- AI会话: ${ctx.database.totalSessions} (${ctx.database.activeSessions} 活跃)`,
        ``,
        `### 服务状态`,
        `- PostgreSQL: ${ctx.services.postgresql.status} (${ctx.services.postgresql.latencyMs}ms)`,
        `- Redis: ${ctx.services.redis.status} (${ctx.services.redis.latencyMs}ms)`,
        `- Qdrant: ${ctx.services.qdrant.status} (${ctx.services.qdrant.latencyMs}ms)`,
        `- MinIO: ${ctx.services.minio.status} (${ctx.services.minio.latencyMs}ms)`,
        `- LLM: ${ctx.services.llmProvider.provider}/${ctx.services.llmProvider.model}`,
        ``,
        `### 系统资源`,
        `- 内存 RSS: ${ctx.resources.memoryUsageMb.rss}MB | Heap: ${ctx.resources.memoryUsageMb.heapUsed}/${ctx.resources.memoryUsageMb.heapTotal}MB`,
        `- 运行时间: ${Math.floor(ctx.resources.uptimeSeconds / 60)} 分钟 | PID: ${ctx.resources.processId}`,
      ];
      return parts.join("\n");
    });
  }
}
