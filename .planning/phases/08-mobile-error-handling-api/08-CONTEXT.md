# Phase 8: 移动端错误处理与 API 对接 - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Source:** User-provided requirements (PRD Express Path)

<domain>
## Phase Boundary

本阶段专注于移动端的错误处理、Stub 方法补全和 API 对接。不涉及后端新增 API 开发，仅确保前端正确消费已有 API 并向用户暴露错误信息。

**In scope:**
- 移动端 Store error 状态字段补全
- 空 catch 块 / 静默吞错修复
- Stub 方法连接真实 API 或添加"功能开发中"提示
- Mock 数据降级时的用户提示
- console.log 清理
- 占位符信息替换
- 重复 Store 定义清理

**Out of scope:**
- 后端新增 API 端点
- 后端错误处理改进
- AI 服务修改
- 设计系统变更
- 新功能开发
</domain>

<decisions>
## Implementation Decisions

### D-01: 关键 Store 添加 error 状态字段
- useOrderStore、useCouponStore、useNotificationStore 必须添加 `error: string | null` 状态字段
- 添加 `setError(message: string)` 和 `clearError()` 方法
- error 状态变更时自动触发 Toast 提示（通过 Zustand middleware 或组件层监听）

### D-02: 空 catch 块处理策略
- 关键操作（支付、登录、收藏）的 catch 块：必须更新 error state + 显示 Toast
- 非关键操作（日志、统计）的 catch 块：至少 console.error + 可选 Toast
- 绝不允许空 catch 块存在

### D-03: Stub 方法处理策略
- 后端 API 已实现：连接真实 API，添加错误处理
- 后端 API 未实现：保留 Stub，添加"功能开发中"Toast 提示
- 不为未实现的后端 API 编造前端逻辑

### D-04: Mock 数据降级提示
- HeartRecommendScreen 等 API 失败降级到 mock 数据时，显示"当前为示例数据"提示
- 提示使用 Snackbar/Banner 组件，不阻断用户操作

### D-05: console.log 清理
- 开发调试用 console.log：移除
- 有意义的日志：替换为 console.error 或 console.warn
- 不引入新日志库

### D-06: 占位符信息替换
- LegalScreen 400-XXX-XXXX：替换为真实客服电话或移除
- 其他占位符：替换为真实信息或标注"暂未提供"

### D-07: 重复 Store 清理
- auth.store.ts（旧版）vs features/auth/stores（新版）：保留新版，旧版添加废弃注释并重导出新版
- 清理所有对旧版 Store 的直接引用

### Claude's Discretion
- Toast 组件选择（React Native Paper Snackbar vs 自定义）
- error state 的具体数据结构
- "功能开发中"提示的具体文案和样式
- 降级提示的显示时机和持续时间
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Store 架构
- `apps/mobile/src/stores/` — 现有 Store 定义
- `apps/mobile/src/features/auth/stores/` — 新版 auth Store

### API 服务层
- `apps/mobile/src/services/` — API 调用封装

### UI 组件
- `apps/mobile/src/components/` — 共享组件（含 Toast/Snackbar）

### 后端 API
- `apps/backend/src/modules/` — 后端模块（确认 API 是否已实现）

</canonical_refs>

<specifics>
## Specific Ideas

1. 约 75 处空 catch 块或仅 console.error 的 catch，用户无法感知错误
2. 20 处 Stub 方法未连接 API（useWardrobeStore.fetchUserClothing、useOrderStore.fetchOrders 等）
3. 多个 Store 缺少 error 状态字段（useOrderStore、useCouponStore、useNotificationStore）
4. HeartRecommendScreen API 失败静默降级到 mock 数据，用户无法区分
5. LegalScreen 占位符电话号码（400-XXX-XXXX）
6. console.log 残留约 20 处
7. Store 重复定义（auth.store.ts 旧版 vs features/auth/stores 新版）

## 修复优先级

1. **P0 - 用户可感知的关键错误**：支付、登录、收藏相关 catch 块和 Stub 方法
2. **P1 - Store error 状态补全**：useOrderStore、useCouponStore、useNotificationStore
3. **P2 - Mock 降级提示**：HeartRecommendScreen 等
4. **P3 - 代码清理**：console.log、占位符、重复 Store
</specifics>

<deferred>
## Deferred Ideas

- 全局错误边界（ErrorBoundary 组件）— 属于 Phase 5 移动端重组范畴
- 统一错误码体系 — 需要后端配合，超出本阶段范围
- 错误监控/上报（Sentry 等）— 属于基础设施，非本阶段重点
</deferred>

---

*Phase: 08-mobile-error-handling-api*
*Context gathered: 2026-04-17 via User Requirements*
