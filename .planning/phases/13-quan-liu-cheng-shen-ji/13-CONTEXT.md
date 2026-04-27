# Phase 13: 全流程深度审计 - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

捕获当前前端完整基线状态，输出差距分析报告，为后续 v2.0 重构（Phases 14-19）提供精确的起点和优先级依据。本阶段仅审计和分析，不做任何代码修改。

**交付物：**

1. 全量页面截图清单（15-20 页，多状态）
2. 标杆差距分析报告（逐页对标小红书/得物/ChatGPT 等）
3. 组件一致性审计报告（间距/圆角/字号/颜色/动效不一致项）
4. 性能基线数据（8 项指标，逐页记录）
5. WCAG 2.1 AA 可访问性审计报告

</domain>

<decisions>
## Implementation Decisions

### 截图工具与方式

- **D-01:** 使用 Detox e2e + screenshot 进行逐页截图，复用现有 `.detoxrc.js` 配置
- **D-02:** 截图范围覆盖全量页面（含子页面），约 15-20 个页面，包括 Today、Discover、Stylist（对话页）、Wardrobe、Profile、Onboarding、Calendar、物品详情、试穿结果、搜索结果、设置、通知等
- **D-03:** 每个页面截取多状态截图：加载中、空状态、错误状态、正常有数据状态
- **D-04:** 输出 PNG 格式，命名规则如 `01-today-loading.png`、`01-today-empty.png`、`01-today-normal.png`，保存至 `.planning/audit/screenshots/`
- **D-05:** 如果 Detox 环境不可用，研究者需先验证并修复，而非降级方案

### 标杆对比维度

- **D-06:** 全面 6 维对比：信息架构、视觉设计（色/字体/间距）、交互动效、卡片/列表设计、空状态/错误处理、导航模式
- **D-07:** 逐页对标，而非整体对比
- **D-08:** 灵活匹配最相关标杆：
  - Today 页 → 小红书发现页
  - Discover 页 → 得物/Pinterest 瀑布流
  - Stylist 对话页 → ChatGPT/豆包
  - Wardrobe 衣橱 → Whering/Stylebook
  - Profile 个人页 → NET-A-PORTER 个人中心
  - Onboarding → 小红书/得物引导流程

### 审计输出格式

- **D-09:** JSON + Markdown 混合输出：
  - JSON 存储机器可读数据（组件不一致项列表、可访问性违规清单、性能数值）
  - Markdown 存储分析和上下文（标杆差距叙述、视觉问题描述）
- **D-10:** 报告集存放于 `.planning/audit/` 目录：
  - `screenshots-inventory.json` — 截图清单元数据
  - `gap-analysis.md` — 标杆差距分析
  - `component-audit.json` + `component-audit.md` — 组件一致性审计
  - `perf-baseline.json` + `perf-baseline.md` — 性能基线
  - `a11y-audit.json` + `a11y-audit.md` — 可访问性审计
- **D-11:** 仅描述问题，不标注优先级。优先级排序留给 planner 根据后续 Phase 需求判断

### 性能基线目标

- **D-12:** 双平台模拟器测试：Android（Pixel 7, API 34）+ iOS（iPhone 15）
- **D-13:** 8 项扩展性能指标：
  1. 首屏加载时间 (First Contentful Paint)
  2. TTI（Time to Interactive）
  3. 列表滚动 FPS（60fps 标准）
  4. 图片加载时间
  5. 内存峰值
  6. JS Bundle 大小
  7. 启动到首屏渲染时间 (Cold Start → First Render)
  8. API 响应时间（关键接口平均耗时）
- **D-14:** 逐页测量并记录到 `perf-baseline.json`，后续 Phase 19 可对比验证

### Claude's Discretion

- 截图命名规则的细节（编号方案、分隔符）
- 标杆对比中每个维度的具体评估标准
- 性能测试工具的选择（Flipper/React DevTools Profiler/custom timing）
- JSON schema 的具体字段设计

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目级规范

- `.planning/PROJECT.md` — 项目核心价值、42 项冻结决策、v2.0 里程碑定义
- `.planning/REQUIREMENTS.md` — AUDIT-01 ~ AUDIT-05 需求定义
- `.planning/ROADMAP.md` §Phase 13 — Phase 13 目标、成功标准、依赖关系

### 技术参考

- `apps/mobile/.detoxrc.js` — 现有 Detox 配置，必须复用
- `apps/mobile/e2e/` — 现有 e2e 测试目录，可参考/扩展
- `apps/mobile/src/design-system/ui/` — 现有 31 个 UI 组件，审计目标
- `apps/mobile/src/design-system/primitives/` — 现有原子组件（Button/Card/Dialog/Input/Toast）
- `apps/mobile/src/theme/index.ts` — legacy theme 桥接层（已 deprecated）
- `apps/mobile/src/design-system/theme/` — 新 theme 系统，审计 Token 一致性

### 设计决策

- `docs/XUNO_FINAL_PLAN.md` — 42 项冻结决策源文件，决策 #35（视觉体系）

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `.detoxrc.js`: Detox 配置已存在，可直接复用构建 e2e 截图测试
- `e2e/` 目录: 已有 e2e 测试基础设施，可扩展添加截图 suite
- `design-system/ui/` 31 个组件: Button, Card, Avatar, Badge, Skeleton, ChatBubble, BottomSheet, Input 等 — 审计目标清单
- `design-system/primitives/` 原子组件: Button, Card, Dialog, Input, Toast — 与 design-system/ui 可能存在重叠，审计需覆盖

### Established Patterns

- Feature-based 架构: 17 个 feature 目录（today, discover, stylist, wardrobe, profile, onboarding 等），截图需逐 feature 导航
- Theme bridge pattern: `src/theme/index.ts` 作为 legacy 桥接层，re-export 自 `design-system/theme`
- Design tokens: 已有 Color/Typography/Spacing/BorderRadius/Shadows/Layout/Animation/ZIndex 分类，审计需验证实际使用一致性

### Integration Points

- 截图脚本需从 `App.tsx` 入口导航到各 feature 页面
- 性能测试需 hook 进 React Native 的 `PerformanceObserver` 或使用 Flipper
- 组件一致性审计需解析 `design-system/` 下所有组件的 style 属性

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 13-全流程深度审计_
_Context gathered: 2026-04-28_
