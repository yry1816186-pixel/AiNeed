# Phase 3: 后端域划分 — identity + platform - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** Assumptions mode (codebase analysis)

<domain>
## Phase Boundary

Phase 3 建立后端域架构基础，将现有 35+ 扁平模块重组为 2 个顶层域划分：
- **identity 域**: auth, users, profile, onboarding, privacy
- **platform 层**: recommendations, admin, merchant, analytics, notification, feature-flags, health, queue, metrics

本阶段只处理 identity 域和 platform 层的迁移，其余 4 个域（ai-core, fashion, commerce, social, customization）留到 Phase 4。

本阶段还需：
- 消除 identity ↔ platform 间的循环依赖
- 配置 eslint-plugin-boundaries 域间依赖规则
- 配置 dependency-cruiser 可视化
- 将 Recommendations 降级为 platform 层共享服务
</domain>

<decisions>
## Implementation Decisions

### 目录结构
- D-01: 创建 `src/domains/identity/` 目录，包含 auth, users, profile, onboarding, privacy 子模块
- D-02: 创建 `src/domains/platform/` 目录，包含 recommendations, admin, merchant, analytics, notification, feature-flags, health, queue, metrics 子模块
- D-03: 每个域目录下创建 `index.ts` 导出该域的所有公开模块
- D-04: 保留 `src/modules/` 中未迁移的模块（Phase 4 处理）

### identity 域迁移
- D-05: auth 模块迁移到 `src/domains/identity/auth/`，保持内部结构不变
- D-06: users 模块迁移到 `src/domains/identity/users/`，保持内部结构不变
- D-07: profile 模块迁移到 `src/domains/identity/profile/`，保持内部结构不变
- D-08: onboarding 模块迁移到 `src/domains/identity/onboarding/`，保持内部结构不变
- D-09: privacy 模块迁移到 `src/domains/identity/privacy/`，保持内部结构不变

### platform 层迁移
- D-10: recommendations 模块迁移到 `src/domains/platform/recommendations/`，保持内部结构不变
- D-11: admin 模块迁移到 `src/domains/platform/admin/`，保持内部结构不变
- D-12: merchant 模块迁移到 `src/domains/platform/merchant/`，保持内部结构不变
- D-13: analytics 模块迁移到 `src/domains/platform/analytics/`，保持内部结构不变
- D-14: notification 模块迁移到 `src/domains/platform/notification/`，保持内部结构不变
- D-15: feature-flags 模块迁移到 `src/domains/platform/feature-flags/`，保持内部结构不变
- D-16: health 模块迁移到 `src/domains/platform/health/`，保持内部结构不变
- D-17: queue 模块迁移到 `src/domains/platform/queue/`，保持内部结构不变
- D-18: metrics 模块迁移到 `src/domains/platform/metrics/`，保持内部结构不变

### 循环依赖消除
- D-19: 消除 ProfileModule → RecommendationsModule 依赖（profile 导入 RecommendationsModule + ContentSubmodule）
- D-20: 消除 RecommendationsModule ↔ AiStylistModule 循环依赖（forwardRef）— 将 Recommendations 降级为 platform 层共享服务
- D-21: 消除 NotificationModule → GatewayModule 循环依赖（forwardRef）
- D-22: 消除 AdminModule → CommunityModule 循环依赖（forwardRef）— admin 暂时保留对 community 的引用，Phase 4 处理
- D-23: 消除 QueueModule → CommunityModule/TryOnModule 循环依赖（forwardRef）

### PII 加密保护
- D-24: SecurityModule（@Global）保持不变，不迁移到 identity 域
- D-25: PII 加密相关代码（pii-encryption.service.ts, prisma-encryption.middleware.ts, user-key.service.ts）标记为不可移动
- D-26: common/encryption/ 和 common/security/ 保持不变

### 依赖规则
- D-27: identity 域只能依赖 common 层 + platform 层
- D-28: platform 层只能依赖 common 层
- D-29: 未迁移模块（仍在 src/modules/）可依赖任何域
- D-30: eslint-plugin-boundaries 规则：identity → platform ✓, platform → identity ✗, identity → identity ✓, platform → platform ✓

### 工具配置
- D-31: 安装并配置 eslint-plugin-boundaries，定义 identity 和 platform 域
- D-32: 安装并配置 dependency-cruiser，生成依赖可视化图
- D-33: dependency-cruiser 规则与 eslint-plugin-boundaries 保持一致

### Recommendations 降级
- D-34: RecommendationsModule 从业务域降级为 platform 层共享服务
- D-35: AiStylistModule 通过 platform 层接口访问 RecommendationsModule，而非直接导入
- D-36: SearchModule 通过 platform 层接口访问 RecommendationsModule

### Claude's Discretion
- 域目录内是否创建 domain.module.ts 聚合模块
- 迁移后 import 路径更新的具体方式（全局替换 vs 逐步更新）
- eslint-plugin-boundaries 的具体配置格式
- dependency-cruiser 输出格式（SVG/HTML/DOT）
- ProfileModule 对 RecommendationsModule 的解耦方式（事件驱动 vs 接口抽象）
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 架构研究
- `.planning/research/ARCHITECTURE.md` — 目标架构：6 域 + 1 平台层设计
- `.planning/research/STACK.md` — 工具链推荐：eslint-plugin-boundaries + dependency-cruiser
- `.planning/research/PITFALLS.md` — 陷阱 2（循环依赖）、陷阱 6（事件驱动）、陷阱 8（PII 加密）

### 后端核心文件
- `apps/backend/src/app.module.ts` — 根模块，所有模块注册入口
- `apps/backend/src/common/` — 共享层（prisma, redis, encryption, guards, etc.）
- `apps/backend/src/modules/security/security.module.ts` — @Global 安全模块（PII 加密）

### 循环依赖关键文件
- `apps/backend/src/modules/recommendations/recommendations.module.ts` — ↔ AiStylistModule 循环依赖
- `apps/backend/src/modules/ai-stylist/ai-stylist.module.ts` — ↔ RecommendationsModule 循环依赖
- `apps/backend/src/modules/profile/profile.module.ts` — → RecommendationsModule 依赖
- `apps/backend/src/modules/notification/notification.module.ts` — → GatewayModule 循环依赖
- `apps/backend/src/modules/admin/admin.module.ts` — → CommunityModule 循环依赖
- `apps/backend/src/modules/queue/queue.module.ts` — → CommunityModule + TryOnModule 循环依赖
- `apps/backend/src/modules/search/search.module.ts` — → RecommendationsModule 循环依赖
</canonical_refs>

<specifics>
## Specific Ideas

1. **迁移策略**: 采用"移动+更新导入"策略，每次移动一个模块，立即更新所有引用
2. **ProfileModule 解耦**: ProfileModule 当前依赖 RecommendationsModule + ContentSubmodule，需要通过事件驱动或接口抽象解耦
3. **Recommendations 降级**: 作为 platform 层共享服务，其他域通过依赖注入访问，而非直接导入模块
4. **QueueModule 解耦**: QueueModule 依赖 CommunityModule 和 TryOnModule（均在 Phase 4 迁移），本阶段需处理 forwardRef
5. **AdminModule 解耦**: AdminModule 依赖 CommunityModule（Phase 4 迁移），本阶段可保留 forwardRef，但需标记为待处理
6. **SecurityModule 保持全局**: PII 加密是 @Global 模块，不迁移到任何域
7. **CacheModule 位置**: CacheModule 是共享服务，应归入 platform 层
8. **DatabaseModule 位置**: DatabaseModule 是基础设施，应归入 common 层或保持原位
</specifics>

<deferred>
## Deferred Ideas

- ai-core 域迁移（Phase 4）
- fashion 域迁移（Phase 4）
- commerce 域迁移（Phase 4）
- social 域迁移（Phase 4）
- customization 域迁移（Phase 4）
- 模块合并（style-profiles + style-quiz, wardrobe-collection + favorites, notification + stock-notification）— Phase 4
- @xuno/types 跨域共享类型提取 — Phase 4
- 所有 forwardRef 的最终消除 — Phase 4
</deferred>

---

*Phase: 03-identity-platform*
*Context gathered: 2026-04-16 via assumptions mode*
