---
phase: 5
slug: mobile-reorg
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
| **Config file** | `apps/mobile/jest.config.js` |
| **Quick run command** | `cd apps/mobile && npx jest --passWithNoTests --changedSince=HEAD~1` |
| **Full suite command** | `cd apps/mobile && npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/mobile && npx tsc --noEmit`
- **After every plan wave:** Run `cd apps/mobile && npx tsc --noEmit && npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green + Metro bundler starts
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | MOBL-01 | — | N/A | structural | `test -d src/features/auth/screens` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | MOBL-01 | — | N/A | structural | `test -d src/shared/components` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | MOBL-01 | — | N/A | structural | `test -d src/design-system/primitives` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | MOBL-01 | — | N/A | compile | `cd apps/mobile && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | MOBL-02 | — | N/A | unit | `npx jest stores/__tests__/authStore.test.ts` | ✅ | ⬜ pending |
| 5-03-02 | 03 | 2 | MOBL-03 | — | N/A | unit | `npx jest stores/__tests__/quizStore.test.ts` | ✅ | ⬜ pending |
| 5-03-03 | 03 | 2 | MOBL-04* | — | N/A | structural | `test -f src/features/wardrobe/stores/clothingStore.ts && test -f src/features/home/stores/homeStore.ts` | ❌ W0 | ⬜ pending |
| 5-04-01 | 04 | 2 | MOBL-01 | — | N/A | compile | `cd apps/mobile && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 5-05-01 | 05 | 3 | MOBL-05 | — | N/A | structural | `test -f src/features/auth/stores/authStore.ts` | ❌ W0 | ⬜ pending |
| 5-06-01 | 06 | 3 | MOBL-06 | — | N/A | compile | `cd apps/mobile && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 5-07-01 | 07 | 4 | MOBL-01 | — | N/A | e2e-manual | Metro bundler starts + screens render | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/mobile/src/features/` — feature directory structure created
- [ ] `apps/mobile/src/shared/` — shared directory structure created
- [ ] `apps/mobile/src/design-system/` — design system directory structure created
- [ ] Existing test infrastructure covers all phase requirements (Jest + TypeScript)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Metro bundler starts successfully | MOBL-01 | Requires running Metro server | `cd apps/mobile && npx react-native start --port 8081` — verify no errors |
| All core screens render | MOBL-01 | Requires running app on device/emulator | Navigate through all 5 tabs, verify each screen renders |
| Deep links work | MOBL-01 | Requires running app + URL scheme | Test 3+ deep link patterns |
| Auth persistence works | MOBL-02 | Requires app restart | Login → kill app → restart → verify still logged in |
| Route guards redirect correctly | MOBL-01 | Requires running app | Access protected route while logged out → verify redirect to Login |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
