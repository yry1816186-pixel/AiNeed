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

### Wave 1: P0 Blocking Fixes (parallel)

| Plan | QA# | Task | Files | Dependencies |
|------|-----|------|-------|-------------|
| 10-01 | QA-01~05 | VipGuard, PaymentScreen i18n, SafeArea, Weather, Chat persistence | Multiple | None |

### Wave 2: P1 Architecture Fixes (sequential within dependency chains)

| Plan | QA# | Task | Files | Dependencies |
|------|-----|------|-------|-------------|
| 10-02 | QA-06,08,10 | Dual theme unification, ClothingDetailScreen colors, Dark mode contrast | theme/, ClothingDetailScreen | Wave 1 |
| 10-03 | QA-07,11,12 | Navigation merge, SharedElement, Route guards | App.tsx, navigation/* | Wave 1 |
| 10-04 | QA-09 | useReducedMotion hook + animation integration | hooks/, animation components | Wave 1 |

### Wave 3: P2 Quality Improvements (partially parallel after Wave 2)

| Plan | QA# | Task | Files | Dependencies |
|------|-----|------|-------|-------------|
| 10-05 | QA-13,15,17 | Animation semantics, AI thinking, Recommendation card | animations.ts, AiStylistChat, SwipeCard | 10-02, 10-04 |
| 10-06 | QA-14,16,18,19 | CommunityScreen split, Masonry height, SeasonPalette, Accent demotion | CommunityScreen, ColorAnalysis, ThemeSystem | 10-02, 10-04 |
| 10-07 | QA-20 | Component library dedup (ui/index.tsx) | ui/index.tsx, primitives/ | 10-02 |

---

## QA Coverage Matrix

| QA# | Plan | Priority | Description |
|-----|------|----------|-------------|
| QA-01 | 10-01 | P0 | VipGuard real user status |
| QA-02 | 10-01 | P0 | PaymentScreen Chinese localization |
| QA-03 | 10-01 | P0 | Safe area insets fix (4 screens) |
| QA-04 | 10-01 | P0 | Weather coordinates device location |
| QA-05 | 10-01 | P0 | Chat message persistence |
| QA-06 | 10-02 | P1 | Dual theme unification → Terracotta |
| QA-07 | 10-03 | P1 | Dual navigation merge → 5-tab |
| QA-08 | 10-02 | P1 | ClothingDetailScreen color tokens |
| QA-09 | 10-04 | P1 | useReducedMotion hook |
| QA-10 | 10-02 | P1 | Dark mode contrast WCAG AA |
| QA-11 | 10-03 | P1 | SharedElement transitions |
| QA-12 | 10-03 | P1 | Route guard integration |
| QA-13 | 10-05 | P2 | Animation spring semantics |
| QA-14 | 10-06 | P2 | Masonry height + FlashList |
| QA-15 | 10-05 | P2 | AI thinking visual upgrade |
| QA-16 | 10-06 | P2 | CommunityScreen monolith split |
| QA-17 | 10-05 | P2 | Recommendation card enrichment |
| QA-18 | 10-06 | P2 | Season color visualization |
| QA-19 | 10-06 | P2 | Accent system demotion |
| QA-20 | 10-07 | P2 | Component library dedup |

---

## Verification Strategy

After each wave:
1. `cd apps/mobile && npx tsc --noEmit` — zero new errors
2. Visual spot-check of modified screens
3. Reduced-motion path verification for all animation changes
4. WCAG AA contrast check for all color changes

Final verification:
1. Mobile: zero TS compilation errors (baseline 34 pre-existing accepted)
2. All 20 QA items verified via UAT checklist
3. `grep -r "isVip = false" apps/mobile/src/` returns 0 matches
4. `grep -r "paddingTop: 56" apps/mobile/src/screens/consultant/` returns 0 matches
5. PaymentScreen contains zero English user-facing strings
6. All animation components reference useReducedMotion
7. ClothingDetailScreen contains zero hardcoded hex colors

---

## Constraints

- No backend API interface changes
- No new database schema
- No brand redesign — only unification
- All colors must meet WCAG AA 4.5:1 contrast
- All animations must include reduced-motion path
- Code comments in English, UI in Chinese