# Phase 7: 代码质量提升 - Research

**Gathered:** 2026-04-16
**Status:** Complete

## Current State (Verified Facts)

### `any` Type Inventory

**Backend (`apps/backend/src/`):**
- Grep pattern `: any\b|: any\[|: any\)|as any` → 184 occurrences across 45 files
- Of those, 145 are in `.spec.ts` test files, 39 in production code
- `Record<string, any>`: 40 occurrences across 23 files
- `Record<string, unknown>`: 398 occurrences across 100 files (partial migration already done)
- No `@ts-ignore` or `@ts-expect-error` found in backend
- STATE.md baseline says 668 — discrepancy likely due to broader counting pattern (includes comments, generic positions, etc.)

**Mobile (`apps/mobile/src/`):**
- Grep pattern `: any\b|: any\[|: any\)|as any` → 86 occurrences across 46 files (excluding polyfills)
- Of those, 19 are in test files, 67 in production code
- `screens/`: 27 occurrences across 17 files
- `components/`: 35 occurrences across 21 files
- `services/`: 10 occurrences across 3 files
- `stores/`: 0 occurrences
- `Record<string, any>`: 1 occurrence
- `@ts-ignore`: 1 occurrence (performanceUtils.ts)
- polyfills/expo-router.tsx: 6 occurrences (separate concern)
- STATE.md baseline says 121 — broader counting pattern

### `any` Pattern Categorization (Production Code)

**Backend — Easy Fixes (mechanical, no business logic understanding needed):**
1. `request: any` → `Request` (Express/NestJS type) — merchant-auth.guard.ts, feature-flag.controller.ts
2. `() => new (...args: any[]) => any` → proper class type pattern — api-paginated.ts decorator
3. `data: any` → specific DTO type — sensitive-data.interceptor.ts
4. `Map<string, { value: any; ... }>` → `Map<string, { value: unknown; ... }>` — feature-flag.service.ts
5. `(this as any).$on(...)` → proper Prisma client type — prisma.service.ts
6. `status as any` / `layer.type as any` → proper enum types — queue.service.ts, customization.service.ts

**Backend — Medium Fixes (need type lookup):**
1. `Record<string, any>` mock objects in test files → `jest.Mocked<T>` or typed mock interfaces
2. `extension: any` → generic constraint type — soft-delete.extension.ts
3. `queue-monitor.service.ts: data: any` → BullMQ job data type

**Mobile — Easy Fixes:**
1. `style?: any` → `ViewStyle | TextStyle` — AnimatedHeartButton, TryOnProgress, TypewriterMessage, SocialInteractions, AlgorithmVisualization
2. `(navigation as any).navigate(...)` → proper typed navigation — multiple screens
3. `Ionicons name={icon as any}` → union of icon name strings — multiple components
4. `(e: any)` event handlers → proper event types (GestureResponderEvent, etc.)
5. `(route.params as any)?.postId` → typed route params — multiple screens
6. `(response.data as any).reason` → typed API response — multiple services

**Mobile — Medium Fixes:**
1. `keyExtractor={(item: any) => ...}` → typed FlatList renderItem — multiple lists
2. `onPress={() => (navigation as any).navigate(...)}` → typed navigation
3. API service response types — need to use @xuno/types

### Test Infrastructure Assessment

**Backend:**
- Jest 29 + ts-jest 29, testEnvironment: 'node'
- 75+ `.spec.ts` files, 16 `.e2e-spec.ts` files
- Coverage threshold: 20% across all dimensions (very low)
- Comprehensive global mocks in `test/setup.ts`: bcrypt, sharp, MinIO, BullMQ, nodemailer, opossum
- Test pattern: NestJS TestingModule with manual mock objects
- Key paths already tested:
  - auth.service.spec.ts: 924 lines, comprehensive (register, login, refresh, SMS, WeChat, password reset)
  - try-on.service.spec.ts: 1319 lines, very comprehensive (create, status, history, delete, retry, quota, archive)
  - payment.service.spec.ts: 1108 lines, comprehensive (create, query, callback, refund, close, poll, subscription)
  - order.service.spec.ts: 344 lines, moderate (create, findAll, findOne, cancel, confirm)
- Coverage gap: many modules have NO test files at all

**Mobile:**
- Jest 29 + babel-jest 29, testEnvironment: 'node'
- 44 test files found
- Coverage threshold: 60% across all dimensions (ambitious but likely not met)
- Uses @testing-library/react-native 13.3.3
- Test pattern: Heavy mocking of navigation, stores, theme, child components
- Key tests:
  - HomeScreen.test.tsx: 409 lines, heavy mocking
  - AiStylistChatScreen.test.tsx: 477 lines, heavy mocking
  - authStore.test.ts: 121 lines, token utility tests
- Coverage gap: most screens/components have NO tests

### ESLint Configuration

**Backend (`apps/backend/.eslintrc.json`):**
- Has `recommended-requiring-type-checking` ✓
- `@typescript-eslint/no-explicit-any: "warn"` (already configured)
- Many `@typescript-eslint/no-unsafe-*` rules set to "warn"

**Mobile (`apps/mobile/.eslintrc.json`):**
- Does NOT have `recommended-requiring-type-checking` ✗ (QUAL-07 gap, but Phase 1 scope)
- `@typescript-eslint/no-explicit-any: "warn"` (already configured)

### Shared Packages

- `@xuno/types`: 899 lines of rich domain types (User, UserProfile, ClothingItem, VirtualTryOn, StyleRecommendation, etc.) with enums (Gender, BodyType, SkinTone, etc.)
- `@xuno/shared`: Re-exports from types and utils/validation
- Both packages exist but are underutilized — mobile and backend often define inline types instead of using shared ones
- No `ts-morph` in project — would need to be added as dev dependency

### ts-morph Codemod Strategy

**Why ts-morph:**
- Programmatic AST manipulation is safer than regex-based find/replace
- Can infer types from context (e.g., `request: any` → check decorator for `@Request()` → `Request`)
- Can batch-process files with consistent patterns
- Supports dry-run mode for verification

**Codemod approach for backend:**
1. Install ts-morph as dev dependency
2. Write codemod scripts per pattern category
3. Run with dry-run first, verify output
4. Apply changes, run tests

**Codemod approach for mobile:**
1. Same ts-morph installation
2. Pattern-specific codemods (style props, navigation, API responses)
3. Leverage @xuno/types for API response typing

**Alternative: Manual fix with IDE assist**
- For ~39 backend production `any` and ~67 mobile production `any`, manual fixing may be more practical than writing codemods
- Codemods are most valuable for repetitive patterns (test mocks, style props)
- Recommendation: codemod for repetitive patterns, manual for complex ones

## Validation Architecture

### Dimension 1: Input Validation
- ESLint `no-explicit-any: error` (upgrade from warn) prevents new `any` types
- TypeScript strict mode catches implicit `any`
- Test coverage threshold enforcement in CI

### Dimension 2: Output Verification
- `tsc --noEmit` passes with zero `any`-related errors
- Jest coverage report meets threshold (50% backend, 30% mobile)
- ESLint reports zero `no-explicit-any` warnings in production code

### Dimension 3: Integration Points
- ts-morph codemods integrate with TypeScript compiler API
- @xuno/types provides shared types for both backend and mobile
- Jest coverage integrates with CI pipeline
- ESLint integrates with lint-staged (Phase 0)

### Dimension 4: Error Paths
- Codemod dry-run catches type incompatibilities before apply
- Test failures after `any` removal indicate missing type constraints
- Coverage reports identify untested paths

### Dimension 5: Boundary Conditions
- `Record<string, any>` in API responses → should be `Record<string, unknown>` or specific DTO
- Test mock objects with `any` → should use `jest.Mocked<T>` or typed mock interfaces
- Polyfill files with `any` → may need to remain (external type definitions)

### Dimension 6: Performance
- ts-morph codemod execution time: seconds per file
- Test suite execution: existing tests should not slow down significantly
- Coverage collection adds ~2x overhead to test execution

### Dimension 7: Security
- Removing `any` types improves type safety, catches potential runtime errors at compile time
- `request: any` → typed Request prevents accidental property access
- `data: any` → typed DTO prevents data leakage

### Dimension 8: Observability
- Coverage reports track progress toward 50%/30% targets
- ESLint `no-explicit-any` warnings count tracks `any` elimination progress
- CI pipeline provides continuous quality feedback

## Key Risks and Mitigations

1. **Risk: `any` removal breaks business logic**
   - Mitigation: PITFALLS-05 — only add types, never change logic
   - Verification: existing tests must pass after each fix

2. **Risk: Codemod produces incorrect types**
   - Mitigation: dry-run mode, manual review of changes, test verification
   - Alternative: manual fix for complex patterns

3. **Risk: Test coverage targets unrealistic**
   - Mitigation: prioritize critical paths (auth, payment, order, try-on)
   - Accept: some modules may remain below threshold if low-risk

4. **Risk: Mobile test infrastructure insufficient**
   - Mitigation: leverage existing @testing-library/react-native patterns
   - May need: MSW or similar for API mocking

5. **Risk: Phase 4/5 not complete when Phase 7 starts**
   - Mitigation: Phase 7 depends on Phase 4 (domain architecture) and Phase 5 (mobile reorganization)
   - If not complete: `any` fixes may need to be redone after restructuring

## Recommended Approach

### Wave 1: Backend `any` Elimination (QUAL-02)
1. Install ts-morph as dev dependency
2. Write codemod for easy patterns (request: any, data: any, status as any)
3. Manual fix for complex patterns (generics, interceptors)
4. Fix test file `any` patterns (mock objects → jest.Mocked<T>)
5. Upgrade ESLint `no-explicit-any` from "warn" to "error"

### Wave 2: Mobile `any` Elimination (QUAL-03)
1. Write codemod for style prop patterns (style?: any → ViewStyle)
2. Manual fix for navigation typing (use typed navigation)
3. Manual fix for API response typing (use @xuno/types)
4. Fix test file `any` patterns
5. Upgrade ESLint `no-explicit-any` from "warn" to "error"

### Wave 3: Backend Test Coverage (QUAL-04)
1. Identify modules with NO test files
2. Write integration tests for critical paths (auth, try-on, payment, order)
3. Write unit tests for service methods with no coverage
4. Increase coverage threshold from 20% to 50%
5. Verify CI gate passes

### Wave 4: Mobile Test Coverage (QUAL-05)
1. Identify screens/components with NO tests
2. Write component tests for critical pages (Home, StylistChat, Cart, Profile)
3. Write store tests for Zustand stores
4. Write service tests for API service layer
5. Increase coverage threshold to 30%
6. Verify CI gate passes

---

*Phase: 07-code-quality*
*Research gathered: 2026-04-16*
