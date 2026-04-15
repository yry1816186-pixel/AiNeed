# Phase 4: 后端域划分 — fashion + ai-core + commerce + social + customization - Research

**Gathered:** 2026-04-16
**Status:** Complete

## Current State (Verified Facts)

### 当前模块结构（48 个模块）

后端目前有 **48 个模块** 在 `apps/backend/src/modules/` 下以扁平结构组织。Phase 4 需要将其中 27 个模块迁移到 5 个新域（fashion, ai-core, commerce, social, customization），Phase 3 已处理 identity 和 platform 域。

### Phase 4 涉及的模块清单

| 域 | 模块 | 数量 |
|---|---|---|
| **fashion** | clothing, brands, search, favorites, wardrobe-collection, style-quiz, style-profiles, weather | 8 |
| **ai-core** | ai-stylist, try-on, ai, ai-safety, photos | 5 |
| **commerce** | cart, order, payment, coupon, address, refund-request, subscription, stock-notification, size-recommendation | 9 |
| **social** | community, blogger, consultant, chat | 4 |
| **customization** | customization, share-template | 2 |
| **合计** | | **28** |

### forwardRef 循环依赖完整清单（11 对）

| # | 循环对 | 类型 | 解耦策略 |
|---|--------|------|----------|
| 1 | AiStylistModule ↔ RecommendationsModule | 模块级 forwardRef | Recommendations 降级 platform 层（Phase 3 已处理） |
| 2 | QueueModule ↔ CommunityModule | 模块级 forwardRef | QueueModule 提取 ContentModerationProcessor 到独立模块 |
| 3 | QueueModule ↔ TryOnModule | 模块级 forwardRef | QueueModule 提取 VirtualTryOnProcessor 到 try-on 模块 |
| 4 | NotificationModule ↔ GatewayModule | 模块级 forwardRef | GatewayModule 是 @Global，移除 forwardRef |
| 5 | NotificationService ↔ WebSocketNotificationService | 服务级 forwardRef | 同上，GatewayModule @Global 后直接注入 |
| 6 | CartModule ↔ CouponModule | 模块级 forwardRef | 事件驱动：Cart 发事件，Coupon 监听 |
| 7 | CartService ↔ CouponService | 服务级 forwardRef | 同上 |
| 8 | RefundRequestModule ↔ PaymentModule | 模块级 forwardRef | 事件驱动：RefundRequest 发事件，Payment 监听 |
| 9 | AdminModule ↔ CommunityModule | 模块级 forwardRef | AdminCommunityController 移入 Community 模块 |
| 10 | StyleQuizModule ↔ ProfileModule | 模块级 forwardRef | 合并 style-quiz + style-profiles 后内部解决 |
| 11 | BrandsModule ↔ BrandPortalModule | 模块级 forwardRef | BrandPortalModule 移入 BrandsModule 内部 |

### 事件驱动架构（13 个监听器，3 个跨域事件流）

**commerce → commerce 事件流**（域内）：
- `payment.succeeded` → SubscriptionModule（激活订阅）
- `payment.failed` → NotificationModule（支付失败通知）
- `payment.refunded` → SubscriptionModule + NotificationModule
- `subscription.renewal.required` → PaymentModule（续费支付）

**commerce → platform 事件流**（跨域）：
- `order.*` 事件 → NotificationModule（订单通知）
- `payment.*` 事件 → NotificationModule（支付通知）

**fashion → commerce 事件流**（跨域）：
- `STOCK_RESTOCKED` / `LOW_STOCK` → StockNotificationService

**关键发现**：OrderService 注入了 NotificationService 但未直接使用（通知通过事件监听器处理），应移除该直接依赖。

### 模块合并可行性分析

| 合并 | 可行性 | 风险 | 共享点 |
|------|--------|------|--------|
| style-profiles + style-quiz | 高 | 低 | 同一用户风格评估业务，共享 ProfileEventEmitter |
| wardrobe-collection + favorites | 中 | 中 | 不同数据模型（WardrobeCollection vs Favorite），需统一接口 |
| notification + stock-notification | 高 | 低 | StockNotificationService 只依赖 PrismaService + EventEmitter2，无交叉导入 |

### 跨域共享类型（应提取到 @xuno/types）

当前 `@xuno/types` 已定义但几乎不被使用。Phase 4 应提取：
- **Payment 事件类型**：PAYMENT_EVENTS, PaymentSucceededPayload 等（被 payment, subscription, notification 3 个域使用）
- **Order 事件类型**：OrderPaymentEvent 等（被 order, notification 使用）
- **ClothingItem 类型**：被 fashion, commerce, ai-core 域共享
- **User/Profile 类型**：被所有域共享
- **Notification 类型**：NotificationType, CreateNotificationDto 等

### eslint-plugin-boundaries 配置方案

需要定义 7 个域（6 + 1 platform），规则：
- fashion → identity ✓, platform ✓, common ✓
- ai-core → identity ✓, platform ✓, common ✓
- commerce → identity ✓, fashion ✓, platform ✓, common ✓
- social → identity ✓, fashion ✓, platform ✓, common ✓
- customization → identity ✓, fashion ✓, platform ✓, common ✓
- 任何域 → 同域 ✓
- 任何域 → 不相关域 ✗

### NestJS 模块迁移最佳实践

- 每次迁移一个模块，立即运行 `nest build` + `tsc --noEmit` 验证
- 先移动目录，再批量更新导入路径
- @Global 模块（SecurityModule, AISafetyModule, WSModule, GatewayModule）不需要导入，只需确保注册
- 事件监听器随消费方域迁移，事件定义提取到 @xuno/types
- 合并模块时，保留旧模块作为 re-export 壳，逐步迁移消费者

## Validation Architecture

### Dimension 1: Input Validation
- `nest build` + `tsc --noEmit` 验证每次模块迁移后编译通过
- eslint-plugin-boundaries 规则验证域间依赖正确

### Dimension 2: Output Verification
- 所有现有 API 端点正常工作（通过 `nest build` 和手动验证）
- 0 处 forwardRef 循环依赖（通过 grep 验证）

### Dimension 3: Integration Points
- 事件监听器跨域迁移后，事件流仍然正常
- @xuno/types 跨域类型正确共享

### Dimension 4: Error Handling
- 模块迁移后 NestJS DI 正常注入（运行时无异常）
- 合并模块后旧导入路径仍可工作（re-export 壳）

### Dimension 5: Performance
- 域划分不影响启动时间
- eslint-plugin-boundaries 不显著增加 lint 时间

### Dimension 6: Security
- PII 加密代码仍在 identity 域（Phase 3 已处理）
- 跨域事件不暴露敏感数据

### Dimension 7: Edge Cases
- @Global 模块迁移后仍被正确注册
- 合并模块时 DTO 冲突处理
- 循环依赖解耦后服务注入链完整

### Dimension 8: Observability
- dependency-cruiser 可视化依赖关系
- eslint-plugin-boundaries CI 门禁报告

## Decision Points for Planning

| Plan | Key Decision | Risk |
|------|-------------|------|
| fashion 域迁移 | wardrobe-collection + favorites 合并策略：统一接口 vs 保留独立服务 | 中（数据模型不同） |
| ai-core 域迁移 | AiStylistModule ↔ RecommendationsModule 解耦方式 | 低（Phase 3 已处理 Recommendations 降级） |
| commerce 域迁移 | CartModule ↔ CouponModule 事件驱动替代方案 | 中（需确保事务一致性） |
| social 域迁移 | AdminCommunityController 移入 Community 模块 | 低 |
| customization 域迁移 | 简单迁移，无循环依赖 | 低 |
| 消除 forwardRef | 11 对循环依赖逐一解耦策略 | 高（运行时 DI 异常风险） |
| @xuno/types 提取 | 提取哪些类型、如何保持向后兼容 | 中 |

## Questions for PLAN Phase

1. **wardrobe-collection + favorites 合并深度**：完全合并为一个模块还是保留两个子模块？
2. **CartModule ↔ CouponModule 事件驱动**：是否需要事务性事件（outbox pattern）？
3. **@xuno/types 类型提取范围**：Phase 4 提取多少？全部还是仅事件类型？
4. **eslint-plugin-boundaries 配置时机**：Phase 3 已配置还是 Phase 4 配置？
5. **模块迁移顺序**：先迁移无循环依赖的域还是先解耦循环依赖？

## RESEARCH COMPLETE
