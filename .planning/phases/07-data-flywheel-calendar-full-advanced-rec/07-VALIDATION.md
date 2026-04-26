---
phase: 7
slug: data-flywheel-calendar-full-advanced-rec
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                           |
| ---------------------- | ----------------------------------------------- |
| **Framework**          | Jest 29.x (backend) + pytest 7.x (Python ML)    |
| **Config file**        | `apps/backend/jest.config.js` + `ml/pytest.ini` |
| **Quick run command**  | `pnpm test --passWithNoTests`                   |
| **Full suite command** | `pnpm test && cd ml && pytest`                  |
| **Estimated runtime**  | ~45 seconds                                     |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --passWithNoTests`
- **After every plan wave:** Run `pnpm test && cd ml && pytest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type   | Automated Command                        | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ---------- | --------------- | ----------- | ---------------------------------------- | ----------- | ---------- |
| 07-01-01 | 01   | 1    | FLY-01      | —          | N/A             | unit        | `pnpm test behavior-etl`                 | ❌ W0       | ⬜ pending |
| 07-01-02 | 01   | 1    | FLY-01      | —          | N/A             | unit        | `pnpm test sasrec-retrain`               | ❌ W0       | ⬜ pending |
| 07-01-03 | 01   | 1    | FLY-02      | —          | N/A             | integration | `cd ml && pytest test_sasrec_service.py` | ✅          | ⬜ pending |
| 07-02-01 | 02   | 1    | FLY-03      | —          | N/A             | unit        | `pnpm test siglip-threshold`             | ❌ W0       | ⬜ pending |
| 07-02-02 | 02   | 1    | FLY-04      | —          | N/A             | unit        | `pnpm test weekly-report`                | ❌ W0       | ⬜ pending |
| 07-03-01 | 03   | 2    | CAL-03      | —          | N/A             | integration | `pnpm test calendar-plan`                | ❌ W0       | ⬜ pending |
| 07-03-02 | 03   | 2    | CAL-04      | —          | N/A             | unit        | `pnpm test calendar-edit`                | ❌ W0       | ⬜ pending |
| 07-03-03 | 03   | 2    | CAL-05      | —          | N/A             | unit        | `pnpm test preference-signal`            | ❌ W0       | ⬜ pending |
| 07-04-01 | 04   | 2    | MOD-04      | —          | N/A             | unit        | `cd ml && pytest test_coordination`      | ❌ W0       | ⬜ pending |
| 07-04-02 | 04   | 2    | MOD-04      | —          | N/A             | integration | `pnpm test coordination-parallel`        | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/backend/src/domains/platform/recommendations/services/__tests__/behavior-etl.service.spec.ts` — stubs for FLY-01
- [ ] `apps/backend/src/domains/platform/recommendations/services/__tests__/sasrec-retrain.service.spec.ts` — stubs for FLY-02
- [ ] `apps/backend/src/domains/platform/recommendations/services/__tests__/siglip-threshold.service.spec.ts` — stubs for FLY-03
- [ ] `apps/backend/src/domains/platform/recommendations/services/__tests__/weekly-report.service.spec.ts` — stubs for FLY-04
- [ ] `apps/backend/src/domains/ai-core/ai-stylist/services/__tests__/calendar-plan.service.spec.ts` — stubs for CAL-03/04/05
- [ ] `ml/tests/test_coordination_model.py` — stubs for MOD-04

---

## Manual-Only Verifications

| Behavior                            | Requirement | Why Manual                 | Test Instructions                                                  |
| ----------------------------------- | ----------- | -------------------------- | ------------------------------------------------------------------ |
| 7-day calendar horizontal scroll UI | CAL-03      | Visual layout verification | Open calendar, verify horizontal scroll, weather icons, scene tags |
| BottomSheet outfit editing          | CAL-04      | Interaction flow           | Tap day → BottomSheet opens → "换一套" → new outfit loads          |
| Style evolution multi-line chart    | FLY-04      | Chart rendering            | View style evolution, verify 4 dimension lines render correctly    |
| Weekly report content quality       | FLY-04      | Subjective quality         | Read weekly report, verify 7 elements present and readable         |
| Repeat detection label              | D-11        | UI label visibility        | Wear same outfit twice, verify "X 天前穿过" label appears          |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
