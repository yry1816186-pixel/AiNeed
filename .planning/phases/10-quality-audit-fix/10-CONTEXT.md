# Phase 10: 品质审计修复 - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** 六重视角全维度设计审计报告

<domain>
## Phase Boundary

修复 AiNeed 寻裳移动端前端的系统性设计缺陷、架构冲突、无障碍缺失和交互品质问题。涵盖 20 项审计发现，分 3 个优先级（P0 阻断性 ×5、P1 体验修复 ×7、P2 品质提升 ×8）。本 Phase 不新增功能，只修复和提升已有实现。

**明确排除：**
- 后端 API 修改（除非前端修复需要调整接口调用方式）
- 新功能开发（如 Lottie 动画系统、音效同步层）
- 数据库 schema 变更
- 品牌重设计或视觉重设计（只做统一，不做重做）

</domain>

<decisions>

### 品牌色决策
- Terracotta (#C67B5C) 为唯一品牌主色，废弃 NightBlue (#1A1A2E) 主题
- Accent 系统（6 色）降为辅助强调色，不覆盖品牌主色
- 中性色使用 warm-tinted neutral scale（已定义在 DesignTokens）

### 架构决策
- 统一到 5-tab 嵌套栈导航（src/navigation/ 版本），废弃 App.tsx 6-tab flat stack
- 统一到 DesignTokens token 体系，废弃 compat.ts legacy API
- 路由守卫接入 MainStackNavigator，VipGuard 接入真实状态
- SharedElement 使用 react-navigation-shared-element 包

### 无障碍决策
- 所有动画组件必须接入 useReducedMotion hook
- 深色模式文字色必须满足 WCAG AA 4.5:1 对比度
- 关键交互页面必须添加 accessibilityLabel + accessibilityRole
- SwipeCard 必须提供 accessibilityActions

### 交互设计决策
- 动画弹簧参数按交互语义分层：snappy/gentle/bouncy/stiff
- 瀑布流高度基于图片宽高比，不使用伪随机
- AI 思考态使用渐进式视觉叙事，非 ActivityIndicator
- 社区巨石组件必须拆分为独立 memo 化组件

### 语言决策
- 全 App 用户界面统一中文
- PaymentScreen 全量中文化（包括支付方式名称）
- AI 造型师界面全量中文化（场景按钮、提示文字）
- 代码内部变量名/注释保持英文

### Claude's Discretion
- 具体的代码迁移策略（codemod vs 手动）
- 动画降级的精确参数值
- 组件拆分的具体粒度
- IntersectionObserver 的实现方式（当前 RN 无原生支持）
- useReducedMotion 的 polyfill 策略

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Theme System (CRITICAL - dual system conflict)
- `apps/mobile/src/theme/index.ts` — Theme bridge, re-exports both systems
- `apps/mobile/src/theme/compat.ts` — Legacy compat layer (Colors/Spacing/Typography from DesignTokens)
- `apps/mobile/src/theme/tokens/design-tokens.ts` — Source of truth: DesignTokens + darkTokens
- `apps/mobile/src/theme/tokens/colors.ts` — Extended color system (XunOColors)
- `apps/mobile/src/theme/tokens/spacing.ts` — Spacing tokens + aliases
- `apps/mobile/src/theme/tokens/typography.ts` — Typography system
- `apps/mobile/src/theme/tokens/shadows.ts` — Shadow + glow presets
- `apps/mobile/src/theme/tokens/animations.ts` — Spring configs, durations, easings, presets

### Navigation System (CRITICAL - dual architecture)
- `apps/mobile/App.tsx` — Legacy 6-tab flat stack entry point
- `apps/mobile/src/navigation/MainStackNavigator.tsx` — Modern 5-tab nested stacks (311 lines)
- `apps/mobile/src/navigation/RootNavigator.tsx` — Tab + root composition
- `apps/mobile/src/navigation/AuthNavigator.tsx` — Auth stack
- `apps/mobile/src/navigation/types.ts` — Full type system (434 lines)
- `apps/mobile/src/navigation/navigationService.ts` — Imperative navigation + deep links (287 lines)
- `apps/mobile/src/navigation/RouteGuards/` — AuthGuard, ProfileGuard, VipGuard

### Screens with Known Issues
- `apps/mobile/src/screens/PaymentScreen.tsx` — All English UI (302 lines)
- `apps/mobile/src/screens/ClothingDetailScreen.tsx` — 29 hardcoded hex colors (400 lines)
- `apps/mobile/src/screens/AiStylistChatScreen.tsx` — English UI, messages not persisted (344 lines)
- `apps/mobile/src/screens/CommunityScreen.tsx` — 735-line monolith, random card heights
- `apps/mobile/src/screens/home/HomeScreen.tsx` — Beijing coords hardcoded (295 lines)
- `apps/mobile/src/screens/VirtualTryOnScreen.tsx` — Thin shell wrapper (57 lines)

### Consultant Screens (paddingTop: 56 hardcoded)
- `apps/mobile/src/screens/consultant/ChatScreen.tsx`
- `apps/mobile/src/screens/consultant/BookingScreen.tsx`
- `apps/mobile/src/screens/consultant/AdvisorProfileScreen.tsx`
- `apps/mobile/src/screens/consultant/AdvisorListScreen.tsx`

### Animation System
- `apps/mobile/src/components/transitions/PageTransitions.tsx` — 10 transition types (960 lines)
- `apps/mobile/src/components/interactions/MicroInteractions.tsx` — 7 micro-interactions
- `apps/mobile/src/components/loading/LoadingStates.tsx` — 10 loading components
- `apps/mobile/src/components/states/StateComponents.tsx` — 7 state components

### Component Architecture
- `apps/mobile/src/components/ui/index.tsx` — Barrel with inline duplicates
- `apps/mobile/src/components/primitives/` — Design system primitives
- `apps/mobile/src/components/heartrecommend/SwipeCard.tsx` — Tinder-style cards
- `apps/mobile/src/components/immersive/ImmersiveComponents.tsx` — Story viewer + gallery

</canonical_refs>

<specifics>
## Specific Ideas

### From Designer Perspective
- Card type system: product (4px radius, subtle shadow) / community (12px, medium) / recommendation (16px, brand shadow)
- Typography: switch heading font from Cormorant Garamond to Playfair Display or Didot for fashion editorial feel
- Glass morphism: glass.light for floating cards, glass.medium for bottom sheets, glass.dark for immersive views

### From Artist Perspective
- Animation emotion grammar: snappy (confirm) → gentle (embrace) → bouncy (celebrate) → stiff (alert)
- AI generation narrative: Terracotta gradient lines → clothing silhouette → full outfit fade-in
- Season palette component: HSL color wheel positioning + CIEDE2000 distance arcs

### From Frontend Engineer Perspective
- Theme migration: Phase 1 narrow compat exports → Phase 2 per-file migration → Phase 3 delete compat
- Navigation consolidation: adopt 5-tab version, delete App.tsx flat stack
- Component layers: primitives/ → ui/(composition) → features/(business)

### From Ergonomist Perspective
- Safe area: useSafeAreaInsets() everywhere, already correct in HomeScreen
- Gesture conflicts: SwipeCard needs activeOffsetX, AICompanionBall needs simultaneousWithExternalGesture
- Form improvements: unit toggle for height/weight, auto-focus, haptic on validation error
- Visual fatigue: animate cards only once (hasAnimated ref), AICompanionBall needs disable option

### From Algorithm Master Perspective
- Recommendation card enrichment: score bar (7-dot), CIEDE2000 color harmony arc, explainability text
- "Because you browsed" tags for SASRec sequence recommendations
- Cold start: "Style exploration" guide instead of empty recommendations

### From Real User Perspective
- Journey A: Style test step is just "preview cards" not real questions
- Journey B: Community→Purchase needs "quick add to cart" bottom sheet (5 clicks → 2)
- Journey C: VipGuard isVip=false blocks all VIP features — journey breaks here
- Journey D: Chat messages lost on page exit, AI thinking state is just a spinner

</specifics>

<deferred>
## Deferred Ideas

- Lottie animation integration (new dependency, new system)
- Sound/haptic/visual unified sensory coordination system
- Custom interactive screen transitions (edge swipe back on Android)
- Playfair Display/Didot font integration (needs asset procurement)
- Parallax scroll reuse across main feed
- Image search from camera roll in community posts
- Podverse/Podcast style audio features
- Brand IP character animation for empty states
- Midjourney-style progressive image reveal for try-on

</deferred>

---

*Phase: 10-quality-audit-fix*
*Context gathered: 2026-04-15 via six-perspective design audit*