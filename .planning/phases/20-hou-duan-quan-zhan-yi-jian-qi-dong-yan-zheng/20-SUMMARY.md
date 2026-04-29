---
phase: "20"
plan: "20-all"
subsystem: "backend-infra"
tags: ["docker", "seed-data", "health-check", "documentation"]
dependency_graph:
  requires:
    [
      "docker-compose.dev.yml",
      "apps/backend/Dockerfile",
      "ml/api/Dockerfile",
      "apps/backend/prisma/schema.prisma",
    ]
  provides:
    [
      "docker-compose.local.yml",
      ".env.local",
      "is_demo schema fields",
      "demo-recommendations.seed.ts",
      "health-check scripts",
      "local-setup docs",
    ]
  affects:
    [
      "seed.ts",
      "users.seed.ts",
      "clothing.seed.ts",
      "recommendations.seed.ts",
      "recommendation-test.seed.ts",
      "ecommerce.seed.ts",
      "clean.ts",
      "README.md",
    ]
tech_stack:
  added: ["docker-compose.local.yml"]
  patterns:
    [
      "shared localnet network",
      "service_healthy dependency chains",
      "is_demo boolean markers",
      "demo_ prefixed seed data",
    ]
key_files:
  created:
    - docker-compose.local.yml
    - .env.local
    - apps/backend/prisma/seeds/demo-recommendations.seed.ts
    - scripts/health-check.sh
    - scripts/health-check.ps1
    - docs/local-setup.md
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/prisma/seed.ts
    - apps/backend/prisma/seeds/users.seed.ts
    - apps/backend/prisma/seeds/clothing.seed.ts
    - apps/backend/prisma/seeds/recommendations.seed.ts
    - apps/backend/prisma/seeds/recommendation-test.seed.ts
    - apps/backend/prisma/seeds/ecommerce.seed.ts
    - apps/backend/prisma/seeds/clean.ts
    - apps/backend/Dockerfile
    - README.md
decisions:
  - "D-01: docker-compose.local.yml inherits dev.yml infra + adds backend/ai-service containers"
  - "D-04: All seed data marked is_demo: true for anti-fraud transparency"
  - "D-05: All seed emails/usernames use demo_ prefix (e.g. demo_user@xuno.local)"
  - "D-09: Recommendation seed data uses provider: sandbox field"
  - "D-13/D-14/D-15: health-check.sh checks 4 TCP + 2 HTTP endpoints, exits 0/1"
  - "D-16/D-17/D-18: docs/local-setup.md + README.md section with demo data disclaimer"
metrics:
  duration: "14min"
  completed: "2026-04-29"
  tasks: 3
  files: 16
---

# Phase 20: 后端全栈一键启动验证 Summary

Docker 化全栈环境 + seed 数据 is_demo 标记改造 + health check 脚本 + 本地开发文档，实现 `docker compose up` 一键启动验证。

## Plan 20-01: Docker 化全栈环境

**Commit:** `23420a28`

- 创建 `docker-compose.local.yml` 包含 7 个服务（postgres, redis, minio, qdrant, minio-init, ai-service, backend）
- 所有服务使用 `localnet` 共享网络，配置 healthcheck + resource limits + json-file logging
- backend depends_on postgres/redis/minio/ai-service (all `service_healthy`)
- backend Dockerfile CMD 更新为 `prisma migrate deploy && node dist/main.js`
- 创建 `.env.local` 模板包含 GLM_API_KEY, ZHIPU_API_KEY, OPENAI_API_KEY 占位符
- `docker compose config` 验证通过

## Plan 20-02: Seed 数据系统改造

**Commit:** `fce4f226`

- Prisma schema User model 添加 `is_demo Boolean @default(false)`
- Prisma schema ClothingItem model 添加 `is_demo Boolean @default(false)`
- 所有 seed 用户 email 添加 `demo_` 前缀（test@example.com → demo_test@example.com）
- 所有 seed 用户创建时标记 `is_demo: true`
- 所有 clothing item 创建时标记 `is_demo: true`
- 创建 `demo-recommendations.seed.ts`，生成 7 天推荐数据（覆盖 7 个不同场景）
- 推荐数据 context 包含 `is_demo: true` 和 `provider: "sandbox"`
- 更新所有引用旧 email 的 seed 文件（recommendations, recommendation-test, ecommerce, clean）
- `npx prisma validate` 验证通过
- 生产环境 seed 保护（NODE_ENV === "production" 检查）保留不变

## Plan 20-03: Health Check 脚本 + 本地开发文档

**Commit:** `e2184079`

- `scripts/health-check.sh` — 检查 4 个 TCP 服务 (5432/6379/9000/6333) + 2 个 HTTP 服务 (8002/3001)
- `scripts/health-check.ps1` — Windows PowerShell 等效脚本
- 两个脚本 exit code 0=全绿, 1=有失败
- `docs/local-setup.md` 完整本地启动指南：前置依赖、配置、启动、验证、端口表、sandbox 模式说明、常见问题
- README.md 添加"本地开发快速启动"section + demo 数据免责声明
- 测试账号更新为 demo\_ 前缀

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality is wired to real implementations.

## Threat Flags

No new threat surface introduced beyond what was planned. All seed data is clearly marked as demo/test data with `is_demo: true` and `demo_` prefixed emails.

## Self-Check: PASSED

All 7 created files verified present. All 3 plan commits verified in git log (23420a28, fce4f226, e2184079).
