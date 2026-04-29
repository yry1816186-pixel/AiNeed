# Phase 15: 原子组件库 + 动效基础 - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

构建完整的原子组件库（8 个核心组件 Button/Input/Card/Avatar/Badge/Skeleton/BottomSheet/Toast），建立统一的动效预设系统和 SmartImage 渐进式加载组件，集成 Splash Lottie 到 App 启动流程。

This phase UPGRADES and CONSOLIDATES existing components (many already exist in primitives/ and ui/) rather than building everything from scratch. Key work: directory restructuring, semantic token migration, dark mode validation, SmartImage creation, Splash Lottie integration.

</domain>

<decisions>
## Implementation Decisions

### 组件架构整理

- Flatten to single `design-system/components/` directory — merge primitives/ and ui/ into one authoritative location; keep composition components (Avatar+Badge combos) in same directory
- Full semantic token migration — replace all old Colors/Spacing/BorderRadius direct references with Phase 14's semantic/component tokens (no legacy bridging); run hardcoded-value audit script to verify zero violations
- RTL not needed — Chinese-first app, skip RTL layout support; ensure no hardcoded left/right in new code
- Existing `tokens/animations.ts` is already comprehensive — keep as-is, it satisfies TECH-05 and ANIM-06 requirements for animation presets

### SmartImage + 图片加载

- expo-image as SmartImage base — already in deps, native blurhash + cache + progressive loading; wrap in SmartImage component with token-aware styling
- Backend generates blurhash strings — frontend receives and renders; minimal client overhead
- SmartImage auto-appends CDN URL params — `?w={width}&q=80&format=webp`; component calculates width from layout

### Splash Lottie + 测试

- expo-splash-screen + Lottie synchronized playback — native splash fades while Lottie plays, total ≤1.5s
- Dual Lottie files for light/dark — themeStore subscription switches splash variant
- Snapshot + render tests per component in `__tests__/` directory
- Existing Splash Lottie assets from Phase 14 are ready to integrate

### Claude's Discretion

- Exact barrel export strategy (index.ts structure)
- Internal component implementation details not specified above
- Exact file count and split for test files

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `design-system/primitives/Button/Button.tsx` — 6 variants, 4 sizes, Reanimated press animation, haptic feedback, gradient support. Already very mature.
- `design-system/primitives/Card/Card.tsx` — 5 variants, 3D press effect, ProductCard composition. Mature.
- `design-system/primitives/Input/Input.tsx` — Exists, needs token audit
- `design-system/primitives/Toast/Toast.tsx` — Exists, needs token audit
- `design-system/primitives/Dialog/Dialog.tsx` — Exists, can serve as BottomSheet base
- `design-system/ui/Avatar.tsx`, `ui/Badge.tsx`, `ui/BottomSheets.tsx` — Exist, need consolidation
- `design-system/skeleton/Skeleton.tsx`, `skeleton/AdvancedSkeleton.tsx` — Exist, need Reanimated shimmer
- `design-system/theme/tokens/animations.ts` — Comprehensive animation presets: SpringConfigs (8 variants), SemanticSpring, Duration, Easing, FadeAnimations, ScaleAnimations, SlideAnimations, InteractionAnimations, PageTransitions, ListAnimations, LoadingAnimations
- `design-system/theme/themeStore.ts` — Zustand + MMKV + Appearance API (Phase 14)
- `design-system/theme/tokens/generated/` — semantic-tokens.ts, component-tokens.ts, primitive-tokens.ts (Phase 14)

### Established Patterns

- Components use Reanimated for animations (not Animated from RN)
- Haptic feedback via expo-haptics polyfill
- Design tokens imported from `../../theme` barrel
- Press animations: scale 0.96-0.98 with SpringConfigs.snappy/bouncy
- Size variants: sm/md/lg/xl pattern
- Shadow system via Shadows object from theme

### Integration Points

- All feature screens import from `design-system/` barrel exports
- Navigation tabs reference design tokens for colors/spacing
- ThemeStore provides current theme mode for dark mode rendering
- Phase 14 brand assets: logo SVGs, Lottie splash files in `assets/`

</code_context>

<specifics>
## Specific Ideas

- Existing animation preset system is production-quality and already satisfies TECH-05 requirement — focus effort on component consolidation and SmartImage
- Hardcoded value audit script from Phase 14 Plan 04 can be re-run to verify zero hardcoded values post-migration
- Phase 14 Lottie splash assets exist and are ready for integration

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
