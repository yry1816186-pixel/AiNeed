---
phase: 7
slug: code-quality
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (backend: ts-jest, mobile: babel-jest) |
| **Config file** | Backend: `apps/backend/jest.config.js`, Mobile: `apps/mobile/jest.config.js` |
| **Quick run command** | `cd apps/backend && npx jest --changedSince=HEAD~1 --no-coverage` / `cd apps/mobile && npx jest --changedSince=HEAD~1 --no-coverage` |
| **Full suite command** | `cd apps/backend && npx jest --coverage` / `cd apps/mobile && npx jest --coverage` |
| **Estimated runtime** | ~30 seconds (backend) / ~20 seconds (mobile) |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --changedSince=HEAD~1 --no-coverage` in affected workspace
- **After every plan wave:** Run full suite with coverage in both backend and mobile
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | QUAL-02 | — | N/A | unit | `cd apps/backend && npx jest --no-coverage` | ✅ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | QUAL-02 | — | N/A | unit | `cd apps/backend && npx jest --no-coverage` | ✅ W0 | ⬜ pending |
| 7-02-01 | 02 | 1 | QUAL-03 | — | N/A | unit | `cd apps/mobile && npx jest --no-coverage` | ✅ W0 | ⬜ pending |
| 7-02-02 | 02 | 1 | QUAL-03 | — | N/A | unit | `cd apps/mobile && npx jest --no-coverage` | ✅ W0 | ⬜ pending |
| 7-03-01 | 03 | 2 | QUAL-04 | — | N/A | integration | `cd apps/backend && npx jest --coverage` | ✅ W0 | ⬜ pending |
| 7-03-02 | 03 | 2 | QUAL-04 | — | N/A | integration | `cd apps/backend && npx jest --coverage` | ✅ W0 | ⬜ pending |
| 7-04-01 | 04 | 2 | QUAL-05 | — | N/A | unit | `cd apps/mobile && npx jest --coverage` | ✅ W0 | ⬜ pending |
| 7-04-02 | 04 | 2 | QUAL-05 | — | N/A | unit | `cd apps/mobile && npx jest --coverage` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing test infrastructure covers all phase requirements

*Note: ts-morph was originally considered for codemod-based `any` elimination, but the plan uses manual fixes instead (more controllable for ~39 backend and ~67 mobile production `any` instances). ts-morph is NOT required for this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ESLint no-explicit-any: error blocks new any | QUAL-02/03 | Need to verify ESLint config change takes effect in IDE | Create a file with `: any`, verify ESLint shows error |
| Coverage threshold enforcement in CI | QUAL-04/05 | CI pipeline verification | Push a commit that reduces coverage below threshold, verify CI fails |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
