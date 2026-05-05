# PROJECT_SUMMARY.md — 寻裳 (XunO)

> Agent 入口文档 — 首次读取此文件即可理解项目全貌
> Phase 1 / GOV-01 | Created: 2026-05-05

---

## 1. 项目概述

- **项目名称:** 寻裳 (XunO)
- **一句话描述:** AI 驱动的全年龄段智能穿搭决策平台
- **核心价值:** AI 造型师「伊伊」通过自然对话精准推荐穿搭方案，让每个人都能获得专业级的形象建议
- **项目类型:** Monorepo (pnpm workspace + Turborepo)

## 2. 技术栈

```
语言:       TypeScript 5.7.3 (主), Python 3.11 (ML 服务), ArkTS (HarmonyOS), SCSS (小程序)
运行时:     Node.js >=20.0.0 (.nvmrc: 20.11.0), Python >=3.11
包管理:     pnpm 8.15.0+ (lock: pnpm-lock.yaml)
构建系统:   Turborepo 2.5

后端:       NestJS 11.x + Prisma 5.22 + PostgreSQL 16 + Redis 7 + BullMQ 5.71
移动端:     React Native 0.76.8 (Expo 52) + React 18.3.1
管理后台:   React 18 + Vite 6.3 + Ant Design 5.24
小程序:     Taro 4.2.0 + React 18
ML 服务:    Python 3.11 FastAPI + transformers + onnxruntime
存储:       MinIO (对象), Qdrant (向量), Neo4j (图)

关键库:
  - react-native-reanimated 3.16.7 (锁定)
  - react-native-screens 4.4.0 (锁定)
  - passport + passport-jwt (鉴权)
  - axios 1.13 (HTTP)
  - zustand 5.0 (状态管理)
  - @tanstack/react-query 5.81 (服务端状态)
  - @shopify/react-native-skia 1.12 (Canvas)
  - @shopify/flash-list 2.3 (高性能列表)
  - socket.io-client 4.7 (WebSocket)
```

## 3. 目录结构

```
xuno/                                   # 项目根
├── apps/
│   ├── backend/                        # NestJS API 服务 (@xuno/backend)
│   │   ├── src/main.ts                 # ★ 入口: 服务引导
│   │   ├── src/app.module.ts           # 根模块
│   │   ├── src/domains/               # 8 业务域 (DDD)
│   │   ├── src/common/                # 25 跨切面基础设施
│   │   ├── src/modules/               # 5 底层基础设施模块
│   │   └── prisma/schema.prisma       # 数据库模型 (2876行/80+模型)
│   ├── mobile/                         # React Native 移动端 (@xuno/mobile)
│   │   ├── App.tsx                     # ★ 入口: 根组件 + Provider 树
│   │   ├── index.js                    # Expo 注册入口
│   │   ├── src/features/              # 18 功能模块
│   │   ├── src/design-system/         # UI 设计系统
│   │   └── android/                   # Android 原生工程
│   ├── admin/                          # React 管理后台 (@xuno/admin)
│   │   └── src/main.tsx               # ★ 入口: SPA 挂载点
│   └── mini-program/                   # 微信小程序 (Taro)
├── packages/
│   ├── types/                          # @xuno/types — 共享类型定义 (12 域)
│   └── shared/                         # @xuno/shared — 共享工具 (验证/色彩)
├── ml/                                 # Python AI/ML 服务
│   ├── api/                            # FastAPI 入口
│   ├── services/                       # ML 服务模块
│   └── pyproject.toml                  # Python 项目配置
├── infrastructure/                     # IAC (Nginx/Prometheus/Grafana/...)
├── k8s/                                # Kubernetes 部署清单
├── scripts/                            # 根级脚本 (67+ 文件, 含审计/备份/部署)
├── docker-compose.yml                  # 生产 Docker Compose (17 服务)
├── docker-compose.dev.yml              # 开发环境 Docker Compose
├── turbo.json                          # Turborepo 任务图
├── pnpm-workspace.yaml                 # 工作区声明
└── .planning/                          # GSD 项目管理产物
```

## 4. 入口文件

| 应用       | 入口                                     | 框架              |
| ---------- | ---------------------------------------- | ----------------- |
| 后端 API   | `apps/backend/src/main.ts`               | NestJS 11         |
| 移动端     | `apps/mobile/App.tsx` (注册: `index.js`) | Expo 52 / RN 0.76 |
| 管理后台   | `apps/admin/src/main.tsx`                | React 18 + Vite 6 |
| 微信小程序 | `apps/mini-program/` (Taro)              | Taro 4.2          |
| ML 服务    | `ml/api/`                                | FastAPI + uvicorn |

## 5. 启动命令

```bash
# 后端 (开发)
pnpm dev                          # 或 pnpm --filter @xuno/backend dev

# 移动端 (Expo)
pnpm dev:mobile                   # 或 cd apps/mobile && npx expo start

# 管理后台
pnpm dev:admin                    # 或 pnpm --filter @xuno/admin dev

# 基础设施 (Docker)
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL/Redis/MinIO/Qdrant

# 全栈开发: 先启动基础设施，再启动需要的应用
```

## 6. 构建命令

```bash
# 全量构建 (Turborepo, 含类型检查)
pnpm build

# 单独构建
pnpm --filter @xuno/backend build       # NestJS → dist/
pnpm --filter @xuno/admin build         # Vite → dist/
pnpm --filter @xuno/types build         # tsup → dist/

# Python ML 语法检查
cd ml && python -m compileall .
```

## 7. 测试命令

```bash
# 全量测试 (Turborepo)
pnpm test

# 按包测试
pnpm --filter @xuno/backend test        # Jest 29.7 (覆盖率阈值 20%)
pnpm --filter @xuno/mobile test         # Jest + @testing-library/react-native (阈值 60%)
cd apps/admin && pnpm vitest            # Vitest
cd packages/shared && pnpm test         # Jest + ts-jest

# ML 测试
cd ml && python -m pytest               # pytest 7.0 + pytest-asyncio

# E2E
pnpm test:e2e                           # Playwright API 测试
```

## 8. Lock 文件

| 文件                | 包管理器    | 说明               |
| ------------------- | ----------- | ------------------ |
| `pnpm-lock.yaml`    | pnpm 8.15.0 | JS/TS 全量依赖锁定 |
| `ml/pyproject.toml` | poetry/pip  | Python 依赖声明    |

注意: package.json 声明 `packageManager: pnpm@8.15.0`，实际运行环境可能为 pnpm 10.x (版本不匹配风险见 CONCERNS.md P2-15)。

## 9. 不可修改业务模块

以下模块受零业务侵入原则保护，Phase 1-8 改造中**绝对不可修改**:

| 模块              | 路径                                         | 说明                       |
| ----------------- | -------------------------------------------- | -------------------------- |
| 鉴权              | `apps/backend/src/domains/identity/auth/`    | JWT + Local + WeChat 策略  |
| 支付              | `apps/backend/src/domains/commerce/payment/` | 支付宝 + 微信支付          |
| 订单              | `apps/backend/src/domains/commerce/order/`   | 订单生命周期管理           |
| AI 核心           | `apps/backend/src/domains/ai-core/`          | AI 对话/试穿/推荐引擎      |
| 数据库            | `apps/backend/prisma/schema.prisma`          | 数据库 schema (不可改结构) |
| 权限              | guards, decorators, roles                    | 全局守卫和角色体系         |
| 核心业务流程      | 各 domain services                           | 购物车/退款/订阅/佣金等    |
| Prisma migrations | `apps/backend/prisma/migrations/`            | 迁移历史                   |

## 10. 当前风险清单

**来源:** `.planning/codebase/CONCERNS.md` (26 findings, 2026-05-05)

```
P0 (4): 明文API密钥 | 算法备案未完成 | 软著未注册 | AI内容无水印
P1 (9): 81个静默catch块 | 无暴力破解保护 | 硬编码fetch | 内部HTTP通信 |
        CSP硬编码ws:// | 生产console.log | admin类型重复 | 7个TODO存根 | admin API未连接
P2 (18): 过期TODO | deprecated标注 | 巨型文件(6个>1200行) | 模块过度耦合 | 架构漂移 |
        pnpm版本不匹配 | ML包名冲突 | requirements.txt废弃 | N+1查询风险 | ...
```

**治理评分:** 90/100 | **合规评分:** 40/100 FAIL

## 11. 项目约束

- 禁止修改鉴权、支付、订单、AI 核心、数据库、权限、核心业务流程
- 禁止读取 .env / 密钥 / 证书 / 签名文件
- 禁止无脑升级依赖
- 每个 phase 必须: 审计 → 计划 → 执行 → 验证 → 报告
- 禁止删除源码/资源目录/配置模板/lock 文件
- 锁定版本: react-native-screens 4.4.0, reanimated 3.16.7 — 不可升级
