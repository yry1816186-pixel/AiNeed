# 00_BASELINE_REPORT.md — Phase 0

## Executive Summary

Phase 0 baseline capture completed for the XunO (寻裳) project. This report establishes the ground truth before any remediation work begins.

**Project**: XunO (寻裳) — AI-driven fashion styling platform
**Repository Root**: `C:\AiNeed`
**Baseline Branch**: `main` → `audit-remediation/20260507-1449`
**Baseline Timestamp**: 2026-05-07T14:49:00+08:00

---

## 1. Repository State

### 1.1 Git Status

- **Current Branch**: `audit-remediation/20260507-1449` (created from `main`)
- **Modified Tracked Files**: Extensive — hundreds of files across apps/, ml/, docker-compose files, monitoring/
- **Untracked Files**: Extensive — includes .planning/ artifacts, audit/ directory, screenshots/, apps/admin tests, mobile polyfills, ML scripts, backend seeds/scrapers, E2E tests, k8s manifests, docs
- **Staged Files**: None
- **Notable**: `packages/types/0/v24.14.0-x64-cf738c9d/` contains hundreds of binary hash files (appears to be a corrupted/types package artifact)

### 1.2 Monorepo Structure

```
C:\AiNeed/
├── apps/
│   ├── backend/      (NestJS 11, Prisma, TypeScript)
│   ├── mobile/       (React Native 0.76.8, Expo)
│   ├── admin/        (React + Vite)
│   ├── mini-program/ (skeleton only)
│   └── harmony/      (early prototype)
├── packages/
│   ├── shared/       (shared utilities)
│   └── types/        (TypeScript types — contains artifact debris)
├── ml/               (Python ML services, FastAPI)
├── data/             (datasets — partially populated)
├── monitoring/       (Prometheus/Grafana — production config)
├── infrastructure/   (Prometheus/Grafana — dev config, more complete)
├── k8s/              (Kubernetes manifests)
├── nginx/            (reverse proxy config)
├── scripts/          (utility scripts)
├── tests/            (E2E Playwright tests)
├── audit_output/     (15 audit reports)
├── docs/             (project documentation)
├── .planning/        (GSD phase tracking)
└── [config files]    (turbo.json, docker-compose*.yml, etc.)
```

---

## 2. Environment

| Tool           | Version                      | Evidence       |
| -------------- | ---------------------------- | -------------- |
| OS             | Windows 11 (NT 10.0.26200.0) | CONFIRMED      |
| Shell          | PowerShell 7.6.1             | CONFIRMED      |
| Git            | 2.53.0.windows.1             | CONFIRMED      |
| Node.js        | v24.14.0                     | CONFIRMED      |
| npm            | 11.9.0                       | CONFIRMED      |
| pnpm           | 8.15.0 (workspace manager)   | CONFIRMED      |
| Python         | 3.12.10                      | CONFIRMED      |
| pip            | 26.0.1                       | CONFIRMED      |
| Docker         | 29.4.1                       | CONFIRMED      |
| Docker Compose | v5.1.3                       | CONFIRMED      |
| TypeScript     | 5.9.3 (AUDIT-REPORTED)       | AUDIT-REPORTED |
| NestJS         | 11.x (AUDIT-REPORTED)        | AUDIT-REPORTED |
| React Native   | 0.76.8 (AUDIT-REPORTED)      | AUDIT-REPORTED |

---

## 3. Audit Input Verification

### 3.1 Audit Files — All Present

All 15 expected audit files are present in `audit_output/`. SHA256 checksums computed and recorded in `remediation/AUDIT_FILE_CHECKSUMS.txt`.

### 3.2 Additional Context Files

| File                    | Status                         |
| ----------------------- | ------------------------------ |
| `PROJECT_SUMMARY.md`    | Present                        |
| `CLAUDE.md`             | Present                        |
| `README.md`             | Present                        |
| `package.json`          | Present — verified             |
| `pnpm-workspace.yaml`   | Present                        |
| `turbo.json`            | Present                        |
| `.gitignore`            | Present — verified covers .env |
| `.env.example`          | Present — tracked              |
| `.env.security.example` | Present — tracked              |
| Docker Compose files    | 6 variants present             |
| K8s manifests           | Present                        |

---

## 4. Critical Findings

### 4.1 CONFIRMED: Secret Exposure in Git History (P0)

**Evidence Classification**: CONFIRMED

- Commit `633545a7` on 2026-04-29 20:56:34 added `.env.production` to git
- Commit `23420a28` on 2026-04-29 11:58:14 added `.env.local` to git
- Currently only `.env.example` and `.env.security.example` are tracked
- `.gitignore` now protects `.env` and `.env.*`
- **Risk**: If secrets were in those committed files, they are recoverable from git history
- **Action Required**: Secret rotation is mandatory

### 4.2 Local .env File Detected

- `apps/admin/.env` exists locally (54 bytes)
- Root `.env`, `.env.local`, `.env.production` also exist locally
- None are currently tracked (protected by .gitignore)
- Values NOT inspected (safety rule)

### 4.3 AUDIT-REPORTED P0 Risks (Unverified Locally)

1. Consent not enforced on AI/photo endpoints (P0-001)
2. Data import pipeline broken — missing script (P0-002)
3. `data/raw/` missing (P0-003)
4. Coordination training data all zeros (P0-004)
5. Backend E2E null-op (P0-005)
6. Production alerting broken (P0-007)

---

## 5. Package Manager Setup

- **Manager**: pnpm 8.15.0 with workspaces
- **Lockfile**: pnpm-lock.yaml present
- **Workspace packages**: 7 projects (backend, mobile, admin, mini-program, harmony, shared, types)
- **Install status**: AUDIT-REPORTED success (not re-verified due to time constraints)
- **Overrides**: Extensive security overrides in package.json

---

## 6. Safe Baseline Checks

The following checks were NOT executed (deferred to sub-agents or later phases):

| Check                     | Reason Deferred                                      |
| ------------------------- | ---------------------------------------------------- |
| `pnpm install`            | AUDIT-REPORTED success; re-running is time-intensive |
| `pnpm build`              | Requires full Turborepo build; resource-intensive    |
| `pnpm test`               | Requires PostgreSQL + Redis containers               |
| `pnpm typecheck`          | May require generated Prisma client                  |
| `pnpm lint`               | Safe but deferred to Phase 1                         |
| Docker Compose validation | Requires Docker Desktop running                      |
| Python pytest             | Requires ML dependencies + API keys                  |

---

## 7. Agent Availability

| Agent                                  | Available | Notes                              |
| -------------------------------------- | --------- | ---------------------------------- |
| orchestrator (GLM-5.1)                 | YES       | Active, coordinating               |
| baseline-auditor                       | YES       | To be delegated                    |
| backend-worker (DeepSeek V4 Pro)       | YES       | Available for Phase 1+             |
| frontend-worker (DeepSeek V4 Pro)      | YES       | Available for Phase 2+             |
| data-pipeline-worker (DeepSeek V4 Pro) | YES       | Available for Phase 1+             |
| ml-worker (DeepSeek V4 Pro)            | YES       | Available for Phase 1+             |
| security-reviewer                      | YES       | Available for Phase 1+             |
| qa-worker (DeepSeek V4 Pro)            | YES       | Available for Phase 4+             |
| deployment-worker (DeepSeek V4 Pro)    | YES       | Available for Phase 5+             |
| final-verifier (DeepSeek V4 Pro)       | YES       | To be delegated for Phase 0 review |

---

## 8. Open Blockers

See `remediation/OPEN_BLOCKERS.md` for full blocker list.

Key blockers for Phase 0 completion:

- None — Phase 0 is a read-only baseline capture phase

Key blockers for Phase 1 start:

- **B-001**: Secret rotation authorization required (HUMAN)

---

## 9. Files Created in Phase 0

| File                                   | Purpose                       |
| -------------------------------------- | ----------------------------- |
| `remediation/AUDIT_FILE_CHECKSUMS.txt` | SHA256 hashes for audit files |
| `remediation/COMMAND_LOG.md`           | All commands executed         |
| `remediation/00_BASELINE_REPORT.md`    | This report                   |
| `remediation/MISSING_INPUTS.md`        | Missing input documentation   |
| `remediation/CONTRADICTIONS.md`        | Contradictions register       |
| `remediation/EVIDENCE_LEDGER.md`       | Evidence classification       |
| `remediation/AGENT_ASSIGNMENTS.md`     | Agent role assignments        |
| `remediation/OPEN_BLOCKERS.md`         | Blocker tracking              |
| `remediation/PHASE_STATUS.md`          | Phase progress tracking       |

---

## 10. No Application Code Modified

Phase 0 is strictly read-only. No application code, configuration, or data was modified. Only the remediation directory structure and documentation files were created.

---

**Phase 0 Status**: COMPLETE

Final-verifier review completed 2026-05-07. Two P0 findings identified and resolved:

- F-001: EVIDENCE_LEDGER E-002 reclassified from CONFIRMED to AUDIT-REPORTED (pnpm install never locally verified)
- F-002: All remediation files committed to branch `audit-remediation/20260507-1449` (commit `08a7eae9`)

All 15 audit checksums verified unchanged. Evidence protection ensured via git commit.
