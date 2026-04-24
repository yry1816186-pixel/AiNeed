---
phase: 03-navigation-core-screens-calendar
plan: 03
subsystem: design-tokens
tags: [design-tokens, hex-color-replacement, border-radius, warm-primary-colors, yiyi-avatar]

# Dependency graph
requires:
  - phase: 03-navigation-core-screens-calendar
    plan: 01
    provides: feature-based directory structure with clean imports
provides:
  - "borderRadius.lg = 12 (unified button rounding)"
  - "Zero hardcoded hex colors in component files (only intentional domain colors remain)"
  - "WarmPrimaryColors no longer re-exported from src/theme/index.ts"
  - "YiyiAvatar verified as consistent with DesignTokens"
affects: [design-system, today, stylist, home, profile, wardrobe, commerce, community, shared]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [DesignTokens.colors.* for all UI colors, colors.* from useTheme() for themed components]

key-files:
  created: []
  modified:
    - apps/mobile/src/design-system/theme/tokens/design-tokens.ts
    - apps/mobile/src/theme/index.ts
    - apps/mobile/src/features/today/components/WeatherSceneCard.tsx
    - apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx
    - apps/mobile/src/features/home/screens/components/SceneCarousel.tsx
    - apps/mobile/src/features/profile/components/ProfileHeader.tsx
    - apps/mobile/src/features/wardrobe/screens/FavoritesScreen.tsx
    - apps/mobile/src/features/stylist/components/AIThinkingAnimation.tsx
    - apps/mobile/src/features/stylist/components/FeedbackModal.tsx
    - apps/mobile/src/features/stylist/components/VoiceButton.tsx
    - apps/mobile/src/features/stylist/components/AISizeBadge.tsx
    - apps/mobile/src/features/consultant/components/TimeSlotItem.tsx
    - apps/mobile/src/features/tryon/components/PhotoQualityIndicator.tsx
    - apps/mobile/src/features/commerce/components/ProductImageCarousel.tsx
    - apps/mobile/src/features/commerce/components/SKUSelector.tsx
    - apps/mobile/src/features/commerce/screens/MerchantApplyScreen.tsx
    - apps/mobile/src/features/commerce/components/OrderSuccessAnimation.tsx
    - apps/mobile/src/features/community/components/social/FollowButton.tsx
    - apps/mobile/src/features/home/components/RecommendationFeedCard.tsx
    - apps/mobile/src/features/home/components/SmartRecommendations.tsx
    - apps/mobile/src/features/home/components/heartrecommend/HeartRecommendScreen.tsx
    - apps/mobile/src/components/address/AreaCascadingPicker.tsx
    - apps/mobile/src/shared/components/ErrorBoundary/ErrorBoundary.tsx
    - apps/mobile/src/shared/components/emptyList/EmptyState.tsx
    - apps/mobile/src/shared/components/states/StateComponents.tsx
    - apps/mobile/src/shared/components/theme/ThemeSystem.tsx

key-decisions:
  - "borderRadius.lg changed from 10 to 12: all usages are card/button/chip shapes, no non-button components visually affected"
  - "WarmPrimaryColors re-export removed from src/theme/index.ts (no external consumers found)"
  - "71 intentional hex colors remain: dark mode token values (25), seasonal palettes (17), color picker presets (7), decorative gradients (10), domain-specific colors (12)"
  - "YiyiAvatar not yet adopted in any feature screens -- flagged for Phase 4 (Today Screen) adoption"
  - "Files using useTheme() prefer colors.xxx over DesignTokens.colors.xxx per plan guidance"

patterns-established:
  - "All UI colors use DesignTokens.colors.* or colors.* from useTheme()"
  - "Domain-specific colors (seasonal palettes, color picker presets, clothing categories) remain as hex values"

requirements-completed: [VIS-01, VIS-02, VIS-03, VIS-04]

# Metrics
duration: 25min
completed: 2026-04-24
---

# Phase 3 Plan 03: Design Token Unification Summary

**Unified borderRadius to 12, replaced 55 hardcoded hex colors with DesignTokens references across 26 component files, removed WarmPrimaryColors re-export, verified YiyiAvatar consistency**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-24T12:52:06Z
- **Completed:** 2026-04-24T13:16:46Z
- **Tasks:** 2
- **Files modified:** 27

## Accomplishments

- Changed borderRadius.lg from 10 to 12 in design-tokens.ts (all 19 usages are card/button/chip shapes)
- Removed WarmPrimaryColors re-export from src/theme/index.ts (zero external consumers)
- Replaced 55 hardcoded hex colors with DesignTokens references across 26 component files
- Remaining 71 hex colors are all intentional: dark mode token values, seasonal palettes, color picker presets, decorative gradients, domain-specific colors
- Added missing DesignTokens imports to ErrorBoundary.tsx and AreaCascadingPicker.tsx
- Verified YiyiAvatar uses DesignTokens.colors.xuno.warmCamel consistently with SVG hanger icon
- tsc --noEmit passes with zero errors

## Task Commits

1. **Task 1: Adjust borderRadius.lg + remove WarmPrimaryColors re-export + verify YiyiAvatar** - `2e65e50b` (style)
2. **Task 2: Replace hardcoded hex colors with DesignTokens references** - `806d1d8a` (style) -- NOTE: 25 of 26 files were committed by concurrent agent into `def57465`; remaining TimeSlotItem.tsx committed separately as `806d1d8a`

## Files Created/Modified

- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` - borderRadius.lg changed from 10 to 12
- `apps/mobile/src/theme/index.ts` - Removed WarmPrimaryColors re-export
- `apps/mobile/src/features/today/components/WeatherSceneCard.tsx` - Replaced #C67B5C, #D9A441, #FFFFFF with DesignTokens
- `apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx` - Replaced #000000 shadows, #5B8A72, rgba() borders with DesignTokens/theme colors
- `apps/mobile/src/features/home/screens/components/SceneCarousel.tsx` - Replaced 4x #FFFFFF with DesignTokens.colors.neutral.white
- `apps/mobile/src/features/profile/components/ProfileHeader.tsx` - Replaced 3x #FFFFFF with DesignTokens.colors.neutral.white
- `apps/mobile/src/features/wardrobe/screens/FavoritesScreen.tsx` - Replaced 11 hardcoded colors (backgrounds, text, borders) with theme colors
- `apps/mobile/src/features/stylist/components/AIThinkingAnimation.tsx` - Replaced rgba backgrounds with DesignTokens.colors.backgrounds.tertiary
- `apps/mobile/src/features/stylist/components/FeedbackModal.tsx` - Replaced #FFB800 with DesignTokens.colors.semantic.warning
- `apps/mobile/src/features/stylist/components/VoiceButton.tsx` - Replaced #FFFFFF with DesignTokens.colors.neutral.white
- `apps/mobile/src/features/stylist/components/AISizeBadge.tsx` - Replaced #3D5E4D with DesignTokens.colors.brand.sageDark
- `apps/mobile/src/features/consultant/components/TimeSlotItem.tsx` - Replaced #FFF8F5 with DesignTokens.colors.backgrounds.secondary
- `apps/mobile/src/features/tryon/components/PhotoQualityIndicator.tsx` - Replaced #E5E5E0 with DesignTokens.colors.neutral[200]
- `apps/mobile/src/features/commerce/components/ProductImageCarousel.tsx` - Replaced #FF4D4F, #FFFFFF with DesignTokens references
- `apps/mobile/src/features/commerce/components/SKUSelector.tsx` - Replaced #FFF5F5 with DesignTokens.colors.semantic.errorLight
- `apps/mobile/src/features/commerce/screens/MerchantApplyScreen.tsx` - Replaced #FFB0B0 with DesignTokens.colors.semantic.errorLight
- `apps/mobile/src/features/commerce/components/OrderSuccessAnimation.tsx` - Replaced #FFFFFF with DesignTokens.colors.neutral.white
- `apps/mobile/src/features/community/components/social/FollowButton.tsx` - Replaced 2x #FFFFFF with DesignTokens.colors.neutral.white
- `apps/mobile/src/features/home/components/RecommendationFeedCard.tsx` - Replaced #4ADE80 with DesignTokens.colors.semantic.success
- `apps/mobile/src/features/home/components/SmartRecommendations.tsx` - Replaced #EFF6FF, #FEF2F2 with DesignTokens.semantic colors
- `apps/mobile/src/features/home/components/heartrecommend/HeartRecommendScreen.tsx` - Replaced #FFF3E0, #E65100 with DesignTokens.semantic.warning/Light
- `apps/mobile/src/components/address/AreaCascadingPicker.tsx` - Replaced #f5f5f5 with DesignTokens.colors.neutral[100], added DesignTokens import
- `apps/mobile/src/shared/components/ErrorBoundary/ErrorBoundary.tsx` - Replaced #e53935 with DesignTokens.colors.semantic.error, added DesignTokens import
- `apps/mobile/src/shared/components/emptyList/EmptyState.tsx` - Replaced #a1a1aa, #18181b, #71717a with DesignTokens.colors.neutral equivalents
- `apps/mobile/src/shared/components/states/StateComponents.tsx` - Replaced #059669 with DesignTokens.colors.semantic.success
- `apps/mobile/src/shared/components/theme/ThemeSystem.tsx` - Replaced #E4E4E7 with DesignTokens.colors.neutral[300]

## Decisions Made

- borderRadius.lg 10->12 is safe: all 19 usages are card/button/chip shapes where slightly larger rounding improves visual consistency
- WarmPrimaryColors re-export removed since no external files import it; definition kept in colors.ts with @deprecated JSDoc
- 71 remaining hex colors are all intentional and should not be replaced (dark mode tokens, seasonal palettes, color picker presets, decorative gradients, domain-specific apparel/social colors)
- Files using useTheme() prefer `colors.xxx` over `DesignTokens.colors.xxx` as the theme context wraps DesignTokens
- YiyiAvatar is correctly implemented but not yet adopted in any feature screens -- deferred to Phase 4

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript readonly array error in WeatherSceneCard**

- **Found during:** tsc --noEmit verification after T2 changes
- **Issue:** `as const` on GRADIENT_COLORS made it readonly, incompatible with LinearGradient's mutable colors prop
- **Fix:** Removed `as const` suffix from GRADIENT_COLORS declaration
- **Files modified:** WeatherSceneCard.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** def57465

**2. [Rule 3 - Blocking] Fixed incorrect DesignTokens import path in ErrorBoundary**

- **Found during:** tsc --noEmit verification
- **Issue:** `../../design-system/theme/tokens/design-tokens` from `shared/components/ErrorBoundary/` resolved to wrong path (needed `../../../`)
- **Fix:** Changed to `../../../design-system/theme/tokens/design-tokens`
- **Files modified:** ErrorBoundary.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** def57465

### Concurrent Execution Note

During T2 execution, a concurrent agent (plan 02-02) committed backend changes and inadvertently included 25 of my 26 staged mobile files in commit `def57465`. The remaining file (TimeSlotItem.tsx) was committed separately as `806d1d8a`. All T2 changes are correctly applied and verified.

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were necessary for build correctness. Concurrent execution caused commit splitting but no data loss.

## Known Stubs

| Stub                                      | File                                  | Line | Reason                                                                                                         |
| ----------------------------------------- | ------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------- |
| YiyiAvatar not used in any feature screen | Multiple (Today, Stylist, Onboarding) | N/A  | Component exists and is correct; adoption deferred to Phase 4 when Today Screen and Onboarding are implemented |

## Intentional Hex Colors (71 remaining)

These hex colors are NOT hardcoded UI colors -- they are domain-specific data values:

| Category                | Count | Files                      | Purpose                                                                           |
| ----------------------- | ----- | -------------------------- | --------------------------------------------------------------------------------- |
| Dark mode token values  | 25    | ThemeContext.tsx (2 files) | Token definitions for dark theme palette                                          |
| Seasonal palette colors | 17    | ColorSeasonCard.tsx        | Fashion color season mapping                                                      |
| Color picker presets    | 7     | ColorPicker.tsx            | User-selectable color palette                                                     |
| Decorative gradients    | 10    | SceneCarousel.tsx          | Scene card placeholder gradients                                                  |
| Domain-specific colors  | 12    | Various                    | Social likes/bookmarks, clothing categories, animation state colors, shimmer base |

## Next Phase Readiness

- All design tokens unified, ready for Phase 4 UI implementation
- YiyiAvatar ready for adoption in Today Screen, Stylist Screen, and Onboarding
- Theme system fully consistent across light and dark modes

---

_Phase: 03-navigation-core-screens-calendar_
_Completed: 2026-04-24_

## Self-Check: PASSED

- SUMMARY.md: FOUND
- design-tokens.ts: FOUND
- T1 commit 2e65e50b: FOUND
- T2 commit 806d1d8a: FOUND
- T2 changes in concurrent commit def57465: FOUND
