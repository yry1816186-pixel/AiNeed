/**
 * Prisma Test Utilities
 * @description 基于 Prisma 交互式事务的测试隔离工具
 *
 * 核心原理：在每个测试用例开始时启动一个 Prisma 交互式事务，
 * 测试中的所有数据库操作都在该事务内执行，测试结束后回滚事务，
 * 从而实现测试间的完全隔离，无需手动清理数据。
 *
 * 使用模式：
 * 1. beforeEach: startTransaction()
 * 2. 测试中: 使用 txPrismaClient 执行操作
 * 3. afterEach: rollbackTransaction()
 *
 * @example
 * ```typescript
 * describe('UserService', () => {
 *   let prismaUtils: PrismaTestUtils;
 *   let txClient: PrismaClient;
 *
 *   beforeAll(async () => {
 *     prismaUtils = new PrismaTestUtils(prismaService);
 *   });
 *
 *   beforeEach(async () => {
 *     txClient = await prismaUtils.startTransaction();
 *   });
 *
 *   afterEach(async () => {
 *     await prismaUtils.rollbackTransaction();
 *   });
 *
 *   it('should create user', async () => {
 *     const user = await txClient.user.create({ data: { ... } });
 *     expect(user).toBeDefined();
 *     // 事务回滚后，数据不会留在数据库中
 *   });
 * });
 * ```
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { Logger } from "@nestjs/common";

/**
 * 事务隔离的 PrismaClient 代理
 *
 * 通过 Proxy 拦截所有对 PrismaClient 的访问，将操作重定向到
 * 当前活跃的事务客户端。这样测试代码可以像使用普通 PrismaClient
 * 一样使用事务客户端，无需修改业务逻辑。
 */
type TransactionClient = Omit<
  PrismaClient,
  | "$connect"
  | "$disconnect"
  | "$on"
  | "$transaction"
  | "$use"
  | "$extends"
>;

/**
 * Prisma 测试工具类
 *
 * 提供基于事务回滚的数据库测试隔离，确保每个测试用例
 * 在独立的数据库快照中运行，互不干扰。
 */
export class PrismaTestUtils {
  private readonly logger = new Logger(PrismaTestUtils.name);

  /** 底层 PrismaClient 实例 */
  private readonly prisma: PrismaClient;

  /** 当前活跃的事务回调（用于回滚） */
  private transactionCallback: ((result: unknown) => void) | null = null;

  /** 当前事务内的 PrismaClient */
  private txClient: TransactionClient | null = null;

  /** 事务超时时间（毫秒），默认 30 秒 */
  private readonly transactionTimeout: number;

  /** 是否已初始化 */
  private initialized = false;

  constructor(prisma: PrismaClient, transactionTimeout: number = 30000) {
    this.prisma = prisma;
    this.transactionTimeout = transactionTimeout;
  }

  /**
   * 启动一个交互式事务用于测试隔离
   *
   * 使用 Prisma 的交互式事务（$transaction 的回调形式），
   * 在回调内执行测试操作，通过不调用 resolve 来阻止事务提交，
   * 测试结束后通过 reject 来回滚事务。
   *
   * @returns 事务内的 PrismaClient 实例
   * @throws 如果已有活跃事务未回滚
   */
  async startTransaction(): Promise<TransactionClient> {
    if (this.txClient) {
      this.logger.warn(
        "A transaction is already active. Rolling back previous transaction before starting a new one.",
      );
      await this.rollbackTransaction();
    }

    return new Promise<TransactionClient>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.logger.error(
          `Transaction timed out after ${this.transactionTimeout}ms. Force rolling back.`,
        );
        this.rollbackTransaction().catch(() => {});
        reject(new Error(`Test transaction timed out after ${this.transactionTimeout}ms`));
      }, this.transactionTimeout);

      this.prisma
        .$transaction(
          async (tx) => {
            this.txClient = tx;
            this.transactionCallback = (result: unknown) => {
              clearTimeout(timeoutId);
              resolve(tx as unknown as TransactionClient);
            };
            this.initialized = true;

            // 阻止事务提交：等待 rollbackTransaction 被调用
            // 当 rollbackTransaction 调用 reject 时，Prisma 会自动回滚事务
            await new Promise((_resolve, txReject) => {
              this.transactionCallback = (result: unknown) => {
                clearTimeout(timeoutId);
                resolve(tx as unknown as TransactionClient);
              };
              // 保存 reject 函数，rollbackTransaction 会调用它
              (this as { txReject?: (reason?: unknown) => void }).txReject =
                txReject;
            });
          },
          {
            maxWait: this.transactionTimeout,
            timeout: this.transactionTimeout,
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        )
        .catch((error: unknown) => {
          // 事务被回滚时会进入这里，这是正常行为
          if (!this.txClient) {
            clearTimeout(timeoutId);
            reject(error);
          }
          // 如果 txClient 已设置，说明事务正常回滚，不需要处理
        });
    });
  }

  /**
   * 回滚当前事务
   *
   * 通过 reject 事务的 Promise 来触发 Prisma 的自动回滚。
   * 这确保所有在事务内执行的数据库操作都不会被持久化。
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.txClient && !this.transactionCallback) {
      return;
    }

    const txReject = (this as { txReject?: (reason?: unknown) => void })
      .txReject;
    if (txReject) {
      // 触发事务回滚
      txReject(new Error("Test transaction rollback"));
    }

    // 重置状态
    this.txClient = null;
    this.transactionCallback = null;
    (this as { txReject?: (reason?: unknown) => void }).txReject = undefined;
  }

  /**
   * 获取当前事务内的 PrismaClient
   *
   * 如果没有活跃事务，抛出错误。
   *
   * @returns 事务内的 PrismaClient
   */
  getTxClient(): TransactionClient {
    if (!this.txClient) {
      throw new Error(
        "No active transaction. Call startTransaction() first.",
      );
    }
    return this.txClient;
  }

  /**
   * 检查是否有活跃事务
   */
  get isActive(): boolean {
    return this.txClient !== null;
  }

  /**
   * 创建一个事务隔离的 PrismaClient 代理
   *
   * 返回一个 Proxy，将所有属性访问重定向到当前事务客户端。
   * 适用于需要将 PrismaClient 注入到服务中的场景。
   *
   * @returns 代理 PrismaClient，所有操作在事务内执行
   */
  createTestPrismaClient(): PrismaClient {
    const self = this;

    return new Proxy(this.prisma, {
      get(_target, prop: string | symbol) {
        // 如果有活跃事务，优先使用事务客户端
        if (self.txClient && prop in self.txClient) {
          return (self.txClient as unknown as Record<string | symbol, unknown>)[prop];
        }
        return (self.prisma as unknown as Record<string | symbol, unknown>)[prop];
      },
    }) as unknown as PrismaClient;
  }

  /**
   * 清理指定表的数据（按依赖顺序）
   *
   * 仅在无法使用事务回滚的场景下使用（如 E2E 测试）。
   * 事务回滚是更推荐的隔离方式。
   *
   * @param tableNames - 要清理的表名列表（按依赖顺序）
   */
  async cleanTables(tableNames: string[]): Promise<void> {
    const client = this.txClient || this.prisma;

    for (const tableName of tableNames) {
      try {
        await (client as unknown as Record<string, { deleteMany: () => Promise<unknown> }>)[
          tableName
        ]?.deleteMany();
      } catch (error) {
        this.logger.warn(
          `Failed to clean table ${tableName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * 按照外键依赖顺序清理所有表
   *
   * 自动检测所有模型并按依赖顺序删除。
   * 仅用于测试环境。
   */
  async cleanAllTables(): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot clean tables in production environment");
    }

    // 按外键依赖顺序排列的表名列表
    // 子表在前，父表在后
    const orderedTables = [
      "communityLike",
      "communityComment",
      "communityPost",
      "aiStylistMessage",
      "aiStylistSession",
      "virtualTryOn",
      "orderItem",
      "order",
      "paymentRecord",
      "cartItem",
      "favorite",
      "clothingItem",
      "userPhoto",
      "userProfile",
      "styleProfile",
      "customizationRequest",
      "searchHistory",
      "weatherData",
      "analyticsEvent",
      "privacyConsent",
      "notification",
      "subscription",
      "address",
      "userKey",
      "brand",
      "merchant",
      "user",
    ];

    await this.cleanTables(orderedTables);
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 事务回滚测试包装器
 *
 * 高阶函数，自动管理事务的生命周期：
 * - 测试前启动事务
 * - 测试后回滚事务
 *
 * @param prisma - PrismaClient 实例
 * @param fn - 测试函数，接收事务客户端作为参数
 * @param options - 配置选项
 *
 * @example
 * ```typescript
 * it('should create user', withTransactionRollback(prisma, async (tx) => {
 *   const user = await tx.user.create({ data: { ... } });
 *   expect(user).toBeDefined();
 * }));
 * ```
 */
export function withTransactionRollback<T = void>(
  prisma: PrismaClient,
  fn: (tx: TransactionClient) => Promise<T>,
  options: { timeout?: number } = {},
): () => Promise<T | undefined> {
  return async () => {
    const utils = new PrismaTestUtils(prisma, options.timeout);
    let result: T | undefined;

    try {
      const tx = await utils.startTransaction();
      result = await fn(tx);
    } catch (error) {
      // 测试失败时也要回滚事务
      throw error;
    } finally {
      await utils.rollbackTransaction();
    }

    return result;
  };
}

/**
 * 创建用于 Jest describe 块的事务隔离辅助
 *
 * 返回一组生命周期钩子，可直接在 describe 块中使用。
 *
 * @param prisma - PrismaClient 实例
 * @returns 包含 beforeAll, beforeEach, afterEach, afterAll 钩子的对象
 *
 * @example
 * ```typescript
 * describe('UserService with transaction isolation', () => {
 *   const isolation = createTransactionIsolation(prismaService);
 *
 *   beforeAll(isolation.beforeAll);
 *   beforeEach(isolation.beforeEach);
 *   afterEach(isolation.afterEach);
 *   afterAll(isolation.afterAll);
 *
 *   it('should create user', async () => {
 *     const tx = isolation.getTxClient();
 *     const user = await tx.user.create({ data: { ... } });
 *     expect(user).toBeDefined();
 *   });
 * });
 * ```
 */
export function createTransactionIsolation(prisma: PrismaClient) {
  const utils = new PrismaTestUtils(prisma);

  return {
    utils,

    beforeAll: async () => {
      // 确保数据库连接
      await prisma.$connect();
    },

    beforeEach: async () => {
      await utils.startTransaction();
    },

    afterEach: async () => {
      await utils.rollbackTransaction();
    },

    afterAll: async () => {
      await utils.rollbackTransaction();
      await prisma.$disconnect();
    },

    /**
     * 获取当前事务客户端
     */
    getTxClient: () => utils.getTxClient(),

    /**
     * 获取事务隔离的 PrismaClient 代理
     */
    getTestPrismaClient: () => utils.createTestPrismaClient(),
  };
}
