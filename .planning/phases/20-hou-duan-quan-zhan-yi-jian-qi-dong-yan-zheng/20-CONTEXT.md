# Phase 20: 后端全栈一键启动验证 - Context

**Gathered:** 2026-04-28 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

确保 `docker-compose up` 一条命令启动所有后端服务（PostgreSQL + Redis + MinIO + Qdrant + FastAPI AI 服务 + NestJS 后端），所有 health check 返回 healthy，seed demo 数据就绪，本地启动文档完整。

**In scope:**

- 创建/完善本地一键启动 Docker 配置
- 验证所有 health endpoint 返回 200/healthy
- 确保 Prisma migrate 可执行
- 改造 seed 数据添加 is_demo 标记 + demo 前缀 + 7 天推荐
- 编写本地启动步骤文档

**Out of scope:**

- 生产部署配置（docker-compose.yml 已有）
- 前端启动（React Native/Expo 单独运行）
- 性能优化、监控配置
- 新功能开发

</domain>

<decisions>
## Implementation Decisions

### Docker Compose 策略

- **D-01:** 创建 `docker-compose.local.yml` 作为本地一键启动配置，继承 docker-compose.dev.yml 的基础设施服务，额外添加 backend + ai-service 容器
- **D-02:** docker-compose.dev.yml 保持不变（仅基础设施），docker-compose.local.yml 扩展用于本地全栈开发
- **D-03:** backend 和 ai-service 容器从本地源码构建（非 pre-built image），支持热重载开发

### Seed 数据改造

- **D-04:** 修改现有 `apps/backend/prisma/seed.ts`，为所有 seed 数据添加 `is_demo: true` 标记
- **D-05:** Seed 用户名/邮箱统一使用 "demo" 前缀（如 `demo_user@xuno.local`）
- **D-06:** 补充 7 天穿搭推荐 seed 数据，覆盖每日搭配 + 天气场景
- **D-07:** Seed 至少包含：1 个 demo 用户 + 10 件衣橱衣物 + 7 天推荐数据
- **D-08:** 生产环境 seed 保护保留（NODE_ENV === "production" 时拒绝运行）

### 反欺诈/数据透明约束

- **D-09:** 所有 API 响应必须包含 `provider` 字段标注数据来源（real/sandbox/fallback）
- **D-10:** Seed 数据在 API 响应中不伪装为真实数据，is_demo 标记在用户/物品查询时可见
- **D-11:** 启动文档中明确标注哪些服务是 demo/sandbox 模式（定制化预览 sandbox、天气 fallback、支付 sandbox）
- **D-12:** 任何骨架/placeholder 功能必须在 UI 中标注"开发中"并隐藏入口（本 phase 不涉及 UI，但 seed 数据层面需确保不包含误导性内容）

### Health Check 验证

- **D-13:** 编写 `scripts/health-check.sh` 自动化验证脚本，检查所有服务 health endpoint
- **D-14:** 验证脚本检查项：PostgreSQL pg_isready、Redis ping、MinIO /minio/health/live、Qdrant /healthz、FastAPI /health (port 8002)、NestJS /api/v1/health (port 3001)
- **D-15:** 验证脚本返回 exit code 0（全绿）或 1（有失败），输出各服务状态表

### 文档

- **D-16:** 创建 `docs/local-setup.md` 详细本地启动步骤文档
- **D-17:** README.md 添加"本地开发快速启动"section，链接到 docs/local-setup.md
- **D-18:** 文档中明确说明"seed 数据仅供开发测试，不代表真实用户或真实商品"
- **D-19:** 文档包含：前置依赖、环境变量配置、启动命令、验证步骤、常见问题排查

### the agent's Discretion

- docker-compose.local.yml 具体服务编排细节（端口映射、卷挂载、环境变量传递）
- health-check.sh 具体实现方式（bash vs node script）
- seed 数据的具体品类/款式/搭配内容
- 文档的详细排版和格式

### Folded Todos

None — no pending todos matched this phase.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Docker & Infrastructure

- `docker-compose.dev.yml` — 开发环境基础设施配置（postgres/redis/minio/neo4j/qdrant）
- `docker-compose.yml` — 生产环境全服务编排（15 服务），backend/ai-service 容器定义参考
- `.env.example` — 环境变量模板，所有必填/可选变量定义
- `.env` — 实际环境变量（不提交到 VCS，仅参考 .env.example）

### Health Check 实现

- `apps/backend/src/domains/platform/health/health.controller.ts` — NestJS health controller，/api/v1/health 端点定义
- `apps/backend/src/domains/platform/health/health.service.ts` — NestJS health service，检查 database/redis/storage/mlService
- `ml/api/routes/health.py` — FastAPI health endpoint，检查 redis/qdrant/glm_api 连通性
- `ml/api/routes/health.py:90` — FastAPI /health/detailed，检查模型加载状态和资源使用

### Seed 数据

- `apps/backend/prisma/seed.ts` — 现有 seed 脚本入口，10 步 seed 流程
- `apps/backend/prisma/seeds/` — 各类 seed 数据模块（users/brands/clothing/profiles/recommendations 等）
- `apps/backend/prisma/schema.prisma` — Prisma schema，数据库模型定义

### 反欺诈/合规

- `.planning/FINAL_DELIVERY_SUMMARY.md` §11 — 不得夸大的能力清单（10 项禁止 + 8 项允许）
- `.planning/FINAL_DELIVERY_SUMMARY.md` §5 — 定制化设计 sandbox 标注情况
- `.planning/FINAL_DELIVERY_SUMMARY.md` §9 — 安全修复记录（mock/fake 处理方式）
- `.planning/phase-0/AGENT_AUDIT_REPORT.md` — 全项目只读审计报告

### 项目上下文

- `.planning/PROJECT.md` — 项目愿景、核心价值、冻结决策
- `.planning/ROADMAP.md` Phase 20 — 本 phase 的 roadmap 定义和验收标准

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `docker-compose.dev.yml` — 已有 5 个基础设施服务的 health check 定义，可直接引用
- `docker-compose.yml` backend service — 已有 NestJS Dockerfile 构建配置、环境变量列表、depends_on 链
- `docker-compose.yml` ai-service — 已有 FastAPI Dockerfile 构建配置（context: ./ml, dockerfile: api/Dockerfile）
- `HealthService` (health.service.ts) — 完整的 4 组件健康检查实现（database/redis/storage/mlService）
- FastAPI `/health` — 已检查 redis/qdrant/glm_api 连通性，返回 healthy/degraded 状态
- `seed.ts` — 完整的 10 步 seed 流程，已有 production 环境守卫

### Established Patterns

- Docker Compose 服务编排：所有服务都有 healthcheck + resource limits + logging 配置
- Health Check 模式：各服务独立 health check → NestJS HealthService 聚合 → 返回 healthy/unhealthy/degraded
- Seed 模式：分步 seed（brands → users → clothing → profiles → quiz → community → rules → rec-test → feature-flags → recommendations+ecommerce）
- 环境变量：必填用 `${VAR:?error message}`，可选有默认值 `${VAR:-default}`

### Integration Points

- NestJS backend 依赖：postgres (health) → redis (health) → minio (health) → qdrant (health) → ai-service (health)
- FastAPI ai-service 依赖：redis (health) → qdrant (health)
- Backend health check 调用 FastAPI /health（通过 ML_SERVICE_URL 配置）
- Prisma migrate 需要 DATABASE_URL 指向可用的 PostgreSQL
- MinIO 需要 bucket 初始化（minio-init 容器处理）

### Key Constraints

- Neo4j 在 docker-compose.dev.yml 中但未在 docker-compose.yml 中——是否需要保留待定
- Qdrant health check 在 dev.yml 中是 `exit 0`（空检查），生产版用 TCP 检查
- Backend Dockerfile 引用 `apps/backend/Dockerfile`——需确认文件存在且可用
- FastAPI Dockerfile 引用 `ml/api/Dockerfile`——需确认文件存在且可用
- .env.example 中 GLM_API_KEY/ZHIPU_API_KEY/OPENAI_API_KEY 可为空（AI 服务降级但不阻塞启动）

</code_context>

<specifics>
## Specific Ideas

- "一条命令启动"意味着 `docker compose -f docker-compose.local.yml up` 即可，不需要额外的手动步骤
- seed 数据的用户应该是 `demo_user@xuno.local` 这样的明显测试账号，避免与真实用户混淆
- health-check.sh 应该有颜色输出（绿色=healthy，红色=unhealthy），方便开发者一眼看出问题
- 文档中需要包含 Windows (PowerShell) 和 macOS/Linux 两种环境的启动命令
- 反欺诈约束是全局的，所有后续 phase 都需要遵守——本 phase 是第一个执行的 phase，需要建立标杆

</specifics>

<deferred>
## Deferred Ideas

- 前端 Expo/React Native 一键启动——属于前端开发环境配置，不同 phase
- CI/CD pipeline 集成——属于 DevOps 阶段
- 性能测试和压测——属于 Phase 19 范围
- 生产部署自动化——Phase 10 已覆盖
- Neo4j 服务是否需要保留——需确认是否仍在使用，可延迟到执行时决定

</deferred>

---

_Phase: 20-hou-duan-quan-zhan-yi-jian-qi-dong-yan-zheng_
_Context gathered: 2026-04-28_
