# Phase 10: 品质审计修复 — Plan

**Created:** 2026-04-15
**Status:** Ready for execution
**Priority:** P0×5 / P1×7 / P2×8

---

## User Decisions (Confirmed)

1. **导航架构**: 删除 App.tsx 6-tab 版本，保留 src/navigation/ 5-tab 嵌套栈
2. **NightBlue 主题**: 废弃，统一到 Terracotta 品牌色
3. **字体**: Cormorant Garamond → Playfair Display
4. **Accent 系统**: 6 色切换降为辅助强调色，品牌色始终 Terracotta
5. **FlashList**: 引入 @shopify/flashlist 替代 FlatList

## Pre-existing Errors Baseline

**Mobile (34 errors in 9 files):**
- Test files: `@testing-library/react-native` not found + `any` types (~25 errors)
- `SwipeCard.tsx:419` / `SeasonPalette.tsx:207,217` — SVG Text props on RN Text
- `ThemeContext.tsx:58` — Missing `colorSeasons` in light theme
- `CommunityScreen.tsx:13` — `MasonryFlashList` import issue
- `CommunityScreen.tsx:356` — `any` type on renderItem

**Backend:** TypeScript not in node_modules (needs `pnpm install` in backend dir)

---

## Execution Waves

### Wave 1: P0 Blocking Fixes (5 items, parallel)

| Plan | QA# | Task | Files | Dependencies |
|------|-----|------|-------|-------------|
| 10-01 | QA-01 | VipGuard real user status | RouteGuards/VipGuard.tsx, useAuthStore | None |
| 10-02 | QA-02 | PaymentScreen Chinese localization | PaymentScreen.tsx | None |
| 10-03 | QA-03 | Safe area insets fix | ChatScreen, BookingScreen, AdvisorProfileScreen, AdvisorListScreen | None |
| 10-04 | QA-04 | Weather coordinates fix | HomeScreen.tsx, location hook | None |
| 10-05 | QA-05 | Chat message persistence | AiStylistChatScreen.tsx, aiStylistStore | None |

### Wave 2: P1 Architecture Fixes (7 items, sequential within dependency chains)

| Plan | QA# | Task | Files | Dependencies |
|------|-----|------|-------|-------------|
| 10-06 | QA-06 | Dual theme unification → Terracotta | theme/index.ts, compat.ts, 21 files | Wave 1 |
| 10-07 | QA-07 | Dual navigation merge → 5-tab | App.tsx, navigation/* | Wave 1 |
| 10-08 | QA-08 | ClothingDetailScreen color tokens | ClothingDetailScreen.tsx | QA-06 |
| 10-09 | QA-09 | useReducedMotion hook + integration | hooks/, animation components | None |
| 10-10 | QA-10 | Dark mode contrast WCAG AA | theme tokens, dark mode colors | QA-06 |
| 10-11 | QA-11 | SharedElement transitions | navigation, PostDetailScreen, ClothingDetailScreen | QA-07 |
| 10-12 | QA-12 | Route guard integration | MainStackNavigator, navigationService | QA-07 |

### Wave 3: P2 Quality Improvements (8 items, partially parallel)

| Plan | QA# | Task | Files | Dependencies |
|------|-----|------|-------|-------------|
| 10-13 | QA-13 | Animation spring semantics | animations.ts, transition components | QA-09 |
| 10-14 | QA-14 | Masonry height + FlashList | CommunityScreen.tsx, PostMasonryCard | QA-06, FlashList pkg |
| 10-15 | QA-15 | AI thinking visual upgrade | AiStylistChatScreen.tsx, loading states | QA-09 |
| 10-16 | QA-16 | CommunityScreen monolith split | CommunityScreen.tsx → components/ | QA-14 |
| 10-17 | QA-17 | Recommendation card enrichment | SwipeCard.tsx, RecommendationCard | QA-06, QA-09 |
| 10-18 | QA-18 | Season color visualization | ColorAnalysisScreen, SeasonPalette | QA-06 |
| 10-19 | QA-19 | Accent system positioning | theme tokens, AccentProvider | QA-06 |
| 10-20 | QA-20 | Component library dedup | ui/index.tsx, primitives/ | QA-06 |

### Wave 4: Pre-existing Error Fixes + Font Integration

| Plan | Task | Files |
|------|------|-------|
| 10-21 | Fix pre-existing TS errors (ThemeContext, MasonryFlashList, SVG Text) | Multiple |
| 10-22 | Playfair Display font integration | typography.ts, app config |
| 10-23 | FlashList package install + MasonryFlashList fix | package.json, CommunityScreen |

---

## Verification Strategy

After each wave:
1. `cd apps/mobile && npx tsc --noEmit` — zero new errors
2. Visual spot-check of modified screens
3. Reduced-motion path verification for all animation changes
4. WCAG AA contrast check for all color changes

Final verification:
1. Mobile: zero TS compilation errors
2. Backend: `pnpm install && npx tsc --noEmit` passes
3. All 20 QA items verified via UAT checklist

---

## Constraints

- No backend API interface changes
- No new database schema
- No brand redesign — only unification
- All colors must meet WCAG AA 4.5:1 contrast
- All animations must include reduced-motion path
- Code comments in English, UI in Chinese
