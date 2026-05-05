# Phase 1 基线确认 (GOV-07)

> Created: 2026-05-05 | Source: PROJECT_SUMMARY.md + codebase audit artifacts

## 项目类型

- [x] 已确认 Monorepo: pnpm workspace (5 apps + 2 packages)
- [x] 已确认 Monorepo 编排: Turborepo 2.5
- [x] 已确认 全栈项目 (NestJS + React Native + React + Taro + Python)

## 核心业务

- [x] 已确认 AI 造型师对话 (伊伊)
- [x] 已确认 虚拟试穿效果生成
- [x] 已确认 穿搭推荐引擎
- [x] 已确认 电商闭环 (商品/购物车/支付/订单)
- [x] 已确认 风格测评 + 衣橱管理
- [x] 已确认 社区/发现/搜索/通知
- [x] 已确认 4 步引导式注册 (场景/画像/风格/首搭)
- [x] 已确认 4-Tab 导航 (Today/Discover/Stylist/Me)

## 技术栈 (逐项确认)

- [x] 已确认 语言: TypeScript 5.7.3 + Python 3.11
- [x] 已确认 运行时: Node.js >=20, pnpm >=8
- [x] 已确认 后端: NestJS 11.x + Prisma 5.x + PostgreSQL 16
- [x] 已确认 移动端: React Native 0.76.8 (Expo 52)
- [x] 已确认 管理后台: React 18 + Vite 6.3 + Ant Design 5.24
- [x] 已确认 小程序: Taro 4.2.0
- [x] 已确认 ML: Python FastAPI + transformers + onnxruntime
- [x] 已确认 存储: MinIO / Qdrant / Neo4j
- [x] 已确认 队列: BullMQ 5.71 + Redis 7

## 目录结构 (逐项确认)

- [x] 已确认 apps/backend/ 存在 (NestJS API)
- [x] 已确认 apps/mobile/ 存在 (React Native)
- [x] 已确认 apps/admin/ 存在 (React SPA)
- [x] 已确认 apps/mini-program/ 存在 (Taro 小程序)
- [x] 已确认 packages/types/ 存在 (共享类型)
- [x] 已确认 packages/shared/ 存在 (共享工具)
- [x] 已确认 ml/ 存在 (Python ML)
- [x] 已确认 infrastructure/ 存在 (IAC)
- [x] 已确认 k8s/ 存在 (Kubernetes 清单)
- [x] 已确认 docker-compose.yml 存在 (生产)
- [x] 已确认 docker-compose.dev.yml 存在 (开发)
- [x] 已确认 turbo.json 存在
- [x] 已确认 pnpm-workspace.yaml 存在

## 启动命令确认

- [x] 已确认 `pnpm dev` — 启动后端 (package.json scripts.dev)
- [x] 已确认 `pnpm dev:mobile` — 启动移动端 Metro (package.json scripts.dev:mobile)
- [x] 已确认 `pnpm dev:admin` — 启动管理后台 Vite (package.json scripts.dev:admin)
- [x] 已确认 `docker compose -f docker-compose.dev.yml up -d` — 启动基础设施

## 构建命令确认

- [x] 已确认 `pnpm build` — turbo 全量构建 (turbo.json + package.json)
- [x] 已确认 `pnpm --filter @xuno/backend build` — 后端构建
- [x] 已确认 `pnpm --filter @xuno/admin build` — 后台构建

## 测试命令确认

- [x] 已确认 `pnpm test` — turbo 全量测试 (turbo.json + package.json)
- [x] 已确认 `pnpm --filter @xuno/backend test` — 后端 Jest
- [x] 已确认 `pnpm --filter @xuno/mobile test` — 移动端 Jest
- [?] 待实地验证 `pnpm test:e2e` — E2E (Playwright) — 需运行时确认

## 当前风险清单

基于 CONCERNS.md:

- [x] 已确认 P0 (4): 明文 API 密钥 | 算法备案 | 软著 | AI 水印
- [x] 已确认 P1 (9): 静默 catch | 暴力破解 | 硬编码 fetch | 内部 HTTP | CSP | console.log | 类型重复 | TODO 存根 | admin API
- [x] 已确认 P2 (18): 详情见 CONCERNS.md

## 约束确认

- [x] 已确认 零业务侵入: 不修改鉴权/支付/订单/AI/数据库/权限/核心流程
- [x] 已确认 不删除文件
- [x] 已确认 不升级依赖
- [x] 已确认 不读取 .env / 密钥 / 证书

## 基线完整性

- [x] 已确认 PROJECT_SUMMARY.md 已创建 (Task 1)
- [x] 已确认 所有 TECHNOLOGY_STACK entries 已验证 (from STACK.md)
- [x] 已确认 所有 ENTRY_POINTS 已验证 (from STRUCTURE.md)
- [x] 已确认 不可修改模块清单完整 (7 项)
- [x] 已确认 风险清单来源可追溯 (CONCERNS.md, 26 findings)

---

## 已知差异

| 项        | 声明值                  | 实际值     | 状态                 |
| --------- | ----------------------- | ---------- | -------------------- |
| pnpm 版本 | 8.15.0 (packageManager) | 可能 10.x  | [!] 部分确认 — P2-15 |
| E2E 测试  | pnpm test:e2e           | 未实际运行 | [?] 待实地验证       |
