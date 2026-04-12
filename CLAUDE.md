# AiNeed 项目 CLAUDE.md

## 项目概述

AiNeed 是一个基于多模态 AI 技术的智能私人形象定制与服装设计助手平台。通过大语言模型、计算机视觉、图像生成等前沿技术的深度融合，为每位用户提供独一无二的个性化形象设计方案。

## 技术栈

### 前端
- **React Native 0.76.8** (Expo 52) - 移动端跨平台开发
- **TypeScript 5.x** - 类型安全
- **React Navigation** - Stack + Bottom Tabs 导航
- **Zustand** - 轻量级状态管理
- **TanStack Query** - 服务端状态管理
- **React Paper** - UI 组件库
- **React Reanimated** - 动画库

### 后端
- **NestJS 11.x** - 企业级 Node.js 框架
- **Prisma 5.x** - 类型安全 ORM
- **PostgreSQL 16.x** - 主数据库
- **Redis 7.x** - 缓存与会话存储
- **MinIO** - S3 兼容对象存储
- **Qdrant** - 向量数据库
- **JWT + Passport** - 认证授权

### AI / ML
- **GLM-5** - AI 造型师对话 (智谱 AI)
- **CatVTON** - 虚拟试衣扩散模型 (RTX 4060 8GB VRAM)
- **FashionCLIP** - 服装图像特征提取
- **SASRec** - 序列推荐算法
- **DensePose + SCHP** - 人体检测与分割

## Monorepo 结构

```
AiNeed/
├── apps/
│   ├── backend/          # NestJS 后端 (端口 3001)
│   └── mobile/           # React Native 移动应用
├── ml/                   # Python AI 服务
│   ├── inference/        # CatVTON 服务器
│   ├── services/         # AI 服务实现
│   │   ├── rag/          # RAG 系统 (混合检索 + 重排序 + RAGAS 评测)
│   │   └── hallucination/# 幻觉检测 (50+ 规则 + LLM 校验)
│   └── models/           # 模型文件 (CatVTON 等)
├── packages/
│   └── types/            # 共享 TypeScript 类型
├── k8s/                  # Kubernetes 部署配置
├── delivery/
│   └── competition/      # 竞赛文档 (商业计划书、路演脚本)
└── docs/
```

## 服务端口

| 服务 | 端口 | 状态 |
|------|------|------|
| Metro (移动端) | 8081 | ✅ |
| Backend API | 3001 | ✅ |
| CatVTON (虚拟试衣) | 8001 | ✅ |
| PostgreSQL | 5432 | ✅ |
| Redis | 6379 | ✅ |
| MinIO | 9000/9001 | ✅ |
| Qdrant | 6333 | ✅ |

## 关键路径

### 移动端
- `apps/mobile/src/screens/` - 页面组件
- `apps/mobile/src/components/` - UI 组件
- `apps/mobile/src/stores/` - Zustand stores
- `apps/mobile/src/services/` - API 服务层
- `apps/mobile/App.tsx` - 6-tab 导航入口
- `apps/mobile/src/config/runtime.ts` - 运行时配置

### 后端
- `apps/backend/src/modules/` - 业务模块 (auth, ai-stylist, clothing, try-on 等)
- `apps/backend/src/common/` - guards, filters, middleware, encryption
- `apps/backend/prisma/` - 数据库 Schema
- `apps/backend/src/main.ts` - 入口
- `apps/backend/.env` - 环境配置 (含 GLM API Key)

### AI 服务
- `ml/inference/catvton_server.py` - CatVTON 虚拟试衣服务器 (含超时控制 + GPU 内存限制)
- `ml/services/rag/` - RAG 系统 (混合检索 + RAGAS 评测)
- `ml/services/hallucination/` - 幻觉检测系统
- `ml/venv/` - Python 虚拟环境

## 常用命令

```powershell
# 安装依赖
pnpm install

# 启动后端
cd apps/backend; pnpm dev

# 启动移动端
cd apps/mobile; npx react-native start --port 8081

# 启动 CatVTON
cd ml; .\venv\Scripts\activate; $env:CATVTON_REPO_PATH="C:\AiNeed\models\CatVTON"; $env:HF_ENDPOINT="https://hf-mirror.com"; python .\inference\catvton_server.py

# 数据库
cd apps/backend; npx prisma db push
cd apps/backend; npx tsx prisma/seed.ts

# Docker
docker-compose up -d

# Android 构建
cd apps/mobile; npx react-native run-android
```

## API 端点 (v1)

### 认证
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/auth/me` - 当前用户信息

### AI 造型师
- `POST /api/v1/ai-stylist/sessions` - 创建会话
- `GET /api/v1/ai-stylist/sessions` - 会话列表
- `POST /api/v1/ai-stylist/sessions/:id/messages` - 发送消息

### 虚拟试衣
- `GET /api/v1/try-on/history` - 试衣历史
- `POST /api/v1/try-on` - 创建试衣任务

### 推荐
- `GET /api/v1/recommendations` - 获取推荐列表

### 服装
- `GET /api/v1/clothing` - 服装列表
- `GET /api/v1/clothing/categories` - 服装分类

### 用户
- `GET /api/v1/profile` - 用户画像
- `PUT /api/v1/profile` - 更新用户画像

### 健康检查
- `GET /health/live` - 存活探针
- `GET /health/ready` - 就绪探针

## 安全增强 (2026-04-01)

### 认证安全
- **JWT 密钥**: 512-bit 强随机密钥 (已更新)
- **密码加密**: bcrypt 12 轮哈希
- **Token 过期**: 7 天 Access Token + 30 天 Refresh Token

### API 安全
- **限流**: @nestjs/throttler (100 req/min/IP)
- **CORS**: 白名单域名配置
- **Helmet**: 安全头注入

### 数据安全
- **PII 加密**: AES-256-GCM 加密存储 (email, phone)
- **传输加密**: HTTPS/TLS 1.3
- **密钥管理**: 环境变量 + Docker Secrets

## AI 工程化 (2026-04-01)

### RAG 系统
- **检索方式**: 混合检索 (BM25 + 向量)
- **重排序**: Cross-Encoder 重排序
- **评测指标**: RAGAS (Faithfulness, Relevancy, ContextRecall, ContextPrecision)
- **检索指标**: HitRate@K, MRR, NDCG, MAP

### 幻觉检测
- **规则引擎**: 50+ 专业规则 (季节材质、颜色理论、场合着装、体型误区)
- **知识验证**: 服装知识图谱验证
- **LLM 校验**: GLM-5 二次校验

### CatVTON 推理
- **超时控制**: 180s 推理超时 + 重试机制
- **GPU 管理**: 80% VRAM 限制 (防止 OOM)
- **批处理**: 支持批量图像处理

## 法律合规 (2026-04-01)

### 用户协议
- **页面**: `apps/mobile/src/screens/LegalScreen.tsx`
- **路由**: `/TermsOfService`
- **内容**: 服务条款、用户行为规范、知识产权、付费服务

### 隐私政策
- **页面**: `apps/mobile/src/screens/LegalScreen.tsx`
- **路由**: `/PrivacyPolicy`
- **内容**: 信息收集、使用、共享、存储、用户权利

### 合规入口
- **设置页面**: 法律信息 → 用户服务协议 / 隐私政策
- **注册页面**: 勾选同意条款

## 已知关键修复

- **MainApplication.kt**: 使用 `SoLoader.init(this, OpenSourceMergedSoMapping)` + `DefaultReactHost.getDefaultReactHost()` 修复启动崩溃
- **6-Tab 布局**: Home/Explore/Heart/Cart/Wardrobe/Profile
- **代码拆分**: 大文件已拆分至 800 行以内
- **数据库连接**: 使用 `127.0.0.1` 替代 `localhost` 解决 IPv6 连接问题
- **TryOn 轮询超时**: 从 60s 改为 180s (60次 x 3s)
- **docker-compose**: 添加 `CATVTON_ENDPOINT` 环境变量
- **JWT 密钥**: 升级为 512-bit 强随机密钥
- **用户协议**: 添加完整的用户服务协议和隐私政策页面

## 环境要求

- Node.js 20+ (当前 v24)
- pnpm 8+
- Python 3.11+ (ML 服务)
- PyTorch 2.5.1+cu121
- CUDA 12.1+
- Docker 20.10+
- 16GB+ RAM (含模型加载)
- GPU: RTX 4060 8GB VRAM (CatVTON 使用约 4GB)

## 当前状态 (2026-04-01 更新)

### ✅ 已完成
- **前端**: 登录页正常渲染，中文 locale，6-Tab 导航，用户协议/隐私政策页面
- **后端**: Auth/AI-Stylist/Recommendations/Clothing/Try-On API 全部可用，健康检查端点
- **数据库**: stylemind DB 已创建，49 张表，测试用户 test@example.com
- **ML**: CatVTON 虚拟试衣服务运行正常 (端口 8001)，超时控制 + GPU 内存限制
- **LLM**: GLM-5 API 已配置，AI 造型师对话正常
- **移动端**: Android 模拟器运行，Metro Bundler 正常
- **安全**: JWT 强密钥、API 限流、PII 加密
- **AI 工程**: RAG 评测指标、幻觉检测 50+ 规则

### 测试账号
- 邮箱: test@example.com
- 密码: Test123456!

### Demo 验收流程
```
用户打开App → 自动登录 → 看到首页推荐 → 点AI Stylist
→ 输入"面试" → AI返回场合询问 → 选择风格 → 获得推荐
→ 虚拟试衣 → 完成 ✅
```

## 项目健康度评分 (2026-04-01)

| 维度 | 评分 | 状态 |
|------|------|------|
| 代码质量 | 70/100 | 🟡 |
| 安全性 | 85/100 | 🟢 |
| 架构设计 | 75/100 | 🟡 |
| AI 工程化 | 80/100 | 🟢 |
| 数据 | 75/100 | 🟡 |
| 移动端 UX | 72/100 | 🟡 |
| API 设计 | 80/100 | 🟢 |
| DevOps | 82/100 | 🟢 |
| 文档 | 80/100 | 🟢 |
| **综合** | **78/100** | 🟡 |

### 待改进项
- TypeScript `any` 类型: 后端 226 处、移动端 105 处 (技术债务)
- 测试覆盖率: 后端 ~15%、移动端 ~5% (需提升至 60%+)
- 真实数据源: 需接入淘宝/得物 API 替代 Mock 数据

## 硬件约束

- **RTX 4060 只有 8GB VRAM**，CatVTON 使用约 4GB，剩余 4GB
- **IDM-VTON 需要 14GB+**，无法运行，使用 CatVTON 替代
- **xformers 装不上** (版本冲突)，不影响 CatVTON
- **CLIP 加载必须 `use_safetensors=True`**
- **react-native-screens 4.4.0, reanimated 3.16.7, svg 15.8.0 不能升级**

## 竞赛文档

- `delivery/competition/AiNeed_Business_Plan.md` - 商业计划书
- `delivery/competition/AiNeed_Competition_Highlights.md` - 比赛加分项
- `delivery/competition/AiNeed_Demo_Script.md` - 路演脚本

<!-- GSD:project-start source:PROJECT.md -->
## Project

**AiNeed - 智能私人形象定制与服装设计助手平台**

AiNeed 是一个 AI 驱动的移动端平台，为用户提供智能私人形象定制和服装设计服务。通过虚拟试衣、AI 造型师、个性化推荐和社区功能，让 AI 成为用户的专属形象顾问。后端 NestJS + React Native 移动端 + Python ML 服务的 pnpm monorepo 架构，已具备 35 个后端模块和 28 个移动端页面。

**Core Value:** 用户能真实体验 AI 虚拟试衣并获得精准的个性化穿搭推荐，这是产品体验闭环的核心。

### Constraints

- **GPU**: RTX 4060 8GB VRAM — ML 模型选择受限于显存
- **Tech Stack**: 已锁定 NestJS + React Native + Python，不更换框架
- **数据库**: PostgreSQL 16 + Redis 7，不更换存储方案
- **Package Manager**: pnpm workspace，不更换
- **API 版本**: 当前 v1，URI versioning
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages & Runtime
| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | ^6.0.2 (root), ^5.0.4 (mobile) | Primary language for backend + mobile |
| Python | 3.11+ | ML services, inference servers, data pipelines |
| SQL | PostgreSQL 16 | Database schema, migrations |
| YAML | Docker Compose, K8s manifests | Infrastructure config |
- Node.js >=20.0.0
- pnpm 8.15.0 (workspace monorepo)
- React Native 0.76.8 (mobile)
- NestJS 11.x (backend)
## Backend Stack
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | @nestjs/core | ^11.1.0 | HTTP server, DI, modules |
| ORM | Prisma | ^5.22.0 | Database schema, queries, migrations |
| Database | PostgreSQL | 16-alpine | Primary data store |
| Cache | Redis (ioredis) | ^5.3.2 | Session, caching, rate limiting |
| Queue | BullMQ | ^5.71.0 | Background job processing |
| Auth | Passport + JWT | passport-jwt ^4.0.1 | Authentication |
| Validation | class-validator + Zod | ^0.14.1 / ^3.22.4 | Input validation |
| API Docs | @nestjs/swagger | ^11.2.0 | OpenAPI/Swagger documentation |
| WebSocket | socket.io | ^4.6.1 | Real-time communication |
| Monitoring | Prometheus + Grafana | prom-client ^15.1.0 | Metrics collection |
| Search | Qdrant | @qdrant/js-client-rest ^1.17.0 | Vector search (Code RAG) |
| Storage | MinIO | minio ^7.1.3 | Object storage |
| Email | Nodemailer | ^7.0.7 | Email delivery |
| Security | Helmet, csurf, bcryptjs | Multiple | HTTP security, CSRF, password hashing |
| Image | Sharp | ^0.33.2 | Image processing |
| Resilience | Opossum | ^8.1.4 | Circuit breaker pattern |
| HTTP Client | Axios | ^1.13.6 | External API calls |
| Schedule | @nestjs/schedule | ^6.0.0 | Cron jobs, task scheduling |
## Mobile Stack
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | React Native | 0.76.8 | Cross-platform mobile |
| UI Library | React Native Paper | ^5.12.0 | Material Design components |
| Navigation | React Navigation 6 | ^6.1.18 | Screen navigation, bottom tabs |
| State | Zustand | ^5.0.5 | Global state management |
| Data Fetching | TanStack Query | ^5.81.0 | Server state, caching |
| Animations | Reanimated | 3.16.7 | Smooth animations |
| Gesture | Gesture Handler | ^2.20.2 | Touch interactions |
| HTTP | Axios | ^1.12.2 | API client |
| Storage | Encrypted Storage | ^4.0.3 | Secure local storage |
| Error Tracking | Sentry | 6.9.0 | Crash reporting |
| Date | date-fns | ^4.1.0 | Date formatting |
## Shared Packages
| Package | Purpose |
|---------|---------|
| `packages/types` | Shared TypeScript type definitions (tsup build, CJS+ESM) |
| `packages/shared` | Shared utilities (tsc build) |
## ML/AI Stack
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Virtual Try-On | CatVTON | AI-powered virtual clothing try-on |
| Body Analysis | Custom model | Body shape analysis |
| Clothing Segmentation | Custom model | Garment segmentation from images |
| Recommendation | SASRec | Sequential recommendation model |
| Trend Prediction | Custom model | Fashion trend forecasting |
| Embeddings | sentence-transformers | Text/code embeddings |
| Vector DB | Qdrant | Code RAG semantic search |
| Aesthetic Scoring | Custom model | Outfit aesthetic evaluation |
| IP-Adapter | Custom implementation | Image prompt adapter |
## Infrastructure
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Containers | Docker + Docker Compose | Local development, deployment |
| Orchestration | Kubernetes | Production deployment |
| Monitoring | Prometheus + Grafana + Alertmanager | Observability stack |
| CI/CD | GitHub Actions | Automated builds, tests |
| Object Storage | MinIO | S3-compatible file storage |
## Build Tools
| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | 8.15.0 | Workspace monorepo management |
| NestJS CLI | ^11.0.16 | Backend scaffolding |
| tsup | ^8.0.2 | Shared types build |
| Jest | ^29.7.0 | Testing (backend + mobile) |
| ESLint | ^8.x | Code linting |
| Prettier | ^2.8.8 / ^3.8.1 | Code formatting |
| TypeScript | ^5.0.4 / ^6.0.2 | Type checking |
## Configuration Files
| File | Location | Purpose |
|------|----------|---------|
| `package.json` | Root | Monorepo workspace config |
| `pnpm-workspace.yaml` | Root | Workspace package definitions |
| `.env.example` | Root | Environment template |
| `.env.security.example` | Root | Security-focused env template |
| `docker-compose.yml` | Root | Full stack Docker setup |
| `docker-compose.dev.yml` | Root | Development Docker setup |
| `prisma/schema.prisma` | `apps/backend/` | Database schema |
| `tsconfig.json` | Multiple | TypeScript configuration |
| `.prettierrc` | Root | Code formatting rules |
| `CLAUDE.md` | Root | Claude Code instructions |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
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
- camelCase for all functions (e.g., `register()`, `login()`, `validateUser()`)
- Async functions use `async/await`, not raw Promises
- Private helper methods prefixed with descriptive names (e.g., `buildAuthResponse()`, `generateTokens()`, `saveRefreshToken()`)
- camelCase for all variables (e.g., `mockPrismaService`, `accessToken`, `featuredItems`)
- Constants in UPPER_SNAKE_CASE at module scope (e.g., `PASSWORD_REGEX`, `PASSWORD_ERROR_MSG`, `CACHE_TTL`)
- Readonly arrays/types defined with `const` and `as const` (e.g., `const GenderValues = ["male", "female", "other"] as const`)
- PascalCase for interfaces and types (e.g., `AuthResponseDto`, `ClothingFilter`, `PaginatedResponse<T>`)
- Suffix DTOs with `Dto` (e.g., `RegisterDto`, `LoginDto`, `RefreshTokenDto`)
- Suffix state interfaces with `State` in Zustand stores (e.g., `ClothingState`, `AuthState`)
- Enum values are camelCase strings (e.g., `Gender.Male = 'male'`, `BodyType.Hourglass = 'hourglass'`)
- Generic utility types defined in `apps/mobile/src/types/index.ts`: `Nullable<T>`, `Optional<T>`, `Maybe<T>`, `DeepPartial<T>`
- PascalCase (e.g., `AuthService`, `ClothingService`, `AllExceptionsFilter`)
- Suffix with function (e.g., `*Service`, `*Controller`, `*Filter`, `*Guard`, `*Interceptor`, `*Exception`)
- NestJS Injectable classes annotated with `@Injectable()`, `@Controller()`, etc.
## Code Style
- Prettier configured at root `.prettierrc`
- Semi-colons: required
- Quotes: double quotes
- Tab width: 2 spaces
- Trailing comma: ES5
- Print width: 100 characters
- Arrow parens: always
- End of line: LF
- Backend ESLint config: `apps/backend/.eslintrc.json`
- Mobile ESLint config: `apps/mobile/.eslintrc.json`
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
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-floating-promises`: error
- `no-console`: warn (allow `warn`, `error`)
- `prefer-const`: error
- `eqeqeq`: error (always)
- `curly`: error (all)
## TypeScript Configuration
- Target: ES2022
- Module: CommonJS
- Strict mode enabled: `strict`, `strictNullChecks`, `noImplicitAny`, `strictBindCallApply`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `forceConsistentCasingInFileNames`, `noFallthroughCasesInSwitch`
- Path alias: `@/*` maps to `./src/*`
- Decorators enabled: `experimentalDecorators`, `emitDecoratorMetadata`
- Target: ESNext
- Module: CommonJS
- Strict mode enabled
- Path alias: `@/*` maps to `./*`
- Polyfill path aliases for Expo modules (e.g., `expo-router`, `expo-image-picker`)
## Import Organization
- Backend: `@/*` -> `./src/*` (configured in `tsconfig.json` and `jest.config.js` `moduleNameMapper`)
- Mobile: `@/*` -> `./*` (configured in `tsconfig.json`)
- Jest resolution for backend uses custom resolver at `apps/backend/jest.resolver.js` (handles pnpm monorepo module resolution)
## Error Handling
- `AllExceptionsFilter` (`apps/backend/src/common/filters/all-exceptions.filter.ts`): Global catch-all filter
- `BusinessException` (`apps/backend/src/common/exceptions/business.exception.ts`): Custom business logic errors with error codes, error keys, and details
- `ValidationException` (`apps/backend/src/common/exceptions/validation.exception.ts`): Input validation errors
- `NotFoundException` (`apps/backend/src/common/exceptions/not-found.exception.ts`): Resource not found
- `ForbiddenException` (`apps/backend/src/common/exceptions/forbidden.exception.ts`): Permission denied
- XX: Error category (40=client, 50=server)
- YY: Specific error type
- Z: Severity (0=low, 9=high)
- P2002 (unique constraint) -> 40901
- P2025 (record not found) -> 40401
- P2003 (foreign key) -> 40402
- P2011 (null constraint) -> 42201
- `ApiClient` class (`apps/mobile/src/services/api/client.ts`) wraps all HTTP calls
- Returns `ApiResponse<T>` with `{ success: boolean; data?: T; error?: ApiError }`
- Automatic token refresh on 401 with queue for concurrent requests
- Retry with exponential backoff via `getWithRetry()`
- Backend uses `class-validator` decorators on DTO classes
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`
- XSS sanitization pipe: `apps/backend/src/common/pipes/xss-sanitization.pipe.ts`
- Chinese error messages in validation decorators (e.g., `"请输入有效的邮箱地址"`)
## Logging
- Sentry integration: `apps/mobile/src/services/sentry.ts`
- `console.log`, `console.debug`, `console.info` are mocked to `jest.fn()` in both backend and mobile test setups
## Comments
- File-level JSDoc/TSDoc with `@fileoverview` tag (used in backend common modules, e.g., `all-exceptions.filter.ts`, `business.exception.ts`, `structured-logger.service.ts`)
- Inline comments in Chinese for business logic explanation (e.g., `// 删除该用户的所有 refresh tokens（强制登出所有设备）`)
- Bug fix annotations: `// FIX-BL-003: 密码找回功能 (修复时间: 2026-03-19)`
- Used extensively in `packages/types/src/index.ts` with `@description`, `@example`, field-level comments
- Used in backend common modules (filters, exceptions, interceptors) with `@fileoverview`, `@class`, `@example`
- Used for DTO classes and their properties with `@ApiProperty` / `@ApiPropertyOptional` decorators for Swagger
- Not used consistently in mobile code or backend service methods
## Function Design
- DTOs for controller input (validated by class-validator)
- Named parameters over positional for complex functions
- Optional parameters marked with `?` or use defaults
- Backend services return typed objects (e.g., `Promise<AuthResponseDto>`, `Promise<{ accessToken: string; refreshToken: string }>`)
- Mobile API client returns `ApiResponse<T>` wrapper
- Mobile stores use Zustand patterns: `set()` with state spread
## Module Design
- Module-per-feature pattern: each business domain has its own directory under `apps/backend/src/modules/`
- Module structure: `{module-name}.module.ts`, `{module-name}.controller.ts`, `{module-name}.service.ts`, `dto/`, optionally `guards/`, `strategies/`, `decorators/`, `services/`
- DTOs exported via barrel `index.ts` files (e.g., `dto/index.ts` re-exports from `dto/auth.dto.ts`)
- Common/shared code in `apps/backend/src/common/` with its own barrel exports
- Backend barrel files (`index.ts`) re-export with `export * from "./..."` pattern
- Mobile stores barrel at `apps/mobile/src/stores/index.ts` re-exports all stores
- Mobile types barrel at `apps/mobile/src/types/index.ts` re-exports from `@aineed/types` and local type files
- `apps/backend/src/common/filters/index.ts`
- `apps/backend/src/common/exceptions/index.ts`
- `apps/backend/src/modules/auth/dto/index.ts`
- `apps/mobile/src/stores/index.ts`
- `apps/mobile/src/types/index.ts`
- `apps/mobile/src/services/api/index.ts`
## API Conventions
## State Management (Mobile)
## Lazy Loading (Mobile)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## High-Level Architecture
```
```
## Monorepo Structure
| Workspace | Path | Purpose |
|-----------|------|---------|
| Backend | `apps/backend/` | NestJS API server |
| Mobile | `apps/mobile/` | React Native app |
| Types | `packages/types/` | Shared TypeScript types |
| Shared | `packages/shared/` | Shared utilities |
## Backend Architecture
### Pattern: Modular Monolith (NestJS)
### Module Layers
```
```
### All Modules (35 total)
| Category | Modules |
|----------|---------|
| **Core** | `auth`, `users`, `profile`, `database`, `health` |
| **Fashion** | `clothing`, `try-on`, `style-profiles`, `recommendations`, `customization` |
| **Commerce** | `cart`, `order`, `payment`, `subscription`, `merchant`, `brands` |
| **AI** | `ai`, `ai-stylist`, `ai-safety`, `code-rag` |
| **Social** | `community`, `photos`, `favorites`, `search` |
| **Infrastructure** | `cache`, `queue`, `ws`, `analytics`, `metrics`, `notification` |
| **Other** | `address`, `weather`, `demo`, `privacy` |
### Common Layer
| Directory | Purpose |
|-----------|---------|
| `config/` | Application configuration |
| `guards/` | Auth guards (JWT, roles) |
| `interceptors/` | Logging, transform interceptors |
| `filters/` | Exception filters (global error handler) |
| `pipes/` | Validation pipes (XSS sanitization) |
| `middleware/` | Metrics, error handler middleware |
| `prisma/` | Prisma client service |
| `redis/` | Redis service |
| `storage/` | MinIO storage service |
| `security/` | Encryption, security utilities |
| `email/` | Email service |
| `circuit-breaker/` | Opossum circuit breaker |
| `logging/` | Logging utilities |
| `soft-delete/` | Soft delete mixin |
| `gateway/` | WebSocket gateway base |
| `types/` | Common TypeScript types |
| `dto/` | Common DTOs |
| `exceptions/` | Custom exceptions |
### Request Flow
```
```
### Data Flow
```
```
## Mobile Architecture
### Pattern: Screen-based with Zustand + TanStack Query
```
```
### State Management
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Server State | TanStack Query ^5.81.0 | API data, caching, refetching |
| Global UI State | Zustand ^5.0.5 | UI preferences, auth state |
| Stores | `stores/clothingStore.ts` | Clothing-specific state |
| Stores | `stores/wardrobeStore.ts` | Wardrobe state |
| Stores | `stores/uiStore.ts` | UI state |
### Directory Organization
| Directory | Purpose |
|-----------|---------|
| `screens/` | 28 screen components (one per route) |
| `components/` | Reusable UI components, organized by domain |
| `services/api/` | API client layer |
| `services/ai/` | AI-specific services |
| `services/speech/` | Speech recognition |
| `stores/` | Zustand stores |
| `hooks/` | Custom React hooks |
| `contexts/` | React context providers |
| `navigation/` | Navigation configuration |
| `theme/` | Theme system with tokens |
| `i18n/` | Internationalization |
| `utils/` | Utility functions |
| `config/` | App configuration |
| `types/` | TypeScript types |
## Database Architecture
### Schema (Prisma)
- `User` - Central entity with relations to nearly everything
- `UserProfile` - Body type, skin tone, face shape
- `UserPhoto` - User uploaded photos
- `Clothing` / `ClothingVariant` - Fashion items
- `VirtualTryOn` - Try-on results
- `StyleProfile` - User style preferences
- `Order` / `CartItem` / `PaymentOrder` - E-commerce
- `CommunityPost` / `PostLike` / `PostComment` - Social
- `AiStylistSession` / `UserDecision` - AI interactions
- `StyleRecommendation` / `RankingFeedback` - Recommendations
- UUID primary keys
- Soft delete on User (GDPR/PIPL compliance)
- Indexes on frequently queried fields
- Cascade deletes where appropriate
## ML/AI Pipeline
```
```
## Entry Points
| Entry Point | Location | Purpose |
|-------------|----------|---------|
| Backend API | `apps/backend/src/main.ts` | NestJS bootstrap, port 3001 |
| Mobile App | `apps/mobile/` | React Native entry |
| ML Services | `ml/inference/*.py` | Individual AI model servers |
| Code RAG CLI | `ml/services/code_rag/index_cli.py` | Code indexing |
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
