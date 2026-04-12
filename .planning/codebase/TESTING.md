# Testing Patterns

**Analysis Date:** 2026-04-13

## Test Framework

**Backend Runner:**
- Jest 29 with ts-jest
- Config: `apps/backend/jest.config.js`
- Preset: `ts-jest`
- Environment: `node`
- Custom resolver: `apps/backend/jest.resolver.js` (handles pnpm monorepo module resolution)
- Timeout: 30000ms (set in both `jest.config.js` and `jest.setup.js`)

**Mobile Runner:**
- Jest 29 with `jest-expo` preset and `babel-jest`
- Config: `apps/mobile/jest.config.js`
- Environment: `node`
- Run command: `pnpm test --runInBand` (serial execution for React Native)

**Assertion Library:**
- Jest built-in `expect()` (both backend and mobile)
- Mobile adds `@testing-library/jest-native/extend-expect` for component assertions

**Run Commands:**
```bash
# Backend
cd apps/backend && pnpm test                  # Run all unit tests
cd apps/backend && pnpm test:watch            # Watch mode
cd apps/backend && pnpm test:cov              # Coverage report
cd apps/backend && pnpm test:e2e              # E2E tests
cd apps/backend && pnpm test:e2e:cov          # E2E with coverage

# Mobile
cd apps/mobile && pnpm test                   # Run all tests (serial)
cd apps/mobile && pnpm test -- --coverage     # Coverage report

# Monorepo root
pnpm test                                     # Run all tests across packages
```

## Test File Organization

**Location:**
- Unit tests: Co-located with source files (e.g., `auth.service.spec.ts` next to `auth.service.ts`)
- E2E tests: Separate `test/` directory at `apps/backend/test/`
- Test utilities: `apps/backend/test/utils/`
- Test fixtures: `apps/backend/test/utils/fixtures.ts`

**Naming:**
- Unit tests: `*.spec.ts` (backend), `*.spec.ts` or `*.test.ts` (mobile)
- E2E tests: `*.e2e-spec.ts`
- Integration tests: `test/integration/*.e2e-spec.ts`

**Structure:**
```
apps/backend/
├── src/
│   ├── common/
│   │   ├── email/
│   │   │   └── email.service.spec.ts
│   │   ├── encryption/
│   │   │   └── encryption.service.spec.ts
│   │   └── soft-delete/
│   │       └── soft-delete.service.spec.ts
│   └── modules/
│       ├── auth/
│       │   ├── auth.service.spec.ts
│       │   └── ...
│       ├── clothing/
│       │   ├── clothing.service.spec.ts
│       │   └── ...
│       └── .../          # Each module has its own .spec.ts
├── test/
│   ├── auth.e2e-spec.ts
│   ├── ai-stylist.e2e-spec.ts
│   ├── health.e2e-spec.ts
│   ├── clothing.e2e-spec.ts
│   ├── try-on.e2e-spec.ts
│   ├── recommendations.e2e-spec.ts
│   ├── payment.e2e-spec.ts
│   ├── cart-order.e2e-spec.ts
│   ├── body-analysis.e2e-spec.ts
│   ├── integration/
│   │   ├── ai-stylist-flow.e2e-spec.ts
│   │   ├── payment-flow.e2e-spec.ts
│   │   └── user-flow.e2e-spec.ts
│   ├── utils/
│   │   ├── test.utils.ts
│   │   └── fixtures.ts
│   └── jest-e2e.json

apps/mobile/
├── jest.config.js
├── jest.setup.js
└── (no test files currently exist)
```

## Test Structure

**Suite Organization (Unit Tests):**
```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { ClothingCategory } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { ClothingService } from "./clothing.service";

describe("ClothingService", () => {
  let service: ClothingService;
  let prisma: PrismaService;
  let cacheService: CacheService;

  // Mock objects defined at suite scope
  const mockPrismaService = {
    clothingItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    getOrSet: jest.fn().mockImplementation(async (key, fetcher) => fetcher()),
    ttl: jest.fn(),
    exists: jest.fn(),
    refresh: jest.fn(),
  };

  // Test data fixtures defined inline
  const mockClothingItem = {
    id: "item-id",
    name: "测试服装",
    // ... full mock object
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClothingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ClothingService>(ClothingService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getItems", () => {
    it("应该返回商品列表", async () => {
      mockPrismaService.clothingItem.findMany.mockResolvedValue([mockClothingItem]);
      mockPrismaService.clothingItem.count.mockResolvedValue(1);

      const result = await service.getItems({});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
```

**Suite Organization (E2E Tests):**
```typescript
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Authentication E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe("/auth/register (POST)", () => {
    it("should register a new user", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email: "e2e-test@example.com", password: "Test123456!" })
        .expect(201);

      expect(response.body).toHaveProperty("access_token");
    });
  });
});
```

**Patterns:**
- Setup: `beforeEach` creates a NestJS `TestingModule` with mock providers
- Teardown: `afterEach` calls `jest.clearAllMocks()`
- Grouping: Nested `describe()` blocks per method/feature, with `it()` for individual cases
- Test descriptions: Chinese language for backend unit tests (e.g., `"应该返回商品列表"`, `"应该拒绝已注册的邮箱"`), English for E2E tests (e.g., `"should register a new user"`)
- Arrange-Act-Assert pattern consistently followed

## Mocking

**Framework:** Jest built-in mocking (`jest.fn()`, `jest.mock()`)

**Backend Mock Patterns:**

1. **PrismaService mock** - Plain object with jest.fn() methods matching Prisma model access:
```typescript
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};
```

2. **RedisService mock** - Plain object with jest.fn() methods:
```typescript
const mockRedisService = {
  exists: jest.fn().mockResolvedValue(false),
  incr: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(true),
  setWithTtl: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  get: jest.fn().mockResolvedValue("0"),
};
```

3. **ConfigService mock** - Function-based mock for `get()`:
```typescript
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      JWT_REFRESH_SECRET: "test-refresh-secret-key",
      JWT_SECRET: "test-jwt-secret-key",
    };
    return config[key] ?? defaultValue;
  }),
};
```

4. **Module-level mocking** via `jest.mock()`:
```typescript
jest.mock("../../common/security/bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
```

5. **Global mocks** in `apps/backend/jest.setup.js`:
```typescript
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("sharp", () => {
  return jest.fn((input) => ({
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(
      Buffer.isBuffer(input) ? input : Buffer.from("mock-thumbnail")
    ),
  }));
});

// Suppress console noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,  // Keep error for debugging
};
```

**Mobile Mock Patterns (in `apps/mobile/jest.setup.js`):**
```typescript
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => "/",
  Link: "Link",
  Stack: { Screen: "Screen" },
  Tabs: { Screen: "Screen" },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        API_URL: "http://localhost:3001/api/v1",
        AI_SERVICE_URL: "http://localhost:8001",
      },
    },
  },
}));
```

**What to Mock:**
- All external dependencies (Prisma, Redis, JWT, bcrypt, external APIs)
- File system operations (sharp, multer)
- Console output (log, debug, info, warn - keep error)
- Expo/React Native modules in mobile tests

**What NOT to Mock:**
- The service under test itself
- Business logic within the service
- Data transformation/mapping functions (test them through the service)

## Fixtures and Factories

**Test Data (Backend):**

Inline fixtures in unit tests:
```typescript
const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  password: "hashed-password",
  nickname: "Test User",
  avatar: null,
  createdAt: new Date(),
};
```

Shared fixtures in `apps/backend/test/utils/fixtures.ts`:
```typescript
export const userFixtures = {
  validUser: { email: "test@example.com", password: "Test123456!", nickname: "测试用户" },
  weakPasswordUser: { email: "weak@example.com", password: "123", nickname: "弱密码用户" },
};

export const clothingFixtures = {
  tshirt: {
    name: "经典白色T恤",
    category: ClothingCategory.tops,
    images: ["https://example.com/white-tshirt.jpg"],
    price: 199.0,
    colors: ["white", "black", "gray"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["basic", "casual", "cotton"],
  },
};

export const performanceThresholds = {
  auth: { register: 500, login: 300, refresh: 200, me: 100 },
  recommendations: { list: 500, styleGuide: 200, similar: 500 },
};
```

**Test Utilities (`apps/backend/test/utils/test.utils.ts`):**
```typescript
// Helper functions for E2E tests
export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }>
export async function registerTestUser(app, email, password?, nickname?): Promise<{ accessToken, refreshToken, userId }>
export async function loginTestUser(app, email, password?): Promise<{ accessToken, refreshToken }>
export async function cleanupTestUser(prisma, userId): Promise<void>
export function generateTestEmail(): string  // test-{timestamp}-{random}@example.com
export async function measureResponseTime(fn): Promise<number>
export async function createTestClothingItem(prisma, data?): Promise<{ id: string }>
export async function createTestUserPhoto(prisma, userId, data?): Promise<{ id: string }>
export function assertHasFields(obj, fields): void
export function assertIsPaginated(obj, itemKey?): void
```

**Location:**
- Shared fixtures: `apps/backend/test/utils/fixtures.ts`
- Shared utilities: `apps/backend/test/utils/test.utils.ts`
- Inline mock data: Within individual test files (no factory pattern)

## Coverage

**Requirements:** No minimum enforced in CI, but coverage reports are generated and uploaded.

**Current Coverage:**
- Backend: ~15% (per CLAUDE.md self-assessment)
- Mobile: ~5% (per CLAUDE.md, no test files found)

**Coverage Configuration (Backend Unit):**
```javascript
collectCoverageFrom: [
  "src/**/*.{ts,tsx}",
  "!src/main.ts",
  "!src/**/*.module.ts",
  "!src/**/*.dto.ts",
  "!src/**/*.entity.ts",
  "!src/**/*.interface.ts",
],
coverageDirectory: "./coverage",
coverageReporters: ["text", "lcov", "html"],
```

**Coverage Configuration (Backend E2E):**
```javascript
collectCoverageFrom: [
  "../src/**/*.ts",
  "!../src/main.ts",
  "!../src/**/*.module.ts",
  "!../src/**/*.dto.ts",
  "!../src/**/*.interface.ts",
  "!../src/**/*.guard.ts",
  "!../src/**/*.decorator.ts",
  "!../src/**/*.strategy.ts",
],
coverageDirectory: "../coverage/e2e",
```

**View Coverage:**
```bash
cd apps/backend && pnpm test:cov      # Generates coverage/ directory
# Open coverage/lcov-report/index.html in browser
```

## Test Types

**Unit Tests:**
- Scope: Individual services, focusing on business logic
- Approach: Mock all dependencies (Prisma, Redis, JWT, bcrypt) with `jest.fn()`
- Services tested: auth, clothing, cart, order, payment, try-on, recommendations, search, favorites, health, brands, merchant, notification, photos, privacy, profile, subscription, address, customization, analytics, encryption, soft-delete, email
- 27 unit test files found in backend
- Controllers: Only `cart.controller.spec.ts` and `order.controller.spec.ts` have controller-level tests
- No unit tests found in mobile app

**Integration Tests:**
- Scope: Multi-step business flows across service boundaries
- Approach: Uses real NestJS application with real database (PostgreSQL) and Redis via Docker services in CI
- Files: `test/integration/ai-stylist-flow.e2e-spec.ts`, `test/integration/payment-flow.e2e-spec.ts`, `test/integration/user-flow.e2e-spec.ts`
- These test complete user journeys (register -> login -> profile -> recommendations -> try-on)

**E2E Tests:**
- Scope: Full HTTP request/response cycle through NestJS application
- Approach: Uses `supertest` to make HTTP requests against a real NestJS application instance
- Framework: Jest with separate config `test/jest-e2e.json`
- Environment: Requires running PostgreSQL and Redis (Docker services in CI)
- Files: 10 E2E test files covering auth, health, clothing, try-on, recommendations, payment, cart-order, body-analysis, ai-stylist
- E2E tests use English descriptions, unit tests use Chinese

**Mobile E2E Tests:**
- Playwright is referenced in CI config (`.github/workflows/test.yml`) but is a placeholder (not configured)
- No actual mobile E2E tests exist

## Common Patterns

**Async Testing:**
```typescript
// Standard async test
it("应该成功注册新用户", async () => {
  mockPrismaService.user.findUnique.mockResolvedValue(null);
  (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

  const result = await service.register(registerDto);

  expect(result.user.email).toBe(registerDto.email);
});

// Testing with delays (async side effects)
it("应该静默处理浏览量更新错误", async () => {
  mockPrismaService.clothingItem.update.mockRejectedValue(new Error("Update failed"));
  const result = await service.getItemById("item-id");
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(result).not.toBeNull();
});
```

**Error Testing:**
```typescript
// Testing thrown exceptions
it("应该拒绝已注册的邮箱", async () => {
  mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

  await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
  expect(mockPrismaService.user.create).not.toHaveBeenCalled();
});

// Testing error messages
it("应该在账户被锁定时拒绝登录", async () => {
  mockRedisService.exists.mockResolvedValue(true);

  await expect(service.login(loginDto)).rejects.toThrow("账户已被锁定，请15分钟后再试");
});

// Testing database errors propagate
it("应该处理数据库查询错误", async () => {
  mockPrismaService.clothingItem.findMany.mockRejectedValue(new Error("Database error"));

  await expect(service.getItems({})).rejects.toThrow("Database error");
});
```

**Edge Case Testing:**
```typescript
describe("边界条件", () => {
  it("应该处理超长邮箱地址", async () => { ... });
  it("应该处理包含特殊字符的密码", async () => { ... });
  it("应该正确处理用户昵称为 null 的情况", async () => { ... });
  it("应该处理空颜色和尺寸数组", async () => { ... });
  it("应该处理零总数商品", async () => { ... });
});

describe("异常处理", () => {
  it("应该处理数据库查询错误", async () => { ... });
  it("应该处理原始查询错误", async () => { ... });
});
```

**Pagination Testing:**
```typescript
it("应该正确分页", async () => {
  mockPrismaService.clothingItem.findMany.mockResolvedValue([]);
  mockPrismaService.clothingItem.count.mockResolvedValue(50);

  const result = await service.getItems({ page: 2, limit: 10 });

  expect(result.page).toBe(2);
  expect(result.totalPages).toBe(5);
  expect(mockPrismaService.clothingItem.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ skip: 10, take: 10 }),
  );
});
```

## CI/CD Testing

**GitHub Actions Workflows:**

1. **`.github/workflows/ci.yml`** - Main CI pipeline:
   - Lint (backend only)
   - TypeCheck (backend only)
   - Security scan (pnpm audit + Snyk)
   - Unit tests with PostgreSQL + Redis services
   - Build verification
   - E2E tests (on PRs only)

2. **`.github/workflows/test.yml`** - Comprehensive test pipeline:
   - Unit tests: backend + mobile (parallel)
   - Integration tests: backend with PostgreSQL + Redis
   - E2E tests: backend with PostgreSQL + Redis
   - Playwright mobile E2E (placeholder)
   - Coverage artifacts uploaded

3. **`.github/workflows/code-quality.yml`** - Quality checks:
   - ESLint (backend + mobile, JSON reports)
   - Prettier formatting check
   - TypeScript strict check
   - Dependency audit
   - CodeQL security analysis
   - SonarCloud integration
   - Unused dependency check (depcheck)
   - Bundle size check (placeholder)

**CI Environment Variables for Tests:**
```yaml
env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'
  # Backend test env
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/stylemind_test
  JWT_SECRET: test-jwt-secret
  REDIS_URL: redis://localhost:6379
  NODE_ENV: test
```

**Test Services in CI:**
- PostgreSQL 15 Alpine
- Redis 7 Alpine

## Test Coverage Gaps

**Backend:**
- No controller tests for most modules (only cart and order controllers tested)
- No guard tests (JWT guard, roles guard)
- No interceptor tests (TransformInterceptor)
- No filter tests (AllExceptionsFilter)
- No middleware tests (ErrorHandlerMiddleware, MetricsMiddleware)
- No pipe tests (XssSanitizationPipe)
- Many modules lack spec files (ai, ai-safety, cache, code-rag, community, demo, metrics, queue, style-profiles, users, weather, ws, database)
- Overall ~15% coverage

**Mobile:**
- Zero test files exist
- No screen/component tests
- No store tests
- No API client tests
- No hook tests
- Overall ~5% coverage

---

*Testing analysis: 2026-04-13*
