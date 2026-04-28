---
phase: 14
slug: pin-pai-shi-jue-she-ji-xi-tong-zhong-jian
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                          |
| ---------------------- | -------------------------------------------------------------- | ------------------ |
| **Framework**          | Jest 29.x (already in project)                                 |
| **Config file**        | `apps/mobile/jest.config.js`                                   |
| **Quick run command**  | `pnpm --filter mobile test -- --testPathPattern="design-system | theme" --no-cache` |
| **Full suite command** | `pnpm --filter mobile test`                                    |
| **Estimated runtime**  | ~15 seconds                                                    |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter mobile test -- --testPathPattern="design-system|theme" --no-cache`
- **After every plan wave:** Run `pnpm --filter mobile test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement        | Threat Ref | Secure Behavior | Test Type | Automated Command                                                   | File Exists | Status     |
| -------- | ---- | ---- | ------------------ | ---------- | --------------- | --------- | ------------------------------------------------------------------- | ----------- | ---------- |
| 14-01-01 | 01   | 1    | DSTK-01            | —          | N/A             | unit      | `pnpm --filter mobile test -- --testPathPattern="tokens"`           | ❌ W0       | ⬜ pending |
| 14-01-02 | 01   | 1    | DSTK-01, DSTK-03   | —          | N/A             | unit      | `pnpm --filter mobile test -- --testPathPattern="style-dictionary"` | ❌ W0       | ⬜ pending |
| 14-02-01 | 02   | 1    | DSTK-04, DSTK-06   | —          | N/A             | unit      | `pnpm --filter mobile test -- --testPathPattern="themeStore"`       | ❌ W0       | ⬜ pending |
| 14-02-02 | 02   | 1    | DSTK-05, DSTK-06   | —          | N/A             | unit      | `pnpm --filter mobile test -- --testPathPattern="contrast"`         | ❌ W0       | ⬜ pending |
| 14-03-01 | 03   | 2    | BRAND-01, BRAND-02 | —          | N/A             | manual    | Visual inspection of SVG/PNG files                                  | ❌ W0       | ⬜ pending |
| 14-03-02 | 03   | 2    | BRAND-03, BRAND-04 | —          | N/A             | unit      | `pnpm --filter mobile test -- --testPathPattern="splash"`           | ❌ W0       | ⬜ pending |
| 14-04-01 | 04   | 2    | DSTK-02            | —          | N/A             | script    | `node scripts/audit-hardcoded-values.mjs`                           | ❌ W0       | ⬜ pending |
| 14-04-02 | 04   | 2    | DSTK-03            | —          | N/A             | unit      | `pnpm --filter mobile test -- --testPathPattern="legacy"`           | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/mobile/src/design-system/theme/__tests__/tokens.test.ts` — stubs for DSTK-01
- [ ] `apps/mobile/src/design-system/theme/__tests__/themeStore.test.ts` — stubs for DSTK-04, DSTK-06
- [ ] `apps/mobile/src/design-system/theme/__tests__/contrast.test.ts` — stubs for DSTK-05
- [ ] `apps/mobile/src/design-system/theme/__tests__/legacy-map.test.ts` — stubs for DSTK-03
- [ ] `scripts/audit-hardcoded-values.mjs` — script to verify zero hardcoded values in source (DSTK-02)

---

## Manual-Only Verifications

| Behavior                              | Requirement       | Why Manual                             | Test Instructions                                                      |
| ------------------------------------- | ----------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Logo visual quality (3 variants)      | BRAND-01          | Aesthetic judgment cannot be automated | Open SVG files, verify horizontal/square/monochrome at 32px and 1024px |
| App Icon visual quality               | BRAND-02          | Aesthetic judgment                     | Install on device, verify on home screen against other apps            |
| Splash animation feel                 | BRAND-03          | Timing and motion quality              | Launch app on device, verify ≤1.5s, brand feel                         |
| Brand guideline document completeness | BRAND-04          | Content coverage                       | Review document has all required sections                              |
| Dark mode visual quality              | BRAND-05, DSTK-05 | Aesthetic judgment                     | Toggle dark mode on device, verify warmth and contrast                 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
