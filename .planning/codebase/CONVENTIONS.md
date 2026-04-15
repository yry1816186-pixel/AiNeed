# Conventions

**Project:** 寻裳 (XunO)
**Last mapped:** 2026-04-16

## Backend Conventions (NestJS/TypeScript)

### Module Structure

Each feature module follows the NestJS convention:

```
modules/{feature}/
├── {feature}.module.ts       # Module definition
├── {feature}.controller.ts   # REST endpoints
├── {feature}.service.ts      # Business logic
├── {feature}.service.spec.ts # Unit tests
├── dto/                      # Data Transfer Objects
│   └── {feature}.dto.ts
└── [sub-services/]           # Additional services if complex
```

### Naming Conventions

- **Files**: kebab-case (`ai-stylist.service.ts`, `try-on.controller.ts`)
- **Classes**: PascalCase (`AiStylistService`, `TryOnController`)
- **Modules**: PascalCase + Module suffix (`AiStylistModule`)
- **DTOs**: PascalCase + Dto/Response suffix (`CreateSessionDto`, `SessionResponseDto`)
- **Database models**: PascalCase singular (`User`, `VirtualTryOn`, `AiStylistSession`)
- **API endpoints**: kebab-case plural (`/api/v1/ai-stylist/sessions`)

### API Design

- **Prefix**: `/api/v1/` (URI versioning)
- **Response format**: JSON:API inspired via `JsonApiInterceptor`
  ```typescript
  { data: {...}, meta: { total, page, limit } }
  ```
- **Error format**: Via `AllExceptionsFilter`
  ```typescript
  { statusCode, message, error, timestamp, path }
  ```
- **Pagination**: Cursor-based (`cursor.ts`) and offset-based (`pagination.dto.ts`)
- **Auth**: `@UseGuards(JwtAuthGuard)` globally, `@Public()` to skip

### Code Patterns

- **Dependency Injection**: NestJS constructor injection
- **Validation**: `class-validator` decorators on DTOs + global `ValidationPipe`
- **XSS Protection**: `XssSanitizationPipe` as global pipe
- **Soft Delete**: `SoftDeleteMiddleware` + Prisma extension
- **Caching**: `@Cache()` decorator with TTL strategies
- **Error Handling**: Custom exception classes (`BusinessException`, `ForbiddenException`)
- **Event-Driven**: `EventEmitterModule` for cross-module communication
- **Circuit Breaker**: `CircuitBreakerService` for external API calls

### Import Conventions

- Workspace packages: `@xuno/types`, `@xuno/shared`
- Common utilities: `import { ... } from "../../common/..."` or barrel exports

## Mobile Conventions (React Native/TypeScript)

### Component Structure

```
components/{domain}/
├── {ComponentName}.tsx        # Component implementation
├── index.ts                   # Barrel export
└── __tests__/                 # Component tests (optional)
```

### Screen Structure

```
screens/{ScreenName}Screen.tsx
```

Screens are registered in navigation types and navigators.

### State Management

- **Zustand stores**: One store per domain (`auth.store.ts`, `clothingStore.ts`)
- **Store pattern**:
  ```typescript
  export const useAuthStore = create<AuthState>((set, get) => ({
    // state
    token: null,
    // actions
    setToken: (token) => set({ token }),
  }));
  ```
- **Server state**: TanStack Query with `useQuery` / `useMutation` hooks

### API Service Pattern

```typescript
// services/api/{domain}.api.ts
export const clothingApi = {
  getList: (params) => apiClient.get('/clothing', { params }),
  getDetail: (id) => apiClient.get(`/clothing/${id}`),
};
```

### Styling

- **Design tokens**: `src/theme/tokens/` (colors, spacing, typography, shadows, animations)
- **Theme context**: `ThemeContext.tsx` for light/dark mode
- **Tailwind/NativeWind**: Used alongside theme tokens
- **React Native Paper**: Base UI component library

### Navigation

- **Route Guards**: `AuthGuard`, `ProfileGuard`, `VipGuard` in `navigation/RouteGuards/`
- **Deep Links**: Handled via `navigationService.ts`
- **Navigation Types**: `navigation/types.ts`

### Polyfills

Expo modules that aren't installed are polyfilled in `src/polyfills/`:
- `expo-camera.tsx`, `expo-haptics.ts`, `expo-router.tsx`, `flash-list.tsx`, etc.

## AI/ML Service Conventions (Python/FastAPI)

### Route Structure

```python
# ml/api/routes/{domain}.py
@router.post("/endpoint")
async def endpoint_handler(request: RequestModel) -> ResponseModel:
    result = await service.process(request)
    return result
```

### Service Pattern

```python
# ml/services/{service_name}.py
class ServiceName:
    async def process(self, input_data):
        # Business logic
        return result
```

### Configuration

- Environment variables via `pydantic-settings`
- Path configuration in `ml/config/paths.py`

## General Conventions

### Git

- Branch naming: feature/fix/chore prefix
- Commit messages: Conventional Commits style

### Testing

- Backend: Jest + Supertest for E2E
- Mobile: Jest + React Native Testing Library
- E2E Mobile: Detox
- Load Testing: k6

### Documentation

- API docs: Swagger (auto-generated from NestJS decorators)
- Architecture docs: `docs/ARCHITECTURE.md`
- Project context: `CLAUDE.md`

### Security

- PII fields encrypted with AES-256-GCM
- JWT 512-bit keys, bcrypt 12 rounds
- Rate limiting: 100 req/min/IP
- Helmet security headers
- CORS whitelist
- CSRF protection
- Content filtering for AI inputs
