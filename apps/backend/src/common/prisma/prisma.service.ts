import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Prisma Service
 * 包装 PrismaClient 以便在 NestJS 中使用依赖注入
 *
 * 通过扩展 PrismaClient，自动继承所有 Prisma 模型属性
 * 如 user, userProfile, paymentRecord, notification 等
 *
 * 注意：由于 PrismaClient 使用动态属性代理，TypeScript 在某些情况下
 * 无法正确推断类型。我们使用类型断言来解决这个问题。
 *
 * 连接池配置说明:
 * - poolSize: 连接池最大连接数 (默认: 20)
 * - idleTimeout: 空闲连接超时时间 (默认: 30秒)
 * - connectionTimeout: 获取连接超时时间 (默认: 2秒)
 *
 * 通过 DATABASE_URL 环境变量配置连接池参数:
 * postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30&connect_timeout=10
 *
 * 推荐配置:
 * - 开发环境: connection_limit=5
 * - 生产环境: connection_limit=20 (根据数据库服务器配置调整)
 * - 使用 PgBouncer 时: connection_limit=50&pgbouncer=true
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY_MS = 1000;

  constructor() {
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "error" },
        { emit: "stdout", level: "warn" },
      ],
      // 数据库连接池配置通过 DATABASE_URL 环境变量传递
      // 推荐的 DATABASE_URL 格式:
      // postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30&connect_timeout=10
      //
      // 连接池参数说明:
      // - connection_limit: 最大连接数，默认为 CPU 核心数 * 2 + 1
      // - pool_timeout: 等待可用连接的超时时间(秒)，默认 30
      // - connect_timeout: 建立连接的超时时间(秒)，默认 5
      // - idle_in_transaction_session_timeout: 事务中空闲会话超时(毫秒)
      // - statement_timeout: 单个语句超时(毫秒)
    });

    // 监听慢查询 (阈值通过 SLOW_QUERY_THRESHOLD_MS 环境变量配置，默认 500ms)
    const slowQueryThreshold = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 500;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on("query", (e: Prisma.QueryEvent) => {
      if (e.duration > slowQueryThreshold) {
        this.logger.warn(
          `Slow Prisma query detected (${e.duration}ms): ${e.query.substring(0, 200)}...`,
        );
      }
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.isConnected = false;
    this.logger.log("Prisma disconnected from database");
  }

  /**
   * 带重试机制的数据库连接
   */
  private async connectWithRetry(): Promise<void> {
    while (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      try {
        await this.$connect();
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.log("Prisma connected to database");
        return;
      } catch (error: unknown) {
        this.reconnectAttempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to connect to database (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}): ${errorMessage}`,
        );

        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          const delay = this.RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1);
          this.logger.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * 健康检查方法
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database health check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * 清理测试数据库（仅用于测试环境）
   *
   * 使用 TRUNCATE CASCADE 按依赖关系顺序删除所有表数据。
   * 相比 Promise.all 并行 deleteMany，TRUNCATE CASCADE 的优势：
   * 1. 自动处理外键依赖，无需手动排序
   * 2. 不会因外键约束报错而失败
   * 3. 重置自增 ID 序列
   * 4. 性能更优（TRUNCATE 是 DDL 操作，不逐行删除）
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot clean database in production");
    }

    // 获取所有表名并按依赖关系顺序执行 TRUNCATE CASCADE
    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;

    if (tablenames.length === 0) {
      return;
    }

    // 使用 TRUNCATE CASCADE 一次性清理所有表，自动处理外键依赖
    const tables = tablenames.map((row) => `"${row.tablename}"`).join(", ");
    await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);

    // 重置所有序列（自增 ID）
    const sequences = await this.$queryRaw<
      Array<{ sequencename: string }>
    >`SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'`;

    if (sequences.length > 0) {
      const resetStatements = sequences
        .map((row) => `ALTER SEQUENCE "${row.sequencename}" RESTART WITH 1;`)
        .join("\n");
      await this.$executeRawUnsafe(resetStatements);
    }
  }
}

// 使用模块扩展来添加类型声明
// 这确保 TypeScript 正确识别 PrismaClient 的所有动态属性
import type { PrismaClient as PrismaClientType } from "@prisma/client";

declare module "./prisma.service" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface PrismaService extends PrismaClientType {}
}
