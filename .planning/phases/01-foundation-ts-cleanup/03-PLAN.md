---
wave: 2
depends_on: [01-PLAN.md, 02-PLAN.md]
files_modified:
  - apps/backend/src/domains/identity/auth/dto/auth.dto.ts
  - apps/backend/src/domains/identity/auth/auth.service.ts
  - apps/backend/src/domains/identity/profile/services/user-profile.service.ts
  - apps/backend/src/domains/identity/profile/profile.service.ts
  - apps/backend/src/domains/identity/onboarding/onboarding.service.ts
  - apps/backend/src/domains/identity/privacy/privacy.service.ts
  - apps/backend/src/domains/identity/privacy/consent.controller.ts
  - apps/backend/src/domains/identity/users/users.service.ts
  - apps/backend/src/common/interceptors/json-api.interceptor.ts
  - apps/backend/src/common/filters/http-exception.filter.ts
  - apps/backend/src/common/prisma/soft-delete.extension.ts
  - apps/backend/src/common/decorators/api-json-api-response.decorator.ts
  - apps/backend/src/common/interceptors/image-response.interceptor.ts
  - apps/backend/src/common/interceptors/cache.interceptor.ts
  - apps/backend/src/common/soft-delete/soft-delete.service.ts
  - apps/backend/src/common/prisma/prisma.service.ts
  - apps/backend/src/common/utils/pagination.util.ts
  - apps/backend/src/common/config/env.validation.ts
  - apps/backend/src/common/services/image-processing.service.ts
  - apps/mobile/src/features/onboarding/stores/index.ts
requirements_addressed: [FND-01, GND-01, GND-02, GND-03, GND-05]
autonomous: true
---

# Plan 03: Remaining `any` Types + Gender Demotion + Quality Gate

**Objective:** Eliminate `any` in identity domain, common/ infrastructure, and remaining scattered files. Implement gender demotion across auth DTOs, onboarding, and profile services. Target: backend `any` count < 200, `tsc --noEmit` zero errors.

## Task 1: Gender demotion — Auth DTO (GND-01)

<read_first>

- apps/backend/src/domains/identity/auth/dto/auth.dto.ts
- apps/backend/src/domains/identity/auth/auth.service.ts
  </read_first>

<action>
1. In `auth.dto.ts`: Find the `gender` field and change its decorator from `@IsEnum(Gender)` or `@IsString()` to `@IsOptional() @IsString()` (or `@IsOptional() @IsEnum(Gender)` if it uses an enum).
2. If `gender` is currently required, make it optional. The field stays in the DTO for backward compatibility but is no longer mandatory.
3. In `auth.service.ts`: Find any code that requires `gender` to be set during registration. Make it optional:
   - Remove any validation that throws if `gender` is missing
   - Remove any default value assignment for `gender` (e.g., `gender: dto.gender || 'unknown'`)
   - Keep the field in the user creation call if the DB schema requires it, but make it nullable
4. Remove any `any` types encountered in auth.service.ts (currently has eslint-disable + string literal console.log)
</action>

<acceptance_criteria>

- `gender` field in auth DTO has `@IsOptional()` decorator
- Registration works without providing `gender`
- `tsc --noEmit` passes
- No `eslint-disable @typescript-eslint/no-explicit-any` in auth.service.ts
  </acceptance_criteria>

---

## Task 2: Gender demotion — Onboarding + Profile (GND-02, GND-03, GND-05)

<read_first>

- apps/backend/src/domains/identity/onboarding/onboarding.service.ts
- apps/backend/src/domains/identity/profile/services/user-profile.service.ts
- apps/backend/src/domains/identity/profile/profile.service.ts
- apps/mobile/src/features/onboarding/stores/index.ts
  </read_first>

<action>

**Backend (GND-02):**

1. In `onboarding.service.ts`: Ensure onboarding requires `primaryScenarios`, `ageBand`, `styleExpression` instead of `gender`
2. If the onboarding DTO has `gender` as required, make it optional and add the new required fields
3. Verify the onboarding completion logic doesn't depend on gender

**Backend (GND-03):**

1. Find `BodyMetricsService` or equivalent in the codebase
2. Replace any default values that fall back to `Gender.female` with continuous variable calculations based on `waist/hip ratio`
3. Use BMI or waist-hip ratio for size recommendations instead of gendered defaults

**Backend (GND-05):**

1. In profile completeness calculation: set `gender` weight to 0%
2. Redistribute weights: 场景 20% + 体型 25% + 风格 20% + 衣橱 20% + 照片 15%
3. Update any completeness percentage calculation functions

**Mobile (GND-02):** 4. In `apps/mobile/src/features/onboarding/stores/index.ts`: Ensure the onboarding flow collects `primaryScenarios`, `ageBand`, `styleExpression` and does not require `gender`
</action>

<acceptance_criteria>

- Onboarding DTO requires primaryScenarios, ageBand, styleExpression (not gender)
- BodyMetricsService uses waist/hip ratio, not gender fallback
- Profile completeness: gender weight = 0%, 场景 20%+体型 25%+风格 20%+衣橱 20%+照片 15%
- Mobile onboarding store collects the 3 required fields
- `tsc --noEmit` passes for both backend and mobile
  </acceptance_criteria>

---

## Task 3: Remove `any` from identity domain production code

<read_first>

- apps/backend/src/domains/identity/profile/services/user-profile.service.ts (12 any)
- apps/backend/src/domains/identity/profile/profile.service.ts (4 any)
- apps/backend/src/domains/identity/users/users.service.ts (4 any)
- apps/backend/src/domains/identity/privacy/privacy.service.ts (2 any)
- apps/backend/src/domains/identity/privacy/consent.controller.ts (2 any)
- apps/backend/src/domains/identity/onboarding/onboarding.service.ts (2 any)
- apps/backend/src/domains/identity/auth/auth.service.ts (2 any)
  </read_first>

<action>
For each file:
1. Remove `eslint-disable @typescript-eslint/no-explicit-any` directives
2. Type all Prisma query results: use `Prisma.UserGetPayload<{...}>` or explicit interfaces
3. Type all method parameters and return values
4. For dynamic data (user preferences, onboarding answers): use `Record<string, unknown>` with type guards
5. For auth service: type JWT payloads, token results, and user creation data

Expected `any` reduction from identity domain: ~28 from production files listed above, plus ~60 from single-usage barrel files and module files with eslint-disable directives.
</action>

<acceptance_criteria>

- Zero `any` in the 7 files listed above
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 4: Remove `any` from common/ infrastructure

<read_first>

- apps/backend/src/common/prisma/soft-delete.extension.ts (6 any)
- apps/backend/src/common/interceptors/json-api.interceptor.ts (see spec for types)
- apps/backend/src/common/filters/http-exception.filter.ts (see spec for types)
- apps/backend/src/common/interceptors/image-response.interceptor.ts (3 any)
- apps/backend/src/common/interceptors/cache.interceptor.ts (2 any)
- apps/backend/src/common/decorators/api-json-api-response.decorator.ts (4 any)
- apps/backend/src/common/soft-delete/soft-delete.service.ts (2 any)
- apps/backend/src/common/prisma/prisma.service.ts (2 any)
- apps/backend/src/common/utils/pagination.util.ts (2 any)
- apps/backend/src/common/config/env.validation.ts (1 any)
- apps/backend/src/common/services/image-processing.service.ts (see spec for types)
  </read_first>

<action>
For each file:
1. Remove `eslint-disable` directives
2. Type NestJS interceptor parameters using `ExecutionContext`, `CallHandler`, `NestInterceptor<T, R>`
3. Type exception filter parameters using `ArgumentsHost`, `HttpException`
4. Type Prisma extension results with `Prisma.*` utility types
5. Type pagination utility with generic `<T>`: `PaginatedResult<T>` with `{ data: T[]; meta: { total, page, limit } }`
6. For decorators: type Swagger decorator parameters with `ApiProperty` options

Note: Skip `.spec.ts` files in this task — they are addressed in Task 5.
</action>

<acceptance_criteria>

- Zero `any` in all 11 common/ production files listed above
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 5: Clean up test spec `any` types (highest-impact batch)

<read_first>

- apps/backend/src/common/interceptors/json-api.interceptor.spec.ts (126 any)
- apps/backend/src/common/filters/http-exception.filter.spec.ts (38 any)
- apps/backend/src/common/services/image-processing.service.spec.ts (16 any)
- apps/backend/src/common/interceptors/error.interceptor.spec.ts (16 any)
- apps/backend/src/common/interceptors/image-response.interceptor.spec.ts (6 any)
  </read_first>

<action>
These 5 test files contain ~202 `any` usages — the single biggest cluster in the codebase.

Strategy for test specs:

1. Type mock objects: Replace `as any` mocks with properly typed mock factories:
   ```typescript
   function createMockExecutionContext(override?: Partial<ExecutionContext>): ExecutionContext {
     return { ...defaultMock, ...override } as unknown as ExecutionContext;
   }
   ```
2. Type mock request/response objects: Define `MockRequest`, `MockResponse` interfaces
3. For `json-api.interceptor.spec.ts` (126 any): This is likely using `any` for every mock call. Replace with a typed mock helper that returns proper NestJS types.
4. For `http-exception.filter.spec.ts` (38 any): Type `ArgumentsHost` mock, type exception objects.
5. For `image-processing.service.spec.ts` (16 any): Type sharp/buffer mock results.

This single task reduces the `any` count by ~200.
</action>

<acceptance_criteria>

- `any` count across these 5 spec files reduced from ~202 to < 20
- All existing tests still pass (`pnpm test` in apps/backend)
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 6: Sweep remaining single-usage `any` files

<read_first>

- Run: `grep -rl "eslint-disable.*no-explicit-any" apps/backend/src/domains/ --include="*.ts"`
- This will show ~90 barrel/index.ts files and module files with top-level eslint-disable
  </read_first>

<action>
Many files have a single `/* eslint-disable @typescript-eslint/no-explicit-any */` at the top but may not actually use `any`. For each:
1. Remove the eslint-disable directive
2. If the file has no actual `any` usage — done (many barrel files fall here)
3. If it has `any` — type it properly using the strategies above

Target files: all files in `domains/` that have the eslint-disable comment but aren't in the top-offender lists already addressed. This is a mechanical sweep.

Group by domain:

- **platform/**: ~90 files (mostly module/controller/service boilerplate)
- **identity/**: ~62 files
- **ai-core/**: ~57 files
- **commerce/**: ~55 files
- **fashion/**: ~22 files
- **customization/**: ~1 file
  </action>

<acceptance_criteria>

- `grep -rl "eslint-disable.*no-explicit-any" apps/backend/src/domains/ --include="*.ts" | grep -v ".spec." | wc -l` returns < 10
- Total backend `any` count < 200
- `tsc --noEmit` zero errors
  </acceptance_criteria>

---

## Task 7: Mobile console.log cleanup

<read_first>

- apps/mobile/src/shared/components/screens/ScreenErrorBoundaries.ts (28 console.log)
- apps/mobile/src/features/stylist/components/AICompanionProvider.tsx (15 total)
- apps/mobile/src/utils/performanceMonitor.ts (6)
- apps/mobile/src/shared/utils/performanceMonitor.ts (6, likely duplicate)
- apps/mobile/src/stores/notificationStore.ts (6)
- apps/mobile/src/features/onboarding/stores/index.ts (6)
  </read_first>

<action>
Strategy by type:
1. **ScreenErrorBoundaries.ts** (28 console.log in error callbacks): Replace with silent error reporting or remove entirely — error boundaries in production should not log to console.
2. **AICompanionProvider.tsx** (15): Replace `console.error` with error boundary / crash reporting. Replace `console.warn` with dev-only `__DEV__ && console.warn` pattern.
3. **performanceMonitor.ts** (duplicate files): Keep one canonical version, remove the duplicate. Replace `console.log` with a no-op in production.
4. **Stores** (notificationStore, onboarding, etc.): Replace `console.error` in catch blocks with proper error tracking service or `__DEV__` gated logging.
5. **API client** (`services/api/client.ts`): Replace console.log with request/response interceptor logging that can be toggled.

Pattern to use throughout:

```typescript
// Replace console.log with:
if (__DEV__) {
  console.log(message); // Keep only in development
}

// Or better, use the existing logger utility:
// apps/mobile/src/shared/utils/logger.ts
```

Note: Many of these are `console.error` in catch blocks which are defensible for error visibility. Prioritize `console.log` removal first.
</action>

<acceptance_criteria>

- `console.log` count in mobile src/ reduced from 14 to < 5 (only in **DEV** guards or logger utility)
- No duplicate files (performanceMonitor, imageCache, etc.)
- Error boundary callbacks don't console.log in production
- App still functions correctly
  </acceptance_criteria>

---

## Final Quality Gate

```bash
# Backend: zero type errors
cd C:/AiNeed/apps/backend && npx tsc --noEmit
echo "Exit code: $?"

# Backend: count remaining `any` in production code
grep -r ": any\|as any" src/domains/ src/common/ src/modules/ --include="*.ts" | grep -v ".spec." | wc -l
# Target: < 200

# Backend: count eslint-disable directives
grep -r "eslint-disable.*no-explicit-any" src/ --include="*.ts" | grep -v ".spec." | wc -l
# Target: < 10

# Backend: console.log check
grep -r "console\." src/ --include="*.ts" | grep -v ".spec." | grep -v "structured-logger" | grep -v "scripts/"
# Target: only in structured-logger (intentional) and auth string literals

# Mobile: console.log count
grep -r "console\." apps/mobile/src/ --include="*.ts" --include="*.tsx" | grep -v ".spec." | wc -l
# Target: < 30 (down from 139)

# Run backend tests
cd C:/AiNeed/apps/backend && pnpm test --passWithNoTests 2>&1 | tail -20
```

**SUCCESS CRITERIA:**

- `tsc --noEmit` zero errors (backend)
- Backend production `any` count < 200
- Backend eslint-disable any directives < 10
- All backend tests pass
- Controller only injects Orchestrator
- ColdStartService has zero gender references
- Mobile console.log count reduced by > 70%
