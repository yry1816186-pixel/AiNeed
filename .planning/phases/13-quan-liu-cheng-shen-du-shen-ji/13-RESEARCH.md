# Phase 13: 全流程深度审计 — Research

**Researched:** 2026-04-28
**Status:** Complete

## Executive Summary

Phase 13 is a pure audit/documentation phase — no production code changes. All 5 requirements produce analysis reports that feed into Phases 14-19. The React Native environment constrains tooling choices (no native Playwright).

## Standard Stack (Audit Tools)

| Tool                              | Purpose                                      | Notes                                         |
| --------------------------------- | -------------------------------------------- | --------------------------------------------- |
| Expo Web (`npx expo start --web`) | Run RN app in browser for screenshot capture | Expo 52 supports web export                   |
| Playwright                        | Automated screenshot capture via web mode    | Screenshots will approximate native rendering |
| `react-native-view-shot`          | Fallback for native-only screenshot capture  | Already in dependencies                       |
| Static code analysis (grep/AST)   | Component consistency + accessibility audit  | No external deps needed                       |
| WCAG contrast checker             | Color contrast validation                    | Can use `color-blend` or manual calculation   |
| React DevTools Profiler           | Performance measurement                      | Via Flipper or standalone                     |

## Architecture Patterns

### Current Screen Inventory (from navigation analysis)

**4 Tabs × N Sub-screens = ~30 screens total**

| Tab          | Screens                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**     | Login, PhoneLogin, Register, Onboarding (4-step wizard)                                                                            |
| **Today**    | TodayScreen, RecommendationDetailScreen                                                                                            |
| **Discover** | DiscoverScreen, SearchScreen, ProductScreen, CommunityFeed, PostDetail, CreatePost                                                 |
| **Stylist**  | AIStylistScreen, ChatHistory, OutfitPlan, OutfitDetail, SessionCalendar, VirtualTryOn, TryOnResult, TryOnHistory                   |
| **Me**       | Profile, ProfileEdit, BodyAnalysis, Wardrobe, Favorites, AddClothing, ClothingDetail, Brand, Settings, Subscription, Notifications |

### Current Design System State

- **Token files**: `src/theme/tokens/design-tokens.ts` AND `src/design-system/theme/tokens/design-tokens.ts` — DUPLICATE files (identical content)
- **Token structure**: Flat object with nested categories (brand/neutral/semantic/fashion/backgrounds/text/borders/xuno/funnel)
- **Dark mode**: `darkTokens` object exists with brightness-inverted approach (not independent design)
- **Component library**: ~40 components in `design-system/ui/` + `design-system/primitives/`
- **Known issues from Phase 12**: ThemeManager.ts broken (uses Web APIs)

### Component Architecture

```
design-system/
├── primitives/    — Button, Card, Input, Dialog, Toast, EmptyState, LoadingStates
├── ui/           — 30+ composite components (ChatBubble, OutfitCard, Avatar, etc.)
├── skeleton/     — Skeleton, AdvancedSkeleton
└── theme/
    └── tokens/   — design-tokens.ts, colors.ts, typography.ts, spacing.ts, shadows.ts, animations.ts
```

## Don't Hand-Roll

- Don't build custom WCAG checker — use `axe-core` via Expo Web for automated a11y checks
- Don't write custom screenshot framework — Playwright's screenshot API is sufficient
- Don't manually measure contrast ratios — use existing contrast calculation libraries

## Common Pitfalls

1. **Expo Web ≠ Native**: Some RN components (BottomSheet, Voice, Camera) won't render on web. Screenshots for these need manual capture or native automation.
2. **Lazy-loaded screens**: All screens use `lazy()` — need proper navigation to trigger loading before screenshot.
3. **Auth guards**: Many screens require authentication. Test script needs to handle login flow or bypass guards.
4. **Duplicate token files**: Two identical `design-tokens.ts` files — must audit both locations.
5. **Hardcoded values**: Many components may use hardcoded colors/spacing instead of tokens — this is the primary consistency finding expected.

## Validation Architecture

This phase produces reports, not code. Validation is:

| Dimension        | Validation Method                                               |
| ---------------- | --------------------------------------------------------------- |
| 1. Completeness  | All 5 AUDIT requirements have deliverable files                 |
| 2. Accuracy      | Screenshots match actual app state                              |
| 3. Actionability | Gap analysis items are specific enough for Phase 14-19 planning |
| 4. Measurability | Performance baselines have actual numbers                       |
| 5. Coverage      | All ~30 screens audited                                         |

## Recommended Audit Approach

### For AUDIT-01 (Screenshots)

- Create a Playwright script that navigates Expo Web mode and captures each screen
- For native-only screens, document manual capture process
- Store in `.planning/audit/screenshots/`

### For AUDIT-02 (Gap Analysis)

- Screenshot-based comparison with 3 benchmark apps
- Create a structured markdown document per screen comparing against benchmarks
- Focus on: layout patterns, card design, typography hierarchy, color usage, animation patterns

### For AUDIT-03 (Component Consistency)

- Static analysis script scanning all TSX files for:
  - Hardcoded colors (regex for `#[0-9A-Fa-f]{6}`, `rgb(`, `rgba(`)
  - Hardcoded spacing (regex for numeric margin/padding values)
  - Hardcoded border radius values
  - Hardcoded font sizes
  - Inconsistent animation patterns

### For AUDIT-04 (Performance)

- Create a benchmark script measuring:
  - Cold start time (Time to Interactive)
  - Screen transition time
  - List scroll FPS (via React DevTools or Flipper)
  - Image load timing (via network waterfall)
  - Note: mid-range Android (Snapdragon 680) per REQUIREMENTS.md

### For AUDIT-05 (WCAG 2.1 AA)

- Static analysis for:
  - Missing `accessibilityLabel` on interactive elements
  - Touch targets < 44px
  - Color contrast violations (using token values)
  - Missing `accessibilityRole` on buttons/links
  - Missing `accessible` on important content

## Recommended Plan Structure

| Plan  | Wave | Requirements       | Tasks                                                      |
| ----- | ---- | ------------------ | ---------------------------------------------------------- |
| 13-01 | 1    | AUDIT-01           | Screenshot automation script + capture all screens         |
| 13-02 | 1    | AUDIT-02, AUDIT-03 | Gap analysis document + component consistency audit script |
| 13-03 | 2    | AUDIT-04, AUDIT-05 | Performance baseline script + WCAG audit script            |

Plans 01 and 02 can run in parallel (Wave 1). Plan 03 depends on having screenshots for visual a11y audit.

---

_Research complete: 2026-04-28_
