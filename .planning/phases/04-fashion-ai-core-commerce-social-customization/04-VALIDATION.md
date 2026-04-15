---
phase: 4
slug: fashion-ai-core-commerce-social-customization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
| **Config file** | apps/backend/jest.config.js |
| **Quick run command** | `cd apps/backend && npx jest --passWithNoTests --changedSince=HEAD~1` |
| **Full suite command** | `cd apps/backend && npx nest build && npx tsc --noEmit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/backend && npx nest build`
- **After every plan wave:** Run `cd apps/backend && npx nest build && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | ARCH-01 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | ARCH-08 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 1 | ARCH-09 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |
| 4-04-01 | 04 | 2 | ARCH-01 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |
| 4-05-01 | 05 | 2 | ARCH-02 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |
| 4-06-01 | 06 | 2 | ARCH-01 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |
| 4-07-01 | 07 | 3 | ARCH-10 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |
| 4-08-01 | 08 | 3 | ARCH-01 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |
| 4-09-01 | 09 | 3 | ARCH-01 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |
| 4-10-01 | 10 | 4 | ARCH-03 | — | N/A | grep | `grep -r "forwardRef" apps/backend/src/domains/` | ❌ W0 | ⬜ pending |
| 4-11-01 | 11 | 4 | MOBL-06 | — | N/A | build | `cd apps/backend && npx nest build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/domains/` — domain directory structure created
- [ ] `apps/backend/.eslintrc.json` — eslint-plugin-boundaries rules added

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| API endpoints work after migration | ARCH-01 | Requires running server + DB | Start backend, hit key endpoints (auth, clothing, cart, payment) |
| Event-driven architecture works across domains | ARCH-02 | Requires running server + event flow | Trigger payment, verify subscription activation |
| eslint-plugin-boundaries rules pass | ARCH-04 | Requires full lint run | `cd apps/backend && npx eslint src/domains/` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
