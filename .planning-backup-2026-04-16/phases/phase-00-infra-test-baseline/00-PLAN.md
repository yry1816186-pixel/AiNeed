---
phase: 0
wave: 1
depends_on: []
requirements_addressed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09]
files_modified:
  - .github/PULL_REQUEST_TEMPLATE.md
  - .github/ISSUE_TEMPLATE/bug_report.yml
  - .github/ISSUE_TEMPLATE/feature_request.yml
  - apps/backend/src/modules/ai-safety/ai-safety.service.spec.ts
  - apps/backend/src/modules/ai-stylist/ai-stylist.service.spec.ts
  - apps/backend/src/modules/clothing/clothing.service.spec.ts
  - apps/backend/src/modules/cart/cart.service.spec.ts
  - apps/backend/src/modules/health/health.service.spec.ts
  - apps/backend/src/modules/photos/photos.service.spec.ts
  - apps/backend/src/modules/recommendations/recommendations.service.spec.ts
  - apps/backend/src/modules/security/encryption/pii-encryption.service.spec.ts
  - apps/backend/src/modules/auth/auth.service.spec.ts
  - apps/backend/src/modules/users/users.service.spec.ts
  - apps/backend/src/modules/subscription/subscription.service.spec.ts
  - apps/backend/src/modules/try-on/try-on.service.spec.ts
  - apps/backend/src/modules/profile/profile.service.spec.ts
  - apps/backend/src/modules/order/order.service.spec.ts
  - apps/backend/src/modules/payment/payment.service.spec.ts
  - apps/backend/src/modules/clothing/clothing.controller.spec.ts
  - apps/backend/src/modules/recommendations/recommendations.controller.spec.ts
  - apps/mobile/src/services/__tests__/api.test.ts
  - apps/mobile/src/stores/__tests__/authStore.test.ts
  - apps/mobile/src/utils/__tests__/helpers.test.ts
autonomous: true
---

# Phase 0 Plan: 基础设施 & 测试基线

<objective>
Complete all infrastructure baseline requirements: fix failing tests, increase backend test coverage to 50%+, add mobile test framework, add PR/issue templates, verify Sentry/logging/migration/Docker/JSON:API are properly configured.
</objective>

## Task 1: Fix 8 Failing Test Suites

<read_first>
- apps/backend/src/modules/ai-safety/ai-safety.service.spec.ts
- apps/backend/src/modules/ai-safety/ai-safety.service.ts
- apps/backend/src/modules/ai-stylist/ai-stylist.service.spec.ts
- apps/backend/src/modules/ai-stylist/ai-stylist.service.ts
- apps/backend/src/modules/clothing/clothing.service.spec.ts
- apps/backend/src/modules/clothing/clothing.service.ts
- apps/backend/src/modules/cart/cart.service.spec.ts
- apps/backend/src/modules/cart/cart.service.ts
- apps/backend/src/modules/health/health.service.spec.ts
- apps/backend/src/modules/health/health.service.ts
- apps/backend/src/modules/photos/photos.service.spec.ts
- apps/backend/src/modules/photos/photos.service.ts
- apps/backend/src/modules/recommendations/recommendations.service.spec.ts
- apps/backend/src/modules/recommendations/recommendations.service.ts
- apps/backend/src/modules/security/encryption/pii-encryption.service.spec.ts
- apps/backend/src/modules/security/encryption/pii-encryption.service.ts
</read_first>

<action>
1. Read each failing spec file and its corresponding service file
2. For each spec, identify why tests fail (missing mocks, wrong expectations, missing providers)
3. Fix each spec by:
   - Adding missing provider mocks in TestBed
   - Correcting test expectations to match actual service behavior
   - Adding missing dependency injections
   - Ensuring all mock return values match service method signatures
4. Run `cd apps/backend && npx jest --testPathPattern="ai-safety|ai-stylist|clothing|cart|health|photos|recommendations|pii-encryption" --no-coverage` to verify all pass
</action>

<acceptance_criteria>
- `cd apps/backend && npx jest --testPathPattern="ai-safety.service|ai-stylist.service|clothing.service|cart.service|health.service|photos.service|recommendations.service|pii-encryption.service" --no-coverage` exits with code 0
- All 8 previously failing suites now pass
- No new test failures introduced
</acceptance_criteria>

## Task 2: Add Missing Test Files to Reach 50%+ Backend Coverage

<read_first>
- apps/backend/jest.config.js
- apps/backend/src/modules/profile/profile.service.ts
- apps/backend/src/modules/order/order.service.ts
- apps/backend/src/modules/payment/payment.service.ts
- apps/backend/src/modules/clothing/clothing.controller.ts
- apps/backend/src/modules/recommendations/recommendations.controller.ts
- apps/backend/src/modules/search/search.service.ts
- apps/backend/src/modules/wardrobe-collection/wardrobe-collection.service.ts
- apps/backend/src/modules/style-quiz/style-quiz.service.ts
- apps/backend/src/modules/subscription/subscription.service.ts
</read_first>

<action>
1. Run `cd apps/backend && npx jest --coverage --collectCoverageFrom="src/**/*.{ts,tsx}" 2>&1 | tail -50` to see current coverage
2. Identify modules with 0% coverage
3. Create spec files for the top 10 uncovered modules:
   - profile.service.spec.ts
   - order.service.spec.ts
   - payment.service.spec.ts
   - clothing.controller.spec.ts
   - recommendations.controller.spec.ts
   - search.service.spec.ts
   - wardrobe-collection.service.spec.ts
   - style-quiz.service.spec.ts
   - subscription.service.spec.ts (fix existing)
   - try-on.service.spec.ts (fix existing)
4. Each spec must have:
   - Proper module setup with all required providers mocked
   - At least 3-5 test cases covering main service methods
   - Both success and error scenarios
5. Run coverage check after each batch
</action>

<acceptance_criteria>
- `cd apps/backend && npx jest --coverage 2>&1 | grep "All files"` shows coverage >= 50% for lines
- All new spec files exist and pass
- No existing tests broken
</acceptance_criteria>

## Task 3: Add Mobile Test Framework and Initial Tests

<read_first>
- apps/mobile/jest.config.js
- apps/mobile/package.json
- apps/mobile/src/services/api.ts
- apps/mobile/src/stores/authStore.ts
- apps/mobile/src/utils/helpers.ts
</read_first>

<action>
1. Check if @testing-library/react-native is installed: `cd apps/mobile && cat package.json | grep testing-library`
2. If not installed: `cd apps/mobile && pnpm add -D @testing-library/react-native @testing-library/jest-native jest-expo`
3. Create test directory structure:
   - apps/mobile/src/services/__tests__/api.test.ts
   - apps/mobile/src/stores/__tests__/authStore.test.ts
   - apps/mobile/src/utils/__tests__/helpers.test.ts
4. Write initial tests:
   - api.test.ts: test API base URL config, request interceptor setup, error handling
   - authStore.test.ts: test login/logout state changes, token persistence
   - helpers.test.ts: test utility functions (formatters, validators)
5. Update jest.config.js if needed for proper module resolution
6. Run `cd apps/mobile && npx jest --no-coverage` to verify
</action>

<acceptance_criteria>
- `cd apps/mobile && npx jest --passWithNoTests` exits with code 0
- At least 3 test files exist under apps/mobile/src/**/__tests__/
- Each test file has at least 3 passing test cases
- jest.config.js properly configured for React Native/Expo
</acceptance_criteria>

## Task 4: Add GitHub PR and Issue Templates

<read_first>
- (no existing files to read — these are new)
</read_first>

<action>
1. Create .github/PULL_REQUEST_TEMPLATE.md with:
   - Description section
   - Type of change checkboxes (bugfix, feature, refactor, test, docs, infra)
   - How Has This Been Tested section
   - Checklist (self-review, comments, no new warnings, tests added, docs updated)
2. Create .github/ISSUE_TEMPLATE/bug_report.yml with:
   - Description, Steps to Reproduce, Expected Behavior, Actual Behavior, Environment
3. Create .github/ISSUE_TEMPLATE/feature_request.yml with:
   - Problem Statement, Proposed Solution, Alternatives Considered, Additional Context
4. Create .github/ISSUE_TEMPLATE/config.yml with:
   - blank_issues_enabled: false
   - contact_links for questions/discussions
</action>

<acceptance_criteria>
- .github/PULL_REQUEST_TEMPLATE.md exists and contains "Type of change" and "Checklist"
- .github/ISSUE_TEMPLATE/bug_report.yml exists with "Steps to Reproduce" field
- .github/ISSUE_TEMPLATE/feature_request.yml exists with "Proposed Solution" field
- .github/ISSUE_TEMPLATE/config.yml exists with blank_issues_enabled: false
</acceptance_criteria>

## Task 5: Verify and Harden Existing Infrastructure

<read_first>
- .github/workflows/ci.yml
- apps/backend/src/common/sentry/sentry.service.ts
- apps/backend/src/common/logging/structured-logger.service.ts
- apps/backend/src/common/interceptors/json-api.interceptor.ts
- apps/backend/prisma/migrations/
- docker-compose.production.yml
- apps/backend/.env.example
- apps/backend/src/app.module.ts
</read_first>

<action>
1. Verify CI pipeline: confirm ci.yml has lint → typecheck → test → build flow (already confirmed ✅)
2. Verify Sentry: confirm SentryModule is imported in app.module.ts and SENTRY_DSN is in .env.example (already confirmed ✅)
3. Verify structured logging: confirm StructuredLoggerService is used (already confirmed ✅)
4. Verify Prisma migrations: confirm migration files exist and `npx prisma migrate status` works (already confirmed ✅)
5. Verify Docker production config: confirm health checks and resource limits (already confirmed ✅)
6. Verify JSON:API interceptor: confirm JsonApiInterceptor exists and is registered globally
7. Verify environment separation: confirm .env.example has NODE_ENV, separate configs for dev/staging/production
8. If any verification fails, fix the specific issue
9. Remove CATVTON_ENDPOINT from .env.example (known issue from CLAUDE.md)
</action>

<acceptance_criteria>
- ci.yml contains jobs: lint, typecheck, test-backend, build-backend (confirmed ✅)
- SentryModule imported in app.module.ts (confirmed ✅)
- SENTRY_DSN present in .env.example (confirmed ✅)
- StructuredLoggerService used across codebase (confirmed ✅)
- Prisma migrations directory has at least 5 migration files (confirmed ✅)
- docker-compose.production.yml has healthcheck for postgres, redis, minio, backend (confirmed ✅)
- JsonApiInterceptor registered globally in app
- .env.example does NOT contain CATVTON_ENDPOINT
- All environment configs properly separated
</acceptance_criteria>

## Verification

<must_haves>
- All 8 previously failing test suites now pass
- Backend test coverage >= 50%
- Mobile test framework configured with at least 3 test files
- GitHub PR and issue templates exist
- CATVTON_ENDPOINT removed from .env.example
- JSON:API interceptor registered globally
- `cd apps/backend && pnpm lint` exits 0
- `cd apps/backend && npx tsc --noEmit` exits 0
</must_haves>
