# Testing

**Project:** 寻裳 (XunO)
**Last mapped:** 2026-04-16

## Backend Testing

### Framework & Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Jest | 29.7 | Unit & integration testing |
| Supertest | 7.2 | HTTP endpoint testing |
| @nestjs/testing | 11.x | NestJS test utilities |
| ts-jest | 29.4 | TypeScript support |

### Test Structure

```
apps/backend/
├── test/                           # E2E tests
│   ├── setup.ts                    # Global setup
│   ├── utils/                      # Test utilities
│   │   ├── fixtures.ts             # Test data fixtures
│   │   ├── test-app.module.ts      # Test app module
│   │   ├── test.utils.ts           # Helper functions
│   │   └── ai-mock-player.ts       # AI service mock
│   ├── auth.e2e-spec.ts            # Auth E2E tests
│   ├── ai-stylist.e2e-spec.ts      # AI Stylist E2E tests
│   ├── cart-order.e2e-spec.ts      # Cart + Order E2E
│   ├── clothing.e2e-spec.ts        # Clothing E2E
│   ├── health.e2e-spec.ts          # Health check E2E
│   ├── payment.e2e-spec.ts         # Payment E2E
│   ├── try-on-flow.e2e-spec.ts     # Try-on flow E2E
│   └── try-on.e2e-spec.ts          # Try-on E2E
└── src/modules/{feature}/
    └── {feature}.service.spec.ts   # Unit tests per module
```

### Unit Test Pattern

```typescript
describe('FeatureService', () => {
  let service: FeatureService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(FeatureService);
  });

  it('should ...', async () => { ... });
});
```

### E2E Test Pattern

```typescript
describe('Feature (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    // Setup test app with TestAppModule
  });

  it('/api/v1/feature (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/feature')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

### Test Commands

```bash
cd apps/backend
pnpm test              # Unit tests
pnpm test:cov          # Coverage report
pnpm test:e2e          # E2E tests
pnpm test:e2e:cov      # E2E coverage
```

### Coverage

- Current: ~15% (known issue)
- Many service files have `.spec.ts` counterparts but coverage is low

## Mobile Testing

### Framework & Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Jest | 29.7 | Unit testing |
| @testing-library/react-native | 13.3 | Component testing |
| react-test-renderer | 18.3.1 | Component rendering |
| Detox | — | E2E testing |

### Test Structure

```
apps/mobile/
├── e2e/                            # Detox E2E tests
│   ├── auth.test.ts                # Auth flow E2E
│   ├── navigation.test.ts          # Navigation E2E
│   ├── utils/test-helpers.ts       # E2E helpers
│   └── jest.config.js
├── src/
│   ├── components/
│   │   ├── heartrecommend/__tests__/
│   │   │   └── SwipeCard.test.tsx
│   │   └── primitives/Button/__tests__/
│   │       └── Button.test.tsx
│   ├── hooks/__tests__/            # Hook tests
│   │   ├── useApi.test.ts
│   │   ├── useAsync.test.ts
│   │   ├── useDebounce.test.ts
│   │   ├── useForm.test.ts
│   │   └── ...
│   ├── screens/__tests__/          # Screen tests
│   │   ├── AiStylistChatScreen.test.tsx
│   │   └── HomeScreen.test.tsx
│   ├── services/api/__tests__/     # API service tests
│   │   ├── auth.api.test.ts
│   │   ├── client.test.ts
│   │   ├── clothing.api.test.ts
│   │   └── ...
│   ├── stores/__tests__/           # Store tests
│   │   ├── authStore.test.ts
│   │   ├── clothingStore.test.ts
│   │   └── ...
│   └── utils/__tests__/            # Utility tests
│       ├── errorHandling.test.ts
│       ├── helpers.test.ts
│       └── ...
└── jest.config.js
```

### Test Commands

```bash
cd apps/mobile
pnpm test              # Unit tests
pnpm typecheck         # TypeScript check
pnpm lint              # ESLint
```

### Coverage

- Current: ~5% (known issue)
- Most test files exist but many screens lack coverage

## AI/ML Service Testing

### Framework

| Tool | Purpose |
|------|---------|
| pytest | Python testing |
| conftest.py | Shared fixtures |

### Test Structure

```
ml/api/tests/
├── conftest.py         # Shared fixtures
├── test_auth.py        # Auth tests
├── test_health.py      # Health check tests
├── test_recommend.py   # Recommendation tests
├── test_stylist.py     # Stylist chat tests
└── test_tasks.py       # Task processing tests
```

## Load Testing

| Tool | Location |
|------|----------|
| k6 | `tests/load/k6/config.js` |

## Known Testing Gaps

1. **Backend coverage ~15%**: Many modules lack comprehensive unit tests
2. **Mobile coverage ~5%**: Most screens have no test coverage
3. **AI service**: Limited test coverage for ML pipelines
4. **Integration tests**: Missing cross-module integration tests
5. **E2E mobile**: Detox tests exist but are minimal
6. **No CI test gate**: Tests don't block merges
