# AiNeed 依赖与配置审计报告

**审计日期**: 2026-04-13
**审计范围**: C:\AiNeed 全代码库
**审计人**: 后端架构师 (自动化审计)

---

## 目录

1. [重复/未使用依赖](#1-重复未使用依赖)
2. [.env.example 覆盖率](#2-envexample-覆盖率)
3. [docker-compose 完整性](#3-docker-compose-完整性)
4. [Prisma migration 状态](#4-prisma-migration-状态)
5. [tsconfig 一致性](#5-tsconfig-一致性)
6. [pnpm-workspace.yaml 配置](#6-pnpm-workspaceyaml-配置)
7. [ESLint 配置](#7-eslint-配置)
8. [版本一致性](#8-版本一致性)

---

## 1. 重复/未使用依赖

### 1.1 跨包重复声明

| 依赖 | 声明位置 | 严重程度 |
|------|---------|---------|
| `axios` | backend (^1.13.6), mobile (^1.12.2), admin (^1.9.0) | 低 - 版本不一致但各项目独立使用 |
| `eslint` | backend (^8.57.0), mobile (^8.19.0), admin (^9.39.4) | **高** - 主版本不一致 (v8 vs v9) |
| `prettier` | backend (^3.8.1), mobile (2.8.8) | **高** - 主版本不一致 (v3 vs v2) |
| `typescript` | root (^6.0.2), backend (未声明), mobile (5.0.4), shared (^5.0.0), admin (~5.7.3) | **高** - 详见版本一致性章节 |
| `zustand` | mobile (^5.0.5), admin (^5.0.5) | 低 - 各项目独立使用，版本一致 |
| `@types/react` | mobile (^18.2.6), admin (^18.2.45) | 中 - 版本不一致，root override 为 18.2.45 |
| `@types/node` | backend (^22.0.0), admin (^22.15.0) | 低 - minor 版本差异 |

### 1.2 后端疑似未使用依赖

| 依赖 | 当前状态 | 代码引用 | 严重程度 |
|------|---------|---------|---------|
| `csurf` | dependencies 中声明 | **无任何 import** | **高** - 已废弃包且未使用 |
| `@types/csurf` | dependencies 中声明 (应在 devDependencies) | 无 | **高** - 类型包放错位置且未使用 |
| `@types/compression` | dependencies 中声明 (应在 devDependencies) | 无 import | 中 - 类型包放错位置 |
| `form-data` | dependencies 中声明 | **无任何 import** | **高** - 未使用 (axios 自带 FormData) |
| `passport` | dependencies 中声明 | **无直接 import** | 中 - 仅通过 @nestjs/passport 间接使用 |
| `jsonwebtoken` | dependencies 中声明 | 仅 1 处 import (merchant-auth.guard.ts) | 中 - 与 @nestjs/jwt 功能重叠 |
| `pino-pretty` | dependencies 中声明 | **无直接 import** | 中 - 应为 devDependency 或通过 pino transport 配置 |
| `multer` | dependencies 中声明 | **无直接 import** | 中 - 通过 @nestjs/platform-express 间接使用 |
| `pg` | dependencies 中声明 | 2 处 import (database.module.ts, database.service.ts) | 低 - Prisma 可能已自带连接池 |
| `canvas` | dependencies 中声明 | 1 处 import (poster-generator.service.ts) | 低 - 使用中但为 native 模块，部署风险高 |

### 1.3 移动端疑似未使用依赖

| 依赖 | 当前状态 | 代码引用 | 严重程度 |
|------|---------|---------|---------|
| `@react-native-community/slider` | dependencies 中声明 | **无任何 import** | **高** - 完全未使用 |
| `@react-native-masked-view/masked-view` | dependencies 中声明 | **无任何 import** | **高** - 完全未使用 |
| `@react-native-community/datetimepicker` | dependencies 中声明 | **无任何 import** | **高** - 完全未使用 |
| `date-fns` | dependencies 中声明 | **无任何 import** | **高** - 完全未使用 |
| `react-native-reanimated-carousel` | dependencies 中声明 | **无任何 import** | **高** - 完全未使用 |
| `@aineed/shared` | dependencies 中声明 | **无任何 import** | **高** - 完全未使用 |
| `react-native-linear-gradient` | dependencies 中声明 | 仅 polyfill 引用 | 中 - 仅在 polyfill 中引用，非实际使用 |

### 1.4 后端 workspace 包引用问题

| 包 | 声明位置 | 实际引用 | 严重程度 |
|----|---------|---------|---------|
| `@aineed/shared` | backend dependencies | **0 处 import** | **高** - 声明但未使用 |
| `@aineed/types` | backend dependencies | **0 处 import** | **高** - 声明但未使用 |
| `@aineed/shared` | mobile dependencies | **0 处 import** | **高** - 声明但未使用 |
| `@aineed/types` | mobile dependencies | 1 处 import (types/index.ts) | 低 |

---

## 2. .env.example 覆盖率

### 2.1 后端 .env.example 缺失的环境变量

代码中通过 `process.env` 或 `configService.get()` 实际使用但 **未在 .env.example 中声明** 的变量：

| 环境变量 | 使用位置 | 严重程度 |
|---------|---------|---------|
| `CORS_ORIGINS` | main.ts, 多个 gateway, ai.service.ts | **高** - 核心安全配置缺失 |
| `LOG_LEVEL` | logging.module.ts, env.config.ts | 中 |
| `SERVICE_NAME` | env.config.ts | 低 |
| `REQUEST_TIMEOUT_MS` | error-handler.middleware.ts | 中 |
| `AI_STYLIST_DAILY_LIMIT` | ai-quota.guard.ts | 中 |
| `TRY_ON_DAILY_LIMIT` | ai-quota.guard.ts | 中 |
| `BAIDU_API_KEY` | ai-image.service.ts | 中 |
| `BAIDU_SECRET_KEY` | ai-image.service.ts | 中 |
| `TAOBAO_APP_KEY` | clothing-data-source.service.ts | 中 |
| `TAOBAO_APP_SECRET` | clothing-data-source.service.ts | 中 |
| `JD_APP_KEY` | clothing-data-source.service.ts | 中 |
| `JD_APP_SECRET` | clothing-data-source.service.ts | 中 |
| `DEWU_APP_KEY` | clothing-data-source.service.ts | 中 |
| `DEWU_APP_SECRET` | clothing-data-source.service.ts | 中 |
| `API4AI_KEY` | clothing-data-source.service.ts | 低 |
| `ML_API_KEY` | ml/api/tests/test_auth.py | 低 |
| `ENVIRONMENT` | ai_service.py, metrics_service.py | 低 |
| `SERVICE_VERSION` | metrics_service.py | 低 |
| `DATA_DIR` | ai_service.py | 低 |

### 2.2 ML .env.example 缺失的环境变量

| 环境变量 | 使用位置 | 严重程度 |
|---------|---------|---------|
| `GLM_API_ENDPOINT` | visual_outfit_service.py, style_understanding_service.py | **高** |
| `GLM_MODEL` | visual_outfit_service.py, style_understanding_service.py | **高** |
| `TAOBAO_APP_KEY` | visual_outfit_service.py | 中 |
| `TAOBAO_APP_SECRET` | visual_outfit_service.py | 中 |
| `JD_APP_KEY` | visual_outfit_service.py | 中 |
| `JD_APP_SECRET` | visual_outfit_service.py | 中 |
| `IDM_VTON_URL` | visual_outfit_service.py, task_worker.py | **高** - 替代 CatVTON 的新服务 |
| `IDM_VTON_TIMEOUT` | task_worker.py | 中 |
| `STORAGE_SERVICE_URL` | task_worker.py | 中 |
| `OPENAI_API_KEY` | style_understanding_service.py | 中 |
| `OPENAI_BASE_URL` | style_understanding_service.py | 中 |
| `OPENAI_API_ENDPOINT` | style_understanding_service.py | 中 |
| `CORS_ORIGINS` | ai_service.py | 中 |
| `ML_API_KEY` | test_auth.py | 低 |

### 2.3 Mobile .env.example 缺失的环境变量

| 环境变量 | 使用位置 | 严重程度 |
|---------|---------|---------|
| `EXPO_PUBLIC_SPEECH_API_URL` | speechRecognition.ts | 中 |
| `EXPO_PUBLIC_SPEECH_API_KEY` | speechRecognition.ts | 中 |
| `EXPO_PUBLIC_OPENAI_KEY` | clothingCategorization.ts, expo-constants.ts | 中 |
| `EXPO_PUBLIC_FAL_KEY` | backgroundRemoval.ts, expo-constants.ts | 中 |
| `EXPO_PUBLIC_SENTRY_DSN` | expo-constants.ts | 中 |

### 2.4 Root .env.example 问题

| 问题 | 严重程度 |
|------|---------|
| 仅包含 7 个变量，远少于 backend .env.example 的覆盖率 | **高** |
| `AES_ENCRYPTION_KEY` 与 backend 的 `ENCRYPTION_KEY` 命名不一致 | **高** |
| `CATVTON_ENDPOINT` 已过时 (应改为 IDM_VTON_URL) | 中 |
| 缺少 CORS_ORIGINS、LOG_LEVEL 等核心变量 | **高** |

### 2.5 .env.example 与 env.config.ts 不一致

| 变量 | .env.example | env.config.ts | 严重程度 |
|------|-------------|--------------|---------|
| `CORS_ORIGINS` | 未声明 | 已声明 | **高** |
| `LOG_LEVEL` | 未声明 | 已声明 | 中 |
| `SERVICE_NAME` | 未声明 | 已声明 | 低 |
| `ALIYUN_ACCESS_KEY_ID` | 已声明 | 未声明 | 中 - 配置类未覆盖 |
| `ALIYUN_ACCESS_KEY_SECRET` | 已声明 | 未声明 | 中 |
| `ALIYUN_REGION` | 已声明 | 未声明 | 低 |

---

## 3. docker-compose 完整性

### 3.1 docker-compose.dev.yml 服务覆盖

| 必要服务 | 是否包含 | 状态 |
|---------|---------|------|
| PostgreSQL 16 | 是 (postgres:16-alpine) | 正常 |
| Redis 7 | 是 (redis:7-alpine) | 正常 |
| MinIO | 是 (RELEASE.2024-11-07T00-52-20Z) | 正常 |
| Qdrant | **否** | **缺失** - 代码中大量使用 @qdrant |
| AI/ML Service | **否** | 缺失 - 需手动启动 |

### 3.2 docker-compose.dev.yml 配置问题

| 问题 | 涉及文件 | 严重程度 |
|------|---------|---------|
| PostgreSQL 默认用户 `aineed` 与 .env.example 中的 `postgres` 不一致 | docker-compose.dev.yml vs .env.example | **高** |
| PostgreSQL 默认数据库 `aineed` 与 .env.example 中的 `stylemind` 不一致 | docker-compose.dev.yml vs .env.example | **高** |
| Redis healthcheck 使用 `$REDIS_PASSWORD` 但未设默认值，无 .env 时报错 | docker-compose.dev.yml | 中 |
| MinIO 版本固定为 2024-11，可能需要更新 | docker-compose.dev.yml | 低 |
| 缺少 Qdrant 服务定义 | docker-compose.dev.yml | **高** - 推荐/向量搜索功能依赖此服务 |

### 3.3 其他 docker-compose 文件

| 文件 | 用途 | 备注 |
|------|------|------|
| docker-compose.yml | 基础设施 | 未检查内容 |
| docker-compose.production.yml | 生产环境 | 未检查内容 |
| docker-compose.staging.yml | 预发布环境 | 未检查内容 |
| docker-compose.observability.yml | 可观测性 | 未检查内容 |

---

## 4. Prisma migration 状态

### 4.1 Migration 目录结构

```
prisma/migrations/
  20260308122642_init/
  20260310165000_add_ai_stylist_sessions/
  20260313013805_add_optimization_indexes/
  20260313230000_fix_p0_database_issues/          (含 rollback.sql)
  20260314100000_fix_p1_database_precision_and_indexing/ (含 rollback.sql)
  20260315100000_fix_p2_database_issues/           (含 rollback.sql)
  20260316163000_add_refresh_token_table/
  20260324000000_add_soft_delete_partial_indexes/
  20260413063000_add_phase_1_6_8_models/
  migration_lock.toml
```

### 4.2 Schema 与 Migration 一致性问题

| 问题 | 严重程度 |
|------|---------|
| Schema 包含 40+ model，但仅 9 个 migration 文件 | 中 - 最后一个 migration 可能包含大量变更 |
| `UserBehaviorEvent` model 在 schema 中存在，但无对应独立 migration | 低 - 可能在最后 migration 中 |
| `FeatureFlag` / `FeatureFlagEvaluation` 使用 `@@map` 重命名表，但其他 model 未使用 | 低 - 风格不一致 |
| Schema 中 `colorSeason` 字段缩进异常 (UserProfile 第 97 行) | 低 - 格式问题 |

### 4.3 Schema 设计问题

| 问题 | 涉及 Model | 严重程度 |
|------|-----------|---------|
| `User` model 关联 25+ 个 relation，单表过重 | User | **高** - 查询性能和迁移风险 |
| `ClothingItem` 有 13 个 @@index，索引过多 | ClothingItem | 中 - 写入性能影响 |
| `CommunityPost` 有 12 个 @@index | CommunityPost | 中 |
| `AuditLog` 有 8 个 @@index | AuditLog | 中 |
| 缺少 `UserClothing.brandId` 外键关联到 `Brand` | UserClothing | 低 - brand 字段为 String 而非关联 |
| `SearchHistory` 无 User 关联 (userId 仅为 String) | SearchHistory | 低 |

---

## 5. tsconfig 一致性

### 5.1 编译选项对比

| 选项 | Backend | Mobile | Admin (app) | Shared | Types |
|------|---------|--------|-------------|--------|-------|
| `target` | ES2022 | esnext | ES2020 | ES2020 | ES2022 |
| `module` | commonjs | commonjs | esnext | commonjs | ESNext |
| `strict` | true | true | (未显式设置) | true | true |
| `strictNullChecks` | true | (继承 strict) | (未显式设置) | (继承 strict) | (继承 strict) |
| `noImplicitAny` | true | (继承 strict) | (未显式设置) | (继承 strict) | (继承 strict) |
| `noUnusedLocals` | (未设置) | (未设置) | true | (未设置) | (未设置) |
| `noUnusedParameters` | (未设置) | (未设置) | true | (未设置) | (未设置) |
| `noImplicitReturns` | true | (未设置) | (未设置) | (未设置) | (未设置) |
| `noUncheckedIndexedAccess` | true | (未设置) | (未设置) | (未设置) | (未设置) |
| `skipLibCheck` | true | true | true | true | true |
| `esModuleInterop` | true | true | (未设置) | true | true |
| `moduleResolution` | (默认) | node | bundler | (默认) | bundler |
| `jsx` | (未设置) | react-native | react-jsx | (未设置) | (未设置) |

### 5.2 关键不一致问题

| 问题 | 涉及项目 | 严重程度 |
|------|---------|---------|
| Backend `noImplicitAny: true` 但其他项目未显式设置 | Backend vs 其他 | 中 |
| Backend `noUncheckedIndexedAccess: true` 但其他项目未设置 | Backend vs 其他 | 中 |
| Admin `noUnusedLocals/Parameters: true` 但 Backend/Mobile 未设置 | Admin vs 其他 | 中 - 代码质量标准不一致 |
| Mobile `lib: ["es2017", "dom"]` 过旧 (es2017) | Mobile | 中 - 应至少 ES2020 |
| Types `module: ESNext` 与 Backend `module: commonjs` 不一致 | Types vs Backend | 中 - 可能导致运行时兼容问题 |
| Admin 未显式设置 `strict: true` | Admin | **高** - 类型安全缺失 |

---

## 6. pnpm-workspace.yaml 配置

### 6.1 当前配置

```yaml
packages:
  - 'apps/backend'
  - 'apps/mobile'
  - 'apps/admin'
  - 'packages/*'
```

### 6.2 问题

| 问题 | 严重程度 |
|------|---------|
| `ml/` 目录未纳入 workspace | **高** - Python 服务不在 workspace 中，但 .env.example 存在 |
| `packages/*` 通配符覆盖 shared 和 types，但未验证是否有遗漏 | 低 |
| `scripts/` 目录未纳入 workspace | 低 - 脚本不需要 |
| 缺少 `docs/` 目录的说明 | 低 |

---

## 7. ESLint 配置

### 7.1 配置格式差异

| 项目 | 配置格式 | ESLint 版本 | 严重程度 |
|------|---------|------------|---------|
| Backend | `.eslintrc.json` (旧格式) | ^8.57.0 | 中 |
| Mobile | `.eslintrc.json` (旧格式) | ^8.19.0 | 中 |
| Admin | `eslint.config.js` (新 flat config) | ^9.39.4 | **高** - 格式和版本不一致 |

### 7.2 规则差异

| 规则 | Backend | Mobile | Admin |
|------|---------|--------|-------|
| `no-explicit-any` | warn | warn | (未设置，默认 off) |
| `no-unused-vars` | error (带忽略模式) | error (带忽略模式) | warn (带忽略模式) |
| `no-floating-promises` | error | error | (未设置) |
| `import/order` | error (详细配置) | (未设置) | (未设置) |
| `import/no-cycle` | error | (未设置) | (未设置) |
| `import/no-unresolved` | error | (未设置) | (未设置) |
| `prefer-nullish-coalescing` | warn | (未设置) | (未设置) |
| `prefer-optional-chain` | warn | (未设置) | (未设置) |
| `react-hooks` 规则 | (未设置) | (未设置) | warn |
| `react-refresh` 规则 | (未设置) | (未设置) | warn |
| `prettier` 集成 | eslint-config-prettier + plugin | expo + prettier plugin | (未设置) |

### 7.3 关键问题

| 问题 | 严重程度 |
|------|---------|
| ESLint 主版本不一致 (v8 vs v9) | **高** - 配置格式不兼容 |
| Backend 规则最严格，Admin 最宽松 | **高** - 代码质量标准不一致 |
| Mobile 缺少 import 排序规则 | 中 |
| Admin 缺少 `no-floating-promises` 规则 | 中 - 可能遗漏 Promise 错误处理 |
| Backend 使用 `eslint-config-prettier`，Mobile 使用 `eslint-plugin-prettier`，Admin 无 prettier 集成 | 中 - prettier 集成方式不一致 |

---

## 8. 版本一致性

### 8.1 TypeScript 版本

| 项目 | 版本 | 严重程度 |
|------|------|---------|
| Root | ^6.0.2 | **高** - TypeScript 6 尚未正式发布 |
| Backend | (未声明，依赖 root) | 中 |
| Mobile | 5.0.4 | 中 - 精确锁定 |
| Shared | ^5.0.0 | 低 |
| Admin | ~5.7.3 | 低 |
| Types | (未声明，依赖 tsup) | 低 |

**关键问题**: Root package.json 声明 `typescript: ^6.0.2`，TypeScript 6 尚未正式发布 (截至 2026-04)，这可能是错误声明。各子项目 TypeScript 版本从 5.0.4 到 5.7.3 不等，跨项目类型检查可能产生不一致结果。

### 8.2 React 版本

| 项目 | 版本 | 严重程度 |
|------|------|---------|
| Mobile | 18.3.1 (精确) | - |
| Admin | ^18.3.1 | - |

React 版本一致，无问题。

### 8.3 Node.js 版本

| 位置 | 版本要求 | 严重程度 |
|------|---------|---------|
| Root engines | >=20.0.0 | - |
| 实际运行 | v24 | 中 - v24 非 LTS 版本 |

### 8.4 其他核心依赖版本

| 依赖 | Backend | Mobile | Admin | 严重程度 |
|------|---------|--------|-------|---------|
| axios | ^1.13.6 | ^1.12.2 | ^1.9.0 | 低 - minor 差异 |
| eslint | ^8.57.0 | ^8.19.0 | ^9.39.4 | **高** - 主版本不一致 |
| prettier | ^3.8.1 | 2.8.8 | (未安装) | **高** - 主版本不一致 |
| jest | ^29.7.0 | ^29.6.3 | (未安装) | 低 - minor 差异 |
| @prisma/client | ^5.22.0 | - | - | - |
| prisma | ^5.22.0 | - | - | - |

### 8.5 pnpm 版本

| 位置 | 版本 | 严重程度 |
|------|------|---------|
| Root engines | >=8.0.0 | - |
| Root packageManager | pnpm@8.15.0 | 低 - 8.x 已较旧，9.x 为当前稳定版 |

---

## 审计总结

### 按严重程度统计

| 严重程度 | 数量 | 关键问题 |
|---------|------|---------|
| **高** | 18 | csurf 废弃未使用、ESLint 主版本不一致、TypeScript 6 错误声明、.env.example 覆盖率低、docker-compose 缺 Qdrant、workspace 包声明未使用 |
| **中** | 19 | 类型包放错位置、tsconfig strict 不一致、import 规则不一致、数据库默认值不匹配 |
| **低** | 12 | 格式问题、minor 版本差异、低优先级缺失变量 |

### 优先修复建议 (Top 5)

1. **移除废弃依赖**: 立即移除 `csurf`、`@types/csurf`、`form-data`，以及移动端 5 个完全未使用的包
2. **修复 TypeScript 版本**: Root `typescript: ^6.0.2` 改为 `^5.7.3`，统一各子项目版本
3. **补充 .env.example**: 添加 `CORS_ORIGINS`、`LOG_LEVEL`、`REQUEST_TIMEOUT_MS`、`AI_STYLIST_DAILY_LIMIT`、`TRY_ON_DAILY_LIMIT` 等缺失变量
4. **统一 ESLint**: 将 Backend 和 Mobile 升级到 ESLint 9 + flat config，或降级 Admin 到 v8
5. **补充 Qdrant 服务**: 在 docker-compose.dev.yml 中添加 Qdrant 向量数据库服务定义

---

*审计完成。本报告仅记录发现，未执行任何修复操作。*
