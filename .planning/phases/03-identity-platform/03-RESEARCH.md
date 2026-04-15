# Research: Phase 3 — 后端域划分 identity + platform

**Project:** 寻裳 (XunO) 代码规整
**Researched:** 2026-04-16

## 核心发现

### 1. 模块依赖全景图

#### identity 域模块（5个）

| 模块 | 内部依赖 | 外部依赖 | 被依赖（消费者） |
|------|---------|---------|----------------|
| auth | RedisModule (forwardRef), EmailModule, PassportModule, JwtModule | common | 20+ 模块（JwtAuthGuard, AuthService, decorators） |
| users | PrismaModule, EncryptionModule, AuthModule, CacheModule | common, auth | SubscriptionModule, ProfileService |
| profile | PrismaModule, PhotosModule, **RecommendationsModule**, ContentSubmodule, AnalyticsModule | common, **platform**, ai-core | StyleQuizModule (forwardRef), AiStylistModule |
| onboarding | PrismaModule | common | PhotosModule, StyleQuizModule, StyleQuizService |
| privacy | PrismaModule, StorageModule, EmailModule | common | AuthModule (引用 privacy-version) |

#### platform 层模块（9个）

| 模块 | 内部依赖 | 外部依赖 | 被依赖（消费者） |
|------|---------|---------|----------------|
| recommendations | PrismaModule, ConfigModule, AIModule, **AiStylistModule (forwardRef)**, RedisModule, CacheModule | common, **ai-core** | ProfileModule, AiStylistModule (forwardRef), SearchModule (forwardRef) |
| admin | PrismaModule, **CommunityModule (forwardRef)** | common, **social** | AppModule only |
| merchant | PrismaModule, JwtModule | common | BrandsModule (MerchantAuthGuard) |
| analytics | ScheduleModule, PrismaModule, RedisModule, **AuthModule** | common, **identity** | ProfileModule, StyleProfilesModule |
| notification | PrismaModule, **GatewayModule (forwardRef)** | common | BloggerModule, OrderService, PaymentService |
| feature-flags | PrismaModule, RedisModule, **AuthModule**, BullModule | common, **identity** | AppModule only (guard exported) |
| health | ConfigModule, PrismaModule, RedisModule, StorageModule | common | AppModule only |
| queue | BullModule, GatewayModule, AIModule, **CommunityModule (forwardRef)**, **TryOnModule (forwardRef)** | common, ai-core, **social** | PhotosModule, TryOnModule |
| metrics | PrometheusModule | common (无) | PerformanceInterceptor, MetricsMiddleware, AppModule |

### 2. 循环依赖分析

#### Phase 3 范围内的循环依赖

| 循环 | 类型 | 严重度 | 解耦策略 |
|------|------|--------|---------|
| RecommendationsModule ↔ AiStylistModule | forwardRef | 🔴 高 | Recommendations 降级为 platform 层，AiStylistModule 通过 DI 访问 |
| ProfileModule → RecommendationsModule | 单向 | 🟠 中 | ProfileModule 通过事件驱动或接口抽象解耦 |
| SearchModule → RecommendationsModule | forwardRef | 🟠 中 | SearchModule 通过 platform 层接口访问 |
| NotificationModule → GatewayModule | forwardRef | 🟡 低 | GatewayModule 在 common 层，无需解耦 |
| AnalyticsModule → AuthModule | 单向 | 🟡 低 | analytics 在 platform 层，auth 在 identity 层，需反转依赖 |
| FeatureFlagModule → AuthModule | 单向 | 🟡 低 | 同上，platform → identity 违规 |

#### Phase 3 范围外的循环依赖（标记待处理）

| 循环 | 类型 | 处理阶段 |
|------|------|---------|
| AdminModule → CommunityModule | forwardRef | Phase 4 |
| QueueModule → CommunityModule | forwardRef | Phase 4 |
| QueueModule → TryOnModule | forwardRef | Phase 4 |

### 3. 关键依赖违规

**platform → identity 违规**（需在本阶段解决）：
1. `AnalyticsModule` 导入 `AuthModule` — 需要反转
2. `FeatureFlagModule` 导入 `AuthModule` — 需要反转

**解决方案**：
- AnalyticsModule 只需要 `JwtAuthGuard`，可通过 common 层的 guard 直接引用（JwtAuthGuard 已在 app.module.ts 全局注册）
- FeatureFlagModule 同理，AuthModule 的 guards/decorators 可提取到 common 层或 identity 域的公共导出

### 4. eslint-plugin-boundaries 配置方案

```json
{
  "plugins": ["boundaries"],
  "settings": {
    "boundaries/elements": [
      {
        "type": "identity",
        "pattern": "src/domains/identity/*",
        "mode": "folder"
      },
      {
        "type": "platform",
        "pattern": "src/domains/platform/*",
        "mode": "folder"
      },
      {
        "type": "common",
        "pattern": "src/common/*",
        "mode": "folder"
      },
      {
        "type": "modules",
        "pattern": "src/modules/*",
        "mode": "folder"
      }
    ]
  },
  "rules": {
    "boundaries/element-types": [2, {
      "default": "allow",
      "rules": [
        { "from": "identity", "disallow": ["modules"] },
        { "from": "platform", "disallow": ["identity", "modules"] },
        { "from": "common", "disallow": ["identity", "platform", "modules"] }
      ]
    }]
  }
}
```

**依赖规则**：
- identity → common ✓, platform ✓, identity ✓
- platform → common ✓, platform ✓; → identity ✗
- common → 无域依赖
- modules（未迁移）→ 任何域 ✓（过渡期）

### 5. dependency-cruiser 配置方案

```json
{
  "forbidden": [
    {
      "name": "no-platform-to-identity",
      "comment": "Platform layer must not depend on identity domain",
      "severity": "error",
      "from": { "path": "^src/domains/platform/" },
      "to": { "path": "^src/domains/identity/" }
    },
    {
      "name": "no-common-to-domain",
      "comment": "Common layer must not depend on any domain",
      "severity": "error",
      "from": { "path": "^src/common/" },
      "to": { "path": "^src/domains/" }
    }
  ]
}
```

**可视化命令**：
```bash
npx depcruise src/domains --output-type dot | dot -T svg > docs/dependency-graph.svg
npx depcruise src --output-type html > docs/dependency-report.html
```

### 6. ProfileModule 解耦方案

**当前状态**：ProfileModule 直接导入 RecommendationsModule + ContentSubmodule

**推荐方案：事件驱动解耦**
1. ProfileModule 通过 `EventEmitter2` 发布 `profile.updated` 事件
2. RecommendationsModule 的 `ProfileEventSubscriberService` 监听事件
3. ProfileModule 不再直接导入 RecommendationsModule
4. 如果 ProfileModule 需要推荐数据，通过 platform 层接口（如 `IRecommendationService`）注入

**替代方案：接口抽象**
1. 在 common 层定义 `IRecommendationService` 接口
2. RecommendationsModule 实现该接口
3. ProfileModule 通过接口注入，不直接导入 RecommendationsModule

**推荐**：事件驱动方案，因为 ProfileModule 主要需要的是"推荐数据"，而非"推荐能力"。

### 7. Recommendations 降级策略

**当前状态**：RecommendationsModule 是业务域模块，与 AiStylistModule 有循环依赖

**降级步骤**：
1. 将 RecommendationsModule 移至 `src/domains/platform/recommendations/`
2. AiStylistModule 不再直接导入 RecommendationsModule
3. 在 common 层或 platform 层定义 `IRecommendationOrchestrator` 接口
4. AiStylistModule 通过接口注入 RecommendationsModule 的能力
5. 移除 `forwardRef(() => RecommendationsModule)` 和 `forwardRef(() => AiStylistModule)`

### 8. 迁移顺序建议

基于依赖分析，推荐以下迁移顺序（从低依赖到高依赖）：

**Wave 1: 独立模块（无外部域依赖）**
1. health → `src/domains/platform/health/`
2. metrics → `src/domains/platform/metrics/`
3. onboarding → `src/domains/identity/onboarding/`
4. privacy → `src/domains/identity/privacy/`
5. merchant → `src/domains/platform/merchant/`

**Wave 2: 低依赖模块**
6. auth → `src/domains/identity/auth/`
7. notification → `src/domains/platform/notification/`
8. queue → `src/domains/platform/queue/`

**Wave 3: 高依赖模块（需先解耦）**
9. analytics → `src/domains/platform/analytics/`（需先移除 AuthModule 依赖）
10. feature-flags → `src/domains/platform/feature-flags/`（需先移除 AuthModule 依赖）
11. users → `src/domains/identity/users/`
12. profile → `src/domains/identity/profile/`（需先解耦 RecommendationsModule）
13. recommendations → `src/domains/platform/recommendations/`（需先解耦 AiStylistModule）
14. admin → `src/domains/platform/admin/`（保留 CommunityModule forwardRef，Phase 4 处理）

### 9. app.module.ts 变更影响

迁移后 app.module.ts 需要：
1. 更新所有 import 路径（从 `./modules/xxx` → `./domains/identity/xxx` 或 `./domains/platform/xxx`）
2. 保留未迁移模块的 import（`./modules/xxx`）
3. 可能需要添加域级别的聚合模块（如 `IdentityDomainModule`, `PlatformModule`）

**推荐**：不创建域聚合模块，直接在 app.module.ts 中引用各子模块。原因：
- NestJS 模块系统已足够，额外聚合层增加复杂度
- 迁移期间需要精确控制每个模块的注册
- 后续可按需添加聚合模块

### 10. 验证策略

**编译验证**：
- `npx nest build` 无错误
- `npx tsc --noEmit` 无错误

**运行时验证**：
- 所有 API 端点正常响应（通过 `curl` 或 Postman 验证）
- PII 加密功能正常（敏感字段仍加密存储）
- 事件监听器正常触发

**架构验证**：
- `eslint-plugin-boundaries` 规则通过
- `dependency-cruiser` 无违规依赖
- 无新增 `forwardRef`

## Validation Architecture

### Dimension 1: 编译正确性
- `nest build` 成功
- `tsc --noEmit` 成功

### Dimension 2: 运行时正确性
- 所有 API 端点返回正确状态码
- PII 加密字段仍加密
- 事件驱动流程正常

### Dimension 3: 架构合规性
- eslint-plugin-boundaries 规则通过
- dependency-cruiser 无违规
- 无 identity ↔ platform 循环依赖

### Dimension 4: 回归防护
- 现有测试全部通过
- 无新增 forwardRef

---

*Phase: 03-identity-platform*
*Research completed: 2026-04-16*
