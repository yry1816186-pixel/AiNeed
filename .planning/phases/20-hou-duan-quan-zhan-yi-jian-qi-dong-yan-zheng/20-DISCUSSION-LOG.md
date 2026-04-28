# Phase 20: 后端全栈一键启动验证 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 20-hou-duan-quan-zhan-yi-jian-qi-dong-yan-zheng
**Mode:** auto (all decisions auto-selected)
**Areas analyzed:** Docker Compose 策略, Seed 数据改造, 反欺诈/数据透明约束, Health Check 验证, 文档

---

## Docker Compose 策略

| Option                        | Description                                                    | Selected |
| ----------------------------- | -------------------------------------------------------------- | -------- |
| 创建 docker-compose.local.yml | 扩展 dev.yml，添加 backend + ai-service 容器，本地全栈一键启动 | ✓        |
| 扩展 docker-compose.dev.yml   | 直接修改 dev.yml 添加应用服务                                  |          |
| 保持分离，文档说明            | dev.yml 只有基础设施，文档说明如何分别启动 backend 和 FastAPI  |          |

**Auto-selected:** 创建 docker-compose.local.yml — 保持 dev.yml 不变用于纯基础设施，local.yml 用于本地全栈开发

---

## Seed 数据改造

| Option                | Description                                              | Selected |
| --------------------- | -------------------------------------------------------- | -------- |
| 修改现有 seed.ts      | 在现有 seed 流程中添加 is_demo 标记、demo 前缀、7 天推荐 | ✓        |
| 创建独立 demo-seed.ts | 单独的 demo seed 脚本，不修改现有 seed                   |          |
| 混合方案              | 现有 seed + 额外 demo-seed 脚本                          |          |

**Auto-selected:** 修改现有 seed.ts — 最小改动，避免维护两套 seed 脚本

---

## Health Check 验证方式

| Option                   | Description                                  | Selected |
| ------------------------ | -------------------------------------------- | -------- |
| scripts/health-check.sh  | 自动化 bash 脚本检查所有服务 health endpoint | ✓        |
| 依赖 Docker health check | 仅使用 docker compose 内置 health check      |          |
| npm script               | Node.js 脚本检查 health endpoint             |          |

**Auto-selected:** scripts/health-check.sh — 可重复验证，独立于 Docker，支持 CI 集成

---

## 文档格式和位置

| Option                               | Description             | Selected |
| ------------------------------------ | ----------------------- | -------- |
| docs/local-setup.md + README section | 完整文档 + 快速启动引用 | ✓        |
| 仅 README.md section                 | 所有内容写在 README 中  |          |
| 仅 docs/local-setup.md               | 完整文档但不修改 README |          |

**Auto-selected:** docs/local-setup.md + README section — 完整文档和快速启动双覆盖

---

## Auto-Resolved

- Docker 策略: auto-selected docker-compose.local.yml (recommended)
- Seed 改造: auto-selected 修改现有 seed.ts (recommended)
- 验证方式: auto-selected scripts/health-check.sh (recommended)
- 文档位置: auto-selected docs/local-setup.md + README section (recommended)

## Deferred Ideas

- 前端 Expo/React Native 一键启动
- CI/CD pipeline 集成
- 性能测试和压测
- 生产部署自动化
- Neo4j 服务是否需要保留

---

_Discussion log generated: 2026-04-28_
