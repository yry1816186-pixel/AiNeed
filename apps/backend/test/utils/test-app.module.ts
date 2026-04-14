/**
 * Test AppModule
 * @description 测试用的 NestJS 应用模块，模拟所有外部依赖
 *
 * 提供完整的测试应用创建和销毁功能，所有外部服务
 * (Prisma, Redis, BullMQ, MinIO, LLM, Email 等) 均被模拟，
 * 确保单元测试和集成测试无需真实外部依赖即可运行。
 */

import { INestApplication, ValidationPipe, Logger, Provider } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";

import { PrismaService } from "../../src/common/prisma/prisma.service";
import {
  RedisService,
  REDIS_CLIENT,
} from "../../src/common/redis/redis.service";
import { StorageService } from "../../src/common/storage/storage.service";
import { EmailService } from "../../src/common/email/email.service";
import { LlmProviderService } from "../../src/modules/ai-stylist/llm-provider.service";
import { DoubaoSeedreamProvider } from "../../src/modules/try-on/services/doubao-seedream.provider";
import { GlmTryOnProvider } from "../../src/modules/try-on/services/glm-tryon.provider";
import { QUEUE_NAMES } from "../../src/modules/queue/queue.constants";

import { createMockRedisClient, createMockRedisService as buildMockRedisService } from "./redis-test-utils";

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建 PrismaService 的完整模拟
 * 包含所有 Prisma 模型的 delegate 方法以及 $transaction, $queryRaw 等
 */
export function createMockPrismaService() {
  const mockDelegate = () => ({
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    createManyAndReturn: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    upsert: jest.fn(),
    fields: {},
  });

  return {
    user: mockDelegate(),
    userProfile: mockDelegate(),
    userPhoto: mockDelegate(),
    clothingItem: mockDelegate(),
    virtualTryOn: mockDelegate(),
    aiStylistSession: mockDelegate(),
    aiStylistMessage: mockDelegate(),
    cartItem: mockDelegate(),
    favorite: mockDelegate(),
    order: mockDelegate(),
    orderItem: mockDelegate(),
    paymentRecord: mockDelegate(),
    notification: mockDelegate(),
    subscription: mockDelegate(),
    address: mockDelegate(),
    brand: mockDelegate(),
    merchant: mockDelegate(),
    styleProfile: mockDelegate(),
    customizationRequest: mockDelegate(),
    communityPost: mockDelegate(),
    communityComment: mockDelegate(),
    communityLike: mockDelegate(),
    searchHistory: mockDelegate(),
    weatherData: mockDelegate(),
    analyticsEvent: mockDelegate(),
    privacyConsent: mockDelegate(),
    userKey: mockDelegate(),

    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn((fn: unknown) => {
      if (typeof fn === "function") {
        return fn(mockPrismaClient);
      }
      return Promise.all(fn as unknown[]);
    }) as unknown as PrismaService["$transaction"],
    $queryRaw: jest.fn().mockResolvedValue([]),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(0),
    $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    $runCommandRaw: jest.fn().mockResolvedValue({}),

    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockResolvedValue(true),
    getConnectionStatus: jest.fn().mockReturnValue({
      connected: true,
      reconnectAttempts: 0,
    }),
    cleanDatabase: jest.fn().mockResolvedValue(undefined),
  } as unknown as PrismaService;
}

/**
 * 全局 mock PrismaClient 实例，用于 $transaction 回调参数
 */
const mockPrismaClient = createMockPrismaService() as unknown as PrismaClient;

/**
 * 创建 RedisService 的完整模拟
 */
export function createAppMockRedisService() {
  return buildMockRedisService();
}

/**
 * 创建 StorageService 的完整模拟
 */
export function createMockStorageService() {
  return {
    uploadImage: jest.fn().mockResolvedValue({
      url: "https://mock-minio.local/xuno/test/mock-file.jpg",
      thumbnailUrl:
        "https://mock-minio.local/xuno/test/mock-file-thumbnail.jpg",
    }),
    uploadTemporary: jest
      .fn()
      .mockResolvedValue(
        "https://mock-minio.local/xuno/test/mock-temp-file.json",
      ),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getFileUrl: jest
      .fn()
      .mockResolvedValue(
        "https://mock-minio.local/xuno/test/mock-file.jpg",
      ),
    fetchRemoteAsset: jest.fn().mockResolvedValue({
      body: Buffer.from("mock-asset-data"),
      contentType: "image/jpeg",
      cacheControl: "private, max-age=300",
    }),
    fetchRemoteAssetDataUri: jest
      .fn()
      .mockResolvedValue(
        "data:image/jpeg;base64,bW9jay1hc3NldC1kYXRh",
      ),
    uploadEncrypted: jest.fn().mockResolvedValue({
      url: "https://mock-minio.local/xuno/test/mock-encrypted-file.jpg.enc",
      thumbnailUrl:
        "https://mock-minio.local/xuno/test/mock-encrypted-file-thumbnail.jpg",
    }),
    downloadEncrypted: jest
      .fn()
      .mockResolvedValue(Buffer.from("mock-decrypted-data")),
  };
}

/**
 * 创建 EmailService 的完整模拟
 */
export function createMockEmailService() {
  return {
    send: jest.fn().mockResolvedValue({
      success: true,
      messageId: `sim_${Date.now()}_mock`,
    }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: `sim_${Date.now()}_welcome`,
    }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: `sim_${Date.now()}_reset`,
    }),
    sendEmailVerification: jest.fn().mockResolvedValue({
      success: true,
      messageId: `sim_${Date.now()}_verify`,
    }),
    sendNotificationEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: `sim_${Date.now()}_notify`,
    }),
    sendSubscriptionConfirmationEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: `sim_${Date.now()}_sub`,
    }),
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: `sim_${Date.now()}_order`,
    }),
    sendCustomizationUpdateEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: `sim_${Date.now()}_custom`,
    }),
    getEmailLogs: jest.fn().mockReturnValue([]),
    getEmailStats: jest.fn().mockReturnValue({
      total: 0,
      success: 0,
      failed: 0,
      successRate: 0,
    }),
  };
}

/**
 * 创建 LlmProviderService 的完整模拟
 */
export function createMockLlmProviderService() {
  return {
    isConfigured: true,
    providerName: "mock",
    modelName: "mock-model",
    chat: jest.fn().mockResolvedValue({
      content: JSON.stringify({
        recommendation: "mock recommendation",
        reasoning: "mock reasoning",
      }),
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      model: "mock-model",
      provider: "mock",
      finishReason: "stop",
    }),
    chatStructured: jest.fn().mockResolvedValue({
      raw: {
        content: '{"result": "mock"}',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        model: "mock-model",
        provider: "mock",
        finishReason: "stop",
      },
      parsed: { result: "mock" },
      parseError: null,
    }),
    healthCheck: jest.fn().mockResolvedValue([
      {
        provider: "mock",
        model: "mock-model",
        available: true,
        latencyMs: 10,
        error: null,
      },
    ]),
  };
}

/**
 * 创建 DoubaoSeedreamProvider 的完整模拟
 */
export function createMockDoubaoSeedreamProvider() {
  return {
    name: "doubao-seedream",
    priority: 1,
    isAvailable: jest.fn().mockResolvedValue(true),
    virtualTryOn: jest.fn().mockResolvedValue({
      resultImageUrl:
        "https://mock-minio.local/xuno/tryon-results/mock-result.png",
      processingTime: 5000,
      confidence: 0.85,
      provider: "doubao-seedream",
      metadata: {
        category: "upper_body",
        model: "doubao-seedream-3-0-t2i-250415",
      },
    }),
  };
}

/**
 * 创建 GlmTryOnProvider 的完整模拟
 */
export function createMockGlmTryOnProvider() {
  return {
    name: "glm-tryon",
    priority: 2,
    isAvailable: jest.fn().mockResolvedValue(false),
    virtualTryOn: jest.fn().mockResolvedValue({
      resultImageUrl:
        "https://mock-minio.local/xuno/tryon-results/mock-glm-result.png",
      processingTime: 3000,
      confidence: 0.6,
      provider: "glm-tryon",
      metadata: {
        category: "upper_body",
        model: "glm-4v-plus",
        fallback: true,
      },
    }),
  };
}

/**
 * 创建 BullMQ Queue 的模拟
 */
export function createMockQueue(name: string) {
  return {
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
  };
}

/**
 * 创建测试用的 ConfigService 模拟
 * 提供所有必要的环境变量默认值
 */
export function createMockConfigService(): Record<string, unknown> {
  return {
    // 数据库
    DATABASE_URL:
      "postgresql://test:test@localhost:5432/xuno_test?connection_limit=5",

    // Redis
    REDIS_URL: "redis://localhost:6379",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    REDIS_DB: 1, // 使用独立的 DB 避免与开发环境冲突
    REDIS_MAX_RETRIES: 3,
    REDIS_POOL_SIZE: 5,
    REDIS_KEEP_ALIVE: 10000,
    REDIS_CONNECT_TIMEOUT: 5000,
    REDIS_COMMAND_TIMEOUT: 3000,

    // MinIO / 存储
    MINIO_ENDPOINT: "localhost",
    MINIO_PORT: "9000",
    MINIO_ACCESS_KEY: "test-access-key",
    MINIO_SECRET_KEY: "test-secret-key",
    MINIO_BUCKET: "xuno-test",
    MINIO_USE_SSL: "false",

    // JWT
    JWT_SECRET:
      "test-jwt-secret-key-for-testing-only-at-least-64-chars-long-aaaaaa",
    JWT_REFRESH_SECRET:
      "test-jwt-refresh-secret-key-for-testing-only-at-least-64-chars-long",
    JWT_EXPIRATION: "1h",
    JWT_REFRESH_EXPIRATION: "7d",

    // LLM API
    DEEPSEEK_API_KEY: "",
    DASHSCOPE_API_KEY: "",
    GLM_API_KEY: "",
    OPENAI_API_KEY: "",
    AI_STYLIST_API_KEY: "",
    AI_STYLIST_API_ENDPOINT: "",
    AI_STYLIST_MODEL: "",

    // Doubao Seedream
    DOUBAO_SEEDREAM_API_KEY: "",
    DOUBAO_SEEDREAM_API_URL: "https://visual.volcengineapi.com/v1/aigc/generate",
    DOUBAO_SEEDREAM_RESULT_URL: "https://visual.volcengineapi.com/v1/aigc/result",
    DOUBAO_SEEDREAM_ENABLED: "false",
    DOUBAO_SEEDREAM_MODEL: "doubao-seedream-3-0-t2i-250415",

    // GLM TryOn (GLM_API_KEY shared with LLM API section above)
    GLM_TRYON_ENABLED: "false",
    GLM_TRYON_MODEL: "glm-4v-plus",

    // Email / SMTP
    SMTP_HOST: "",
    SMTP_PORT: 587,
    SMTP_USER: "",
    SMTP_PASS: "",
    SMTP_FROM_EMAIL: "test@xuno.app",
    SMTP_FROM_NAME: "寻裳 Test",
    SMTP_SECURE: "false",
    SMTP_MAX_RETRIES: 1,
    SMTP_RETRY_BASE_DELAY: 100,
    SMTP_RETRY_MAX_DELAY: 1000,

    // 应用配置
    NODE_ENV: "test",
    PORT: 3001,
    FRONTEND_URL: "http://localhost:3000",
    API_PREFIX: "api/v1",

    // 加密
    ENCRYPTION_KEY:
      "test-encryption-key-32-bytes-long!!",

    // 限流
    THROTTLE_TTL: 60000,
    THROTTLE_LIMIT: 1000,
  };
}

// ============================================================================
// 测试应用创建
// ============================================================================

/**
 * 测试配置默认值
 */
const TEST_CONFIG = {
  cors: {
    origin: ["http://localhost:3000"],
    credentials: true,
  },
  validationPipe: {
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
    transformOptions: {
      enableImplicitConversion: true,
    },
  },
};

/**
 * 创建测试用的 NestJS TestingModule
 *
 * 所有外部依赖均被模拟，适用于单元测试和集成测试。
 * 返回的模块可以直接用于创建 NestApplication 或获取服务实例。
 *
 * @param customProviders - 额外的自定义 provider，可覆盖默认 mock
 * @returns 配置好的 TestingModule
 *
 * @example
 * ```typescript
 * const module = await createTestAppModule();
 * const userService = module.get(UserService);
 * ```
 *
 * @example
 * ```typescript
 * // 覆盖特定 mock
 * const module = await createTestAppModule([
 *   {
 *     provide: PrismaService,
 *     useValue: { ...createMockPrismaService(), user: { findMany: jest.fn().mockResolvedValue([{ id: '1' }]) } }
 *   }
 * ]);
 * ```
 */
export async function createTestAppModule(
  customProviders: Provider[] = [],
): Promise<TestingModule> {
  const mockPrismaService = createMockPrismaService();
  const mockRedisService = createAppMockRedisService();
  const mockRedisClient = createMockRedisClient();
  const mockStorageService = createMockStorageService();
  const mockEmailService = createMockEmailService();
  const mockLlmProviderService = createMockLlmProviderService();
  const mockDoubaoSeedreamProvider = createMockDoubaoSeedreamProvider();
  const mockGlmTryOnProvider = createMockGlmTryOnProvider();

  const mockAiTasksQueue = createMockQueue(QUEUE_NAMES.AI_TASKS);
  const mockStyleAnalysisQueue = createMockQueue(QUEUE_NAMES.STYLE_ANALYSIS);
  const mockVirtualTryOnQueue = createMockQueue(QUEUE_NAMES.VIRTUAL_TRYON);
  const mockWardrobeMatchQueue = createMockQueue(QUEUE_NAMES.WARDROBE_MATCH);

  const defaultProviders: Provider[] = [
    { provide: PrismaService, useValue: mockPrismaService },
    { provide: REDIS_CLIENT, useValue: mockRedisClient },
    { provide: RedisService, useValue: mockRedisService },
    { provide: StorageService, useValue: mockStorageService },
    { provide: EmailService, useValue: mockEmailService },
    { provide: LlmProviderService, useValue: mockLlmProviderService },
    { provide: DoubaoSeedreamProvider, useValue: mockDoubaoSeedreamProvider },
    { provide: GlmTryOnProvider, useValue: mockGlmTryOnProvider },
    {
      provide: `BullQueue_${QUEUE_NAMES.AI_TASKS}`,
      useValue: mockAiTasksQueue,
    },
    {
      provide: `BullQueue_${QUEUE_NAMES.STYLE_ANALYSIS}`,
      useValue: mockStyleAnalysisQueue,
    },
    {
      provide: `BullQueue_${QUEUE_NAMES.VIRTUAL_TRYON}`,
      useValue: mockVirtualTryOnQueue,
    },
    {
      provide: `BullQueue_${QUEUE_NAMES.WARDROBE_MATCH}`,
      useValue: mockWardrobeMatchQueue,
    },
  ];

  const mergedProviders = [...defaultProviders, ...customProviders];

  const module = await Test.createTestingModule({
    providers: mergedProviders,
  }).compile();

  return module;
}

/**
 * 创建并初始化测试 NestApplication
 *
 * 基于 createTestAppModule() 创建的 TestingModule 构建 NestApplication，
 * 自动配置 ValidationPipe 和 CORS。
 *
 * @param module - 可选的 TestingModule，如果不提供则自动创建
 * @param customProviders - 传递给 createTestAppModule 的自定义 provider
 * @returns 初始化好的 INestApplication
 *
 * @example
 * ```typescript
 * const app = await createTestApp();
 * const response = await request(app.getHttpServer())
 *   .get('/api/v1/auth/me')
 *   .set('Authorization', `Bearer ${token}`);
 * ```
 */
export async function createTestNestApp(
  module?: TestingModule,
  customProviders?: Provider[],
): Promise<INestApplication> {
  const testingModule =
    module || (await createTestAppModule(customProviders));

  const app = testingModule.createNestApplication();

  // 配置全局 ValidationPipe
  app.useGlobalPipes(new ValidationPipe(TEST_CONFIG.validationPipe));

  // 启用 CORS
  app.enableCors(TEST_CONFIG.cors);

  await app.init();

  return app;
}

/**
 * 安全关闭测试应用
 *
 * 确保所有连接和资源被正确释放，避免测试间的资源泄漏。
 *
 * @param app - 要关闭的 NestApplication
 */
export async function closeTestNestApp(app: INestApplication): Promise<void> {
  if (app) {
    try {
      await app.close();
    } catch (error) {
      const logger = new Logger("TestApp");
      logger.warn(
        `Error closing test app: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/**
 * 从 TestingModule 获取模拟服务
 *
 * 类型安全的辅助函数，用于从测试模块中获取模拟服务实例。
 *
 * @param module - TestingModule
 * @param token - Provider token
 * @returns 模拟服务实例
 *
 * @example
 * ```typescript
 * const module = await createTestAppModule();
 * const prisma = getMockService<PrismaService>(module, PrismaService);
 * jest.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
 * ```
 */
export function getMockService<T>(
  module: TestingModule,
  token: abstract new (...args: unknown[]) => T,
): T {
  return module.get<T>(token);
}

/**
 * 重置所有模拟服务的调用记录
 *
 * 在 afterEach 中调用，确保每个测试用例的 mock 状态独立。
 *
 * @param module - TestingModule
 */
export function resetMockServices(module: TestingModule): void {
  const services = [
    PrismaService,
    RedisService,
    StorageService,
    EmailService,
    LlmProviderService,
    DoubaoSeedreamProvider,
    GlmTryOnProvider,
  ];

  for (const ServiceToken of services) {
    try {
      const service = module.get(ServiceToken);
      if (service && typeof service === "object") {
        for (const value of Object.values(service)) {
          if (jest.isMockFunction(value)) {
            value.mockClear();
          }
        }
      }
    } catch {
      // 服务可能未注册，跳过
    }
  }
}
