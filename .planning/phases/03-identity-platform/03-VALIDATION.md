---
phase: 3
slug: identity-platform
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | apps/backend/jest.config.js (existing) |
| **Quick run command** | `cd apps/backend && npx jest --passWithNoTests --no-coverage` |
| **Full suite command** | `cd apps/backend && npx jest --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/backend && npx nest build`
- **After every plan wave:** Run `cd apps/backend && npx jest --coverage && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | ARCH-01 | — | N/A | build | `cd apps/backend && npx nest build` | ✅ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | ARCH-01 | T-3-01 | PII fields remain encrypted after module move | unit | `cd apps/backend && npx jest --testPathPattern=pii-encryption` | ✅ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | ARCH-01 | — | N/A | build | `cd apps/backend && npx nest build` | ✅ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | ARCH-01 | — | N/A | build | `cd apps/backend && npx nest build` | ✅ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | ARCH-11 | — | N/A | unit | `cd apps/backend && npx jest --testPathPattern=recommendations` | ✅ W0 | ⬜ pending |
| 03-05-01 | 05 | 2 | ARCH-01 | — | N/A | build | `cd apps/backend && npx nest build` | ✅ W0 | ⬜ pending |
| 03-06-01 | 06 | 3 | ARCH-04 | — | N/A | lint | `cd apps/backend && npx eslint src/domains --rulesdir .` | ❌ W0 | ⬜ pending |
| 03-07-01 | 07 | 3 | ARCH-05 | — | N/A | cli | `cd apps/backend && npx depcruise src/domains --validate` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `eslint-plugin-boundaries` installed and configured
- [ ] `dependency-cruiser` installed and configured
- [ ] Existing test infrastructure covers all phase requirements

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PII fields encrypted after migration | ARCH-01 | Requires database inspection | 1. Create user via API 2. Check database for encrypted PII fields 3. Verify decryption works via GET /api/v1/profile |
| All API endpoints return correct status | ARCH-01 | Requires running server | 1. Start backend 2. Test each endpoint group (auth, users, profile, etc.) 3. Verify 200/201 responses |
| dependency-cruiser visualization renders | ARCH-05 | Visual verification | 1. Run `npx depcruise src/domains --output-type html > report.html` 2. Open report.html in browser 3. Verify domain boundaries visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
