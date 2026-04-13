/**
 * Global Test Setup
 * @description Jest 全局测试设置文件
 *
 * 在所有测试运行前执行的全局配置：
 * - 设置 NODE_ENV 为 'test'
 * - 配置 Jest 超时时间
 * - 模拟外部服务（MinIO, BullMQ, nodemailer 等）
 * - 初始化全局测试工具
 * - 设置全局 beforeEach/afterEach 钩子
 *
 * 此文件通过 jest.config.js 的 setupFilesAfterEnv 引入，
 * 在每个测试文件的测试用例运行前执行。
 */

// ============================================================================
// 环境配置
// ============================================================================

// 确保 NODE_ENV 为 test，防止误操作生产环境
process.env.NODE_ENV = "test";

// 覆盖关键环境变量，确保测试环境安全
process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  "test-jwt-secret-key-for-testing-only-at-least-64-chars-long-aaaaaa";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "test-jwt-refresh-secret-key-for-testing-only-at-least-64-chars-long";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://test:test@localhost:5432/xuno_test?connection_limit=5";
process.env.REDIS_URL =
  process.env.REDIS_URL || "redis://localhost:6379/1";

// ============================================================================
// Jest 超时配置
// ============================================================================

// 默认超时 30 秒，适用于大多数测试
jest.setTimeout(30000);

// ============================================================================
// 外部服务 Mock
// ============================================================================

/**
 * Mock bcryptjs
 * 避免在测试中执行真实的哈希计算，提升测试速度
 */
jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockImplementation((password: string, _rounds: number) =>
    Promise.resolve(`$2b$12$hashed_${password}`),
  ),
  genSalt: jest.fn().mockResolvedValue("$2b$12$mocksalt"),
  hashSync: jest.fn().mockImplementation((password: string) =>
    `$2b$12$hashed_${password}`,
  ),
  compareSync: jest.fn().mockReturnValue(true),
}));

/**
 * Mock sharp
 * 避免在测试中执行真实的图片处理
 */
jest.mock("sharp", () => {
  return jest.fn((input: unknown) => ({
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(
      Buffer.isBuffer(input) ? input : Buffer.from("mock-thumbnail"),
    ),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    metadata: jest.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: "jpeg",
    }),
    toFile: jest.fn().mockResolvedValue({ size: 1024 }),
  }));
});

/**
 * Mock MinIO Client
 * 避免在测试中连接真实的 MinIO 服务
 */
jest.mock("minio", () => ({
  Client: jest.fn().mockImplementation(() => ({
    putObject: jest.fn().mockResolvedValue({ etag: "mock-etag" }),
    getObject: jest.fn().mockResolvedValue({
      [Symbol.asyncIterator]: jest.fn().mockImplementation(() => ({
        next: jest.fn().mockResolvedValue({ done: true, value: undefined }),
      })),
    }),
    removeObjects: jest.fn().mockResolvedValue(undefined),
    removeObject: jest.fn().mockResolvedValue(undefined),
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(undefined),
    listBuckets: jest.fn().mockResolvedValue([{ name: "xuno-test" }]),
    presignedUrl: jest
      .fn()
      .mockResolvedValue("https://mock-minio.local/xuno/test/mock-file.jpg"),
    presignedGetObject: jest
      .fn()
      .mockResolvedValue("https://mock-minio.local/xuno/test/mock-file.jpg"),
    statObject: jest.fn().mockResolvedValue({
      size: 1024,
      lastModified: new Date(),
    }),
  })),
}));

/**
 * Mock BullMQ
 * 避免在测试中连接真实的 Redis 队列
 */
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation((name: string) => ({
    name,
    add: jest.fn().mockResolvedValue({ id: "mock-job-id" }),
    getJob: jest.fn().mockResolvedValue(null),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getDelayed: jest.fn().mockResolvedValue([]),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    obliterate: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    isPaused: jest.fn().mockResolvedValue(false),
    drain: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
    run: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Job: jest.fn().mockImplementation(() => ({
    id: "mock-job-id",
    data: {},
    progress: jest.fn(),
    updateProgress: jest.fn(),
    log: jest.fn(),
    moveToCompleted: jest.fn(),
    moveToFailed: jest.fn(),
    remove: jest.fn(),
    retry: jest.fn(),
    getState: jest.fn().mockResolvedValue("completed"),
  })),
}));

/**
 * Mock nodemailer
 * 避免在测试中发送真实邮件
 */
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: `sim_${Date.now()}_mock`,
      response: "250 OK",
    }),
    verify: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

/**
 * Mock opossum (circuit breaker)
 * 避免在测试中创建真实的熔断器
 */
jest.mock("opossum", () => {
  return jest.fn().mockImplementation((fn: (...args: unknown[]) => unknown) => {
    const mockCircuitBreaker = {
      fire: jest.fn().mockImplementation((...args: unknown[]) => fn(...args)),
      on: jest.fn().mockReturnThis(),
      opened: false,
      halfOpen: false,
      close: jest.fn(),
      open: jest.fn(),
      shutdown: jest.fn(),
    };
    return mockCircuitBreaker;
  });
});

// ============================================================================
// 全局 Console 配置
// ============================================================================

// 减少测试输出噪音，但保留 error 用于调试
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // 保留 error 输出，方便调试失败的测试
  error: console.error,
};

// ============================================================================
// 全局测试钩子
// ============================================================================

/**
 * 全局 beforeEach 钩子
 * 每个测试用例运行前执行
 */
beforeEach(() => {
  // 重置所有 mock 的调用记录
  jest.clearAllMocks();
});

/**
 * 全局 afterEach 钩子
 * 每个测试用例运行后执行
 */
afterEach(() => {
  // 恢复所有 mock 的实现
  jest.restoreAllMocks();
});

// ============================================================================
// 工具导出（供测试文件使用）
// ============================================================================

export {};
