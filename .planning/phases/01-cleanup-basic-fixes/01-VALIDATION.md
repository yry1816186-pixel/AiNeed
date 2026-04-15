---
phase: 1
slug: cleanup-basic-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (backend + mobile) |
| **Config file** | apps/backend/jest.config.js, apps/mobile/jest.config.js |
| **Quick run command** | `cd apps/backend && npx jest --passWithNoTests --no-coverage` |
| **Full suite command** | `cd apps/backend && npx jest && cd ../mobile && npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/backend && npx jest --passWithNoTests --no-coverage`
- **After every plan wave:** Run `cd apps/backend && npx tsc --noEmit && cd ../mobile && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite + tsc --noEmit must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | ENGR-02 | — | N/A | file-check | `ls root clutter files` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | ARCH-06 | — | N/A | grep | `grep DemoModule app.module.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | ARCH-07 | — | N/A | grep | `grep CodeRagModule app.module.ts` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 1 | QUAL-06 | — | Encryption key handling unchanged | tsc | `cd apps/backend && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 2 | QUAL-01 | — | N/A | eslint | `cd apps/backend && npx eslint --rule '@typescript-eslint/no-explicit-any: error'` | ❌ W0 | ⬜ pending |
| 1-06-01 | 06 | 2 | QUAL-07 | — | N/A | eslint | `cd apps/mobile && npx eslint --print-config src/App.tsx` | ❌ W0 | ⬜ pending |
| 1-07-01 | 07 | 2 | ENGR-08 | — | N/A | grep | `grep -r 'Controller' apps/backend/src/modules/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend `typecheck` script added to `apps/backend/package.json`
- [ ] Root `typecheck` script added to `package.json`
- [ ] `.gitignore` updated with clutter file patterns

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Demo endpoints no longer accessible | ARCH-06 | Requires running server | Start backend, curl /api/v1/demo → 404 |
| Code-RAG endpoints no longer accessible | ARCH-07 | Requires running server | Start backend, curl /api/v1/code-rag → 404 |
| PII encryption still works after user-key.service.ts fix | QUAL-06 | Requires full encryption pipeline | Register user, verify encrypted fields in DB |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
