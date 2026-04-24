# Phase 3: Navigation + Core Screens + Calendar - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Source:** User input + Codebase analysis

<domain>
## Phase Boundary

Phase 3 delivers a clean, unified mobile architecture:

1. Zustand Store 去重 — 删除旧 `src/stores/` 目录，统一使用 feature-based `src/features/*/stores/`
2. 4-Tab 导航完善 — 验证 Today/Discover/Stylist/Me 4-Tab 架构，确保 Wardrobe 从 Profile 提取到 Discover
3. 设计 Token 统一 — 替换 384 处硬编码颜色为 DesignTokens 引用
4. 伊伊形象组件 — 已存在 YiyiAvatar，需确认在所有界面一致使用

验证标准：每步完成后 `tsc --noEmit` 零错误 + Metro 能启动
</domain>

<decisions>
## Implementation Decisions

### Store 迁移策略

- 删除 `src/stores/` 整个目录（30 个文件）
- 保留 `src/features/*/stores/` 下的 24 个 feature store
- `stores/index.ts` 中定义的独有 store（useAnalysisStore, useRecommendationStore, useCartStore, useHeartRecommendStore）需迁移到对应 feature 目录
- clearAllStore 函数迁移到 `src/shared/stores/clearAllStores.ts`
- 所有 `from '../../stores/index'` 或 `from '../stores/index'` 的导入更新为 feature-local 路径

### 导航架构（已基本完成，需验证和微调）

- 4-Tab 结构已实现：Today / Discover / Stylist / Me
- AnimatedTabBar 已实现（glass morphism + spring animation）
- Wardrobe 目前在 Profile Stack 中，需确认是否迁移到 Discover
- TryOn 已在 Discover Stack 中（VirtualTryOn, TryOnResult, TryOnHistory）
- 社区内容（CommunityFeed, PostDetail 等）已在 Discover Stack

### 设计 Token 统一

- XUNO 品牌色已定义在 DesignTokens.colors.xuno 中：warmCamel #C4956A, charcoal #2D3436, warmOrange #E17055
- 背景暖白已在 DesignTokens.colors.neutral[50]: #FAFAF8
- 圆角已在 DesignTokens.borderRadius 中定义（需确认：卡片 xl=16, 按钮 lg=10 需调整为 12, 输入框 2xl=24）
- 384 处硬编码颜色值需替换为 DesignTokens 引用
- 废弃的 WarmPrimaryColors（coral/mint/ocean 辅助色系）需清理

### 伊伊形象组件

- YiyiAvatar 已存在于 `src/design-system/ui/YiyiAvatar.tsx`
- 已使用 DesignTokens.colors.xuno.warmCamel 背景 + 简笔画衣架图标
- 需确保在 Today/Stylist/Onboarding 等界面一致使用
  </decisions>

<canonical_refs>

## Canonical References

### 品牌设计系统

- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — 设计令牌定义（颜色、间距、圆角、阴影）
- `apps/mobile/src/design-system/theme/tokens/colors.ts` — 颜色系统（BrandColors, PrimaryColors 等）
- `apps/mobile/src/design-system/theme/FlatColors.ts` — 扁平化颜色接口

### 导航架构

- `apps/mobile/src/navigation/RootNavigator.tsx` — 根导航器（4-Tab + Auth/Main 分流）
- `apps/mobile/src/navigation/MainStackNavigator.tsx` — 4 个 Stack Navigator 定义
- `apps/mobile/src/shared/components/AnimatedTabBar.tsx` — 自定义 Tab Bar 组件

### Store 架构

- `apps/mobile/src/stores/index.ts` — 旧 store 集中导出（待删除）
- `apps/mobile/src/features/*/stores/` — feature-based store 目录

### 现有组件

- `apps/mobile/src/design-system/ui/YiyiAvatar.tsx` — 伊伊形象组件
  </canonical_refs>

<specifics>
## Specific Requirements

### NAV-01 ~ NAV-05 需求

- NAV-01: 4-Tab 导航（今日/探索/造型师/我的）
- NAV-02: Today Screen 显示场景卡 + 今日穿搭 + 语音按钮
- NAV-03: Discover Screen 显示推荐 feed + 策展空间
- NAV-04: 旧用户更新不崩溃（NAV_VERSION 迁移）
- NAV-05: Wardrobe 从 Profile 提取到 Discover（策展空间）

### VIS-01 ~ VIS-04 需求（Phase 1 遗留）

- VIS-01: 主色 #C4956A 暖驼 / 辅色 #2D3436 深炭灰 / 强调 #E17055 暖橘 / 背景 #FAFAF8 暖白
- VIS-02: 伊伊形象 — 暖驼色圆形 + 简笔画衣架图标（已实现）
- VIS-03: 圆角统一（卡片 16px / 按钮 12px / 输入框 24px）+ 间距基线 8px
- VIS-04: 替换所有硬编码颜色值

### Store 导入更新目标（16 个文件）

从 `../../stores/index` 迁移到 feature-local 导入：

- navigation/RootNavigator.tsx → features/auth/stores, features/commerce/stores
- navigation/RouteGuards/\*.tsx → features/auth/stores
- features/auth/screens/\*.tsx → ../stores (已经是 feature-local)
- features/profile/screens/\*.tsx → features/auth/stores
- features/style-quiz/screens/\*.tsx → 对应 feature stores
- features/home/screens/\*.tsx → features/auth/stores

### 独有 Store 迁移目标

- useAnalysisStore → src/features/profile/stores/analysis.store.ts（已存在）
- useRecommendationStore → src/features/home/stores/recommendation.store.ts（已存在）
- useCartStore → src/features/commerce/stores/cart.store.ts（已存在）
- useHeartRecommendStore → src/features/home/stores/heart-recommend.store.ts（已存在）
- clearAllStores → src/shared/stores/clearAllStores.ts（新建）
  </specifics>

<deferred>
## Deferred Ideas
- 7-day calendar 细节实现（CAL-01, CAL-02）— 留到 Phase 3 后续或与 Phase 4 合并
- Today Screen 场景卡完整实现（TOD-01~05）— 需要后端 API 支持，留到 Phase 4
</deferred>

---

_Phase: 03-navigation-core-screens-calendar_
_Context gathered: 2026-04-24_
