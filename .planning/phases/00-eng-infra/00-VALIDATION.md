---
phase: 0
slug: eng-infra
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 0 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (backend + mobile), vitest (admin) |
| **Config file** | apps/backend/jest.config.js, apps/mobile/jest.config.js |
| **Quick run command** | `pnpm -r --parallel run lint` |
| **Full suite command** | `pnpm -r run lint && pnpm -r run typecheck && pnpm -r run test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm -r --parallel run lint`
- **After every plan wave:** Run `pnpm -r run lint && pnpm -r run typecheck && pnpm -r run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 0-01-01 | 01 | 1 | ENGR-01 | — | N/A | manual | `git commit -m "test: wip" --allow-empty` triggers lint-staged | ⬜ W0 | ⬜ pending |
| 0-02-01 | 02 | 1 | ENGR-03 | — | N/A | unit | `pnpm -r run lint` exits 0 | ⬜ W0 | ⬜ pending |
| 0-03-01 | 03 | 1 | ENGR-04 | — | N/A | unit | `pnpm prettier --check .` exits 0 | ⬜ W0 | ⬜ pending |
| 0-04-01 | 04 | 2 | ENGR-05 | — | N/A | unit | `npx turbo build --dry` shows cache | ⬜ W0 | ⬜ pending |
| 0-05-01 | 05 | 2 | ENGR-06 | — | N/A | manual | `npx changeset add` works | ⬜ W0 | ⬜ pending |
| 0-06-01 | 06 | 2 | ENGR-07 | — | N/A | unit | CI pipeline runs on PR | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Root `.eslintrc.json` — shared config for monorepo
- [ ] Root `.prettierrc` — shared config for monorepo
- [ ] `turbo.json` — pipeline definition
- [ ] `.changeset/config.json` — changeset configuration

*Existing infrastructure partially covers phase requirements (CI exists, needs enhancement).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| lint-staged triggers on commit | ENGR-01 | Requires actual git commit | Make a test commit with lint error, verify it's blocked |
| Changeset version management | ENGR-06 | Requires interactive CLI | Run `npx changeset add`, verify it creates a changeset file |
| Turborepo cache hit on second build | ENGR-05 | Requires two sequential builds | Run `npx turbo build` twice, verify second is cached |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
