# Coding Conventions

**Analysis Date:** 2026-04-13

## Naming Patterns

**Files:**
- Backend services: `kebab-case.service.ts` (e.g., `auth.service.ts`, `clothing.service.ts`)
- Backend controllers: `kebab-case.controller.ts` (e.g., `auth.controller.ts`, `clothing.controller.ts`)
- Backend modules: `kebab-case.module.ts` (e.g., `auth.module.ts`)
- Backend DTOs: `kebab-case.dto.ts` (e.g., `auth.dto.ts`)
- Backend specs: `kebab-case.service.spec.ts` (unit), `kebab-case.e2e-spec.ts` (e2e)
- Backend helpers: `kebab-case.helpers.ts` (e.g., `auth.helpers.ts`)
- Backend index/barrel files: `index.ts` for re-exports
- Mobile screens: `PascalCaseScreen.tsx` (e.g., `HomeScreen.tsx`, `LoginScreen.tsx`)
- Mobile stores: `camelCaseStore.ts` (e.g., `clothingStore.ts`, `uiStore.ts`)
- Mobile API services: `kebab-case.api.ts` (e.g., `auth.api.ts`, `clothing.api.ts`)
- Mobile hooks: `useCamelCase.ts` (e.g., `useAsync.ts`, `useDebounce.ts`)
- Mobile components: directories with `PascalCase` files inside (e.g., `components/ErrorBoundary/`)
- Mobile types: grouped by domain (e.g., `types/user.ts`, `types/api.ts`, `types/navigation.ts`)

**Functions:**
- camelCase for all functions (e.g., `register()`, `login()`, `validateUser()`)
- Async functions use `async/await`, not raw Promises
- Private helper methods prefixed with descriptive names (e.g., `buildAuthResponse()`, `generateTokens()`, `saveRefreshToken()`)

**Variables:**
- camelCase for all variables (e.g., `mockPrismaService`, `accessToken`, `featuredItems`)
- Constants in UPPER_SNAKE_CASE at module scope (e.g., `PASSWORD_REGEX`, `PASSWORD_ERROR_MSG`, `CACHE_TTL`)
- Readonly arrays/types defined with `const` and `as const` (e.g., `const GenderValues = ["male", "female", "other"] as const`)

**Types/Interfaces:**
- PascalCase for interfaces and types (e.g., `AuthResponseDto`, `ClothingFilter`, `PaginatedResponse<T>`)
- Suffix DTOs with `Dto` (e.g., `RegisterDto`, `LoginDto`, `RefreshTokenDto`)
- Suffix state interfaces with `State` in Zustand stores (e.g., `ClothingState`, `AuthState`)
- Enum values are camelCase strings (e.g., `Gender.Male = 'male'`, `BodyType.Hourglass = 'hourglass'`)
- Generic utility types defined in `apps/mobile/src/types/index.ts`: `Nullable<T>`, `Optional<T>`, `Maybe<T>`, `DeepPartial<T>`

**Classes:**
- PascalCase (e.g., `AuthService`, `ClothingService`, `AllExceptionsFilter`)
- Suffix with function (e.g., `*Service`, `*Controller`, `*Filter`, `*Guard`, `*Interceptor`, `*Exception`)
- NestJS Injectable classes annotated with `@Injectable()`, `@Controller()`, etc.

## Code Style

**Formatting:**
- Prettier configured at root `.prettierrc`
- Semi-colons: required
- Quotes: double quotes
- Tab width: 2 spaces
- Trailing comma: ES5
- Print width: 100 characters
- Arrow parens: always
- End of line: LF

**Linting:**
- Backend ESLint config: `apps/backend/.eslintrc.json`
  - Extends: `eslint:recommended`, `@typescript-eslint/recommended`, `@typescript-eslint/recommended-requiring-type-checking`, `import/recommended`, `prettier`
  - Plugins: `@typescript-eslint`, `import`
  - Strict type checking enabled (project-based parsing from `tsconfig.json`)
- Mobile ESLint config: `apps/mobile/.eslintrc.json`
  - Extends: `expo`, `prettier`, `@typescript-eslint/recommended`
  - Plugins: `prettier`, `@typescript-eslint`

**Key ESLint Rules (Backend):**
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: error (args/vars prefixed with `_` ignored)
- `@typescript-eslint/no-floating-promises`: error
- `@typescript-eslint/no-misused-promises`: error
- `@typescript-eslint/prefer-nullish-coalescing`: warn
- `@typescript-eslint/prefer-optional-chain`: warn
- `import/order`: error (enforced groups: builtin, external, internal, parent, sibling, index; alphabetized)
- `import/no-cycle`: error
- `no-console`: warn (allow `warn`, `error`)
- `prefer-const`: error
- `eqeqeq`: error (always)
- `curly`: error (all)

**Key ESLint Rules (Mobile):**
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-floating-promises`: error
- `no-console`: warn (allow `warn`, `error`)
- `prefer-const`: error
- `eqeqeq`: error (always)
- `curly`: error (all)

## TypeScript Configuration

**Backend (`apps/backend/tsconfig.json`):**
- Target: ES2022
- Module: CommonJS
- Strict mode enabled: `strict`, `strictNullChecks`, `noImplicitAny`, `strictBindCallApply`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `forceConsistentCasingInFileNames`, `noFallthroughCasesInSwitch`
- Path alias: `@/*` maps to `./src/*`
- Decorators enabled: `experimentalDecorators`, `emitDecoratorMetadata`

**Mobile (`apps/mobile/tsconfig.json`):**
- Target: ESNext
- Module: CommonJS
- Strict mode enabled
- Path alias: `@/*` maps to `./*`
- Polyfill path aliases for Expo modules (e.g., `expo-router`, `expo-image-picker`)

## Import Organization

**Backend (enforced by ESLint `import/order` rule):**
1. Node.js builtins (e.g., `crypto`, `async_hooks`)
2. External packages (e.g., `@nestjs/common`, `@prisma/client`, `rxjs`)
3. Internal aliases (e.g., `@/*` paths)
4. Parent imports (e.g., `../../common/...`)
5. Sibling imports
6. Index files

Example from `apps/backend/src/modules/auth/auth.service.ts`:
```typescript
import { randomUUID } from "crypto";

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { StructuredLoggerService, ContextualLogger } from "../../common/logging/structured-logger.service";
import * as bcrypt from "../../common/security/bcrypt";

import { RegisterDto, LoginDto, AuthResponseDto } from "./dto/auth.dto";
import { AuthHelpersService } from "./auth.helpers";
```

**Mobile (less strictly enforced):**
1. React and React Native
2. External packages (e.g., `@react-navigation/*`, `zustand`, `axios`)
3. Internal modules using `@/` alias or relative paths
4. Types

Example from `apps/mobile/src/screens/HomeScreen.tsx`:
```typescript
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ... } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { recommendationsApi, type RecommendedItem } from '../services/api/tryon.api';
import apiClient from '../services/api/client';
import { useAuthStore } from '../stores/index';
import type { RootStackParamList } from '../types/navigation';
```

**Path Aliases:**
- Backend: `@/*` -> `./src/*` (configured in `tsconfig.json` and `jest.config.js` `moduleNameMapper`)
- Mobile: `@/*` -> `./*` (configured in `tsconfig.json`)
- Jest resolution for backend uses custom resolver at `apps/backend/jest.resolver.js` (handles pnpm monorepo module resolution)

## Error Handling

**Backend Exception Hierarchy:**
- `AllExceptionsFilter` (`apps/backend/src/common/filters/all-exceptions.filter.ts`): Global catch-all filter
- `BusinessException` (`apps/backend/src/common/exceptions/business.exception.ts`): Custom business logic errors with error codes, error keys, and details
- `ValidationException` (`apps/backend/src/common/exceptions/validation.exception.ts`): Input validation errors
- `NotFoundException` (`apps/backend/src/common/exceptions/not-found.exception.ts`): Resource not found
- `ForbiddenException` (`apps/backend/src/common/exceptions/forbidden.exception.ts`): Permission denied

**Business Error Code Format:** `XXYYZ` where:
- XX: Error category (40=client, 50=server)
- YY: Specific error type
- Z: Severity (0=low, 9=high)

**Error Response Format (from `AllExceptionsFilter`):**
```typescript
interface ErrorResponse {
  code: number;       // 5-digit business error code
  message: string;
  errors?: ValidationError[];
  details?: Record<string, unknown>;
  timestamp: string;  // ISO 8601
  path: string;
  requestId?: string;
  stack?: string;     // Only in non-production
}
```

**Throwing Errors in Services:**
Use NestJS built-in exceptions or custom exceptions:
```typescript
// Use NestJS built-in for simple cases
throw new ConflictException("该邮箱已被注册");
throw new UnauthorizedException("Invalid refresh token");
throw new BadRequestException("无效或已过期的重置令牌");

// Use BusinessException for complex business logic errors
throw BusinessException.resourceNotFound("ClothingItem", itemId);
throw BusinessException.externalServiceError("CatVTON", error.message);
```

**Database Error Handling:**
Prisma errors are mapped in `AllExceptionsFilter`:
- P2002 (unique constraint) -> 40901
- P2025 (record not found) -> 40401
- P2003 (foreign key) -> 40402
- P2011 (null constraint) -> 42201

**Mobile Error Handling:**
- `ApiClient` class (`apps/mobile/src/services/api/client.ts`) wraps all HTTP calls
- Returns `ApiResponse<T>` with `{ success: boolean; data?: T; error?: ApiError }`
- Automatic token refresh on 401 with queue for concurrent requests
- Retry with exponential backoff via `getWithRetry()`

**Validation:**
- Backend uses `class-validator` decorators on DTO classes
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`
- XSS sanitization pipe: `apps/backend/src/common/pipes/xss-sanitization.pipe.ts`
- Chinese error messages in validation decorators (e.g., `"请输入有效的邮箱地址"`)

## Logging

**Framework:** `StructuredLoggerService` (`apps/backend/src/common/logging/structured-logger.service.ts`)

**Pattern:**
```typescript
// Services receive a ContextualLogger via injection
constructor(loggingService: StructuredLoggerService) {
  this.logger = loggingService.createChildLogger(AuthService.name);
}

// Log with structured data
this.logger.log("用户注册请求", { email: dto.email, hasNickname: !!dto.nickname });
this.logger.warn("注册失败：邮箱已存在", { email: dto.email });
this.logger.debug("密码重置：用户不存在", { email });
```

**Log Entry Format:**
```typescript
interface StructuredLogEntry {
  level: LogLevel;        // "debug" | "info" | "warn" | "error"
  message: string;
  timestamp: string;      // ISO 8601
  context: string;        // Class name
  requestId?: string;
  userId?: string;
  data?: Record<string, unknown>;
  stack?: string;         // Error only
}
```

**Sensitive Data Masking:**
The logger and exception filter automatically mask sensitive fields:
`password`, `token`, `accessToken`, `refreshToken`, `email`, `phone`, `creditCard`, `ssn`, etc.

**Mobile Logging:**
- Sentry integration: `apps/mobile/src/services/sentry.ts`
- `console.log`, `console.debug`, `console.info` are mocked to `jest.fn()` in both backend and mobile test setups

## Comments

**When to Comment:**
- File-level JSDoc/TSDoc with `@fileoverview` tag (used in backend common modules, e.g., `all-exceptions.filter.ts`, `business.exception.ts`, `structured-logger.service.ts`)
- Inline comments in Chinese for business logic explanation (e.g., `// 删除该用户的所有 refresh tokens（强制登出所有设备）`)
- Bug fix annotations: `// FIX-BL-003: 密码找回功能 (修复时间: 2026-03-19)`

**JSDoc/TSDoc:**
- Used extensively in `packages/types/src/index.ts` with `@description`, `@example`, field-level comments
- Used in backend common modules (filters, exceptions, interceptors) with `@fileoverview`, `@class`, `@example`
- Used for DTO classes and their properties with `@ApiProperty` / `@ApiPropertyOptional` decorators for Swagger
- Not used consistently in mobile code or backend service methods

## Function Design

**Size:** Functions typically 5-30 lines. Service methods may be longer for complex flows (e.g., `register()` in `AuthService` is ~40 lines). Private helper methods break down complexity (e.g., `buildAuthResponse()`, `generateTokens()`, `saveRefreshToken()`).

**Parameters:**
- DTOs for controller input (validated by class-validator)
- Named parameters over positional for complex functions
- Optional parameters marked with `?` or use defaults

**Return Values:**
- Backend services return typed objects (e.g., `Promise<AuthResponseDto>`, `Promise<{ accessToken: string; refreshToken: string }>`)
- Mobile API client returns `ApiResponse<T>` wrapper
- Mobile stores use Zustand patterns: `set()` with state spread

## Module Design

**Backend (NestJS):**
- Module-per-feature pattern: each business domain has its own directory under `apps/backend/src/modules/`
- Module structure: `{module-name}.module.ts`, `{module-name}.controller.ts`, `{module-name}.service.ts`, `dto/`, optionally `guards/`, `strategies/`, `decorators/`, `services/`
- DTOs exported via barrel `index.ts` files (e.g., `dto/index.ts` re-exports from `dto/auth.dto.ts`)
- Common/shared code in `apps/backend/src/common/` with its own barrel exports

**Exports:**
- Backend barrel files (`index.ts`) re-export with `export * from "./..."` pattern
- Mobile stores barrel at `apps/mobile/src/stores/index.ts` re-exports all stores
- Mobile types barrel at `apps/mobile/src/types/index.ts` re-exports from `@aineed/types` and local type files

**Barrel Files:** Used consistently:
- `apps/backend/src/common/filters/index.ts`
- `apps/backend/src/common/exceptions/index.ts`
- `apps/backend/src/modules/auth/dto/index.ts`
- `apps/mobile/src/stores/index.ts`
- `apps/mobile/src/types/index.ts`
- `apps/mobile/src/services/api/index.ts`

## API Conventions

**Backend Response Format (via `TransformInterceptor`):**
```typescript
interface ApiResponse<T> {
  code: number;       // 0 = success
  message: string;    // "success"
  data: T;
  timestamp: string;
  path: string;
  requestId?: string;
  duration?: number;
}
```

**API Versioning:** URI-based, prefix `api/v1/` (configured in `apps/backend/src/main.ts`)

**Rate Limiting:** Applied per endpoint via `@Throttle()` decorator with specific limits (e.g., registration: 5/min, login: 5/min, forgot-password: 3/min)

**Swagger Documentation:** Every endpoint annotated with `@ApiOperation`, `@ApiBody`, `@ApiResponse`, `@ApiBearerAuth`. Available at `/api/docs` in non-production.

## State Management (Mobile)

**Pattern:** Zustand with persist middleware
```typescript
export const useClothingStore = create<ClothingState>()(
  persist(
    (set) => ({
      // State
      items: [],
      isLoading: false,

      // Actions (use spread for immutable updates)
      setItems: (items) => set({ items }),
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
    }),
    {
      name: "clothing-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        filters: state.filters,
        viewMode: state.viewMode,
      }),
    },
  ),
);
```

**Custom selector hooks pattern:**
```typescript
export const useClothingFilters = () =>
  useClothingStore((state) => state.filters);
```

**Secure storage for auth:** Uses `react-native-encrypted-storage` via `secureStorageAdapter` for sensitive data (tokens, user data).

## Lazy Loading (Mobile)

**Pattern:** React.lazy() for non-first-screen components in `App.tsx`:
```typescript
const SettingsScreen = lazy(() => import('./src/screens/SettingsScreen'));
const AiStylistScreen = lazy(() => import('./src/screens/AiStylistScreenV2'));
```

First-screen components (6 tabs + Login) are synchronously imported.

---

*Convention analysis: 2026-04-13*
