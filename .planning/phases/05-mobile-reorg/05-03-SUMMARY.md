---
phase: 05
plan: 03
status: complete
started: "2026-04-17T10:00:00Z"
completed: "2026-04-17T11:00:00Z"
---

## Summary: Store Consolidation & Migration

Merged overlapping stores and migrated all stores to feature-based directories.

### What was built
- **authStore**: Merged auth.store.ts + user.store.ts into unified `features/auth/stores/authStore.ts`. User profile fields renamed (`profile` → `userProfile`) to avoid confusion with auth `user` field. Logout clears both auth and profile state.
- **quizStore**: Merged quizStore.ts + styleQuizStore.ts into unified `features/style-quiz/stores/quizStore.ts`. Added `mode` field ('basic' | 'style') to distinguish quiz flows. Backward-compatible selectors preserved (`useStyleQuizCurrentQuiz`, etc.).
- **clothingStore & homeStore**: Already migrated to `features/wardrobe/stores/` and `features/home/stores/` respectively (MOBL-04 deviation — no merge, separate stores per SRP).
- **All other stores**: Already migrated to feature directories with barrel exports.
- **stores/index.ts**: Updated to re-export from feature stores for backward compatibility.

### Key files created/modified
- `apps/mobile/src/features/auth/stores/authStore.ts` — Merged auth + user store
- `apps/mobile/src/features/style-quiz/stores/quizStore.ts` — Merged quiz + styleQuiz store
- `apps/mobile/src/stores/index.ts` — Updated re-exports

### Key files removed
- `apps/mobile/src/features/auth/stores/auth.store.ts` — Replaced by authStore.ts
- `apps/mobile/src/features/auth/stores/user.store.ts` — Merged into authStore.ts
- `apps/mobile/src/features/style-quiz/stores/styleQuizStore.ts` — Merged into quizStore.ts

### Deviations
- MOBL-04 deviation: clothingStore and homeStore NOT merged (zero functional overlap, merging would violate SRP). Both migrated as independent stores per MOBL-01 feature-based architecture goal.

### Verification
- No `useUserStore` references remain (all replaced by useAuthStore)
- `useStyleQuizStore` references use alias pattern `useQuizStore as useStyleQuizStore`
- All feature store directories have barrel exports (14 directories)
- stores/index.ts only contains index.ts (barrel re-export)
