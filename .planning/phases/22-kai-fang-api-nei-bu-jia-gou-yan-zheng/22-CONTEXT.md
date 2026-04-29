# Phase 22: 开放 API 内部架构验证 - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** User-provided PRD (inline context)

<domain>
## Phase Boundary

本 phase 产出内部技术验证，不是可商用的开放平台。

范围：

1. Prisma schema 新增 PartnerApiKey 和 PartnerApiCallLog 模型
2. 鉴权中间件（HMAC-SHA256 签名验证 + 时间窗口防重放）
3. 限流中间件（Redis 滑动窗口 + 429 + Retry-After）
4. 5 个 Partner API 端点（转发到现有内部 API，不做新逻辑）
5. OpenAPI 3.0 yaml 文档（每页标注 Internal Use Only）
6. OPEN_API_STRATEGY.md 更新

</domain>

<decisions>
## Implementation Decisions

### D-01: Prisma Schema — PartnerApiKey

- 模型字段：id (UUID), name (string), keyHash (string, SHA-256), keyPrefix (string, 前缀用于识别), permissions (Json, 权限列表), rateLimit (Int, 每分钟请求数), status (Enum: active/revoked/expired), expiresAt (DateTime, nullable)
- keyHash 存储 API Key 的 SHA-256 哈希，永远不存储明文 key
- keyPrefix 存储 key 的前 8 位，用于日志和识别

### D-02: Prisma Schema — PartnerApiCallLog

- 模型字段：id (UUID), keyId (FK → PartnerApiKey), endpoint (string), statusCode (Int), responseTime (Int, ms), ip (string), createdAt (DateTime)
- 用于审计和用量追踪

### D-03: 鉴权中间件 — HMAC-SHA256

- 请求签名方式：HMAC-SHA256(timestamp + method + path + body, secretKey)
- Headers：X-Api-Key (keyPrefix), X-Timestamp (Unix ms), X-Signature (HMAC hex)
- 时间窗口验证：请求 timestamp 与服务器时间差 ±5 分钟，拒绝过期请求
- 中间件查找 PartnerApiKey by keyPrefix → 比较 SHA256(明文 key) == keyHash → 验证签名 → 检查 status + expiresAt

### D-04: 限流中间件 — Redis 滑动窗口

- 使用 Redis sorted set 实现滑动窗口限流
- Key: `xuno:partner:ratelimit:{keyId}`
- 每 key 独立计数，limit 由 PartnerApiKey.rateLimit 决定
- 超限返回 429 + Retry-After header (秒数)
- 默认 rateLimit: 60 req/min

### D-05: Partner API 端点

- POST /partner/recommendation → 调用 RecommendationOrchestrator.getRecommendations()
- POST /partner/try-on → 调用 TryOnService.createTryOnRequest()
- POST /partner/body-analysis → 调用 AIIntegrationService.analyzeBodyBuffer()
- POST /partner/color-analysis → 调用 AIIntegrationService.performColorSeasonAnalysis()
- POST /partner/wardrobe/tagging → 调用 ClothingService (tagging/search 相关方法)
- 所有端点均为转发，不实现新业务逻辑

### D-06: OpenAPI 3.0 文档

- 文件路径: docs/partner-api.yaml
- 每个端点标注 "Internal Use Only · Not Production Ready"
- 包含请求/响应 schema
- 包含鉴权说明

### D-07: 反欺诈约束

- API 文档每页标注 Internal Use Only
- 不得在 PPT/文档中将此包装为"开发者生态"
- 正确说法："我们设计了 Partner API 架构，完成了鉴权和限流的技术验证"

### D-08: Seed Script

- 创建一个 seed script 生成测试用 Partner API Key
- 明文 key 仅输出到控制台（一次性显示），数据库只存 hash

### the agent's Discretion

- NestJS module 文件组织结构
- Guard vs Middleware 实现选择
- DTO 类的具体字段设计
- Error response 格式
- 是否使用现有的 RedisService 或直接注入 Redis client

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend Architecture

- `apps/backend/src/app.module.ts` — NestJS 根模块，了解现有模块注册方式
- `apps/backend/src/main.ts` — 应用启动配置，API prefix `/api`
- `apps/backend/prisma/schema.prisma` — Prisma schema，新增模型位置

### Existing Services (Partner API 转发目标)

- `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts` — 推荐服务
- `apps/backend/src/domains/ai-core/try-on/try-on.service.ts` — 试穿服务
- `apps/backend/src/domains/ai-core/ai/services/ai-integration.service.ts` — AI 分析服务
- `apps/backend/src/domains/fashion/clothing/clothing.service.ts` — 服装服务
- `apps/backend/src/domains/fashion/style-assessment/color-analysis/color-analysis.service.ts` — 色彩分析

### Infrastructure

- `apps/backend/src/common/redis/redis.service.ts` — Redis 封装，限流使用
- `apps/backend/src/modules/security/` — 安全模块，鉴权 guard 参考

### Existing Auth Patterns

- `apps/backend/src/domains/identity/auth/guards/jwt-auth.guard.ts` — JWT Guard 实现参考
- `apps/backend/src/common/guards/roles.guard.ts` — 角色权限 Guard 参考

</canonical_refs>

<specifics>
## Specific Ideas

### 验收标准

- curl -H "X-Api-Key: ...; X-Timestamp: ...; X-Signature: ..." POST /api/v1/partner/recommendation 返回推荐结果
- 错误 key 返回 401
- 超限请求返回 429 + Retry-After header
- grep "Internal Use Only" docs/partner-api.yaml 返回匹配

### 明确排除

- 计费系统
- 开发者门户/注册页面
- 沙箱环境隔离
- SLA 监控面板
- 外部用户自助注册

</specifics>

<deferred>
## Deferred Ideas

None — scope is clearly bounded to internal architecture verification.
</deferred>

---

_Phase: 22-kai-fang-api-nei-bu-jia-gou-yan-zheng_
_Context gathered: 2026-04-29 via inline PRD_
