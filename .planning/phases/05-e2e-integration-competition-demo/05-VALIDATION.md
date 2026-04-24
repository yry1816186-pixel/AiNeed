---
phase: 5
slug: e2e-integration-competition-demo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                      |
| ---------------------- | ---------------------------------------------------------- |
| **Framework**          | jest 29.x (mobile) + pytest 7.x (Python AI)                |
| **Config file**        | apps/mobile/jest.config.js + ml/pyproject.toml             |
| **Quick run command**  | `pnpm test --filter=mobile -- --passWithNoTests`           |
| **Full suite command** | `pnpm typecheck && pnpm test && cd ml && python -m pytest` |
| **Estimated runtime**  | ~60 seconds                                                |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck`
- **After every plan wave:** Run `pnpm typecheck && pnpm lint`
- **Before `/gsd-verify-work`:** Full suite must be green + tsc --noEmit zero errors
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command  | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ---------- | --------------- | --------- | ------------------ | ----------- | ---------- |
| 05-01-01 | 01   | 1    | D-01        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-01-02 | 01   | 1    | D-02        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-01-03 | 01   | 1    | D-03        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-02-01 | 02   | 1    | D-05        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-02-02 | 02   | 1    | D-06        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-02-03 | 02   | 1    | D-07        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-03-01 | 03   | 2    | D-09        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-03-02 | 03   | 2    | D-10        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-03-03 | 03   | 2    | D-11        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-04-01 | 04   | 2    | D-12        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |
| 05-04-02 | 04   | 2    | D-13        | —          | N/A             | manual    | Human verification | ❌ W0       | ⬜ pending |
| 05-04-03 | 04   | 2    | D-14        | —          | N/A             | manual    | E2E checklist      | ❌ W0       | ⬜ pending |
| 05-04-04 | 04   | 2    | D-15        | —          | N/A             | unit      | `pnpm typecheck`   | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `pnpm typecheck` runs successfully (baseline for all subsequent tasks)
- [ ] Phase 4 human verification items executed (D-13 prerequisite)

_If none: "Existing infrastructure covers all phase requirements."_

---

## Manual-Only Verifications

| Behavior                                                               | Requirement          | Why Manual                        | Test Instructions                                          |
| ---------------------------------------------------------------------- | -------------------- | --------------------------------- | ---------------------------------------------------------- |
| E2E user journey (register→onboarding→Today→chat→try-on→save→calendar) | D-14                 | Requires running app with backend | Follow manual test script, verify no crashes/blank screens |
| Competition demo path (interview outfit + funnel viz + profile switch) | D-04/D-05/D-06       | Requires visual interaction       | Run demo script, verify three-layer narrative              |
| Voice button STT/TTS                                                   | Phase 4 verification | Requires physical device          | Press voice button, speak, verify response                 |
| Onboarding Step 4 "让伊伊搭第一套"                                     | Phase 4 verification | Requires full flow                | Complete onboarding, verify 3 outfit options               |
| Demo video recording                                                   | D-08                 | Requires screen recording         | Record 1-3 min demo video                                  |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
