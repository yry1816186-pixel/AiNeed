# Phase 5: E2E Integration + Competition Demo - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers the complete, demo-ready product:

1. **E2E 数据接线** — TodayScreen/DiscoverScreen 接入真实后端 API（推荐+天气+场景），消除所有硬编码数据
2. **比赛 Demo 路径** — 自由交互演示 + 6 层漏斗可视化 + 实时 Profile 切换 + Demo 视频
3. **视觉一致性收尾** — 全量替换硬编码颜色 + 三态统一覆盖（Loading/Empty/Error）+ 品牌色骨架屏
4. **编译零错误 + 验证** — 系统化修复 TS 错误 + Phase 4 人工验证 + 自动化 E2E 测试

验证标准：新用户可 register → 4-step onboarding → Today 伊伊主动推送 → 对话 → 试穿 → 保存 → 日历查看，无崩溃无空白页；比赛 Demo 可自由交互展示三层叙事
</domain>

<decisions>
## Implementation Decisions

### E2E 数据接线

- **D-01:** TodayScreen 实时 API 调用 — 直接调用推荐 API + 天气 API，数据实时获取
  - 删除 `HAS_RECOMMENDATION_DATA = false` 硬编码
  - WeatherSceneCard 接入和风天气 API（决策 #27，1000 次/天免费）
  - RecommendationCarousel 接入 Orchestrator 推荐输出
- **D-02:** 推荐进入页面自动触发 — 用户打开 Today Tab 即获取当日推荐，体现"伊伊主动推送"
  - 使用 TanStack Query 的 useQuery 在组件 mount 时自动请求
  - 后端 Orchestrator 已标准化输出（REC-04），前端直接渲染 items + outfit + explanation
- **D-03:** Orchestrator 输出直接渲染 — 前端消费 RecommendationOutput 结构（items + outfit + explanation{why, alternative, nextAction, confidence}）
  - 不在前端组合搭配，完全依赖后端输出
  - explanation.why 用于 AiInsightBubble 展示

### 比赛 Demo 路径

- **D-04:** 自由交互演示 — 评委自由操作，伊伊实时响应
  - 高风险高回报选择，需配合预缓存 + 本地降级（D-07）
  - 对话状态机已完整（9 状态），可处理各种用户输入
- **D-05:** 6 层漏斗可视化 — 推荐结果旁展示漏斗图
  - L1 合规 → L2 场景 → L3 尺码 → L4 预算 → L5 风格 → L6 衣橱互补
  - 每层显示通过/过滤数量，技术深度证明
  - 新建 RecommendationFunnel 组件
- **D-06:** 实时修改属性展示包容性 — 演示中修改用户属性（体型/风格/场景），观察推荐变化
  - 需要一个 Profile 调试面板（仅 Demo 模式可见）
  - 修改后立即触发重新推荐，展示"不同人不同结果"
- **D-07:** 预缓存 + 本地降级 — Demo 稳定性保障
  - 预缓存推荐结果（3 套方案 × 3 个 Profile）
  - LLM 不可用时降级到规则引擎（REC-05 已实现）
  - 网络断时使用本地缓存数据
- **D-08:** 视频 + 现场演示 — 双重保险（决策 #21 四件套之一）
  - 录制 1-3 分钟 Demo 视频（面试穿搭场景完整 Agent 对话 + 技术可视化）
  - 现场演示作为补充，视频保证不崩

### 视觉一致性收尾

- **D-09:** 全量替换硬编码颜色 — 所有 84 处硬编码颜色替换为 DesignTokens 引用
  - 不区分核心/非核心屏幕，一次性统一
  - 替换后确保 DesignTokens.colors.xuno.\* 覆盖所有品牌色使用
- **D-10:** 三态统一覆盖 — 每个屏幕统一实现 Loading/Empty/Error 三种状态
  - 已有共享组件：EmptyState、ShimmerSkeleton、LoadingSpinner、ErrorBoundary
  - 需要在 TodayScreen、DiscoverScreen、StylistScreen、CalendarScreen 等核心屏幕统一接入
  - 统一状态切换模式：isLoading → skeleton, data.length === 0 → EmptyState, error → ErrorState + retry
- **D-11:** 品牌色骨架屏 — ShimmerSkeleton 使用暖驼色系（#C4956A 低透明度）
  - 与品牌视觉一致，不是中性灰
  - 改造现有 ShimmerSkeleton 组件的 shimmer 颜色

### 编译零错误 + 验证

- **D-12:** 系统化修复 TS 错误 — 先运行 tsc --noEmit 获取当前错误列表，按文件分组修复
  - 不使用 @ts-expect-error 或 any 压制
  - 按文件分组，每个文件逐一修复
- **D-13:** Phase 5 首先执行 Phase 4 人工验证 — 5 项验证在集成工作开始前完成
  - 确保基础功能正常后再做 E2E 集成
  - 验证项：对话状态机、面试流程、语音按钮、Onboarding Step 4、工作室推荐
- **D-14:** 自动化 E2E 测试 — 关键路径可重复验证
  - 核心路径：注册 → Onboarding → Today 推荐 → 对话 → 试穿 → 保存
  - 降低 R4 风险（Demo 崩溃 HIGH/致命）
- **D-15:** 每 Plan 验证编译 — 每个 Plan 完成后运行 tsc --noEmit 确保零错误
  - 不允许编译错误在 Plan 间积累
  - 后端和移动端分别验证

### Claude's Discretion

- 和风天气 API 的具体集成细节（请求格式、城市编码、缓存策略）
- RecommendationFunnel 组件的具体视觉设计
- Profile 调试面板的 UI 布局
- Demo 视频的录制工具和格式
- E2E 测试框架选择（Detox vs Maestro vs 手动脚本）
- ShimmerSkeleton 品牌色改造的具体色值
- DiscoverScreen 数据接线的具体策略（与 TodayScreen 类似但需确认差异）

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### E2E 数据接线

- `apps/mobile/src/features/today/screens/TodayScreen.tsx` — 主屏幕（HAS_RECOMMENDATION_DATA=false 需删除）
- `apps/mobile/src/features/today/components/WeatherSceneCard.tsx` — 天气场景卡（硬编码天气数据需替换）
- `apps/mobile/src/features/today/components/RecommendationCarousel.tsx` — 推荐轮播
- `apps/mobile/src/features/today/components/AiInsightBubble.tsx` — AI 洞察气泡
- `apps/mobile/src/features/discover/screens/DiscoverScreen.tsx` — 探索屏幕（SAMPLE_SCENES 硬编码需替换）
- `apps/backend/src/domains/platform/recommendations/services/orchestrator.service.ts` — 推荐唯一入口
- `apps/backend/src/domains/platform/recommendations/dto/recommendation-output.dto.ts` — RecommendationOutput 结构

### 天气 API

- `docs/XUNO_FINAL_PLAN.md` §决策 #27 — 和风天气 API（1000 次/天免费）

### 对话系统（Demo 路径依赖）

- `ml/services/stylist/dialog_engine.py` — Python 状态机核心
- `ml/services/stylist/dialog_state.py` — DialogState 枚举定义
- `apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx` — 主聊天屏
- `apps/mobile/src/features/stylist/components/TryOnBottomSheet.tsx` — 试穿 BottomSheet
- `apps/mobile/src/features/stylist/components/VoiceButton.tsx` — 语音按钮

### 推荐管道（漏斗可视化依赖）

- `apps/backend/src/domains/platform/recommendations/services/orchestrator.service.ts` — Orchestrator
- `apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts` — 规则引擎（降级方案）
- `ml/services/stylist/full_outfit_engine.py` — 搭配生成引擎

### 视觉系统

- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — 设计令牌定义
- `apps/mobile/src/design-system/theme/tokens/colors.ts` — 颜色系统
- `apps/mobile/src/shared/components/states/EmptyState.tsx` — 空状态组件
- `apps/mobile/src/shared/components/animations/ShimmerSkeleton.tsx` — 骨架屏组件
- `apps/mobile/src/design-system/ui/LoadingSpinner.tsx` — 加载指示器
- `apps/mobile/src/shared/components/ErrorBoundary/ErrorBoundary.tsx` — 错误边界

### Onboarding

- `apps/mobile/src/features/onboarding/screens/OnboardingWizard.tsx` — 4 步向导
- `apps/mobile/src/features/onboarding/screens/steps/YiyiFirstOutfitStep.tsx` — Step 4

### Phase 4 验证

- `.planning/phases/04-yiyi-agent-voice-onboarding-studio/04-VERIFICATION.md` — Phase 4 验证项

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `EmptyState` — 共享空状态组件（shared/components/states/）
- `ShimmerSkeleton` — 骨架屏组件（shared/components/animations/），需改造为品牌色
- `LoadingSpinner` — 加载指示器（design-system/ui/）
- `ErrorBoundary` + `ErrorFallback` — 错误边界组件
- `RetryWrapper` — 重试包装器（shared/components/ux/）
- `useTheme` + `createStyles` — 主题系统，所有屏幕已接入
- `DesignTokens` — 完整设计令牌体系（颜色/间距/圆角/阴影）

### Established Patterns

- 主题：useTheme() + createStyles() 模式，colors 从 ThemeContext 获取
- 数据获取：TanStack Query（useQuery/useInfiniteQuery）已在部分屏幕使用
- 状态管理：Zustand + AsyncStorage 持久化
- 导航：4-Tab（Today/Discover/Stylist/Me），MainStackNavigator 管理 Stack
- 推荐：Orchestrator 唯一入口，RecommendationOutput 标准化输出

### Integration Points

- TodayScreen → 推荐 API（GET /recommendations）+ 天气 API（GET /weather）
- DiscoverScreen → 推荐 feed API + 搜索 API
- StylistScreen → 对话 API（POST /dialog/process）+ TTS API（POST /tts）
- Onboarding → 注册 API + 首套推荐 API（POST /onboarding/first-outfits）
- CalendarScreen → 日历 API（GET /calendar/outfits）

</code_context>

<specifics>
## Specific Ideas

- TodayScreen 进入时自动触发推荐，伊伊说"今天 22°C 晴天，给你搭了 3 套通勤穿搭"
- 漏斗可视化：6 层从上到下收窄，每层标注通过数量（如 L1: 1000→L2: 200→L3: 80→L4: 30→L5: 12→L6: 3）
- Profile 调试面板：Demo 模式下可切换体型/风格/场景，实时看推荐变化
- 骨架屏使用暖驼色 shimmer（#C4956A 20% 透明度），不是中性灰
- Demo 视频：1-3 分钟，面试穿搭场景完整流程 + 漏斗可视化 + Profile 切换

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 05-e2e-integration-competition-demo_
_Context gathered: 2026-04-25_
